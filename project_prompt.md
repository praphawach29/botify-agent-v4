# 🏗️ Master Prompt: สร้างระบบ Botify SaaS Dashboard & Smart Agent

ไฟล์นี้คือ "Master Prompt" สำหรับส่งให้ AI (เช่น Claude, ChatGPT, Gemini) เพื่อจำลองและสร้างโปรเจกต์นี้ขึ้นมาใหม่ตั้งแต่ต้นจนจบอย่างเป็นขั้นตอน โดยไม่ทำให้เกิดความสับสนหรือไฟล์กระจัดกระจาย

---

**[คัดลอกข้อความด้านล่างนี้ ส่งให้ AI ผู้ช่วยของคุณ]**

> "คุณคือ Expert Full-Stack Developer ที่เชี่ยวชาญด้าน Node.js, Vanilla HTML/CSS/JS และ AI Agentic Development 
> ฉันต้องการให้คุณสร้างระบบ **'Botify SaaS Dashboard'** ซึ่งเป็นแพลตฟอร์มจัดการแชท (Unified Inbox) และจัดการบอท AI อัจฉริยะ (Native Tool Calling Agent) สำหรับร้านค้า E-Commerce
> 
> ขอให้คุณทำงานตามขั้นตอนย่อย (Phases) ด้านล่างนี้อย่างเคร่งครัด **ห้ามทำข้ามขั้นตอนเด็ดขาด** ทำเสร็จ 1 Phase ให้หยุดและรอฉันคอนเฟิร์มก่อนไป Phase ถัดไป:
> 
> ### Phase 1: วางโครงสร้างโปรเจกต์ (Project Setup & Architecture)
> 1. สร้าง `package.json` พร้อม dependencies ที่จำเป็น: `express`, `cors`, `axios`, `dotenv`, `@google/genai`, `openai`, `@anthropic-ai/sdk`, `googleapis`
> 2. สร้างโครงสร้างโฟลเดอร์หลัก: `server.js`, โฟลเดอร์ `views/` และไฟล์ `views/Botify_Dashboard.html`
> 3. เขียนไฟล์ `README.md`, `CONTEXT.md` และ `AGENTS.md` เพื่อวางกฎเหล็กของโปรเจกต์
> 
> ### Phase 2: พัฒนา Frontend (SPA Dashboard & Cyberpunk Theme)
> 1. สร้าง UI ในไฟล์ `Botify_Dashboard.html` โดยใช้ Vanilla HTML/CSS (ห้ามใช้ Tailwind)
> 2. ออกแบบ CSS Variables ด้วยธีม Dark Mode / Cyberpunk (พื้นหลังสี `#020617`, Primary `#0ea5e9`, Secondary `#8b5cf6`)
> 3. สร้างระบบ Single Page Application (SPA) ใช้ JavaScript สลับการแสดงผลแบบ Tab (Overview, Inbox, Products, Bot Config)
> 4. สร้าง Mock UI สำหรับ "SaaS Feature Gating" (เช่น ปุ่มล็อกฟีเจอร์สำหรับผู้ใช้ Free Trial และปลดล็อกเมื่อเป็น Pro)
> 5. ออกแบบ UI ต้องเป็น Mobile-first รองรับการใช้งานบนมือถืออย่างสมบูรณ์
> 
> ### Phase 3: สร้าง Backend (Node.js Server & Webhooks)
> 1. ใน `server.js` ให้สร้าง Express server พื้นฐาน
> 2. สร้าง Webhook endpoints สำหรับรับข้อความ (เช่น `/webhook` สำหรับ LINE, `/webhook-fb` สำหรับ Facebook)
> 3. สร้างระบบอ่าน/เขียนข้อมูลจาก Google Sheets API (ฟังก์ชัน `readSheet`, `writeSheet`)
> 
> ### Phase 4: สร้าง Smart AI Agent (Native Tool Calling)
> 1. ใน `server.js` ให้สร้างอาร์เรย์ `agentTools` เพื่อกำหนด Schema ของเครื่องมือ เช่น `take_order`, `get_product_image`, `save_lead`, `book_appointment`, `check_order_status`
> 2. สร้างฟังก์ชัน `executeTool(name, args)` เพื่อเป็นสะพานเชื่อมระหว่าง AI กับ Backend Logic จริง
> 3. สร้างฟังก์ชัน `callAIAgent(systemPrompt, messages, config, ...)` ภายในฟังก์ชันนี้ให้เขียน **Agent Loop** ที่รองรับ Official SDKs ทั้ง 3 ค่าย (Gemini, OpenAI, Claude) เพื่อให้ AI สามารถทริกเกอร์ Tool Calls และวนลูปจนกว่าจะได้คำตอบสุดท้าย
> 4. สร้างฟังก์ชัน `buildPrompt` เพื่อสร้าง System Prompt แจ้งกฎและหน้าที่ของ AI อย่างชัดเจน ห้ามใช้ Text Tags แบบเก่า ให้สั่งให้ AI เรียกใช้ฟังก์ชันแทน
> 
> ### Phase 5: เชื่อมต่อ Frontend กับ Backend (Integration & Testing)
> 1. เชื่อมต่อหน้า Dashboard ฝั่ง Frontend ให้สามารถส่งตั้งค่า Bot Config ไปบันทึกที่ Backend ได้
> 2. ทำระบบดึงสินค้าจาก Google Sheets ไปโชว์ในหน้า Products ของ Dashboard
> 
> เข้าใจตรงกันแล้ว ให้พิมพ์ว่า 'พร้อมเริ่มต้น Phase 1' และเริ่มเขียนโค้ดของ Phase 1 ได้เลย!"
