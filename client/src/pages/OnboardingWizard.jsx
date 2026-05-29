import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Icon, Icons, api, TokenManager, Loader, Toast, Modal, Field, DropdownSelect } from '../components/Shared';

export default // ═══════════════════════════════════════════════════════════
//  ONBOARDING WIZARD — นำทางร้านค้าใหม่ตั้งค่าระบบ
// ═══════════════════════════════════════════════════════════
function OnboardingWizard({
  onComplete
}) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const auth = getAuth();
  const shopId = auth.shopId;

  // Step 1: ข้อมูลร้าน
  const [shopData, setShopData] = useState({
    SHOP_NAME: auth.shopName || "",
    PHONE: "",
    ADDRESS: "",
    OPEN_HOURS: "",
    LINE_OA: "",
    WELCOME_MSG: "สวัสดีครับ! ยินดีต้อนรับ ร้านเรามีสินค้าและบริการหลากหลาย สอบถามได้เลยครับ 😊"
  });

  // Step 2: LINE OA
  const [lineData, setLineData] = useState({
    line_token: "",
    line_bot_id: "",
    owner_line_id: ""
  });
  const [lineTest, setLineTest] = useState(null); // null | "ok" | "err"

  // Step 3: สินค้าแรก
  const [product, setProduct] = useState({
    name: "",
    category: "",
    priceNew: "",
    stock: "มี"
  });
  const [productAdded, setProductAdded] = useState(false);
  const STEPS = [{
    title: "ข้อมูลร้าน",
    desc: "กรอกข้อมูลพื้นฐานของร้านคุณ"
  }, {
    title: "เชื่อม LINE OA",
    desc: "เชื่อมต่อ LINE Official Account"
  }, {
    title: "เพิ่มสินค้า",
    desc: "เพิ่มสินค้าหรือบริการแรกของคุณ"
  }, {
    title: "พร้อมใช้งาน!",
    desc: "ระบบตั้งค่าเสร็จสมบูรณ์"
  }];
  const saveShopInfo = async () => {
    setSaving(true);
    await api("/api/shopinfo", {
      method: "PUT",
      body: {
        info: shopData
      }
    });
    setSaving(false);
    setStep(1);
  };
  const saveLine = async () => {
    if (!lineData.line_token) {
      setStep(2);
      return;
    } // ข้ามได้
    setSaving(true);
    const res = await api("/api/shops/" + shopId + "/line", {
      method: "PUT",
      body: lineData
    });
    setLineTest(res.success ? "ok" : "err");
    setSaving(false);
    if (res.success) setTimeout(() => setStep(2), 800);
  };
  const saveProduct = async () => {
    if (!product.name) {
      setStep(3);
      return;
    } // ข้ามได้
    setSaving(true);
    const res = await api("/api/products", {
      method: "POST",
      body: product
    });
    if (res.success) setProductAdded(true);
    setSaving(false);
    setTimeout(() => setStep(3), 500);
  };
  const finish = async () => {
    setSaving(true);
    await api("/api/onboarding/complete", {
      method: "POST"
    });
    setSaving(false);
    onComplete();
  };
  const StepIndicator = () => <div className="flex items-center justify-center gap-1 mb-8">
      {STEPS.map((s, i) => <React.Fragment key={i}>
          <div className={"flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold transition-all " + (i < step ? "bg-green-500 text-white" : i === step ? "bg-blue-500 text-white ring-4 ring-blue-500/30" : "bg-gray-100 text-gray-500")}>
            {i < step ? "✓" : i + 1}
          </div>
          {i < STEPS.length - 1 && <div className={"w-8 h-0.5 " + (i < step ? "bg-green-500" : "bg-gray-100")} />}
        </React.Fragment>)}
    </div>;
  return <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-2xl font-black text-gray-900 mb-1">BOT<span className="text-amber-400">IFY</span></div>
          <div className="text-gray-500 text-sm">ตั้งค่าระบบของคุณใน 4 ขั้นตอน</div>
        </div>

        <StepIndicator />

        <div className="bg-white backdrop-blur border border-gray-200/50 rounded-2xl p-6 shadow-xl">
          {/* Step title */}
          <div className="mb-5">
            <h2 className="text-lg font-bold text-gray-900">{STEPS[step].title}</h2>
            <p className="text-gray-500 text-sm">{STEPS[step].desc}</p>
          </div>

          {/* ── Step 0: ข้อมูลร้าน ── */}
          {step === 0 && <div>
              <Field label="ชื่อร้าน *" ph="ร้าน ABC" value={shopData.SHOP_NAME} onChange={v => setShopData(d => ({
            ...d,
            SHOP_NAME: v
          }))} />
              <Field label="เบอร์โทร" ph="081-234-5678" value={shopData.PHONE} onChange={v => setShopData(d => ({
            ...d,
            PHONE: v
          }))} />
              <Field label="ที่อยู่" ph="123 ถ.xxx เขต..." value={shopData.ADDRESS} onChange={v => setShopData(d => ({
            ...d,
            ADDRESS: v
          }))} />
              <Field label="เวลาทำการ" ph="จ-ศ 9:00-18:00" value={shopData.OPEN_HOURS} onChange={v => setShopData(d => ({
            ...d,
            OPEN_HOURS: v
          }))} />
              <Field label="LINE OA ID" ph="@shopname" value={shopData.LINE_OA} onChange={v => setShopData(d => ({
            ...d,
            LINE_OA: v
          }))} />
              <Field label="ข้อความต้อนรับ (Bot จะส่งเมื่อลูกค้าเริ่มแชท)" type="textarea" value={shopData.WELCOME_MSG} onChange={v => setShopData(d => ({
            ...d,
            WELCOME_MSG: v
          }))} />
              <button onClick={saveShopInfo} disabled={saving || !shopData.SHOP_NAME} className="w-full mt-2 py-2.5 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition">
                {saving ? "กำลังบันทึก..." : "ถัดไป →"}
              </button>
            </div>}

          {/* ── Step 1: เชื่อม LINE OA ── */}
          {step === 1 && <div>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4 text-xs text-blue-300 leading-relaxed">
                <p className="font-bold mb-1">วิธีรับ LINE Channel Access Token:</p>
                <p>1. ไปที่ <span className="text-blue-400">LINE Developers Console</span></p>
                <p>2. เลือก Provider → Channel (Messaging API)</p>
                <p>3. แท็บ "Messaging API" → คัดลอก <span className="text-gray-900">Channel Access Token</span></p>
                <p>4. Bot basic ID คือรหัสที่ขึ้นต้นด้วย U...</p>
              </div>
              <Field label="Channel Access Token *" ph="xxxxxxxxxxxxxxx" value={lineData.line_token} onChange={v => setLineData(d => ({
            ...d,
            line_token: v
          }))} />
              <Field label="Bot User ID" ph="Uxxxxxxxxx" value={lineData.line_bot_id} onChange={v => setLineData(d => ({
            ...d,
            line_bot_id: v
          }))} />
              <Field label="Owner LINE ID (แจ้งเตือนเจ้าของ)" ph="Uxxxxxxxxx" value={lineData.owner_line_id} onChange={v => setLineData(d => ({
            ...d,
            owner_line_id: v
          }))} />

              {lineTest === "ok" && <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2 text-xs text-green-400 mb-3 text-center">✅ เชื่อมต่อสำเร็จ!</div>}
              {lineTest === "err" && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2 text-xs text-red-400 mb-3 text-center">❌ เชื่อมต่อไม่สำเร็จ ตรวจสอบ Token</div>}

              <div className="flex gap-2 mt-2">
                <button onClick={() => setStep(0)} className="flex-1 py-2.5 rounded-lg text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition">
                  ← ย้อนกลับ
                </button>
                <button onClick={saveLine} disabled={saving} className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition">
                  {saving ? "กำลังเชื่อมต่อ..." : lineData.line_token ? "เชื่อมต่อ & ถัดไป →" : "ข้ามขั้นตอนนี้ →"}
                </button>
              </div>
            </div>}

          {/* ── Step 2: เพิ่มสินค้า ── */}
          {step === 2 && <div>
              {productAdded ? <div className="text-center py-4">
                  <div className="text-4xl mb-2">🎉</div>
                  <div className="text-green-400 font-bold">เพิ่มสินค้าแรกสำเร็จ!</div>
                  <p className="text-gray-500 text-xs mt-1">เพิ่มสินค้าเพิ่มเติมได้ในหน้า "สินค้า" ภายหลัง</p>
                </div> : <div>
                  <Field label="ชื่อสินค้า / บริการ *" ph="เช่น เสื้อยืด Cotton, บริการล้างแอร์..." value={product.name} onChange={v => setProduct(d => ({
              ...d,
              name: v
            }))} />
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="หมวดหมู่" ph="เสื้อผ้า, อาหาร..." value={product.category} onChange={v => setProduct(d => ({
                ...d,
                category: v
              }))} />
                    <Field label="ราคา (บาท)" ph="590" value={product.priceNew} onChange={v => setProduct(d => ({
                ...d,
                priceNew: v
              }))} />
                  </div>
                  <div className="bg-gray-100/30 rounded-lg p-3 mt-1 mb-3 text-xs text-gray-500">
                    💡 เพิ่มแค่ 1 รายการก่อน — เพิ่มเพิ่มเติมได้ทีหลังในหน้า "สินค้า" หรือ import จาก Google Sheet
                  </div>
                </div>}
              <div className="flex gap-2 mt-2">
                <button onClick={() => setStep(1)} className="flex-1 py-2.5 rounded-lg text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition">
                  ← ย้อนกลับ
                </button>
                <button onClick={productAdded ? () => setStep(3) : saveProduct} disabled={saving} className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition">
                  {saving ? "กำลังเพิ่ม..." : productAdded ? "ถัดไป →" : product.name ? "เพิ่มสินค้า & ถัดไป →" : "ข้ามขั้นตอนนี้ →"}
                </button>
              </div>
            </div>}

          {/* ── Step 3: เสร็จสิ้น ── */}
          {step === 3 && <div className="text-center py-2">
              <div className="text-5xl mb-3">🚀</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">ระบบพร้อมใช้งานแล้ว!</h3>
              <p className="text-gray-500 text-sm mb-5">สิ่งที่ตั้งค่าเรียบร้อย:</p>

              <div className="text-left space-y-2 mb-6">
                <div className="flex items-center gap-2 text-sm">
                  <span className={shopData.SHOP_NAME ? "text-green-400" : "text-slate-500"}>{shopData.SHOP_NAME ? "✅" : "⏭️"}</span>
                  <span className="text-gray-700">ข้อมูลร้าน{shopData.SHOP_NAME ? ": " + shopData.SHOP_NAME : " (ข้าม)"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className={lineData.line_token ? "text-green-400" : "text-slate-500"}>{lineData.line_token ? "✅" : "⏭️"}</span>
                  <span className="text-gray-700">LINE OA{lineData.line_token ? " เชื่อมต่อแล้ว" : " (ยังไม่ได้เชื่อม — ตั้งค่าภายหลังได้)"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className={productAdded ? "text-green-400" : "text-slate-500"}>{productAdded ? "✅" : "⏭️"}</span>
                  <span className="text-gray-700">สินค้า{productAdded ? ": " + product.name : " (ยังไม่ได้เพิ่ม — เพิ่มภายหลังได้)"}</span>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-5 text-xs text-amber-300 text-left">
                <p className="font-bold mb-1">💡 สิ่งที่ควรทำต่อ:</p>
                <p>• เพิ่มสินค้าเพิ่มเติมในหน้า "สินค้า"</p>
                <p>• ตั้ง Webhook URL ใน LINE Developers: <span className="text-gray-900">https://yourdomain.com/webhook</span></p>
                <p>• ทดสอบส่งข้อความหา LINE OA ของคุณ</p>
                <p>• ตั้งค่าวิธีชำระเงินในหน้า "ข้อมูลร้าน"</p>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setStep(2)} className="flex-1 py-2.5 rounded-lg text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition">
                  ← ย้อนกลับ
                </button>
                <button onClick={finish} disabled={saving} className="flex-1 py-3 rounded-lg text-sm font-bold text-white bg-green-600 hover:bg-green-500 disabled:opacity-50 transition shadow-lg shadow-green-600/20">
                  {saving ? "กำลังบันทึก..." : "🎉 เข้าสู่ Dashboard"}
                </button>
              </div>
            </div>}
        </div>

        {/* Skip link */}
        {step < 3 && <div className="text-center mt-4">
            <button onClick={finish} className="text-xs text-gray-400 hover:text-gray-700 underline transition">
              ข้ามทั้งหมด — เข้า Dashboard เลย
            </button>
          </div>}
      </div>
    </div>;
}

// ═══════════════════════════════════════════════════════════
//  PAGE LISTS
// ═══════════════════════════════════════════════════════════
