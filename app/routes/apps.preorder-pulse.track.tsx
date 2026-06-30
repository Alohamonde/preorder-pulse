import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { recordPreorderEvent } from "../models/metafield-sync.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);
  const shop = session?.shop;

  if (!shop) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const eventType = url.searchParams.get("event") ?? "";
  const ruleId = url.searchParams.get("ruleId") ?? undefined;

  const allowed = [
    "preorder_impression",
    "preorder_click",
    "notify_impression",
    "notify_submit",
    "waitlist_subscribe",
  ];

  if (!allowed.includes(eventType)) {
    return json({ error: "Invalid event" }, { status: 400 });
  }

  await recordPreorderEvent(shop, eventType, ruleId);
  return json({ ok: true });
};
