import type { AdminApiContext } from "@shopify/shopify-app-remix/server";
import prisma from "../db.server";
import type { InventoryPolicy, TriggerMode } from "../constants.server";
import { syncConfigToMetafield } from "./metafield-sync.server";

export type PreorderRuleInput = {
  productId: string;
  productTitle: string;
  variantId: string;
  variantTitle: string;
  depositPercent: number;
  fulfillmentDate: string;
  triggerMode: TriggerMode;
  inventoryPolicy: InventoryPolicy;
  enabled?: boolean;
};

export async function getPreorderRules(shop: string) {
  return prisma.preorderRule.findMany({
    where: { shop },
    orderBy: { createdAt: "desc" },
  });
}

function formatFulfillmentDate(date: string): string | null {
  if (!date) return null;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().split("T")[0];
}

function buildBillingPolicy(depositPercent: number) {
  if (depositPercent >= 100) {
    return {
      fixed: {
        checkoutCharge: {
          type: "PERCENTAGE",
          value: { percentage: 100 },
        },
        remainingBalanceChargeTrigger: "NO_REMAINING_BALANCE",
      },
    };
  }

  return {
    fixed: {
      checkoutCharge: {
        type: "PERCENTAGE",
        value: { percentage: depositPercent },
      },
      remainingBalanceChargeTrigger: "EXACT_TIME",
      remainingBalanceChargeExactTime: formatFulfillmentDate(
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      ),
    },
  };
}

export async function createSellingPlanGroup(
  admin: AdminApiContext,
  input: PreorderRuleInput,
) {
  const fulfillmentDate = formatFulfillmentDate(input.fulfillmentDate);
  const depositPercent = Math.min(100, Math.max(0, input.depositPercent));

  const response = await admin.graphql(
    `#graphql
      mutation PreorderPulseCreateSellingPlan($input: SellingPlanGroupInput!, $resources: SellingPlanGroupResourceInput) {
        sellingPlanGroupCreate(input: $input, resources: $resources) {
          sellingPlanGroup {
            id
          }
          userErrors {
            field
            message
          }
        }
      }
    `,
    {
      variables: {
        input: {
          name: `Preorder: ${input.variantTitle}`,
          merchantCode: `preorder-${input.variantId.split("/").pop()}`,
          options: ["Preorder"],
          sellingPlansToCreate: [
            {
              name: input.fulfillmentDate
                ? `预售 — 预计 ${input.fulfillmentDate} 发货`
                : "预售 — 尽快发货",
              category: "PRE_ORDER",
              options: [
                input.fulfillmentDate
                  ? `预计 ${input.fulfillmentDate} 发货`
                  : "尽快发货",
              ],
              billingPolicy: buildBillingPolicy(depositPercent),
              deliveryPolicy: fulfillmentDate
                ? {
                    fixed: {
                      fulfillmentTrigger: "EXACT_TIME",
                      fulfillmentExactTime: fulfillmentDate,
                    },
                  }
                : { fixed: { fulfillmentTrigger: "ASAP" } },
              inventoryPolicy: {
                reserve:
                  input.inventoryPolicy === "ON_FULFILLMENT"
                    ? "ON_FULFILLMENT"
                    : "ON_SALE",
              },
            },
          ],
        },
        resources: {
          productIds: [input.productId],
          productVariantIds: [input.variantId],
        },
      },
    },
  );

  const json = await response.json();
  const userErrors = json.data?.sellingPlanGroupCreate?.userErrors ?? [];
  if (userErrors.length) {
    throw new Error(
      userErrors.map((e: { message: string }) => e.message).join(", "),
    );
  }

  return json.data?.sellingPlanGroupCreate?.sellingPlanGroup?.id as string;
}

export async function deleteSellingPlanGroup(
  admin: AdminApiContext,
  sellingPlanGroupId: string,
) {
  if (!sellingPlanGroupId) return;

  await admin.graphql(
    `#graphql
      mutation PreorderPulseDeleteSellingPlan($id: ID!) {
        sellingPlanGroupDelete(id: $id) {
          deletedSellingPlanGroupId
          userErrors {
            field
            message
          }
        }
      }
    `,
    { variables: { id: sellingPlanGroupId } },
  );
}

export async function createPreorderRule(
  admin: AdminApiContext,
  shop: string,
  input: PreorderRuleInput,
) {
  const existing = await prisma.preorderRule.findFirst({
    where: { shop, variantId: input.variantId },
  });
  if (existing) {
    throw new Error("该变体已有预售规则");
  }

  const sellingPlanGroupId = await createSellingPlanGroup(admin, input);

  const rule = await prisma.preorderRule.create({
    data: {
      shop,
      productId: input.productId,
      productTitle: input.productTitle,
      variantId: input.variantId,
      variantTitle: input.variantTitle,
      sellingPlanGroupId,
      depositPercent: input.depositPercent,
      fulfillmentDate: input.fulfillmentDate,
      triggerMode: input.triggerMode,
      inventoryPolicy: input.inventoryPolicy,
      enabled: input.enabled ?? true,
    },
  });

  await syncConfigToMetafield(admin, shop);
  return rule;
}

export async function deletePreorderRule(
  admin: AdminApiContext,
  shop: string,
  id: string,
) {
  const rule = await prisma.preorderRule.findFirst({ where: { id, shop } });
  if (!rule) return;

  await deleteSellingPlanGroup(admin, rule.sellingPlanGroupId);
  await prisma.preorderRule.deleteMany({ where: { id, shop } });
  await syncConfigToMetafield(admin, shop);
}

export async function togglePreorderRule(
  admin: AdminApiContext,
  shop: string,
  id: string,
  enabled: boolean,
) {
  await prisma.preorderRule.updateMany({
    where: { id, shop },
    data: { enabled },
  });
  await syncConfigToMetafield(admin, shop);
}

export async function syncAutoPreorderForVariant(
  admin: AdminApiContext,
  shop: string,
  variant: {
    productId: string;
    productTitle: string;
    variantId: string;
    variantTitle: string;
    inventoryQuantity: number;
  },
) {
  const settings = await prisma.shopSettings.findUnique({ where: { shop } });
  if (!settings?.autoPreorderOnZero) return;

  const existing = await prisma.preorderRule.findFirst({
    where: { shop, variantId: variant.variantId },
  });

  if (variant.inventoryQuantity <= 0 && !existing) {
    await createPreorderRule(admin, shop, {
      productId: variant.productId,
      productTitle: variant.productTitle,
      variantId: variant.variantId,
      variantTitle: variant.variantTitle,
      depositPercent: 100,
      fulfillmentDate: "",
      triggerMode: "auto",
      inventoryPolicy: "ON_SALE",
      enabled: true,
    });
    return;
  }

  if (variant.inventoryQuantity > 0 && existing?.triggerMode === "auto") {
    await deletePreorderRule(admin, shop, existing.id);
  }
}
