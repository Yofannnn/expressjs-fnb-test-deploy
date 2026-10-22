-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER', 'CASHIER', 'KITCHEN', 'BAR', 'MEMBER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'BANNED');

-- CreateEnum
CREATE TYPE "UserActivityType" AS ENUM ('REGISTERED', 'LOGGED_IN', 'LOGGED_OUT', 'PASSWORD_RESET', 'PASSWORD_CHANGED', 'EMAIL_CHANGED', 'VERIFICATION_EMAIL_RESENT', 'EMAIL_VERIFIED', 'PROFILE_UPDATED', 'ACCOUNT_LOCKED', 'ACCOUNT_UNLOCKED', 'ROLE_CHANGED', 'ACCOUNT_SUSPENDED', 'ACCOUNT_BANNED', 'ACCOUNT_DEACTIVATED', 'ACCOUNT_ACTIVATED', 'SESSION_REFRESHED');

-- CreateEnum
CREATE TYPE "ApplicationTokenType" AS ENUM ('VERIFICATION_EMAIL', 'PASSWORD_RESET', 'GUEST_ORDER_MANAGEMENT');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('FOOD', 'DRINK', 'PACKAGED');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('UPCOMING', 'AVAILABLE', 'UNAVAILABLE', 'OUT_OF_STOCK', 'DISCONTINUED');

-- CreateEnum
CREATE TYPE "ProductCategoryStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('RESERVATION', 'ONLINE', 'DINEIN');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('BOOKED', 'SEATED', 'NO_SHOW', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DeliveryType" AS ENUM ('DELIVERY', 'PICKUP');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PAID', 'PARTIALLY_PAID', 'REFUNDED', 'FAILED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'QRIS', 'E_WALLET', 'BANK_TRANSFER', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentTransactionType" AS ENUM ('CHARGE', 'REFUND');

-- CreateEnum
CREATE TYPE "PaymentTransactionStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "email" TEXT NOT NULL,
    "email_changed_at" TIMESTAMP(3),
    "email_verified_at" TIMESTAMP(3),
    "hashed_password" TEXT NOT NULL,
    "password_changed_at" TIMESTAMP(3),
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "suspend_reason" TEXT,
    "suspended_at" TIMESTAMP(3),
    "banned_reason" TEXT,
    "banned_at" TIMESTAMP(3),
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "account_locked_until" TIMESTAMP(3),
    "last_logout_at" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "last_failed_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_activities" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" "UserActivityType" NOT NULL,
    "description" TEXT,
    "user_agent" TEXT,
    "ip_address" TEXT,
    "metadata" JSONB,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "token_fingerprint" TEXT NOT NULL,
    "token_family" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "revoke_reason" TEXT,
    "user_agent" TEXT,
    "ip_address" TEXT,
    "device_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_tokens" (
    "id" TEXT NOT NULL,
    "identifier" TEXT,
    "type" "ApplicationTokenType" NOT NULL,
    "token_fingerprint" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "user_id" TEXT,
    "order_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "application_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dead_letter_events" (
    "id" TEXT NOT NULL,
    "processing_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 5,
    "event_type" TEXT NOT NULL,
    "event_data" JSONB NOT NULL,
    "handler_name" TEXT NOT NULL,
    "error_message" TEXT NOT NULL,
    "error_stack" TEXT,
    "attempts" INTEGER NOT NULL,
    "failed_at" TIMESTAMP(3) NOT NULL,
    "can_retry" BOOLEAN NOT NULL DEFAULT true,
    "retried_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aggregate_id" TEXT,
    "correlation_id" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "dead_letter_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "type" "ProductType" NOT NULL,
    "ingredients" TEXT,
    "preparation_time_in_minutes" INTEGER,
    "stock_quantity" INTEGER NOT NULL DEFAULT 0,
    "status" "ProductStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "status" "ProductCategoryStatus" NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_images" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "alt_text" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "type" "OrderType" NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "member_id" TEXT,
    "guest_name" TEXT,
    "guest_email" TEXT,
    "subtotal" INTEGER NOT NULL,
    "tax" INTEGER NOT NULL,
    "service_charge" INTEGER NOT NULL,
    "delivery_fee" INTEGER NOT NULL DEFAULT 0,
    "discount" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "payment_method" "PaymentMethod",
    "paid_at" TIMESTAMP(3),
    "dine_in_table_id" TEXT,
    "dine_in_table_number" TEXT,
    "dine_in_guest_count" INTEGER,
    "dine_in_cashier_session_id" TEXT,
    "online_delivery_type" "DeliveryType",
    "online_scheduled_at" TIMESTAMP(3),
    "reservation_table_id" TEXT,
    "reservation_reserved_at" TIMESTAMP(3),
    "reservation_party_size" INTEGER,
    "reservation_duration_minutes" INTEGER,
    "reservation_status" "ReservationStatus",
    "reservation_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "online_delivery_locations" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "online_delivery_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "price_snapshot" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "type" "PaymentTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "method" "PaymentMethod",
    "status" "PaymentTransactionStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL,
    "provider_reference_id" TEXT,
    "parent_transaction_id" TEXT,
    "failure_reason" TEXT,
    "metadata" JSONB,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_fingerprint_key" ON "sessions"("token_fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "application_tokens_token_fingerprint_key" ON "application_tokens"("token_fingerprint");

-- CreateIndex
CREATE INDEX "application_tokens_user_id_type_idx" ON "application_tokens"("user_id", "type");

-- CreateIndex
CREATE INDEX "application_tokens_identifier_type_idx" ON "application_tokens"("identifier", "type");

-- CreateIndex
CREATE INDEX "application_tokens_token_fingerprint_idx" ON "application_tokens"("token_fingerprint");

-- CreateIndex
CREATE INDEX "application_tokens_expires_used_at_idx" ON "application_tokens"("expires", "used_at");

-- CreateIndex
CREATE UNIQUE INDEX "application_tokens_identifier_token_fingerprint_key" ON "application_tokens"("identifier", "token_fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "dead_letter_events_processing_id_key" ON "dead_letter_events"("processing_id");

-- CreateIndex
CREATE INDEX "dead_letter_events_event_type_can_retry_idx" ON "dead_letter_events"("event_type", "can_retry");

-- CreateIndex
CREATE INDEX "dead_letter_events_failed_at_idx" ON "dead_letter_events"("failed_at");

-- CreateIndex
CREATE INDEX "dead_letter_events_can_retry_failed_at_idx" ON "dead_letter_events"("can_retry", "failed_at");

-- CreateIndex
CREATE INDEX "dead_letter_events_event_id_idx" ON "dead_letter_events"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "dead_letter_events_event_id_handler_name_can_retry_key" ON "dead_letter_events"("event_id", "handler_name", "can_retry");

-- CreateIndex
CREATE INDEX "orders_type_idx" ON "orders"("type");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_member_id_idx" ON "orders"("member_id");

-- CreateIndex
CREATE INDEX "orders_guest_email_idx" ON "orders"("guest_email");

-- CreateIndex
CREATE INDEX "orders_reservation_reserved_at_idx" ON "orders"("reservation_reserved_at");

-- CreateIndex
CREATE INDEX "orders_created_at_idx" ON "orders"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "online_delivery_locations_order_id_key" ON "online_delivery_locations"("order_id");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "order_items_product_id_idx" ON "order_items"("product_id");

-- CreateIndex
CREATE INDEX "payment_transactions_order_id_idx" ON "payment_transactions"("order_id");

-- CreateIndex
CREATE INDEX "payment_transactions_provider_reference_id_idx" ON "payment_transactions"("provider_reference_id");

-- CreateIndex
CREATE INDEX "payment_transactions_status_idx" ON "payment_transactions"("status");

-- CreateIndex
CREATE INDEX "payment_transactions_parent_transaction_id_idx" ON "payment_transactions"("parent_transaction_id");

-- AddForeignKey
ALTER TABLE "user_activities" ADD CONSTRAINT "user_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_tokens" ADD CONSTRAINT "application_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "online_delivery_locations" ADD CONSTRAINT "online_delivery_locations_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_parent_transaction_id_fkey" FOREIGN KEY ("parent_transaction_id") REFERENCES "payment_transactions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
