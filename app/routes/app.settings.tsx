import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useActionData, useLoaderData, useSubmit } from "@remix-run/react";
import { useState } from "react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  TextField,
  Checkbox,
  Button,
  Banner,
  InlineStack,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import {
  getOrCreateShopSettings,
  syncConfigToMetafield,
  updateShopSettings,
} from "../models/metafield-sync.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const settings = await getOrCreateShopSettings(session.shop);
  return json({ settings });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();

  await updateShopSettings(session.shop, {
    enabled: formData.get("enabled") === "on",
    autoPreorderOnZero: formData.get("autoPreorderOnZero") === "on",
    notifyButtonText: String(formData.get("notifyButtonText") ?? ""),
    preorderButtonText: String(formData.get("preorderButtonText") ?? ""),
    notifySuccessText: String(formData.get("notifySuccessText") ?? ""),
    barBgColor: String(formData.get("barBgColor") ?? "#f3f4f6"),
    barTextColor: String(formData.get("barTextColor") ?? "#111827"),
    barAccentColor: String(formData.get("barAccentColor") ?? "#2563eb"),
  });

  await syncConfigToMetafield(admin, session.shop);
  return json({ ok: true });
};

export default function SettingsPage() {
  const { settings } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();

  const [enabled, setEnabled] = useState(settings.enabled);
  const [autoPreorderOnZero, setAutoPreorderOnZero] = useState(
    settings.autoPreorderOnZero,
  );
  const [preorderButtonText, setPreorderButtonText] = useState(
    settings.preorderButtonText,
  );
  const [notifyButtonText, setNotifyButtonText] = useState(
    settings.notifyButtonText,
  );
  const [notifySuccessText, setNotifySuccessText] = useState(
    settings.notifySuccessText,
  );
  const [barBgColor, setBarBgColor] = useState(settings.barBgColor);
  const [barTextColor, setBarTextColor] = useState(settings.barTextColor);
  const [barAccentColor, setBarAccentColor] = useState(settings.barAccentColor);

  return (
    <Page title="设置" subtitle="全局开关与店面文案">
      <TitleBar title="设置" />
      <Layout>
        <Layout.Section>
          {actionData?.ok ? (
            <Banner tone="success">
              <p>设置已保存并同步到店面。</p>
            </Banner>
          ) : null}

          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                全局设置
              </Text>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData();
                  if (enabled) fd.set("enabled", "on");
                  if (autoPreorderOnZero) fd.set("autoPreorderOnZero", "on");
                  fd.set("preorderButtonText", preorderButtonText);
                  fd.set("notifyButtonText", notifyButtonText);
                  fd.set("notifySuccessText", notifySuccessText);
                  fd.set("barBgColor", barBgColor);
                  fd.set("barTextColor", barTextColor);
                  fd.set("barAccentColor", barAccentColor);
                  submit(fd, { method: "post" });
                }}
              >
                <BlockStack gap="400">
                  <Checkbox
                    label="启用 Preorder Pulse"
                    name="enabled"
                    checked={enabled}
                    onChange={setEnabled}
                    helpText="取消勾选后店面不展示预售与通知功能"
                  />
                  <Checkbox
                    label="库存为 0 时自动创建预售规则"
                    name="autoPreorderOnZero"
                    checked={autoPreorderOnZero}
                    onChange={setAutoPreorderOnZero}
                    helpText="需配合 products/update 与 inventory webhook"
                  />

                  <TextField
                    label="预售按钮文案"
                    name="preorderButtonText"
                    value={preorderButtonText}
                    onChange={setPreorderButtonText}
                    autoComplete="off"
                  />
                  <TextField
                    label="到货通知按钮文案"
                    name="notifyButtonText"
                    value={notifyButtonText}
                    onChange={setNotifyButtonText}
                    autoComplete="off"
                  />
                  <TextField
                    label="订阅成功提示"
                    name="notifySuccessText"
                    value={notifySuccessText}
                    onChange={setNotifySuccessText}
                    autoComplete="off"
                  />

                  <InlineStack gap="300">
                    <TextField
                      label="背景色"
                      name="barBgColor"
                      value={barBgColor}
                      onChange={setBarBgColor}
                      autoComplete="off"
                    />
                    <TextField
                      label="文字色"
                      name="barTextColor"
                      value={barTextColor}
                      onChange={setBarTextColor}
                      autoComplete="off"
                    />
                    <TextField
                      label="强调色"
                      name="barAccentColor"
                      value={barAccentColor}
                      onChange={setBarAccentColor}
                      autoComplete="off"
                    />
                  </InlineStack>

                  <Button variant="primary" submit>
                    保存设置
                  </Button>
                </BlockStack>
              </form>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
