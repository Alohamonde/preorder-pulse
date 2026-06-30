export const METAFIELD_NAMESPACE = "$app:preorder_pulse";
export const METAFIELD_KEY = "config";

export type TriggerMode = "manual" | "auto";
export type InventoryPolicy = "ON_SALE" | "ON_FULFILLMENT";

export function parseJsonArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}
