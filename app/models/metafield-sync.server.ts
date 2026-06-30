import type { AdminApiContext } from "@shopify/shopify-app-remix/server";
import prisma from "../db.server";
import { METAFIELD_KEY, METAFIELD_NAMESPACE } from "../constants.server";
import { getPreorderRules } from "./preorders.server";

export type StorefrontConfig = {
  enabled: boolean;
  autoPreorderOnZero: boolean;
  notifyButtonText: string;
  preorderButtonText: string;
  notifySuccessText: string;
  barBgColor: string;
  barTextColor: string;
  barAccentColor: string;
  preorders: Array<{
    variantId: string;
    productId: string;
    productTitle: string;
    variantTitle: string;
    depositPercent: number;
    fulfillmentDate: string;
    sellingPlanGroupId: string;
    triggerMode: string;
  }>;
};

export async function getOrCreateShopSettings(shop: string) {
  return prisma.shopSettings.upsert({
    where: { shop },
    create: { shop },
    update: {},
  });
}

export async function updateShopSettings(
  shop: string,
  data: Partial<{
    enabled: boolean;
    autoPreorderOnZero: boolean;
    notifyButtonText: string;
    preorderButtonText: string;
    notifySuccessText: string;
    barBgColor: string;
    barTextColor: string;
    barAccentColor: string;
  }>,
) {
  await getOrCreateShopSettings(shop);
  return prisma.shopSettings.update({
    where: { shop },
    data,
  });
}

export async function recordPreorderEvent(
  shop: string,
  eventType: string,
  ruleId?: string,
) {
  return prisma.preorderEvent.create({
    data: { shop, eventType, ruleId },
  });
}

export async function getPreorderStats(shop: string) {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [
    settings,
    activeRules,
    pendingWaitlist,
    notifiedThisWeek,
    preorderOrders,
    convertedSubscribers,
    totalSubscribers,
  ] = await Promise.all([
    getOrCreateShopSettings(shop),
    prisma.preorderRule.count({ where: { shop, enabled: true } }),
    prisma.waitlistSubscriber.count({
      where: { shop, status: "pending" },
    }),
    prisma.notificationJob.count({
      where: { shop, status: "sent", sentAt: { gte: weekAgo } },
    }),
    prisma.preorderEvent.count({
      where: { shop, eventType: "preorder_order" },
    }),
    prisma.waitlistSubscriber.count({
      where: { shop, convertedAt: { not: null } },
    }),
    prisma.waitlistSubscriber.count({ where: { shop } }),
  ]);

  const conversionRate =
    totalSubscribers > 0
      ? Math.round((convertedSubscribers / totalSubscribers) * 100)
      : 0;

  return {
    enabled: settings.enabled,
    activeRules,
    pendingWaitlist,
    notifiedThisWeek,
    preorderOrders,
    convertedSubscribers,
    conversionRate,
  };
}

export async function buildStorefrontConfig(
  shop: string,
): Promise<StorefrontConfig> {
  const [settings, rules] = await Promise.all([
    getOrCreateShopSettings(shop),
    getPreorderRules(shop),
  ]);

  return {
    enabled: settings.enabled,
    autoPreorderOnZero: settings.autoPreorderOnZero,
    notifyButtonText: settings.notifyButtonText,
    preorderButtonText: settings.preorderButtonText,
    notifySuccessText: settings.notifySuccessText,
    barBgColor: settings.barBgColor,
    barTextColor: settings.barTextColor,
    barAccentColor: settings.barAccentColor,
    preorders: rules
      .filter((rule) => rule.enabled)
      .map((rule) => ({
        variantId: rule.variantId,
        productId: rule.productId,
        productTitle: rule.productTitle,
        variantTitle: rule.variantTitle,
        depositPercent: rule.depositPercent,
        fulfillmentDate: rule.fulfillmentDate,
        sellingPlanGroupId: rule.sellingPlanGroupId,
        triggerMode: rule.triggerMode,
      })),
  };
}

export async function syncConfigToMetafield(
  admin: AdminApiContext,
  shop: string,
) {
  const config = await buildStorefrontConfig(shop);

  const shopResponse = await admin.graphql(
    `#graphql
      query PreorderPulseShopId {
        shop {
          id
        }
      }
    `,
  );
  const shopJson = await shopResponse.json();
  const shopId = shopJson.data?.shop?.id;

  if (!shopId) {
    throw new Error("Unable to resolve shop id for metafield sync");
  }

  const response = await admin.graphql(
    `#graphql
      mutation PreorderPulseSyncConfig($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
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
        metafields: [
          {
            ownerId: shopId,
            namespace: METAFIELD_NAMESPACE,
            key: METAFIELD_KEY,
            type: "json",
            value: JSON.stringify(config),
          },
        ],
      },
    },
  );

  const json = await response.json();
  const userErrors = json.data?.metafieldsSet?.userErrors ?? [];
  if (userErrors.length) {
    throw new Error(
      userErrors.map((e: { message: string }) => e.message).join(", "),
    );
  }

  return config;
}

export async function purgeShopData(shop: string) {
  await prisma.preorderEvent.deleteMany({ where: { shop } });
  await prisma.notificationJob.deleteMany({ where: { shop } });
  await prisma.waitlistSubscriber.deleteMany({ where: { shop } });
  await prisma.preorderRule.deleteMany({ where: { shop } });
  await prisma.shopSettings.deleteMany({ where: { shop } });
}
