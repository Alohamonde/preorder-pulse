-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" DATETIME,
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,
    "refreshToken" TEXT,
    "refreshTokenExpires" DATETIME
);

-- CreateTable
CREATE TABLE "ShopSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "autoPreorderOnZero" BOOLEAN NOT NULL DEFAULT false,
    "notifyButtonText" TEXT NOT NULL DEFAULT '到货通知我',
    "preorderButtonText" TEXT NOT NULL DEFAULT '立即预售',
    "notifySuccessText" TEXT NOT NULL DEFAULT '已加入等候名单，补货后第一时间通知您',
    "barBgColor" TEXT NOT NULL DEFAULT '#f3f4f6',
    "barTextColor" TEXT NOT NULL DEFAULT '#111827',
    "barAccentColor" TEXT NOT NULL DEFAULT '#2563eb',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PreorderRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productTitle" TEXT NOT NULL DEFAULT '',
    "variantId" TEXT NOT NULL,
    "variantTitle" TEXT NOT NULL DEFAULT '',
    "sellingPlanGroupId" TEXT NOT NULL DEFAULT '',
    "depositPercent" REAL NOT NULL DEFAULT 100,
    "fulfillmentDate" TEXT NOT NULL DEFAULT '',
    "triggerMode" TEXT NOT NULL DEFAULT 'manual',
    "inventoryPolicy" TEXT NOT NULL DEFAULT 'ON_SALE',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WaitlistSubscriber" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "productTitle" TEXT NOT NULL DEFAULT '',
    "variantTitle" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notifiedAt" DATETIME,
    "convertedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "NotificationJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sentAt" DATETIME,
    "errorMessage" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PreorderEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "ruleId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopSettings_shop_key" ON "ShopSettings"("shop");

-- CreateIndex
CREATE INDEX "PreorderRule_shop_idx" ON "PreorderRule"("shop");

-- CreateIndex
CREATE INDEX "PreorderRule_shop_variantId_idx" ON "PreorderRule"("shop", "variantId");

-- CreateIndex
CREATE INDEX "WaitlistSubscriber_shop_status_idx" ON "WaitlistSubscriber"("shop", "status");

-- CreateIndex
CREATE INDEX "WaitlistSubscriber_shop_variantId_idx" ON "WaitlistSubscriber"("shop", "variantId");

-- CreateIndex
CREATE UNIQUE INDEX "WaitlistSubscriber_shop_variantId_email_key" ON "WaitlistSubscriber"("shop", "variantId", "email");

-- CreateIndex
CREATE INDEX "NotificationJob_shop_status_idx" ON "NotificationJob"("shop", "status");

-- CreateIndex
CREATE INDEX "PreorderEvent_shop_eventType_idx" ON "PreorderEvent"("shop", "eventType");
