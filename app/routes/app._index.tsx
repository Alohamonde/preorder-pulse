import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  BlockStack,
  Button,
  Badge,
  InlineGrid,
  Banner,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import {
  getPreorderStats,
  syncConfigToMetafield,
} from "../models/metafield-sync.server";
import { getPreorderRules } from "../models/preorders.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  const [stats, rules] = await Promise.all([
    getPreorderStats(shop),
    getPreorderRules(shop),
  ]);

  await syncConfigToMetafield(admin, shop);

  return json({ stats, totalRules: rules.length });
};

export default function Index() {
  const { stats, totalRules } = useLoaderData<typeof loader>();

  return (
    <Page
      title="Preorder Pulse"
      subtitle="预售管理 + 到货通知：Selling Plans + inventory webhook"
    >
      <TitleBar title="Preorder Pulse" />
      <BlockStack gap="500">
        {!stats.enabled ? (
          <Banner tone="warning">
            <p>应用当前已禁用，店面不会展示预售或到货通知功能。</p>
          </Banner>
        ) : null}

        <Layout>
          <Layout.Section>
            <InlineGrid columns={{ xs: 1, sm: 2, md: 4 }} gap="400">
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    活跃预售规则
                  </Text>
                  <Text as="p" variant="heading2xl">
                    {stats.activeRules}
                  </Text>
                  <Text as="p" tone="subdued">
                    共 {totalRules} 条规则
                  </Text>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    待通知等候名单
                  </Text>
                  <Text as="p" variant="heading2xl">
                    {stats.pendingWaitlist}
                  </Text>
                  <Text as="p" tone="subdued">
                    补货后自动发送
                  </Text>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    本周通知发送
                  </Text>
                  <Text as="p" variant="heading2xl">
                    {stats.notifiedThisWeek}
                  </Text>
                  <Text as="p" tone="subdued">
                    开发模式记录于控制台
                  </Text>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    预售订单
                  </Text>
                  <Text as="p" variant="heading2xl">
                    {stats.preorderOrders}
                  </Text>
                  <Text as="p" tone="subdued">
                    转化率 {stats.conversionRate}%
                  </Text>
                </BlockStack>
              </Card>
            </InlineGrid>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  模块概览
                </Text>
                <InlineGrid columns={{ xs: 1, sm: 3 }} gap="400">
                  <BlockStack gap="200">
                    <Text as="h3" variant="headingSm">
                      预售 Selling Plans
                    </Text>
                    <Badge tone="success">PRE_ORDER</Badge>
                    <Text as="p">
                      通过 Selling Plans API 创建预售方案，支持定金比例与预计发货日。
                    </Text>
                  </BlockStack>
                  <BlockStack gap="200">
                    <Text as="h3" variant="headingSm">
                      到货通知
                    </Text>
                    <Badge tone="info">inventory webhook</Badge>
                    <Text as="p">
                      库存恢复时自动通知等候名单订阅者，开发阶段记录于控制台。
                    </Text>
                  </BlockStack>
                  <BlockStack gap="200">
                    <Text as="h3" variant="headingSm">
                      店面扩展
                    </Text>
                    <Badge>Theme Extension</Badge>
                    <Text as="p">
                      商品页展示预售按钮与「到货通知我」表单，监听变体切换。
                    </Text>
                  </BlockStack>
                </InlineGrid>
                <InlineGrid columns={{ xs: 1, sm: 2 }} gap="300">
                  <Button url="/app/preorders" variant="primary">
                    管理预售规则
                  </Button>
                  <Button url="/app/waitlist">查看等候名单</Button>
                </InlineGrid>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
