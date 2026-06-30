import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { handleInventoryRestock } from "../models/waitlist.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session, topic, payload } =
    await authenticate.webhook(request);

  if (!session?.shop) {
    return new Response();
  }

  if (topic !== "INVENTORY_LEVELS_UPDATE") {
    return new Response();
  }

  const available = Number(payload.available ?? 0);
  const inventoryItemId = String(payload.inventory_item_id ?? "");

  await handleInventoryRestock(
    session.shop,
    inventoryItemId,
    available,
    admin,
  );

  return new Response();
};
