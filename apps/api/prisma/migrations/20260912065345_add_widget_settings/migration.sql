-- CreateEnum
CREATE TYPE "WidgetLauncherStyle" AS ENUM ('BUBBLE', 'FULLSCREEN');

-- CreateTable
CREATE TABLE "widget_settings" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "launcherStyle" "WidgetLauncherStyle" NOT NULL DEFAULT 'BUBBLE',
    "greetingText" TEXT NOT NULL DEFAULT 'How can we help you today?',
    "inputPlaceholder" TEXT NOT NULL DEFAULT 'Ask a question...',
    "brandColor" TEXT NOT NULL DEFAULT '#3457d5',
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "widget_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "widget_settings_websiteId_key" ON "widget_settings"("websiteId");

-- AddForeignKey
ALTER TABLE "widget_settings" ADD CONSTRAINT "widget_settings_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
