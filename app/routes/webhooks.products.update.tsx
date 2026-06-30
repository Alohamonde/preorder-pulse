import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { syncAutoPreorderForVariant } from "../models/preorders.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session, topic, payload } =
    await authenticate.webhook(request);

  if (!session?.shop || !admin) {
    return new Response();
  }

  if (topic !== "PRODUCTS_UPDATE") {
    return new Response();
  }

  const product = payload as {
    id?: number;
    title?: string;
    variants?: Array<{
      id?: number;
      title?: string;
      inventory_quantity?: number;
    }>;
  };

  if (!product.id || !product.variants?.length) {
    return new Response();
  }

  const productId = `gid://shopify/Product/${product.id}`;
  const productTitle = product.title ?? "";

  for (const variant of product.variants) {
    if (!variant.id) continue;
    await syncAutoPreorderForVariant(admin, session.shop, {
      productId,
      productTitle,
      variantId: `gid://shopify/ProductVariant/${variant.id}`,
      variantTitle:
        variant.title === "Default Title"
          ? productTitle
          : (variant.title ?? ""),
      inventoryQuantity: variant.inventory_quantity ?? 0,
    });
  }

  return new Response();
};
