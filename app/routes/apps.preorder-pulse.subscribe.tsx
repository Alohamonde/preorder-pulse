import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { subscribeToWaitlist } from "../models/waitlist.server";
import { recordPreorderEvent } from "../models/metafield-sync.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);
  const shop = session?.shop;

  if (!shop) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const subscriber = await subscribeToWaitlist(shop, {
      email: String(body.email ?? ""),
      productId: String(body.productId ?? ""),
      variantId: String(body.variantId ?? ""),
      productTitle: String(body.productTitle ?? ""),
      variantTitle: String(body.variantTitle ?? ""),
    });

    await recordPreorderEvent(shop, "waitlist_subscribe", body.variantId);

    return json({
      ok: true,
      id: subscriber.id,
    });
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "订阅失败" },
      { status: 400 },
    );
  }
};
