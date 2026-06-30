import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { recordPreorderEvent } from "../models/metafield-sync.server";
import { markSubscriberConverted } from "../models/waitlist.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, topic, payload } = await authenticate.webhook(request);

  if (!session?.shop) {
    return new Response();
  }

  if (topic !== "ORDERS_PAID") {
    return new Response();
  }

  const order = payload as {
    line_items?: Array<{
      variant_id?: number;
      selling_plan_allocation?: unknown;
    }>;
    email?: string;
    customer?: { email?: string };
  };

  const email = order.email ?? order.customer?.email ?? "";
  const hasPreorder = order.line_items?.some(
    (item) => item.selling_plan_allocation,
  );

  if (hasPreorder) {
    await recordPreorderEvent(session.shop, "preorder_order");
  }

  if (email) {
    for (const item of order.line_items ?? []) {
      if (!item.variant_id) continue;
      const variantId = `gid://shopify/ProductVariant/${item.variant_id}`;
      await markSubscriberConverted(session.shop, email, variantId);
    }
  }

  return new Response();
};
