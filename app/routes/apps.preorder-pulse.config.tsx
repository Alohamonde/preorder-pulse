import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { buildStorefrontConfig } from "../models/metafield-sync.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);
  const shop = session?.shop;

  if (!shop) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = await buildStorefrontConfig(shop);
  return json(config);
};
