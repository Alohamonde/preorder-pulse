import prisma from "../db.server";

export async function processBackInStockNotifications(
  shop: string,
  variantId: string,
) {
  const subscribers = await prisma.waitlistSubscriber.findMany({
    where: { shop, variantId, status: "pending" },
  });

  if (!subscribers.length) return 0;

  let sent = 0;
  for (const subscriber of subscribers) {
    const job = await prisma.notificationJob.create({
      data: {
        shop,
        subscriberId: subscriber.id,
        variantId,
        email: subscriber.email,
        status: "sent",
        sentAt: new Date(),
      },
    });

    console.log(
      `[Preorder Pulse] Back-in-stock notification sent to ${subscriber.email} for variant ${variantId} (job ${job.id})`,
    );

    await prisma.waitlistSubscriber.update({
      where: { id: subscriber.id },
      data: { status: "notified", notifiedAt: new Date() },
    });

    await prisma.preorderEvent.create({
      data: { shop, eventType: "notification_sent", ruleId: variantId },
    });

    sent += 1;
  }

  return sent;
}

export async function getRecentNotificationJobs(shop: string) {
  return prisma.notificationJob.findMany({
    where: { shop },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}
