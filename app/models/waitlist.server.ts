import prisma from "../db.server";
import { processBackInStockNotifications } from "./notifications.server";

export type SubscribeInput = {
  email: string;
  productId: string;
  variantId: string;
  productTitle?: string;
  variantTitle?: string;
};

export async function getWaitlistSubscribers(shop: string) {
  return prisma.waitlistSubscriber.findMany({
    where: { shop },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function subscribeToWaitlist(shop: string, input: SubscribeInput) {
  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    throw new Error("请输入有效邮箱");
  }

  return prisma.waitlistSubscriber.upsert({
    where: {
      shop_variantId_email: {
        shop,
        variantId: input.variantId,
        email,
      },
    },
    create: {
      shop,
      email,
      productId: input.productId,
      variantId: input.variantId,
      productTitle: input.productTitle ?? "",
      variantTitle: input.variantTitle ?? "",
      status: "pending",
    },
    update: {
      status: "pending",
      productTitle: input.productTitle ?? "",
      variantTitle: input.variantTitle ?? "",
      notifiedAt: null,
    },
  });
}

export async function deleteWaitlistSubscriber(shop: string, id: string) {
  return prisma.waitlistSubscriber.deleteMany({ where: { id, shop } });
}

export async function handleInventoryRestock(
  shop: string,
  inventoryItemId: string,
  available: number,
  admin?: import("@shopify/shopify-app-remix/server").AdminApiContext,
) {
  if (available <= 0) return { notified: 0 };

  let variantIds: string[] = [];

  if (admin) {
    const response = await admin.graphql(
      `#graphql
        query PreorderPulseVariantsByInventory($id: ID!) {
          inventoryItem(id: $id) {
            variant {
              id
              product {
                id
                title
              }
              title
            }
          }
        }
      `,
      { variables: { id: `gid://shopify/InventoryItem/${inventoryItemId}` } },
    );
    const json = await response.json();
    const variant = json.data?.inventoryItem?.variant;
    if (variant?.id) {
      variantIds = [variant.id];
    }
  }

  if (!variantIds.length) {
    const pending = await prisma.waitlistSubscriber.findMany({
      where: { shop, status: "pending" },
      select: { variantId: true },
      distinct: ["variantId"],
    });
    variantIds = pending.map((s) => s.variantId);
  }

  let totalNotified = 0;
  for (const variantId of variantIds) {
    totalNotified += await processBackInStockNotifications(shop, variantId);
  }

  return { notified: totalNotified };
}

export async function markSubscriberConverted(
  shop: string,
  email: string,
  variantId: string,
) {
  await prisma.waitlistSubscriber.updateMany({
    where: { shop, email: email.toLowerCase(), variantId },
    data: { convertedAt: new Date(), status: "converted" },
  });
}
