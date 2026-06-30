import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  Button,
  DataTable,
  Badge,
  InlineStack,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import {
  deleteWaitlistSubscriber,
  getWaitlistSubscribers,
} from "../models/waitlist.server";
import { getRecentNotificationJobs } from "../models/notifications.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const [subscribers, jobs] = await Promise.all([
    getWaitlistSubscribers(session.shop),
    getRecentNotificationJobs(session.shop),
  ]);
  return json({ subscribers, jobs });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent"));

  if (intent === "delete") {
    await deleteWaitlistSubscriber(
      session.shop,
      String(formData.get("id")),
    );
    return json({ ok: true });
  }

  if (intent === "export") {
    const subscribers = await getWaitlistSubscribers(session.shop);
    const csv = [
      "email,product,variant,status,createdAt",
      ...subscribers.map(
        (s) =>
          `${s.email},"${s.productTitle}","${s.variantTitle}",${s.status},${s.createdAt.toISOString()}`,
      ),
    ].join("\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="waitlist.csv"',
      },
    });
  }

  return json({ error: "Unknown intent" }, { status: 400 });
};

export default function WaitlistPage() {
  const { subscribers, jobs } = useLoaderData<typeof loader>();
  const submit = useSubmit();

  const statusTone = (status: string) => {
    if (status === "pending") return "attention" as const;
    if (status === "notified") return "info" as const;
    if (status === "converted") return "success" as const;
    return undefined;
  };

  const rows = subscribers.map((sub) => [
    sub.email,
    sub.productTitle,
    sub.variantTitle,
    <Badge key={sub.id} tone={statusTone(sub.status)}>
      {sub.status}
    </Badge>,
    new Date(sub.createdAt).toLocaleDateString("zh-CN"),
    <Button
      key={`del-${sub.id}`}
      size="slim"
      tone="critical"
      onClick={() => {
        const fd = new FormData();
        fd.set("intent", "delete");
        fd.set("id", sub.id);
        submit(fd, { method: "post" });
      }}
    >
      删除
    </Button>,
  ]);

  const jobRows = jobs.map((job) => [
    job.email,
    job.variantId.split("/").pop() ?? job.variantId,
    <Badge key={job.id} tone={job.status === "sent" ? "success" : undefined}>
      {job.status}
    </Badge>,
    job.sentAt ? new Date(job.sentAt).toLocaleString("zh-CN") : "—",
  ]);

  return (
    <Page title="等候名单" subtitle="到货通知订阅者与发送记录">
      <TitleBar title="等候名单" />
      <Layout>
        <Layout.Section>
          <InlineStack align="end">
            <Button
              onClick={() => {
                const fd = new FormData();
                fd.set("intent", "export");
                submit(fd, { method: "post" });
              }}
            >
              导出 CSV
            </Button>
          </InlineStack>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">
                订阅者 ({subscribers.length})
              </Text>
              {subscribers.length ? (
                <DataTable
                  columnContentTypes={[
                    "text",
                    "text",
                    "text",
                    "text",
                    "text",
                    "text",
                  ]}
                  headings={[
                    "邮箱",
                    "商品",
                    "变体",
                    "状态",
                    "订阅日期",
                    "操作",
                  ]}
                  rows={rows}
                />
              ) : (
                <Text as="p" tone="subdued">
                  暂无订阅者。在商品页启用「到货通知我」区块后，买家可提交邮箱。
                </Text>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h2" variant="headingMd">
                最近通知记录 ({jobs.length})
              </Text>
              {jobs.length ? (
                <DataTable
                  columnContentTypes={["text", "text", "text", "text"]}
                  headings={["邮箱", "变体 ID", "状态", "发送时间"]}
                  rows={jobRows}
                />
              ) : (
                <Text as="p" tone="subdued">
                  库存恢复后将自动创建通知记录。
                </Text>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
