-- ================================================================
--  BOTIFY SaaS — Supabase Schema (v2 — Fixed & Complete)
--  วิธีใช้: คัดลอกไปวางใน Supabase → SQL Editor แล้วกด Run
--  อัปเดต: เพิ่ม chat_logs, แก้ชื่อ table เป็น shops (ตรงกับโค้ด),
--           เพิ่ม columns ที่หายไป
-- ================================================================

-- ── Shops (แต่ละร้านค้า/workspace) ────────────────────────────
--  ใช้ชื่อ "shops" ให้ตรงกับโค้ด server ทั้งหมด
CREATE TABLE IF NOT EXISTS shops (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  slug                TEXT UNIQUE,                               -- URL slug เช่น "my-shop"
  description         TEXT,
  plan                TEXT NOT NULL DEFAULT 'trial',            -- trial | starter | pro | agency | byok | suspended
  package_name        TEXT DEFAULT 'free',                      -- alias สำหรับ plan
  status              TEXT NOT NULL DEFAULT 'active',           -- active | suspended | deleted
  trial_expires_at    TIMESTAMPTZ DEFAULT (now() + interval '14 days'),
  plan_expires_at     TIMESTAMPTZ,
  msg_used            INT NOT NULL DEFAULT 0,
  token_used          INT NOT NULL DEFAULT 0,
  billing_reset_at    TIMESTAMPTZ DEFAULT (date_trunc('month', now()) + interval '1 month'),
  -- Bot config (รวม CLIENTS จาก server.js ไว้ในนี้)
  line_token          TEXT,
  line_bot_id         TEXT,                                     -- LINE Bot User ID (destination)
  line_bot_user_id    TEXT,                                     -- alias
  fb_token            TEXT,
  fb_page_id          TEXT,
  sheet_id            TEXT,
  owner_line_id       TEXT,
  -- AI Provider config
  ai_provider         TEXT DEFAULT 'claude',
  ai_model            TEXT,                                     -- custom model name
  ai_key              TEXT,                                     -- BYOK: user's own API key (encrypt in app)
  system_prompt       TEXT,
  personality         TEXT DEFAULT 'หญิง-สุภาพ',
  -- BYOK: Bring Your Own Key
  custom_ai_key       TEXT,
  custom_ai_provider  TEXT DEFAULT 'claude',
  custom_ai_model     TEXT,
  -- Notification settings
  notify_new_order    BOOLEAN DEFAULT true,
  notify_low_stock    BOOLEAN DEFAULT true,
  notify_daily_summary BOOLEAN DEFAULT true,
  notify_new_chat     BOOLEAN DEFAULT false,
  -- Payment gateway
  stripe_customer_id  TEXT,
  -- Storefront
  line_oa_url         TEXT,
  phone               TEXT,
  -- Timestamps
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- ── Users (แอดมินของแต่ละ Shop) ────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID REFERENCES shops(id) ON DELETE CASCADE,
  email           TEXT UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL DEFAULT 'supabase_auth',
  name            TEXT,
  role            TEXT NOT NULL DEFAULT 'admin',                -- owner | admin | superadmin
  -- Password reset (for /api/auth/forgot-password)
  reset_token     TEXT,
  reset_expires_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ── Payments (ประวัติการชำระเงิน Subscription) ─────────────────
CREATE TABLE IF NOT EXISTS payments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        UUID REFERENCES shops(id) ON DELETE CASCADE,
  shop_id             UUID REFERENCES shops(id) ON DELETE CASCADE, -- alias
  amount              INT NOT NULL,                               -- หน่วย: สตางค์ (satang)
  currency            TEXT DEFAULT 'THB',
  plan                TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending',           -- pending | paid | failed
  provider            TEXT NOT NULL DEFAULT 'omise',            -- omise | stripe | mock
  provider_charge_id  TEXT,
  metadata            JSONB,
  paid_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- ── Chat Logs (ประวัติแชทแต่ละ message) ───────────────────────
CREATE TABLE IF NOT EXISTS chat_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     UUID REFERENCES shops(id) ON DELETE CASCADE,
  platform    TEXT NOT NULL DEFAULT 'LINE',                     -- LINE | Facebook | Shopee | Lazada
  user_id     TEXT NOT NULL,                                    -- LINE User ID หรือ FB Sender ID
  user_name   TEXT,                                             -- ชื่อผู้ใช้ (ถ้ามี)
  direction   TEXT NOT NULL DEFAULT 'in',                       -- in (จากลูกค้า) | out (จากบอท/แอดมิน)
  message     TEXT,                                             -- ข้อความ
  msg_type    TEXT DEFAULT 'text',                             -- text | image | sticker | etc.
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── Products (สินค้า) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id        UUID REFERENCES shops(id) ON DELETE CASCADE,
  workspace_id   UUID REFERENCES shops(id) ON DELETE CASCADE,  -- alias
  row_index      INT,
  sku            TEXT,
  name           TEXT NOT NULL,
  category       TEXT DEFAULT 'อื่นๆ',
  price          NUMERIC(10,2),                                -- ราคาหลัก (สำหรับ Storefront)
  price_used     TEXT,
  price_new      TEXT,
  stock          TEXT DEFAULT 'มี',
  description    TEXT,
  metadata       JSONB DEFAULT '{}'::jsonb,
  link_buy       TEXT,
  link_driver    TEXT,
  image_url      TEXT,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

-- ── Customers (ลูกค้า CRM) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   UUID REFERENCES shops(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  phone          TEXT,
  email          TEXT,
  address        TEXT,
  tax_id         TEXT,
  line_id        TEXT,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

-- ── Documents (ใบเสนอราคา, ใบเสร็จ, ฯลฯ) ────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   UUID REFERENCES shops(id) ON DELETE CASCADE,
  doc_no         TEXT NOT NULL,
  doc_type       TEXT NOT NULL,                                 -- quotation | receipt | billing | delivery
  customer_id    UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_info  JSONB DEFAULT '{}'::jsonb,
  items          JSONB DEFAULT '[]'::jsonb,
  subtotal       NUMERIC(10,2) DEFAULT 0,
  tax            NUMERIC(10,2) DEFAULT 0,
  discount       NUMERIC(10,2) DEFAULT 0,
  total          NUMERIC(10,2) DEFAULT 0,
  status         TEXT DEFAULT 'draft',                         -- draft | sent | paid | cancelled
  note           TEXT,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

-- ── Orders (ออเดอร์จากบอท/แชท) ───────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   UUID REFERENCES shops(id) ON DELETE CASCADE,
  platform       TEXT DEFAULT 'LINE',
  order_id       TEXT,
  customer_name  TEXT,
  products       TEXT,
  total          TEXT,
  status         TEXT DEFAULT 'Pending',
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

-- ── Credit Transactions (ประวัติการใช้/เติมเครดิต) ──────────────
CREATE TABLE IF NOT EXISTS credit_transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     UUID REFERENCES shops(id) ON DELETE CASCADE,
  amount      INT NOT NULL,                                     -- + (topup) or - (deduct)
  reason      TEXT NOT NULL,                                    -- 'ai_chat', 'slip_check', 'topup'
  metadata    JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── Slip Checks (ประวัติการตรวจสลิป) ─────────────────────────
CREATE TABLE IF NOT EXISTS slip_checks (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id        UUID REFERENCES shops(id) ON DELETE CASCADE,
  order_id       TEXT,
  amount         NUMERIC(10,2),
  status         TEXT DEFAULT 'pending',                        -- success, failed, pending
  slip_url       TEXT,
  api_response   JSONB,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- ================================================================
--  Indexes
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_shops_slug          ON shops(slug);
CREATE INDEX IF NOT EXISTS idx_shops_plan          ON shops(plan);
CREATE INDEX IF NOT EXISTS idx_shops_status        ON shops(status);
CREATE INDEX IF NOT EXISTS idx_users_email         ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_workspace     ON users(workspace_id);
CREATE INDEX IF NOT EXISTS idx_chat_logs_shop      ON chat_logs(shop_id);
CREATE INDEX IF NOT EXISTS idx_chat_logs_user      ON chat_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_logs_created   ON chat_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_logs_platform  ON chat_logs(platform);
CREATE INDEX IF NOT EXISTS idx_payments_workspace  ON payments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_products_shop       ON products(shop_id);
CREATE INDEX IF NOT EXISTS idx_orders_workspace    ON orders(workspace_id);

-- ================================================================
--  Functions
-- ================================================================

-- นับ message + token แบบ Atomic
CREATE OR REPLACE FUNCTION increment_usage(
  p_workspace_id UUID,
  p_messages     INT DEFAULT 0,
  p_tokens       INT DEFAULT 0
) RETURNS void LANGUAGE sql AS $$
  UPDATE shops
  SET msg_used   = msg_used   + p_messages,
      token_used = token_used + p_tokens,
      updated_at = now()
  WHERE id = p_workspace_id;
$$;

-- รีเซ็ต usage รายเดือน
CREATE OR REPLACE FUNCTION reset_monthly_usage() RETURNS void LANGUAGE sql AS $$
  UPDATE shops
  SET msg_used         = 0,
      token_used       = 0,
      billing_reset_at = date_trunc('month', now()) + interval '1 month',
      updated_at       = now()
  WHERE billing_reset_at <= now();
$$;

-- ================================================================
--  Row Level Security (RLS)
--  Server ใช้ Service Role Key → ข้ามทุก Policy ได้เลย
-- ================================================================
ALTER TABLE shops      ENABLE ROW LEVEL SECURITY;
ALTER TABLE users      ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE products   ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents  ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders     ENABLE ROW LEVEL SECURITY;

-- ================================================================
--  Migration: เพิ่ม columns สำหรับ DB ที่มีอยู่แล้ว
--  (ถ้าเพิ่งสร้าง DB ใหม่ข้ามส่วนนี้ได้เลย — CREATE TABLE IF NOT EXISTS จัดการให้แล้ว)
-- ================================================================

-- shops table — เพิ่ม columns ที่อาจขาดหายไป
ALTER TABLE shops ADD COLUMN IF NOT EXISTS slug               TEXT UNIQUE;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS description        TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS status             TEXT DEFAULT 'active';
ALTER TABLE shops ADD COLUMN IF NOT EXISTS package_name       TEXT DEFAULT 'free';
ALTER TABLE shops ADD COLUMN IF NOT EXISTS line_bot_id        TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS ai_model           TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS ai_key             TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS line_oa_url        TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS phone              TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS notify_new_order   BOOLEAN DEFAULT true;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS notify_low_stock   BOOLEAN DEFAULT true;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS notify_daily_summary BOOLEAN DEFAULT true;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS notify_new_chat    BOOLEAN DEFAULT false;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS custom_ai_key      TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS custom_ai_provider TEXT DEFAULT 'claude';
ALTER TABLE shops ADD COLUMN IF NOT EXISTS custom_ai_model    TEXT;

-- users table — เพิ่ม columns สำหรับ password reset
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token       TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_expires_at  TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMPTZ DEFAULT now();

-- shops table — เพิ่ม ai_credits
ALTER TABLE shops ADD COLUMN IF NOT EXISTS ai_credits        INT DEFAULT 0;

-- products table — เพิ่ม price column สำหรับ Storefront
ALTER TABLE products ADD COLUMN IF NOT EXISTS price         NUMERIC(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS description   TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS shop_id       UUID REFERENCES shops(id) ON DELETE CASCADE;

-- payments — เพิ่ม shop_id alias
ALTER TABLE payments ADD COLUMN IF NOT EXISTS shop_id       UUID REFERENCES shops(id) ON DELETE CASCADE;

-- chat_logs — สร้างถ้ายังไม่มี (Migration-safe)
CREATE TABLE IF NOT EXISTS chat_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     UUID REFERENCES shops(id) ON DELETE CASCADE,
  platform    TEXT NOT NULL DEFAULT 'LINE',
  user_id     TEXT NOT NULL,
  user_name   TEXT,
  direction   TEXT NOT NULL DEFAULT 'in',
  message     TEXT,
  msg_type    TEXT DEFAULT 'text',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ================================================================
--  Comments
-- ================================================================
COMMENT ON TABLE shops     IS 'แต่ละร้านค้า / workspace (ใช้ชื่อ shops ตรงกับโค้ด)';
COMMENT ON TABLE users     IS 'Admin users ของแต่ละร้าน + Supabase Auth';
COMMENT ON TABLE chat_logs IS 'ประวัติแชทแต่ละ message จากทุก Platform';
COMMENT ON COLUMN shops.plan IS 'trial | starter | pro | agency | byok | suspended';
