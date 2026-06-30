import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useActionData, useLoaderData, useSubmit } from "@remix-run/react";
import { useCallback, useEffect, useState } from "react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  Button,
  TextField,
  Select,
  InlineStack,
  Banner,
  DataTable,
  Badge,
  Autocomplete,
  Icon,
} from "@shopify/polaris";
import { SearchIcon } from "@shopify/polaris-icons";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { searchProducts, type SearchProduct } from "../models/products.server";
import {
  createPreorderRule,
  deletePreorderRule,
  getPreorderRules,
  togglePreorderRule,
} from "../models/preorders.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const rules = await getPreorderRules(session.shop);
  return json({ rules });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent"));

  try {
    if (intent === "search") {
      const query = String(formData.get("query") ?? "");
      const products = await searchProducts(admin, query);
      return json({ products, error: null, ok: false });
    }

    if (intent === "create") {
      await createPreorderRule(admin, session.shop, {
        productId: String(formData.get("productId")),
        productTitle: String(formData.get("productTitle")),
        variantId: String(formData.get("variantId")),
        variantTitle: String(formData.get("variantTitle")),
        depositPercent: parseFloat(String(formData.get("depositPercent") ?? "100")),
        fulfillmentDate: String(formData.get("fulfillmentDate") ?? ""),
        triggerMode: String(formData.get("triggerMode") ?? "manual") as "manual" | "auto",
        inventoryPolicy: String(
          formData.get("inventoryPolicy") ?? "ON_SALE",
        ) as "ON_SALE" | "ON_FULFILLMENT",
      });
      return json({ ok: true, error: null });
    }

    if (intent === "delete") {
      await deletePreorderRule(admin, session.shop, String(formData.get("id")));
      return json({ ok: true, error: null });
    }

    if (intent === "toggle") {
      await togglePreorderRule(
        admin,
        session.shop,
        String(formData.get("id")),
        formData.get("enabled") === "true",
      );
      return json({ ok: true, error: null });
    }

    return json({ error: "Unknown intent", ok: false }, { status: 400 });
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : "操作失败",
        ok: false,
      },
      { status: 400 },
    );
  }
};

export default function PreordersPage() {
  const { rules } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();

  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<SearchProduct[]>([]);
  const [selected, setSelected] = useState<{
    productId: string;
    productTitle: string;
    variantId: string;
    variantTitle: string;
  } | null>(null);
  const [depositPercent, setDepositPercent] = useState("100");
  const [fulfillmentDate, setFulfillmentDate] = useState("");
  const [triggerMode, setTriggerMode] = useState("manual");
  const [inventoryPolicy, setInventoryPolicy] = useState("ON_SALE");

  useEffect(() => {
    if (actionData && "products" in actionData && actionData.products) {
      setProducts(actionData.products);
    }
  }, [actionData]);

  const handleSearch = useCallback(
    (value: string) => {
      setQuery(value);
      if (value.length < 2) return;
      const fd = new FormData();
      fd.set("intent", "search");
      fd.set("query", value);
      submit(fd, { method: "post" });
    },
    [submit],
  );

  const productOptions = products.map((p) => ({
    value: `${p.id}|${p.variantId}`,
    label: `${p.title} — ${p.variantTitle} (库存 ${p.inventoryQuantity})`,
  }));

  const rows = rules.map((rule) => [
    rule.productTitle,
    rule.variantTitle,
    `${rule.depositPercent}%`,
    rule.fulfillmentDate || "尽快发货",
    <Badge key={rule.id} tone={rule.triggerMode === "auto" ? "info" : "attention"}>
      {rule.triggerMode === "auto" ? "自动" : "手动"}
    </Badge>,
    <Badge key={`${rule.id}-status`} tone={rule.enabled ? "success" : undefined}>
      {rule.enabled ? "启用" : "禁用"}
    </Badge>,
    <InlineStack gap="200" key={`${rule.id}-actions`}>
      <Button
        size="slim"
        onClick={() => {
          const fd = new FormData();
          fd.set("intent", "toggle");
          fd.set("id", rule.id);
          fd.set("enabled", String(!rule.enabled));
          submit(fd, { method: "post" });
        }}
      >
        {rule.enabled ? "禁用" : "启用"}
      </Button>
      <Button
        size="slim"
        tone="critical"
        onClick={() => {
          const fd = new FormData();
          fd.set("intent", "delete");
          fd.set("id", rule.id);
          submit(fd, { method: "post" });
        }}
      >
        删除
      </Button>
    </InlineStack>,
  ]);

  return (
    <Page title="预售规则" subtitle="通过 Selling Plans API 管理预售方案">
      <TitleBar title="预售规则" />
      <Layout>
        <Layout.Section>
          {actionData?.error ? (
            <Banner tone="critical">
              <p>{actionData.error}</p>
            </Banner>
          ) : null}
          {actionData?.ok ? (
            <Banner tone="success">
              <p>操作成功。</p>
            </Banner>
          ) : null}

          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                创建预售规则
              </Text>
              <Autocomplete
                options={productOptions}
                selected={selected ? [`${selected.productId}|${selected.variantId}`] : []}
                onSelect={(selectedValues) => {
                  const [productId, variantId] = selectedValues[0].split("|");
                  const product = products.find(
                    (p) => p.id === productId && p.variantId === variantId,
                  );
                  if (product) {
                    setSelected({
                      productId: product.id,
                      productTitle: product.title,
                      variantId: product.variantId,
                      variantTitle: product.variantTitle,
                    });
                  }
                }}
                textField={
                  <Autocomplete.TextField
                    label="搜索商品/变体"
                    value={query}
                    onChange={handleSearch}
                    prefix={<Icon source={SearchIcon} />}
                    autoComplete="off"
                    placeholder="输入商品名称..."
                  />
                }
              />
              <InlineStack gap="300">
                <div style={{ flex: 1 }}>
                  <TextField
                    label="定金比例 (%)"
                    type="number"
                    value={depositPercent}
                    onChange={setDepositPercent}
                    autoComplete="off"
                    helpText="100 = 全款预售"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <TextField
                    label="预计发货日"
                    type="date"
                    value={fulfillmentDate}
                    onChange={setFulfillmentDate}
                    autoComplete="off"
                  />
                </div>
              </InlineStack>
              <InlineStack gap="300">
                <div style={{ flex: 1 }}>
                  <Select
                    label="触发模式"
                    options={[
                      { label: "手动标记", value: "manual" },
                      { label: "库存为 0 自动", value: "auto" },
                    ]}
                    value={triggerMode}
                    onChange={setTriggerMode}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <Select
                    label="库存策略"
                    options={[
                      { label: "下单时扣库存 (ON_SALE)", value: "ON_SALE" },
                      {
                        label: "发货时扣库存 (ON_FULFILLMENT)",
                        value: "ON_FULFILLMENT",
                      },
                    ]}
                    value={inventoryPolicy}
                    onChange={setInventoryPolicy}
                  />
                </div>
              </InlineStack>
              <Button
                variant="primary"
                disabled={!selected}
                onClick={() => {
                  if (!selected) return;
                  const fd = new FormData();
                  fd.set("intent", "create");
                  fd.set("productId", selected.productId);
                  fd.set("productTitle", selected.productTitle);
                  fd.set("variantId", selected.variantId);
                  fd.set("variantTitle", selected.variantTitle);
                  fd.set("depositPercent", depositPercent);
                  fd.set("fulfillmentDate", fulfillmentDate);
                  fd.set("triggerMode", triggerMode);
                  fd.set("inventoryPolicy", inventoryPolicy);
                  submit(fd, { method: "post" });
                }}
              >
                创建预售规则
              </Button>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">
                已有规则 ({rules.length})
              </Text>
              {rules.length ? (
                <DataTable
                  columnContentTypes={[
                    "text",
                    "text",
                    "text",
                    "text",
                    "text",
                    "text",
                    "text",
                  ]}
                  headings={[
                    "商品",
                    "变体",
                    "定金",
                    "发货日",
                    "模式",
                    "状态",
                    "操作",
                  ]}
                  rows={rows}
                />
              ) : (
                <Text as="p" tone="subdued">
                  暂无预售规则，请搜索商品并创建。
                </Text>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
