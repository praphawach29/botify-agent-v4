const express = require('express');
module.exports = function(app) {
// Auto-generated from chunks
const { supabase } = require("../config/db");
const { authMW, fSid } = require("../middleware/auth");
const { readSheet } = require("../services/sheetService");
const { sanitize } = require("../utils/helpers");
const axios = require("axios");

// --- 35____PAYMENT_GATEWAY___Stripe___Omise.js ---
// ═══════════════════════════════════════════════════════════
//  💳 PAYMENT GATEWAY — Stripe + Omise
// ═══════════════════════════════════════════════════════════

// ── Config ────────────────────────────────────────────────
const STRIPE_SECRET_KEY     = process.env.STRIPE_SECRET_KEY || "";
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";
const STRIPE_PUBLISHABLE    = process.env.STRIPE_PUBLISHABLE_KEY || "";
const OMISE_SECRET_KEY      = process.env.OMISE_SECRET_KEY || "";
const OMISE_PUBLIC_KEY      = process.env.OMISE_PUBLIC_KEY || "";
const OMISE_WEBHOOK_SECRET  = process.env.OMISE_WEBHOOK_SECRET || "";
const PAYMENT_SUCCESS_URL   = process.env.PAYMENT_SUCCESS_URL || "/dashboard?payment=success";
const PAYMENT_CANCEL_URL    = process.env.PAYMENT_CANCEL_URL  || "/dashboard?payment=cancel";

function paymentGatewayStatus() {
  return {
    stripe: { enabled: !!STRIPE_SECRET_KEY, testMode: STRIPE_SECRET_KEY.startsWith("sk_test_") },
    omise:  { enabled: !!OMISE_SECRET_KEY,  testMode: OMISE_SECRET_KEY.startsWith("skey_test_") },
    promptpay: { enabled: true },
    manual: { enabled: true },
  };
}

// ── Helper: generate invoice number ──────────────────────
function generateInvoiceNumber() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `INV-${y}${m}${d}-${rand}`;
}

// ── Helper: activate subscription after payment ──────────

app.get("/api/orders", authMW, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1), limit = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const rawRows = await readSheet(fSid(req), "Orders!A:P").catch(() => []);
    let orders = rawRows.slice(1).filter(r => r[1]).map((r, i) => ({
      rowIndex: i + 2, date: r[0], orderId: r[1], name: r[2], phone: r[3], product: r[4], qty: r[5], address: r[6], tax: r[7], note: r[8], status: r[9], platform: r[10], trackingNo: r[11], carrier: r[12], deliveryStatus: r[13], shippedAt: r[14], lineUserId: r[15]
    })).reverse();
    res.json({ success: true, orders: orders.slice(offset, offset + limit), total: orders.length });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

async function activateSubscription(shopId, packageName, periodDays, billingId, gateway) {
  if (!supabase) return;
  const now = new Date();
  const periodEnd = new Date(now.getTime() + periodDays * 86400000);
  // Update shop status
  await supabase.from("shops").update({
    status: "active",
    package_name: packageName,
    expired_at: periodEnd.toISOString(),
    updated_at: now.toISOString(),
  }).eq("id", shopId);
  // Upsert subscription
  const { data: existing } = await supabase.from("subscriptions")
    .select("id").eq("shop_id", shopId).eq("status", "active").maybeSingle();
  if (existing) {
    await supabase.from("subscriptions").update({
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      gateway,
      status: "active",
      updated_at: now.toISOString(),
    }).eq("id", existing.id);
  } else {
    // find package_id
    const { data: pkg } = await supabase.from("packages")
      .select("id").ilike("name", packageName).maybeSingle();
    await supabase.from("subscriptions").insert({
      shop_id: shopId,
      package_id: pkg?.id || null,
      gateway,
      status: "active",
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
    });
  }
}

// ── Helper: log payment event ────────────────────────────
async function logPaymentEvent(gateway, eventType, eventId, payload, shopId, billingId) {
  if (!supabase) return;
  await supabase.from("payment_events").insert({
    gateway, event_type: eventType, event_id: eventId || "",
    payload: payload || {}, shop_id: shopId || null,
    billing_id: billingId || null, processed: true,
  }).catch(e => console.error("logPaymentEvent:", e.message));
}

// ── GET /api/payment/config — ส่ง publishable keys + status ─
app.get("/api/payment/config", authMW, (req, res) => {
  res.json({
    success: true,
    gateways: paymentGatewayStatus(),
    stripe_publishable_key: STRIPE_PUBLISHABLE,
    omise_public_key: OMISE_PUBLIC_KEY,
  });
});

// ── GET /api/payment/subscription — ดู subscription ปัจจุบัน ─
app.get("/api/payment/subscription", authMW, async (req, res) => {
  try {
    if (!supabase) return res.json({ success: true, subscription: null });
    const shopId = req.auth.shopId;
    if (!shopId) return res.status(400).json({ success: false, error: "ไม่พบ shop" });
    const { data } = await supabase.from("subscriptions")
      .select("*, packages(name, price, msg_limit, product_limit)")
      .eq("shop_id", shopId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    res.json({ success: true, subscription: data });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── GET /api/payment/history — ประวัติการชำระเงินของร้าน ─
app.get("/api/payment/history", authMW, async (req, res) => {
  try {
    if (!supabase) return res.json({ success: true, payments: [] });
    const shopId = req.auth.shopId;
    if (!shopId) return res.status(400).json({ success: false, error: "ไม่พบ shop" });
    const { data } = await supabase.from("billing")
      .select("*").eq("shop_id", shopId)
      .order("created_at", { ascending: false }).limit(50);
    res.json({ success: true, payments: data || [] });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── GET /api/payment/packages — ดูแพ็กเกจที่เปิดให้ซื้อ ─
app.get("/api/payment/packages", async (req, res) => {
  try {
    if (!supabase) return res.json({ success: true, packages: [] });
    const { data } = await supabase.from("packages")
      .select("*").eq("is_active", true).order("sort_order", { ascending: true });
    res.json({ success: true, packages: data || [] });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});


// --- 36_STRIPE___Checkout_Session___Webhook.js ---
// ═══════════════════════════════════════════════════════════
//  STRIPE — Checkout Session + Webhook
// ═══════════════════════════════════════════════════════════

// ── POST /api/payment/stripe/checkout — สร้าง Checkout Session ─
app.post("/api/payment/stripe/checkout", authMW, async (req, res) => {
  try {
    if (!STRIPE_SECRET_KEY) return res.status(503).json({ success: false, error: "Stripe ยังไม่ได้เปิดใช้งาน กรุณาตั้งค่า STRIPE_SECRET_KEY" });
    if (!supabase) return res.status(500).json({ success: false, error: "Supabase not configured" });

    const shopId = req.auth.shopId;
    if (!shopId) return res.status(400).json({ success: false, error: "ไม่พบ shop" });

    const { package_id } = req.body;
    if (!package_id) return res.status(400).json({ success: false, error: "กรุณาเลือกแพ็กเกจ" });

    // Get package info
    const { data: pkg } = await supabase.from("packages").select("*").eq("id", package_id).single();
    if (!pkg) return res.status(404).json({ success: false, error: "ไม่พบแพ็กเกจ" });

    // Get or create Stripe customer
    const { data: shop } = await supabase.from("shops").select("id, name, stripe_customer_id").eq("id", shopId).single();
    let customerId = shop?.stripe_customer_id;

    if (!customerId) {
      const custRes = await axios.post("https://api.stripe.com/v1/customers",
        new URLSearchParams({ name: shop.name, metadata: { shop_id: shopId } }).toString(),
        { headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded" } }
      );
      customerId = custRes.data.id;
      await supabase.from("shops").update({ stripe_customer_id: customerId }).eq("id", shopId);
    }

    // Create billing record
    const invoiceNumber = generateInvoiceNumber();
    const { data: bill } = await supabase.from("billing").insert({
      shop_id: shopId, package_name: pkg.name, amount: pkg.price,
      period_start: new Date().toISOString().slice(0, 10),
      period_end: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      status: "pending", gateway: "stripe", invoice_number: invoiceNumber,
      currency: "THB",
    }).select().single();

    // Create Stripe Checkout Session
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const params = new URLSearchParams();
    params.append("mode", "payment");
    params.append("customer", customerId);
    params.append("currency", "thb");
    params.append("line_items[0][price_data][currency]", "thb");
    params.append("line_items[0][price_data][product_data][name]", `BOTIFY ${pkg.name}`);
    params.append("line_items[0][price_data][product_data][description]", pkg.description || `แพ็กเกจ ${pkg.name} — ${pkg.msg_limit} ข้อความ/เดือน`);
    params.append("line_items[0][price_data][unit_amount]", String(pkg.price * 100)); // Stripe uses satang
    params.append("line_items[0][quantity]", "1");
    params.append("metadata[billing_id]", String(bill.id));
    params.append("metadata[shop_id]", shopId);
    params.append("metadata[package_name]", pkg.name);
    params.append("success_url", `${baseUrl}${PAYMENT_SUCCESS_URL}&session_id={CHECKOUT_SESSION_ID}`);
    params.append("cancel_url", `${baseUrl}${PAYMENT_CANCEL_URL}`);

    const sessionRes = await axios.post("https://api.stripe.com/v1/checkout/sessions",
      params.toString(),
      { headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded" } }
    );

    // Save session ID
    await supabase.from("billing").update({ gateway_session_id: sessionRes.data.id }).eq("id", bill.id);

    await logPaymentEvent("stripe", "checkout.created", sessionRes.data.id, { billing_id: bill.id, package: pkg.name }, shopId, bill.id);

    res.json({ success: true, checkout_url: sessionRes.data.url, session_id: sessionRes.data.id, invoice_number: invoiceNumber });
  } catch (err) {
    console.error("Stripe checkout error:", err.response?.data || err.message);
    res.status(500).json({ success: false, error: err.response?.data?.error?.message || err.message });
  }
});

// ── POST /api/payment/webhook/stripe — Stripe Webhook ────
// ⚠️ ต้องใช้ raw body สำหรับ signature verification
app.post("/api/payment/webhook/stripe", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    let event;
    const sig = req.headers["stripe-signature"];

    if (STRIPE_WEBHOOK_SECRET && sig) {
      // Verify signature using crypto (ไม่ต้องพึ่ง stripe library)
      const crypto = require("crypto");
      const payload = req.body.toString();
      const [tHeader, ...sigHeaders] = sig.split(",");
      const timestamp = tHeader.replace("t=", "");
      const expectedSig = sigHeaders.find(s => s.startsWith("v1="));
      if (!expectedSig) return res.status(400).send("Invalid signature header");

      const signedPayload = `${timestamp}.${payload}`;
      const computed = "v1=" + crypto.createHmac("sha256", STRIPE_WEBHOOK_SECRET).update(signedPayload).digest("hex");

      if (computed !== expectedSig) {
        console.error("Stripe webhook signature mismatch");
        return res.status(400).send("Signature verification failed");
      }
      event = JSON.parse(payload);
    } else {
      // Test mode: no signature verification
      event = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    }

    console.log(`💳 Stripe webhook: ${event.type} [${event.id}]`);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const billingId = Number(session.metadata?.billing_id);
        const shopId = session.metadata?.shop_id;
        const packageName = session.metadata?.package_name || "Pro";

        if (billingId && supabase) {
          await supabase.from("billing").update({
            status: "paid", paid_at: new Date().toISOString(),
            gateway_charge_id: session.payment_intent || "",
            payment_method: "stripe", payment_ref: session.id,
            confirmed_by: "stripe_webhook", updated_at: new Date().toISOString(),
          }).eq("id", billingId);

          if (shopId) {
            await activateSubscription(shopId, packageName, 30, billingId, "stripe");
          }
        }
        await logPaymentEvent("stripe", event.type, event.id, session, shopId, billingId);
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object;
        await logPaymentEvent("stripe", event.type, event.id, pi, pi.metadata?.shop_id, Number(pi.metadata?.billing_id) || null);
        break;
      }
      default:
        await logPaymentEvent("stripe", event.type, event.id, event.data?.object || {}, null, null);
    }

    res.json({ received: true });
  } catch (err) {
    console.error("Stripe webhook error:", err.message);
    res.status(400).json({ error: err.message });
  }
});


// --- 37_OMISE___Charge___Webhook.js ---
// ═══════════════════════════════════════════════════════════
//  OMISE — Charge + Webhook
// ═══════════════════════════════════════════════════════════

// ── POST /api/payment/omise/charge — สร้าง Charge (Card/PromptPay) ─
app.post("/api/payment/omise/charge", authMW, async (req, res) => {
  try {
    if (!OMISE_SECRET_KEY) return res.status(503).json({ success: false, error: "Omise ยังไม่ได้เปิดใช้งาน กรุณาตั้งค่า OMISE_SECRET_KEY" });
    if (!supabase) return res.status(500).json({ success: false, error: "Supabase not configured" });

    const shopId = req.auth.shopId;
    if (!shopId) return res.status(400).json({ success: false, error: "ไม่พบ shop" });

    const { package_id, token, source_type } = req.body;
    // token = Omise token from frontend (card) OR source_type = "promptpay" for PromptPay QR
    if (!package_id) return res.status(400).json({ success: false, error: "กรุณาเลือกแพ็กเกจ" });
    if (!token && !source_type) return res.status(400).json({ success: false, error: "กรุณาระบุ token หรือ source_type" });

    const { data: pkg } = await supabase.from("packages").select("*").eq("id", package_id).single();
    if (!pkg) return res.status(404).json({ success: false, error: "ไม่พบแพ็กเกจ" });

    // Create billing record
    const invoiceNumber = generateInvoiceNumber();
    const { data: bill } = await supabase.from("billing").insert({
      shop_id: shopId, package_name: pkg.name, amount: pkg.price,
      period_start: new Date().toISOString().slice(0, 10),
      period_end: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      status: "pending", gateway: "omise", invoice_number: invoiceNumber,
      currency: "THB",
    }).select().single();

    // Build Omise charge params
    const chargeParams = new URLSearchParams();
    chargeParams.append("amount", String(pkg.price * 100)); // Omise uses satang
    chargeParams.append("currency", "thb");
    chargeParams.append("description", `BOTIFY ${pkg.name} — ${invoiceNumber}`);
    chargeParams.append("metadata[billing_id]", String(bill.id));
    chargeParams.append("metadata[shop_id]", shopId);
    chargeParams.append("metadata[package_name]", pkg.name);

    const baseUrl = `${req.protocol}://${req.get("host")}`;

    if (source_type === "promptpay") {
      // Create PromptPay source first
      const srcRes = await axios.post("https://api.omise.co/sources",
        new URLSearchParams({ type: "promptpay", amount: String(pkg.price * 100), currency: "thb" }).toString(),
        { auth: { username: OMISE_SECRET_KEY, password: "" }, headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );
      chargeParams.append("source", srcRes.data.id);
      chargeParams.append("return_uri", `${baseUrl}${PAYMENT_SUCCESS_URL}`);
    } else if (token) {
      chargeParams.append("card", token);
    }

    // Create charge
    const chargeRes = await axios.post("https://api.omise.co/charges",
      chargeParams.toString(),
      { auth: { username: OMISE_SECRET_KEY, password: "" }, headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const charge = chargeRes.data;

    // Update billing with charge ID
    await supabase.from("billing").update({
      gateway_charge_id: charge.id,
      gateway_session_id: charge.source?.id || "",
    }).eq("id", bill.id);

    // If card payment is successful immediately
    if (charge.status === "successful" && charge.paid) {
      await supabase.from("billing").update({
        status: "paid", paid_at: new Date().toISOString(),
        payment_method: "omise_card", payment_ref: charge.id,
        confirmed_by: "omise_auto", updated_at: new Date().toISOString(),
      }).eq("id", bill.id);
      await activateSubscription(shopId, pkg.name, 30, bill.id, "omise");
    }

    await logPaymentEvent("omise", "charge.created", charge.id, { billing_id: bill.id, status: charge.status }, shopId, bill.id);

    // Response — for PromptPay, include QR code URL
    const result = {
      success: true, charge_id: charge.id, status: charge.status,
      invoice_number: invoiceNumber, amount: pkg.price, currency: "THB",
    };
    if (source_type === "promptpay" && charge.source?.scannable_code?.image?.download_uri) {
      result.qr_code_url = charge.source.scannable_code.image.download_uri;
    }
    if (charge.authorize_uri) {
      result.authorize_uri = charge.authorize_uri;
    }

    res.json(result);
  } catch (err) {
    console.error("Omise charge error:", err.response?.data || err.message);
    res.status(500).json({ success: false, error: err.response?.data?.message || err.message });
  }
});

// ── POST /api/payment/webhook/omise — Omise Webhook ──────
app.post("/api/payment/webhook/omise", async (req, res) => {
  try {
    const event = req.body;
    console.log(`💳 Omise webhook: ${event.key} [${event.id}]`);

    if (event.key === "charge.complete") {
      const charge = event.data;
      const billingId = Number(charge.metadata?.billing_id);
      const shopId = charge.metadata?.shop_id;
      const packageName = charge.metadata?.package_name || "Pro";

      if (billingId && supabase) {
        if (charge.status === "successful" && charge.paid) {
          await supabase.from("billing").update({
            status: "paid", paid_at: new Date().toISOString(),
            gateway_charge_id: charge.id,
            payment_method: charge.source?.type === "promptpay" ? "omise_promptpay" : "omise_card",
            payment_ref: charge.id,
            confirmed_by: "omise_webhook", updated_at: new Date().toISOString(),
          }).eq("id", billingId);

          if (shopId) {
            await activateSubscription(shopId, packageName, 30, billingId, "omise");
          }
        } else if (charge.status === "failed") {
          await supabase.from("billing").update({
            status: "failed", updated_at: new Date().toISOString(),
            note: charge.failure_message || "Payment failed",
          }).eq("id", billingId);
        }
      }
      await logPaymentEvent("omise", event.key, event.id, charge, shopId, billingId);
    } else {
      await logPaymentEvent("omise", event.key || "unknown", event.id || "", event.data || {}, null, null);
    }

    res.json({ received: true });
  } catch (err) {
    console.error("Omise webhook error:", err.message);
    res.status(400).json({ error: err.message });
  }
});


// --- 38_MANUAL___BANK_TRANSFER_Payment.js ---
// ═══════════════════════════════════════════════════════════
//  MANUAL / BANK TRANSFER Payment
// ═══════════════════════════════════════════════════════════

// ── POST /api/payment/manual — แจ้งชำระเงินโอน/พร้อมเพย์ ─
app.post("/api/payment/manual", authMW, async (req, res) => {
  try {
    if (!supabase) return res.status(500).json({ success: false, error: "Supabase not configured" });
    const shopId = req.auth.shopId;
    if (!shopId) return res.status(400).json({ success: false, error: "ไม่พบ shop" });

    const { package_id, payment_method, payment_ref, note } = req.body;
    if (!package_id) return res.status(400).json({ success: false, error: "กรุณาเลือกแพ็กเกจ" });

    const { data: pkg } = await supabase.from("packages").select("*").eq("id", package_id).single();
    if (!pkg) return res.status(404).json({ success: false, error: "ไม่พบแพ็กเกจ" });

    const invoiceNumber = generateInvoiceNumber();
    const gateway = payment_method === "promptpay" ? "promptpay" : "bank_transfer";
    const { data: bill, error } = await supabase.from("billing").insert({
      shop_id: shopId, package_name: pkg.name, amount: pkg.price,
      period_start: new Date().toISOString().slice(0, 10),
      period_end: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      status: "pending_review", gateway, invoice_number: invoiceNumber,
      payment_method: sanitize.text(payment_method, 50) || "bank_transfer",
      payment_ref: sanitize.text(payment_ref, 200) || "",
      note: sanitize.text(note, 500) || "",
      currency: "THB",
    }).select().single();

    if (error) return res.status(400).json({ success: false, error: error.message });

    await logPaymentEvent(gateway, "manual.created", invoiceNumber, { billing_id: bill.id, payment_method }, shopId, bill.id);

    // Notify super admin via LINE (if configured)
    const { data: shop } = await supabase.from("shops").select("name").eq("id", shopId).single();
    console.log(`💰 แจ้งชำระเงิน: ${shop?.name || shopId} — ${pkg.name} ฿${pkg.price} (${gateway}) — ${invoiceNumber}`);

    res.json({ success: true, invoice_number: invoiceNumber, bill });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── POST /api/payment/confirm/:billingId — SA ยืนยันการโอน ─
app.post("/api/payment/confirm/:billingId", authMW, async (req, res) => {
  try {
    if (req.auth.role !== "superadmin") return res.status(403).json({ error: "ต้องเป็น Super Admin" });
    if (!supabase) return res.status(500).json({ success: false, error: "Supabase not configured" });

    const billingId = Number(req.params.billingId);
    const { data: bill } = await supabase.from("billing")
      .select("*, shops(name)").eq("id", billingId).single();
    if (!bill) return res.status(404).json({ success: false, error: "ไม่พบรายการ" });

    await supabase.from("billing").update({
      status: "paid", paid_at: new Date().toISOString(),
      confirmed_by: "superadmin", updated_at: new Date().toISOString(),
    }).eq("id", billingId);

    await activateSubscription(bill.shop_id, bill.package_name, 30, billingId, bill.gateway || "manual");
    await logPaymentEvent(bill.gateway || "manual", "payment.confirmed", String(billingId), { confirmed_by: "superadmin" }, bill.shop_id, billingId);

    res.json({ success: true, message: `ยืนยันการชำระเงิน ${bill.invoice_number} เรียบร้อย` });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── GET /api/payment/admin/all — SA ดู payments ทั้งหมด ──
app.get("/api/payment/admin/all", authMW, async (req, res) => {
  try {
    if (req.auth.role !== "superadmin") return res.status(403).json({ error: "ต้องเป็น Super Admin" });
    if (!supabase) return res.json({ success: true, payments: [], summary: {} });

    const { data: payments } = await supabase.from("billing")
      .select("*, shops(name)").order("created_at", { ascending: false }).limit(200);

    // Revenue summary
    const paid = (payments || []).filter(p => p.status === "paid");
    const thisMonth = paid.filter(p => {
      const d = new Date(p.paid_at);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const summary = {
      total_revenue: paid.reduce((s, p) => s + (p.amount || 0), 0),
      month_revenue: thisMonth.reduce((s, p) => s + (p.amount || 0), 0),
      total_paid: paid.length,
      pending_review: (payments || []).filter(p => p.status === "pending_review").length,
      pending: (payments || []).filter(p => p.status === "pending").length,
    };

    res.json({ success: true, payments: payments || [], summary, gateways: paymentGatewayStatus() });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── GET /api/payment/admin/events — SA ดู webhook events ─
app.get("/api/payment/admin/events", authMW, async (req, res) => {
  try {
    if (req.auth.role !== "superadmin") return res.status(403).json({ error: "ต้องเป็น Super Admin" });
    if (!supabase) return res.json({ success: true, events: [] });
    const { data } = await supabase.from("payment_events")
      .select("*").order("created_at", { ascending: false }).limit(100);
    res.json({ success: true, events: data || [] });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// Usage summary for all shops
app.get("/api/usage", authMW, async (req, res) => {
  try {
    if (req.auth.role !== "superadmin") return res.status(403).json({ error: "ต้องเป็น Super Admin" });
    if (!supabase) return res.json({ success: true, usage: [] });
    const { data: shops } = await supabase.from("shops")
      .select("id, name, status, package_name, msg_used_this_month, expired_at");
    const { data: pkgs } = await supabase.from("packages").select("name, msg_limit, product_limit");
    const pkgMap = {};
    (pkgs || []).forEach(p => { pkgMap[p.name.toLowerCase()] = p; });
    const usage = (shops || []).map(s => {
      const pkg = pkgMap[s.package_name || "free"] || { msg_limit: 100, product_limit: 20 };
      return {
        ...s, msg_limit: pkg.msg_limit, product_limit: pkg.product_limit,
        msg_percent: pkg.msg_limit === -1 ? 0 : Math.round((s.msg_used_this_month || 0) / Math.max(1, pkg.msg_limit) * 100),
      };
    });
    res.json({ success: true, usage });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// Shop payment config update
app.put("/api/shops/:id/payment", authMW, async (req, res) => {
  try {
    if (!supabase) return res.status(500).json({ success: false, error: "Supabase not configured" });
    // Validate shop ID
    let shopUUID;
    try { shopUUID = sanitize.uuid(req.params.id); } catch (e) {
      return res.status(400).json({ success: false, error: "Shop ID ไม่ถูกต้อง" });
    }
    // ตรวจสอบสิทธิ์: shop owner ดูได้เฉพาะร้านตัวเอง
    if (req.auth.role !== "superadmin" && req.auth.shopId !== shopUUID) {
      return res.status(403).json({ success: false, error: "ไม่มีสิทธิ์แก้ไขร้านนี้" });
    }
    // Sanitize inputs
    const cleanPay = {
      payment_transfer: sanitize.bool(req.body.payment_transfer),
      payment_promptpay: sanitize.text(req.body.payment_promptpay, 50),
      payment_bank_name: sanitize.text(req.body.payment_bank_name, 100),
      payment_bank_account: sanitize.text(req.body.payment_bank_account, 50),
      payment_bank_acc_name: sanitize.text(req.body.payment_bank_acc_name, 100),
      payment_cod: sanitize.bool(req.body.payment_cod),
      payment_cod_fee: sanitize.text(req.body.payment_cod_fee, 100),
      payment_pickup: sanitize.bool(req.body.payment_pickup),
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from("shops").update(cleanPay)
      .eq("id", shopUUID).select().single();
    if (error) return res.status(400).json({ success: false, error: error.message });
    res.json({ success: true, shop: data });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

// Onboarding — เช็คสถานะ + mark complete
app.get("/api/onboarding", authMW, async (req, res) => {
  try {
    const shopId = req.auth.shopId;
    if (!shopId || !supabase) return res.json({ completed: true }); // superadmin ไม่ต้อง onboard
    const { data } = await supabase.from("shops")
      .select("onboarding_completed, name, line_token, line_bot_id, sheet_id")
      .eq("id", shopId).single();
    if (!data) return res.json({ completed: true });
    res.json({
      completed: !!data.onboarding_completed,
      shop: {
        name: data.name || "",
        hasLine: !!(data.line_token && data.line_bot_id),
        hasSheet: !!data.sheet_id,
      },
    });
  } catch (err) { res.json({ completed: true }); }
});

app.post("/api/onboarding/complete", authMW, async (req, res) => {
  try {
    const shopId = req.auth.shopId;
    if (!shopId || !supabase) return res.json({ success: true });
    await supabase.from("shops").update({
      onboarding_completed: true, updated_at: new Date().toISOString(),
    }).eq("id", shopId);
    res.json({ success: true });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

// เชื่อม LINE OA — อัพเดท token + bot_id ของร้าน
app.put("/api/shops/:id/line", authMW, async (req, res) => {
  try {
    if (!supabase) return res.status(500).json({ success: false, error: "Supabase not configured" });
    let shopUUID;
    try { shopUUID = sanitize.uuid(req.params.id); } catch (e) {
      return res.status(400).json({ success: false, error: "Shop ID ไม่ถูกต้อง" });
    }
    if (req.auth.role !== "superadmin" && req.auth.shopId !== shopUUID) {
      return res.status(403).json({ success: false, error: "ไม่มีสิทธิ์" });
    }
    const line_token = sanitize.text(req.body.line_token, 200);
    const line_bot_id = sanitize.text(req.body.line_bot_id, 100);
    const owner_line_id = sanitize.text(req.body.owner_line_id, 100);
    if (!line_token) return res.status(400).json({ success: false, error: "กรุณาระบุ LINE Channel Access Token" });

    const { data, error } = await supabase.from("shops").update({
      line_token, line_bot_id, owner_line_id,
      updated_at: new Date().toISOString(),
    }).eq("id", shopUUID).select().single();
    if (error) return res.status(400).json({ success: false, error: error.message });
    res.json({ success: true, shop: data });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});




};
