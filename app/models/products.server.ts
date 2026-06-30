import type { AdminApiContext } from "@shopify/shopify-app-remix/server";

export type SearchProduct = {
  id: string;
  title: string;
  imageUrl: string;
  variantId: string;
  variantTitle: string;
  price: string;
  inventoryQuantity: number;
  available: boolean;
};

export async function searchProducts(admin: AdminApiContext, query: string) {
  const response = await admin.graphql(
    `#graphql
      query PreorderPulseSearchProducts($query: String!) {
        products(first: 10, query: $query) {
          edges {
            node {
              id
              title
              featuredImage {
                url
              }
              variants(first: 5) {
                edges {
                  node {
                    id
                    title
                    price
                    inventoryQuantity
                    availableForSale
                  }
                }
              }
            }
          }
        }
      }
    `,
    { variables: { query } },
  );

  const json = await response.json();
  const results: SearchProduct[] = [];

  for (const edge of json.data?.products?.edges ?? []) {
    const node = edge.node;
    for (const variantEdge of node.variants?.edges ?? []) {
      const variant = variantEdge.node;
      results.push({
        id: node.id,
        title: node.title,
        imageUrl: node.featuredImage?.url ?? "",
        variantId: variant.id,
        variantTitle: variant.title === "Default Title" ? node.title : variant.title,
        price: variant.price ?? "0.00",
        inventoryQuantity: variant.inventoryQuantity ?? 0,
        available: variant.availableForSale ?? false,
      });
    }
  }

  return results;
}

export async function getVariantInventory(
  admin: AdminApiContext,
  variantId: string,
): Promise<number | null> {
  const response = await admin.graphql(
    `#graphql
      query PreorderPulseVariantInventory($id: ID!) {
        productVariant(id: $id) {
          id
          inventoryQuantity
          availableForSale
        }
      }
    `,
    { variables: { id: variantId } },
  );

  const json = await response.json();
  const variant = json.data?.productVariant;
  if (!variant) return null;
  return variant.inventoryQuantity ?? 0;
}
