# BOTIFY AI — Deployment Guide

คู่มือ deploy BOTIFY AI SaaS ครอบคลุม 3 platforms: Railway, Docker/VPS, และ Vercel

---

## สิ่งที่ต้องเตรียมก่อน Deploy

### 1. Supabase Project

1. สร้าง project ที่ [supabase.com](https://supabase.com)
2. ไปที่ **Settings → API** → คัดลอก:
   - `Project URL` → ใช้เป็น `SUPABASE_URL`
   - `anon public key` → ใช้เป็น `SUPABASE_ANON_KEY`
   - `service_role key` → ใช้เป็น `SUPABASE_SERVICE_KEY`
3. รัน SQL migration ใน **SQL Editor** เพื่อสร้าง tables (shops, users, chat_logs, etc.)

### 2. LINE Official Account

1. สร้าง LINE OA ที่ [LINE Developers](https://developers.line.biz/)
2. สร้าง Messaging API Channel
3. คัดลอก **Channel Access Token** → ใช้เป็น `LINE_TOKEN_1`
4. คัดลอก **Bot Basic ID** → ใช้เป็น `LINE_BOTID_1`
5. ตั้ง Webhook URL (หลัง deploy): `https://YOUR_DOMAIN/webhook`

### 3. AI API Key

เลือกอย่างน้อย 1 provider:
- **Claude**: `CLAUDE_KEY=sk-ant-...`
- **OpenAI**: `OPENAI_KEY=sk-...`
- **Gemini**: `GEMINI_KEY=AIza...`

### 4. Google Sheets (ถ้าใช้)

1. สร้าง Service Account ที่ Google Cloud Console
2. เปิด Google Sheets API
3. แชร์ Sheet กับ service account email
4. คัดลอก credentials JSON → ใช้เป็น `GOOGLE_CREDS`

---

## Environment Variables Checklist

```bash
# ═══ จำเป็นต้องมี (Required) ═══
ADMIN_API_KEY=          # API Key สำหรับ Super Admin login
SUPABASE_URL=           # Supabase Project URL
SUPABASE_ANON_KEY=      # Supabase Anon Key
SUPABASE_SERVICE_KEY=   # Supabase Service Role Key
AI_PROVIDER=claude      # claude | openai | gemini | typhoon
CLAUDE_KEY=             # (หรือ OPENAI_KEY / GEMINI_KEY ตาม AI_PROVIDER)

# ═══ LINE Bot (อย่างน้อย 1 client) ═══
LINE_TOKEN_1=           # LINE Channel Access Token
LINE_BOTID_1=           # LINE Bot User ID (Uxxxx...)
OWNER_LINE_ID_1=        # LINE User ID ของเจ้าของร้าน

# ═══ Google Sheets (ถ้าใช้ Sheets sync) ═══
SHEET_ID_1=             # Google Spreadsheet ID
GOOGLE_CREDS=           # Service Account JSON (single line)

# ═══ Optional ═══
NODE_ENV=production     # production | development
PORT=3000               # Port (Railway/Vercel จัดการเอง)
PROMPTPAY_NUMBER=       # เบอร์พร้อมเพย์สำหรับ QR Payment
ALLOWED_ORIGINS=        # CORS origins (comma-separated)
LOW_STOCK_LIMIT=3       # จำนวนสต็อกต่ำสุดก่อนแจ้งเตือน
```

---

## Option 1: Railway (แนะนำ)

Railway เหมาะที่สุดสำหรับ BOTIFY เพราะรองรับ Node.js โดยตรง, มี persistent process สำหรับ cron jobs, และตั้ง env variables ง่าย

### ขั้นตอน

**1. สร้าง project บน Railway**
```bash
# ติดตั้ง Railway CLI
npm install -g @railway/cli

# Login
railway login

# สร้าง project ใหม่
railway init
```

**2. Push code**
```bash
# ถ้าใช้ GitHub (แนะนำ)
git init
git add .
git commit -m "Initial BOTIFY deploy"
git remote add origin https://github.com/YOUR_USER/botify.git
git push -u origin main

# เชื่อม Railway กับ GitHub repo
# → ไปที่ Railway Dashboard → New Project → Deploy from GitHub repo
```

หรือ deploy ตรงจาก CLI:
```bash
railway up
```

**3. ตั้ง Environment Variables**

ไปที่ **Railway Dashboard → Your Project → Variables** แล้วเพิ่มทุกตัวจาก checklist ด้านบน

หรือใช้ CLI:
```bash
railway variables set ADMIN_API_KEY=your_key
railway variables set SUPABASE_URL=https://xxxx.supabase.co
railway variables set SUPABASE_ANON_KEY=eyJ...
railway variables set SUPABASE_SERVICE_KEY=eyJ...
railway variables set AI_PROVIDER=claude
railway variables set CLAUDE_KEY=sk-ant-...
railway variables set LINE_TOKEN_1=xxx
railway variables set LINE_BOTID_1=Uxxxx
railway variables set OWNER_LINE_ID_1=Uxxxx
railway variables set NODE_ENV=production
```

**4. ตั้ง Webhook URL**

หลัง deploy สำเร็จ Railway จะให้ URL เช่น `https://botify-production.up.railway.app`

ไปตั้งค่าใน LINE Developers Console:
- Webhook URL: `https://YOUR_RAILWAY_URL/webhook`
- เปิด "Use webhook" = ON

**5. ตรวจสอบ**
```bash
# เช็ค status
curl https://YOUR_RAILWAY_URL/status

# เช็ค logs
railway logs
```

### Railway Tips
- **Auto Deploy**: เชื่อมกับ GitHub แล้ว push = deploy อัตโนมัติ
- **Custom Domain**: Settings → Domains → เพิ่ม domain ของคุณ
- **Health Check**: ตั้งไว้แล้วใน `railway.json` → `/status`
- **ราคา**: Hobby Plan $5/month, มี $5 free credit

---

## Option 2: Docker + VPS

เหมาะสำหรับคนที่ต้องการควบคุมเต็มที่ หรือ deploy บน VPS (DigitalOcean, AWS EC2, GCP, Linode)

### ขั้นตอน

**1. Build Docker Image**
```bash
docker build -t botify-ai .
```

**2. รันด้วย Docker Compose (แนะนำ)**
```bash
# สร้างไฟล์ .env จาก template
cp .env.example .env
# แก้ไข .env ใส่ค่าจริง
nano .env

# รัน
docker compose up -d

# เช็ค status
docker compose ps
docker compose logs -f
```

**3. รันด้วย Docker ตรง**
```bash
docker run -d \
  --name botify \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file .env \
  botify-ai
```

### ตั้ง Reverse Proxy (Nginx + SSL)

```nginx
server {
    listen 80;
    server_name botify.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name botify.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/botify.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/botify.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**ติดตั้ง SSL ด้วย Certbot:**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d botify.yourdomain.com
```

### Docker VPS Tips
- **Auto-restart**: `--restart unless-stopped` จัดการให้แล้ว
- **Update**: `docker compose pull && docker compose up -d --build`
- **Logs**: `docker compose logs -f --tail 100`
- **Backup**: ไม่ต้อง backup ตัว app — data อยู่บน Supabase

---

## Option 3: Vercel

Vercel ใช้ได้แต่มีข้อจำกัดสำหรับ BOTIFY เพราะเป็น serverless — cron jobs, setInterval, และ scheduled tasks จะไม่ทำงาน

### ข้อจำกัดสำคัญ
- ❌ `setInterval` / `setTimeout` (cron jobs) ไม่ทำงาน
- ❌ In-memory cache จะถูก reset ทุก request
- ❌ Webhook อาจ timeout ถ้าประมวลผลนานกว่า 10 วินาที (Hobby) / 60 วินาที (Pro)
- ✅ API endpoints ทำงานปกติ
- ✅ Dashboard / Login / TOS / Privacy ทำงานปกติ
- ✅ LINE/FB webhook ทำงานได้ (ถ้าไม่ timeout)

### ขั้นตอน

**1. ติดตั้ง Vercel CLI**
```bash
npm install -g vercel
```

**2. Deploy**
```bash
vercel

# Production deploy
vercel --prod
```

**3. ตั้ง Environment Variables**

ไปที่ **Vercel Dashboard → Your Project → Settings → Environment Variables** แล้วเพิ่มทุกตัว

หรือใช้ CLI:
```bash
vercel env add ADMIN_API_KEY
vercel env add SUPABASE_URL
# ... (ใส่ทีละตัว)
```

**4. ตั้ง Webhook URL**
- `https://your-project.vercel.app/webhook`

### Vercel Tips
- ถ้าต้องการ cron jobs → ใช้ [Vercel Cron](https://vercel.com/docs/cron-jobs) แทน setInterval
- แนะนำ Pro plan ($20/month) เพื่อ function timeout 60 วินาที
- ถ้าใช้ Vercel เป็น frontend แล้ว Railway เป็น backend → ตั้ง CORS ที่ `ALLOWED_ORIGINS`

---

## หลัง Deploy: Checklist

### ทดสอบทันที
- [ ] เปิด `https://YOUR_DOMAIN/status` → ต้องเห็น JSON status
- [ ] เปิด `https://YOUR_DOMAIN/dashboard` → ต้องเห็นหน้า login
- [ ] Login ด้วย Super Admin API Key
- [ ] Login ด้วย email/password (shop owner)
- [ ] เปิด `https://YOUR_DOMAIN/terms` → หน้าข้อกำหนด
- [ ] เปิด `https://YOUR_DOMAIN/privacy` → หน้า PDPA

### ทดสอบ LINE Bot
- [ ] ตั้ง Webhook URL ใน LINE Developers Console
- [ ] กด "Verify" ใน LINE Console → ต้องได้ 200 OK
- [ ] ส่งข้อความทดสอบใน LINE OA → Bot ต้องตอบ
- [ ] ทดสอบสั่งซื้อ / จองคิว ผ่าน LINE

### ทดสอบ Dashboard
- [ ] ดู Stats → ต้องเห็นตัวเลข
- [ ] จัดการสินค้า → เพิ่ม/แก้ไข/ลบได้
- [ ] ดูออเดอร์
- [ ] ตั้งค่าร้าน
- [ ] หน้าเชื่อมต่อ (Channels)
- [ ] ประวัติแชท (Chat History)

---

## Troubleshooting

### App ไม่ start
```bash
# เช็ค logs
railway logs              # Railway
docker compose logs -f    # Docker
vercel logs               # Vercel

# สาเหตุที่พบบ่อย:
# 1. ลืมตั้ง SUPABASE_URL / SUPABASE_SERVICE_KEY
# 2. GOOGLE_CREDS format ผิด (ต้องเป็น JSON string 1 บรรทัด)
# 3. PORT conflict (ใช้ PORT env variable)
```

### LINE Webhook ไม่ทำงาน
1. เช็คว่า Webhook URL ถูกต้อง: `https://YOUR_DOMAIN/webhook`
2. เช็คว่า "Use webhook" เปิดอยู่
3. กด Verify ใน LINE Console → ดู response
4. เช็คว่า `LINE_TOKEN_1` ถูกต้อง
5. ดู logs หา error message

### Dashboard login ไม่ได้
1. เช็คว่า `SUPABASE_URL` และ `SUPABASE_ANON_KEY` ถูกต้อง
2. เช็คว่ามี user ใน Supabase → `auth.users` table
3. ลอง Super Admin login ด้วย `ADMIN_API_KEY` ก่อน
4. เช็ค browser console สำหรับ error

### GOOGLE_CREDS ตั้งค่าอย่างไร
```bash
# Railway / Docker: ใส่ JSON string 1 บรรทัด (ไม่ต้องมี single quotes)
GOOGLE_CREDS={"type":"service_account","project_id":"...","private_key":"-----BEGIN..."}

# ถ้ามีปัญหา escape: encode เป็น base64
cat service-account.json | base64 -w 0
# แล้วแก้ code ให้ decode base64 กลับ
```

### Custom Domain
```bash
# Railway: Settings → Domains → Add Custom Domain
# Vercel: Settings → Domains → Add Domain
# Docker/VPS: ตั้ง Nginx reverse proxy + Certbot SSL
```

---

## การ Update / Redeploy

### Railway
```bash
git add .
git commit -m "update: description"
git push  # Auto deploy ถ้าเชื่อม GitHub
```

### Docker
```bash
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Vercel
```bash
vercel --prod
# หรือ push to GitHub (auto deploy)
```

---

## Security Checklist (Production)

- [ ] เปลี่ยน `ADMIN_API_KEY` จาก default เป็นค่าที่แข็งแกร่ง (32+ characters)
- [ ] ตั้ง `NODE_ENV=production`
- [ ] ตั้ง `ALLOWED_ORIGINS` เฉพาะ domain ที่ใช้จริง
- [ ] ใช้ HTTPS เท่านั้น (Railway/Vercel มีให้, Docker ต้องตั้ง SSL)
- [ ] ไม่เก็บ `.env` ใน Git repository
- [ ] Review Supabase RLS policies
- [ ] ตั้ง strong password สำหรับทุก shop account
