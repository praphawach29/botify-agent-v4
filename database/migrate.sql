-- ================================================================
--  BOTIFY — Migration Script
--  วิธีใช้: คัดลอกไปวางใน Supabase → SQL Editor → Run
--  
--  Script นี้ใช้ได้ทั้งกับ:
--  - Database ใหม่ (สร้าง table ทั้งหมด)
--  - Database เดิม (เพิ่มแค่ส่วนที่ขาดหายไป)
-- ================================================================

-- ── 1. สร้าง chat_logs table (ถ้ายังไม่มี) ────────────────
CREATE TABLE IF NOT EXISTS chat_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     UUID,
  platform    TEXT NOT NULL DEFAULT 'LINE',
  user_id     TEXT NOT NULL,
  user_name   TEXT,
  direction   TEXT NOT NULL DEFAULT 'in',   -- in | out
  message     TEXT,
  msg_type    TEXT DEFAULT 'text',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── 2. เพิ่ม columns ที่หายไปใน users table ────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token       TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_expires_at  TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMPTZ DEFAULT now();

-- ── 3. เพิ่ม columns ที่หายไปใน shops table ────────────────
ALTER TABLE shops ADD COLUMN IF NOT EXISTS slug               TEXT;
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

-- ── 4. สร้าง slug unique index (ถ้ายังไม่มี) ──────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_shops_slug_unique ON shops(slug) WHERE slug IS NOT NULL;

-- ── 5. สร้าง indexes สำหรับ chat_logs ────────────────────
CREATE INDEX IF NOT EXISTS idx_chat_logs_shop     ON chat_logs(shop_id);
CREATE INDEX IF NOT EXISTS idx_chat_logs_user     ON chat_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_logs_created  ON chat_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_logs_platform ON chat_logs(platform);

-- ── 6. เปิด RLS สำหรับ chat_logs ────────────────────────
ALTER TABLE chat_logs ENABLE ROW LEVEL SECURITY;

-- ── 7. เพิ่ม columns สำหรับ products table ───────────────
ALTER TABLE products ADD COLUMN IF NOT EXISTS price       NUMERIC(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS shop_id     UUID;

-- ── 8. เพิ่ม shop_id ใน payments (alias) ────────────────
ALTER TABLE payments ADD COLUMN IF NOT EXISTS shop_id UUID;

-- ── 9. เพิ่มระบบเครดิต (AI Credits) ────────────────────────
ALTER TABLE shops ADD COLUMN IF NOT EXISTS ai_credits INT DEFAULT 0;

CREATE TABLE IF NOT EXISTS credit_transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     UUID REFERENCES shops(id) ON DELETE CASCADE,
  amount      INT NOT NULL,
  reason      TEXT NOT NULL,
  metadata    JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── 10. เพิ่มระบบตรวจสลิป ─────────────────────────────────
CREATE TABLE IF NOT EXISTS slip_checks (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id        UUID REFERENCES shops(id) ON DELETE CASCADE,
  order_id       TEXT,
  amount         NUMERIC(10,2),
  status         TEXT DEFAULT 'pending',
  slip_url       TEXT,
  api_response   JSONB,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- ── 11. ตาราง Packages (แพ็กเกจ) ────────────────────────
CREATE TABLE IF NOT EXISTS packages (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  price          INT NOT NULL DEFAULT 0,
  msg_limit      INT DEFAULT -1,
  product_limit  INT DEFAULT 20,
  description    TEXT,
  features       JSONB DEFAULT '{}'::jsonb,
  is_active      BOOLEAN DEFAULT true,
  sort_order     INT DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

-- Seed Data (Starter, Standard, Elite)
INSERT INTO packages (name, price, msg_limit, product_limit, description, features, sort_order)
VALUES 
('Starter', 590, 500, 50, 'แพ็กเกจเริ่มต้น เหมาะสำหรับร้านค้าขนาดเล็ก', '{"ai": true, "broadcast": false, "analytics": false, "ai_credits": 100, "slip_check": false}'::jsonb, 1),
('Standard', 990, 2000, 200, 'แพ็กเกจขายดี เหมาะสำหรับร้านค้าที่กำลังเติบโต', '{"ai": true, "broadcast": true, "analytics": true, "ai_credits": 500, "slip_check": true}'::jsonb, 2),
('Elite', 1590, 5000, 1000, 'แพ็กเกจสำหรับมือโปร ฟีเจอร์ครบจัดเต็ม', '{"ai": true, "broadcast": true, "analytics": true, "ai_credits": 2000, "slip_check": true, "quotation": true}'::jsonb, 3),
('Enterprise', 2990, -1, -1, 'แพ็กเกจสูงสุดสำหรับแบรนด์ใหญ่ (Unlimited)', '{"ai": true, "broadcast": true, "analytics": true, "ai_credits": 10000, "slip_check": true, "quotation": true, "custom_prompt": true, "byok": true, "team_management": true, "erp_api": true}'::jsonb, 4);

-- ================================================================
--  ✅ Migration เสร็จสิ้น
-- ================================================================
SELECT 'Migration completed successfully' as status;
