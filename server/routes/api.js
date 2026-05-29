module.exports = function(app) {

// Auto-generated from chunks
const { supabase } = require("../config/db");
const { ADMIN_API_KEY, getClientByShopId, getFirstClient } = require("../config/globals");
const { authMW, fSid } = require("../middleware/auth");
const { clearCache, statusCache } = require("../utils/helpers");
const { readSheet, writeSheet, appendSheet } = require("../services/sheetService");

// --- 30_Dashboard_API.js ---
// ═══════════════════════════════════════════════════════════
//  Dashboard API
// ═══════════════════════════════════════════════════════════

// ─── Team Management Routes (Phase 5) ──────────────────────
app.get("/api/team", authMW, async (req, res) => {
  try {
    if (!req.auth.shopId) return res.status(400).json({ error: "No workspace selected" });
    const { data: users, error } = await supabase
      .from("users")
      .select("id, name, email, role, created_at")
      .eq("workspace_id", req.auth.shopId)
      .order("created_at", { ascending: true });
    
    if (error) throw error;
    res.json({ success: true, team: users });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/team/invite", authMW, async (req, res) => {
  try {
    if (req.auth.role !== "owner" && req.auth.role !== "superadmin") {
      return res.status(403).json({ error: "Only owners can invite team members" });
    }
    const { email, password, name, role } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: "Missing required fields" });
    
    const targetRole = role === "owner" ? "owner" : "staff";
    
    // 1. Create User in Supabase Auth
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: name, workspace_id: req.auth.shopId }
    });
    
    if (authErr) throw authErr;
    
    // 2. Insert into users table
    const { error: dbErr } = await supabase.from("users").insert({
      id: authData.user.id,
      email,
      name,
      workspace_id: req.auth.shopId,
      role: targetRole,
      password_hash: "supabase_auth"
    });
    
    if (dbErr) throw dbErr;
    
    res.json({ success: true, message: "เพิ่มทีมงานสำเร็จ" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete("/api/team/:id", authMW, async (req, res) => {
  try {
    if (req.auth.role !== "owner" && req.auth.role !== "superadmin") {
      return res.status(403).json({ error: "Only owners can remove team members" });
    }
    const targetId = req.params.id;
    if (targetId === req.auth.userId) {
      return res.status(400).json({ error: "Cannot remove yourself" });
    }
    
    // Check if target is in the same workspace
    const { data: targetUser } = await supabase
      .from("users")
      .select("workspace_id")
      .eq("id", targetId)
      .single();
      
    if (!targetUser || targetUser.workspace_id !== req.auth.shopId) {
      return res.status(404).json({ error: "User not found in this workspace" });
    }

    // 1. Delete from users table (Cascade will not delete Auth user automatically)
    await supabase.from("users").delete().eq("id", targetId);
    
    // 2. Delete from Supabase Auth
    await supabase.auth.admin.deleteUser(targetId);
    
    res.json({ success: true, message: "ลบทีมงานสำเร็จ" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// ─── Auth Routes ที่ต้องใช้ authMW ──────────────────────────
app.get("/api/auth/me", authMW, (req, res) => {
  res.json(req.auth);
});

app.post("/api/auth/change-password", authMW, async (req, res) => {
  try {
    if (!supabase) return res.status(500).json({ success: false, error: "Supabase not configured" });
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, error: "รหัสผ่านต้องมีอย่างน้อย 6 ตัว" });
    }
    await supabase.auth.admin.updateUserById(req.auth.userId, { password: newPassword });
    res.json({ success: true, message: "เปลี่ยนรหัสผ่านสำเร็จ" });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Token Refresh — ใช้ refresh_token เพื่อต่ออายุ session โดยไม่ต้อง login ใหม่
app.post("/api/auth/refresh", async (req, res) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) {
      return res.status(400).json({ success: false, error: "refresh_token is required" });
    }
    if (!supabaseAuth) {
      return res.status(500).json({ success: false, error: "Supabase ยังไม่ได้ตั้งค่า" });
    }

    const { data, error } = await supabaseAuth.auth.refreshSession({ refresh_token });
    if (error || !data.session) {
      return res.status(401).json({ success: false, error: "Refresh token หมดอายุ กรุณาเข้าสู่ระบบใหม่" });
    }

    // ดึง profile เพื่อ return role/shopId ล่าสุด
    const { data: profile } = await supabase
      .from("users")
      .select("role, workspace_id, name, shops(name, business_type)")
      .eq("id", data.user.id)
      .single();

    res.json({
      success: true,
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      role: profile?.role || "admin",
      shopId: profile?.workspace_id || null,
      shopName: profile?.shops?.name || null,
      bizType: profile?.shops?.business_type || "retail",
      displayName: profile?.name || data.user.email,
      avatarUrl: data.user?.user_metadata?.avatar_url || null,
    });
  } catch (err) {
    res.status(401).json({ success: false, error: err.message });
  }
});

// Logout — ทำลาย session ฝั่ง server
app.post("/api/auth/logout", authMW, async (req, res) => {
  try {
    // ถ้ามี token ให้ signOut จาก Supabase
    if (supabaseAuth && req.auth.mode === "supabase") {
      await supabaseAuth.auth.signOut();
    }
    res.json({ success: true, message: "ออกจากระบบสำเร็จ" });
  } catch (err) {
    res.json({ success: true }); // ไม่ว่าจะ error ก็ให้ logout ได้
  }
});

app.post("/api/auth/create-user", authMW, async (req, res) => {
  try {
    if (req.auth.role !== "superadmin") return res.status(403).json({ error: "ต้องเป็น Super Admin" });
    if (!supabase) return res.status(500).json({ success: false, error: "Supabase not configured" });
    const { email, password, displayName, shopId, role } = req.body;
    // Input validation
    let cleanEmail, cleanPass, cleanName;
    try {
      cleanEmail = sanitize.email(email);
      cleanPass = sanitize.password(password);
      cleanName = sanitize.text(displayName, 100) || cleanEmail;
      if (shopId) sanitize.uuid(shopId);
    } catch (e) {
      return res.status(400).json({ success: false, error: e.message });
    }
    const cleanRole = ["superadmin", "shop_owner"].includes(role) ? role : "shop_owner";
    const { data, error } = await supabase.auth.admin.createUser({
      email: cleanEmail, password: cleanPass, email_confirm: true,
      user_metadata: { display_name: cleanName, shop_id: shopId },
    });
    if (error) return res.status(400).json({ success: false, error: error.message });
    await supabase.from("profiles").upsert({
      id: data.user.id, email: cleanEmail, display_name: cleanName,
      shop_id: shopId || null, role: cleanRole,
    });
    res.json({ success: true, user: { id: data.user.id, email: cleanEmail, displayName: cleanName, role: cleanRole } });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.put("/api/auth/update-user", authMW, async (req, res) => {
  try {
    if (req.auth.role !== "superadmin") return res.status(403).json({ error: "ต้องเป็น Super Admin" });
    if (!supabase) return res.status(500).json({ success: false, error: "Supabase not configured" });
    const { userId, displayName, shopId, role, password } = req.body;
    if (!userId) return res.status(400).json({ success: false, error: "userId is required" });
    // Update Supabase Auth user (password + metadata)
    const authUpdate = { user_metadata: { display_name: displayName, shop_id: shopId } };
    if (password) authUpdate.password = password;
    const { error: authErr } = await supabase.auth.admin.updateUserById(userId, authUpdate);
    if (authErr) return res.status(400).json({ success: false, error: authErr.message });
    // Update profiles table
    await supabase.from("profiles").upsert({
      id: userId, display_name: displayName,
      shop_id: shopId || null, role: role || "shop_owner",
    });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get("/api/auth/users", authMW, async (req, res) => {
  try {
    if (req.auth.role !== "superadmin") return res.status(403).json({ error: "ต้องเป็น Super Admin" });
    if (!supabase) return res.status(500).json({ success: false, error: "Supabase not configured" });
    const { data: profiles } = await supabase.from("users").select("id, name, email, role, workspace_id, created_at, shops(name)");
    res.json({ success: true, users: profiles || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// --- 41____CHAT_HISTORY_API.js ---
// ═══════════════════════════════════════════════════════════
//  💬 CHAT HISTORY API
// ═══════════════════════════════════════════════════════════
app.get("/api/chats", authMW, async (req, res) => {
  try {
    const shopId = req.auth.role === "superadmin" ? (req.query.shop_id || null) : req.auth.shopId;
    if (!shopId || !supabase) return res.json({ chats: [], total: 0 });

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 50);
    const offset = (page - 1) * limit;
    const search = (req.query.search || "").trim();
    const platform = (req.query.platform || "").trim();

    let query = supabase.from("chat_logs")
      .select("*", { count: "exact" })
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (platform) query = query.eq("platform", platform);
    if (search) query = query.or(`message.ilike.%${search}%,user_name.ilike.%${search}%,user_id.ilike.%${search}%`);

    const { data, count, error } = await query;
    if (error) return res.status(400).json({ error: error.message });
    res.json({ chats: data || [], total: count || 0, page, limit });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// รายชื่อลูกค้าที่เคยแชท (unique users)
app.get("/api/chats/users", authMW, async (req, res) => {
  try {
    const shopId = req.auth.role === "superadmin" ? (req.query.shop_id || null) : req.auth.shopId;
    if (!shopId || !supabase) return res.json({ users: [] });

    const { data, error } = await supabase.rpc("get_chat_users", { p_shop_id: shopId });
    if (error) {
      // Fallback: ดึงจาก chat_logs ตรง ๆ ถ้ายังไม่มี rpc function
      const { data: logs } = await supabase.from("chat_logs")
        .select("user_id, user_name, platform, created_at")
        .eq("shop_id", shopId)
        .eq("direction", "in")
        .order("created_at", { ascending: false })
        .limit(500);

      const userMap = {};
      (logs || []).forEach(l => {
        if (!userMap[l.user_id]) {
          userMap[l.user_id] = { user_id: l.user_id, user_name: l.user_name, platform: l.platform, last_message_at: l.created_at, message_count: 0 };
        }
        userMap[l.user_id].message_count++;
      });
      return res.json({ users: Object.values(userMap).sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at)) });
    }
    res.json({ users: data || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ประวัติแชทของ user คนเดียว
app.get("/api/chats/:userId", authMW, async (req, res) => {
  try {
    const shopId = req.auth.role === "superadmin" ? (req.query.shop_id || null) : req.auth.shopId;
    if (!shopId || !supabase) return res.json({ messages: [] });

    const { data, error } = await supabase.from("chat_logs")
      .select("*")
      .eq("shop_id", shopId)
      .eq("user_id", req.params.userId)
      .order("created_at", { ascending: true })
      .limit(200);

    if (error) return res.status(400).json({ error: error.message });
    res.json({ messages: data || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/stats", authMW, async (req,res) => {
  try {
    const sid=fSid(req);
    const [oRows,pRows,iRows]=await Promise.all([readSheet(sid,"Orders!A:K").catch(()=>[]),readSheet(sid,"Products!A:F").catch(()=>[]),readSheet(sid,"Inquiries!A:A").catch(()=>[])]);
    const orders=oRows.slice(1).filter(r=>r[1]),low=pRows.slice(1).filter(r=>!isNaN(r[5])&&r[5]!==""&&parseInt(r[5])<=LOW_STOCK_LIMIT);
    const orderStats = { 'ส่งแล้ว': 0, 'จัดส่ง': 0, 'รอ': 0, 'ยกเลิก': 0 };
    orders.forEach(r => {
      const s = r[9] || '';
      if (s.includes('ส่งแล้ว')) orderStats['ส่งแล้ว']++;
      else if (s.includes('จัดส่ง')) orderStats['จัดส่ง']++;
      else if (s.includes('ยกเลิก')) orderStats['ยกเลิก']++;
      else orderStats['รอ']++;
    });
    let shopInfo = {};
    if (supabase && req.auth.shopId) {
      const { data } = await supabase.from('shops').select('package_name, ai_credits, expired_at').eq('id', req.auth.shopId).single();
      if (data) shopInfo = data;
    }
    res.json({totalOrders:orders.length,pendingOrders:orderStats['รอ'],orderStats,todayMsgs:Math.max(0,iRows.length-1),activeBots:activeClients.length||1,lowStock:low.length,lowStockItems:low.slice(0,5).map(r=>({name:r[1],stock:r[5]})), shopInfo});
  } catch(e){res.status(500).json({error:e.message});}
});

// Analytics Chart Data
app.get("/api/analytics/chart", authMW, async (req,res) => {
  try {
    const sid = fSid(req);
    const period = req.query.period || 'รายเดือน';
    const [oRows, iRows] = await Promise.all([
      readSheet(sid, "Orders!A:K").catch(() => []),
      readSheet(sid, "Inquiries!A:E").catch(() => [])
    ]);

    const orders = oRows.slice(1).filter(r => r[0]);
    const inquiries = iRows.slice(1).filter(r => r[0]);

    let labels = [], chatData = [], botData = [], orderData = [];

    const parseThaiDate = (str) => {
      if (!str) return new Date();
      const parts = str.split(' ')[0].split('/');
      if (parts.length < 3) return new Date();
      let d = parseInt(parts[0], 10), m = parseInt(parts[1], 10) - 1, y = parseInt(parts[2], 10);
      if (y > 2500) y -= 543;
      return new Date(y, m, d);
    };

    if (period === 'รายสัปดาห์') {
      const today = new Date();
      today.setHours(0,0,0,0);
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        labels.push(`${d.getDate()}/${d.getMonth()+1}`);
        chatData.push(0); botData.push(0); orderData.push(0);
      }
      
      inquiries.forEach(row => {
        const d = parseThaiDate(row[0]);
        d.setHours(0,0,0,0);
        const diffDays = Math.floor((today - d) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= 6) {
          const idx = 6 - diffDays;
          chatData[idx]++;
          if (row[4] && row[4].trim() !== '') botData[idx]++;
        }
      });
      orders.forEach(row => {
        const d = parseThaiDate(row[0]);
        d.setHours(0,0,0,0);
        const diffDays = Math.floor((today - d) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= 6) {
          orderData[6 - diffDays]++;
        }
      });
    } else {
      labels = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
      chatData = Array(12).fill(0); botData = Array(12).fill(0); orderData = Array(12).fill(0);
      const currentYear = new Date().getFullYear();

      inquiries.forEach(row => {
        const d = parseThaiDate(row[0]);
        if (d.getFullYear() === currentYear) {
          chatData[d.getMonth()]++;
          if (row[4] && row[4].trim() !== '') botData[d.getMonth()]++;
        }
      });
      orders.forEach(row => {
        const d = parseThaiDate(row[0]);
        if (d.getFullYear() === currentYear) {
          orderData[d.getMonth()]++;
        }
      });
    }

    res.json({ labels, chatData, botData, orderData });
  } catch(e) {
    console.error("CHART ERROR:", e.stack);
    res.status(500).json({error:e.message});
  }
});

// Products CRUD (ใช้ Supabase แทน Google Sheets)
app.get("/api/products", authMW, async (req,res) => {
  try {
    if (!req.auth.shopId) return res.status(404).json({error:"ไม่พบ Workspace"});

    const { data, error } = await supabase.from("products").select("*").eq("shop_id", req.auth.shopId).order("created_at", { ascending: true });
    if (error) throw error;

    // แปลงข้อมูลกลับไปให้อยู่ในฟอร์แมตที่ Frontend ของ Dashboard เข้าใจได้ง่าย (ดึงค่าจาก metadata ออกมา)
    const formattedProducts = data.map(p => ({
      id: p.id,
      rowIndex: p.id, // ใช้ id แทน rowIndex ใน V4
      name: p.name,
      category: p.category,
      priceUsed: p.price_used,
      priceNew: p.price_new,
      stock: p.stock,
      paper: p.metadata?.paper || "",
      port: p.metadata?.port || "",
      suitable: p.metadata?.suitable || "",
      feature: p.metadata?.feature || "",
      warranty: p.metadata?.warranty || "",
      note: p.metadata?.note || "",
      knowledge: p.metadata?.knowledge || "",
      linkBuy: p.link_buy || "",
      linkDriver: p.link_driver || "",
      imageUrl: p.image_url || ""
    }));

    res.json({ products: formattedProducts });
  } catch(e) { res.status(500).json({error:e.message}); }
});

app.post("/api/products", authMW, async (req,res) => {
  try {
    if (!req.auth.shopId) return res.status(404).json({error:"ไม่พบ Workspace"});

    const b = req.body;
    const name = sanitize.text(b.name, 200);
    if (!name) return res.status(400).json({error:"ต้องการชื่อสินค้า"});

    const metadata = {
      paper: sanitize.text(b.paper, 100),
      port: sanitize.text(b.port, 100),
      suitable: sanitize.text(b.suitable, 200),
      feature: sanitize.text(b.feature, 500),
      warranty: sanitize.text(b.warranty, 200),
      note: sanitize.text(b.note, 500),
      knowledge: sanitize.text(b.knowledge, 1500)
    };

    const { error } = await supabase.from("products").insert([{
      shop_id: req.auth.shopId,
      sku: `P${Date.now().toString().slice(-4)}`,
      name: name,
      category: sanitize.text(b.category, 100) || "อื่นๆ",
      price_used: sanitize.text(b.priceUsed, 50),
      price_new: sanitize.text(b.priceNew, 50),
      stock: sanitize.text(b.stock, 50) || "มี",
      link_buy: sanitize.url(b.linkBuy),
      link_driver: sanitize.url(b.linkDriver),
      image_url: sanitize.url(b.imageUrl),
      metadata: metadata
    }]);

    if (error) throw error;
    clearCache(); res.json({success:true});
  } catch(e) { res.status(500).json({error:e.message}); }
});

app.put("/api/products/:id", authMW, async (req,res) => {
  try {
    const id = req.params.id;
    const b = req.body;
    
    const metadata = {
      paper: sanitize.text(b.paper, 100),
      port: sanitize.text(b.port, 100),
      suitable: sanitize.text(b.suitable, 200),
      feature: sanitize.text(b.feature, 500),
      warranty: sanitize.text(b.warranty, 200),
      note: sanitize.text(b.note, 500),
      knowledge: sanitize.text(b.knowledge, 1500)
    };

    const { error } = await supabase.from("products").update({
      name: sanitize.text(b.name, 200),
      category: sanitize.text(b.category, 100) || "อื่นๆ",
      price_used: sanitize.text(b.priceUsed, 50),
      price_new: sanitize.text(b.priceNew, 50),
      stock: sanitize.text(b.stock, 50) || "มี",
      link_buy: sanitize.url(b.linkBuy),
      link_driver: sanitize.url(b.linkDriver),
      image_url: sanitize.url(b.imageUrl),
      metadata: metadata,
      updated_at: new Date().toISOString()
    }).eq("id", id).eq("shop_id", req.auth.shopId);

    if (error) throw error;
    clearCache(); res.json({success:true});
  } catch(e) { res.status(500).json({error:e.message}); }
});

app.delete("/api/products/:id", authMW, async (req,res) => {
  try {
    const { error } = await supabase.from("products").delete().eq("id", req.params.id).eq("shop_id", req.auth.shopId);
    if (error) throw error;
    clearCache(); res.json({success:true});
  } catch(e) { res.status(500).json({error:e.message}); }
});

app.get("/api/orders", authMW, async (req,res) => {
  try {
    const {limit,status}=req.query;
    let orders=(await readSheet(fSid(req),"Orders!A:P")).slice(1).filter(r=>r[1]).map((r,i)=>({rowIndex:i+2,date:r[0],orderId:r[1],name:r[2],phone:r[3],product:r[4],qty:r[5],address:r[6],tax:r[7],note:r[8],status:r[9],platform:r[10],trackingNo:r[11],carrier:r[12],deliveryStatus:r[13],shippedAt:r[14],lineUserId:r[15]})).reverse();
    if(status) orders=orders.filter(o=>o.status===status);
    if(limit) orders=orders.slice(0,parseInt(limit));
    res.json({orders});
  } catch(e){res.status(500).json({error:e.message});}
});
app.put("/api/orders/:ri/status", authMW, async (req,res) => { try{await writeSheet(fSid(req),`Orders!J${req.params.ri}`,[[req.body.status]]);res.json({success:true});}catch(e){res.status(500).json({error:e.message});} });
app.post("/api/orders/tracking", authMW, async (req,res) => {
  try {
    const {orderId,trackingNo,carrier}=req.body;
    if(!orderId||!trackingNo||!carrier) return res.status(400).json({error:"ต้องการ orderId, trackingNo, carrier"});
    let found=null;
    for(const c of activeClients){const r=await findOrder(c.sheetId,orderId);if(r){found={c,r};break;}}
    if(!found) return res.status(404).json({error:`ไม่พบออเดอร์ ${orderId}`});
    const{c,r}=found, ci=CARRIERS[carrier.toLowerCase()]||{name:carrier,track:""};
    await updateTracking(c.sheetId,r.rowIndex,trackingNo,carrier,r.data[15]||"");
    const msg=`📦 จัดส่งแล้วครับ!\n${"─".repeat(24)}\n🆔 ${orderId}\n🚚 ${ci.name}\n📝 ${trackingNo}\n${ci.track?`🔍 ${ci.track}${trackingNo}\n`:""}\nขอบคุณครับ 🙏`;
    if(r.data[15]&&c.lineToken) await linePush(c.lineToken,r.data[15],msg);
    res.json({success:true,message:"อัพเดท + แจ้งลูกค้าแล้วครับ"});
  } catch(e){res.status(500).json({error:e.message});}
});

app.get("/api/clients", authMW, async (req,res) => { try{const rows=await readSheet(fSid(req),"Clients!A:H");res.json({clients:rows.slice(1).filter(r=>r[0]).map((r,i)=>({rowIndex:i+2,clientId:r[0],shopName:r[1],lineToken:r[2],status:r[3]||"active",expiry:r[4],package:r[5],note:r[6],ownerLineId:r[7]}))});}catch(e){res.status(500).json({error:e.message});} });
app.post("/api/clients", authMW, async (req,res) => { try{const{shopName,lineToken,status,expiry,package:pkg,note,ownerLineId}=req.body;if(!shopName)return res.status(400).json({error:"ต้องการชื่อร้าน"});await appendSheet(fSid(req),"Clients!A:H",[[`client_${Date.now().toString().slice(-6)}`,shopName,lineToken||"",status||"active",expiry||"",pkg||"Pro ฿2,500/เดือน",note||"",ownerLineId||""]]);res.json({success:true});}catch(e){res.status(500).json({error:e.message});} });
app.put("/api/clients/:ri", authMW, async (req,res) => { try{const{shopName,lineToken,status,expiry,package:pkg,note,ownerLineId}=req.body;await writeSheet(fSid(req),`Clients!B${req.params.ri}:H${req.params.ri}`,[[shopName||"",lineToken||"",status||"active",expiry||"",pkg||"",note||"",ownerLineId||""]]);Object.keys(statusCache).forEach(k=>delete statusCache[k]);res.json({success:true});}catch(e){res.status(500).json({error:e.message});} });

app.get("/api/promotions", authMW, async (req,res) => { try{const rows=await readSheet(fSid(req),"Promotions!A:G");res.json({promotions:rows.slice(1).filter(r=>r[0]).map((r,i)=>({rowIndex:i+2,promoId:r[0],promoName:r[1],promoText:r[2],startDate:r[3],endDate:r[4],target:r[5],sent:r[6]}))});}catch(e){res.status(500).json({error:e.message});} });
app.post("/api/promotions", authMW, async (req,res) => { try{const{promoId,promoName,promoText,startDate,endDate,target,sent}=req.body;if(!promoName||!promoText)return res.status(400).json({error:"ต้องการชื่อและข้อความ"});await appendSheet(fSid(req),"Promotions!A:G",[[promoId||`PROMO-${Date.now().toString().slice(-6)}`,promoName,promoText,startDate||"",endDate||"",target||"all",sent||"no"]]);res.json({success:true});}catch(e){res.status(500).json({error:e.message});} });
app.put("/api/promotions/:ri", authMW, async (req,res) => { try{const{promoId,promoName,promoText,startDate,endDate,target,sent}=req.body;await writeSheet(fSid(req),`Promotions!A${req.params.ri}:G${req.params.ri}`,[[promoId||"",promoName||"",promoText||"",startDate||"",endDate||"",target||"all",sent||"no"]]);res.json({success:true});}catch(e){res.status(500).json({error:e.message});} });

app.post("/api/promotions/:ri/broadcast", authMW, async (req, res) => {
  try {
    const ri = parseInt(req.params.ri);
    if (!ri || isNaN(ri)) return res.status(400).json({ error: "Invalid Row Index" });

    // 1. Get Promo Details
    const rows = await readSheet(fSid(req), `Promotions!A${ri}:G${ri}`);
    if (!rows || rows.length === 0) return res.status(404).json({ error: "ไม่พบโปรโมชัน" });
    const promo = rows[0];
    const promoText = promo[2];
    if (!promoText) return res.status(400).json({ error: "โปรโมชันนี้ไม่มีข้อความ" });

    // 2. Get Shop Details
    const { data: shop } = await supabase.from("shops").select("line_token").eq("id", req.auth.shopId).single();
    if (!shop || !shop.line_token) return res.status(400).json({ error: "ร้านค้านี้ยังไม่ได้ตั้งค่า LINE Token" });

    // 3. Get Customers with line_id
    const { data: customers } = await supabase.from("customers")
      .select("line_id")
      .eq("workspace_id", req.auth.shopId)
      .not("line_id", "is", null)
      .neq("line_id", "");
      
    if (!customers || customers.length === 0) {
      return res.status(400).json({ error: "ไม่พบลูกค้าระบบที่มี LINE ID ให้ส่งข้อความ" });
    }

    const lineIds = [...new Set(customers.map(c => c.line_id))]; // Unique

    // 4. Send via Multicast in chunks of 500
    let successCount = 0;
    const CHUNK_SIZE = 500;
    for (let i = 0; i < lineIds.length; i += CHUNK_SIZE) {
      const chunk = lineIds.slice(i, i + CHUNK_SIZE);
      const ok = await lineMulticast(shop.line_token, chunk, promoText);
      if (ok) successCount += chunk.length;
      await new Promise(r => setTimeout(r, 1000)); // Delay between chunks
    }

    // 5. Mark as sent
    promo[6] = "yes";
    await writeSheet(fSid(req), `Promotions!A${ri}:G${ri}`, [promo]);

    res.json({ success: true, totalTarget: lineIds.length, sentCount: successCount });
  } catch(e) {
    console.error("Broadcast Error:", e.message);
    res.status(500).json({ error: e.message });
  }
});
app.get("/api/shopinfo", authMW, async (req,res) => {
  try {
    const info = {};
    if (supabase && req.auth.shopId) {
      const { data: shop } = await supabase.from("shops").select("name, phone, ai_provider, system_prompt, personality, custom_ai_model, package_name, custom_ai_key").eq("id", req.auth.shopId).single();
      if (shop) {
        if (shop.name) info.SHOP_NAME = shop.name;
        if (shop.phone) info.PHONE = shop.phone;
        info.AI_PROVIDER = shop.ai_provider || "claude";
        info.PERSONALITY = shop.personality || "หญิง-สุภาพ";
        info.SYSTEM_PROMPT = shop.system_prompt || "";
        info.AI_MODEL = shop.custom_ai_model || "";
        info.PACKAGE_NAME = shop.package_name || "free";
        info.CUSTOM_AI_KEY = shop.custom_ai_key || "";
      }
    }
    try {
      const rows=await readSheet(fSid(req),"ShopInfo!A:B");
      if(rows && rows.length > 1) {
        rows.slice(1).forEach(([k,v])=>{if(k)info[k.trim()]=v||""});
      }
    } catch(err) {} // Ignore sheet errors
    res.json({info});
  } catch(e){
    res.status(500).json({error:e.message});
  } 
});

app.put("/api/shopinfo", authMW, async (req,res) => {
  try {
    const{info}=req.body;
    if (!info || typeof info !== "object") return res.status(400).json({error:"ข้อมูลไม่ถูกต้อง"});
    
    const cleanInfo = {};
    for (const [key, val] of Object.entries(info)) {
      const cleanKey = sanitize.text(key, 50);
      if (cleanKey) cleanInfo[cleanKey] = sanitize.text(val, 1000) || "";
    }

    if (supabase && req.auth.shopId) {
      const updateData = {};
      if (cleanInfo.SHOP_NAME !== undefined) updateData.name = cleanInfo.SHOP_NAME;
      if (cleanInfo.PHONE !== undefined) updateData.phone = cleanInfo.PHONE;
      if (cleanInfo.AI_PROVIDER !== undefined) updateData.ai_provider = cleanInfo.AI_PROVIDER;
      if (cleanInfo.PERSONALITY !== undefined) updateData.personality = cleanInfo.PERSONALITY;
      if (cleanInfo.SYSTEM_PROMPT !== undefined) updateData.system_prompt = cleanInfo.SYSTEM_PROMPT;
      if (cleanInfo.AI_MODEL !== undefined) updateData.custom_ai_model = cleanInfo.AI_MODEL;
      if (cleanInfo.CUSTOM_AI_KEY !== undefined) updateData.custom_ai_key = cleanInfo.CUSTOM_AI_KEY;
      
      if (Object.keys(updateData).length > 0) {
        updateData.updated_at = new Date().toISOString();
        await supabase.from("shops").update(updateData).eq("id", req.auth.shopId);
      }
    }

    try {
      const sid=fSid(req),rows=await readSheet(sid,"ShopInfo!A:B");
      if (rows) {
        const existing=rows.slice(1).map(r=>r[0]?.trim()).filter(Boolean);
        for(let i=1;i<rows.length;i++){const key=rows[i][0]?.trim();if(key&&cleanInfo.hasOwnProperty(key))await writeSheet(sid,`ShopInfo!B${i+1}`,[[cleanInfo[key]||""]]);}
        for(const[key,val]of Object.entries(cleanInfo)){if(!existing.includes(key)&&val)await appendSheet(sid,"ShopInfo!A:B",[[key,val]]);}
      }
    } catch(err) {} // Ignore sheet errors
    
    clearCache(); res.json({success:true});
  } catch(e){
    res.status(500).json({error:e.message});
  }
});

// ─── Sync: รับข้อมูลจาก Sheet → Supabase ──────────────
app.post("/api/sync", authMW, async (req, res) => {
  try {
    const { type, shopId: inputShopId } = req.body;
    const targetShopId = inputShopId || req.auth.shopId;
    
    // ดึง workspace ของร้านนี้
    const { data: workspace } = await supabase.from("shops").select("*").eq(inputShopId ? "line_bot_id" : "id", targetShopId).single();
    if (!workspace) return res.status(404).json({error:"ไม่พบ Workspace"});

    if (type === "products" || !type) {
      // ดึงข้อมูลจาก Google Sheets
      const sheetId = workspace.sheet_id;
      if (!sheetId) return res.status(400).json({error:"ยังไม่ได้ตั้งค่า Google Sheet ID"});
      
      const rows = await readSheet(sheetId, "Products!A:O");
      if (rows && rows.length > 1) {
        // ลบข้อมูลเก่าใน Supabase แล้วใส่ข้อมูลใหม่จาก Sheet เพื่อ Sync ทับ
        await supabase.from("products").delete().eq("shop_id", workspace.id);
        
        const insertData = rows.slice(1).filter(r => r[1]).map(r => ({
          shop_id: workspace.id,
          sku: r[0] || `P${Date.now().toString().slice(-4)}`,
          name: r[1],
          category: r[2] || "อื่นๆ",
          price_used: r[3],
          price_new: r[4],
          stock: r[5] || "มี",
          metadata: {
            col_6: r[6] || "",
            col_7: r[7] || "",
            col_8: r[8] || "",
            col_9: r[9] || "",
            col_10: r[10] || "",
            col_11: r[11] || ""
          },
          link_buy: r[12] || "",
          link_driver: r[13] || "",
          image_url: r[14] || ""
        }));
        
        const chunk = 50;
        for (let i = 0; i < insertData.length; i += chunk) {
          await supabase.from("products").insert(insertData.slice(i, i + chunk));
        }
      }
    }
    
    clearCache();
    await Promise.all(activeClients.map(c => getPromptData(c).catch(() => null)));
    res.json({ success: true, message: "Sync ข้อมูลจาก Google Sheet สำเร็จแล้ว" });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ─── Bookings POST (for Dashboard modal) ─────────────────────
// ─── Shops API (for Supabase multi-tenant dashboard) ────────
app.get("/api/shops", authMW, async (req, res) => {
  try {
    if (req.auth.role !== "superadmin") return res.status(403).json({ error: "ต้องเป็น Super Admin" });
    if (supabase) {
      const { data, error } = await supabase.from("shops").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return res.json({ shops: data || [] });
    }
    // Fallback: ใช้ CLIENTS config
    res.json({ shops: activeClients.map((c, i) => ({ id: c.shopId || (i + 1), name: c.name, status: "active" })) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/shops", authMW, async (req, res) => {
  try {
    if (!supabase) return res.status(500).json({ error: "Supabase not configured" });
    if (req.auth.role !== "superadmin") return res.status(403).json({ error: "ต้องเป็น Super Admin" });
    
    const { name, phone, status, personality, ai_provider, line_token, line_bot_id, owner_line_id, sheet_id } = req.body;
    if (!name) return res.status(400).json({ error: "ต้องระบุชื่อร้าน" });
    const shopSlug = await ensureUniqueSlug(supabase, generateSlug(name));
    const { data, error } = await supabase
      .from("shops")
      .insert({ 
        name, 
        phone: phone || null, 
        status: status || "active", 
        slug: shopSlug,
        personality: personality || 'ชาย-สุภาพ',
        ai_provider: ai_provider || 'claude',
        line_token: line_token || null,
        line_bot_id: line_bot_id || null,
        owner_line_id: owner_line_id || null,
        sheet_id: sheet_id || null
      })
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, shop: data });
  } catch(e) { res.status(400).json({ error: e.message }); }
});

app.put("/api/shops/:id", authMW, async (req, res) => {
  try {
    if (!supabase) return res.status(500).json({ error: "Supabase not configured" });
    if (req.auth.role !== "superadmin") return res.status(403).json({ error: "ต้องเป็น Super Admin" });
    
    const { name, package: pkg, status, expiry_date, line_token, line_bot_id, owner_line_id, ai_provider, sheet_id, ai_credits, system_prompt } = req.body;
    
    const updateData = { 
      updated_at: new Date().toISOString() 
    };
    if (name !== undefined) updateData.name = name;
    if (pkg !== undefined) updateData.package_name = pkg;
    if (status !== undefined) updateData.status = status;
    if (expiry_date !== undefined) {
      updateData.plan_expires_at = expiry_date || null;
      updateData.trial_expires_at = expiry_date || null; // fallback update both for simplicity
    }
    if (line_token !== undefined) updateData.line_token = line_token || null;
    if (line_bot_id !== undefined) updateData.line_bot_id = line_bot_id || null;
    if (owner_line_id !== undefined) updateData.owner_line_id = owner_line_id || null;
    if (ai_provider !== undefined) updateData.ai_provider = ai_provider;
    if (sheet_id !== undefined) updateData.sheet_id = sheet_id || null;
    if (ai_credits !== undefined) updateData.ai_credits = ai_credits;
    if (system_prompt !== undefined) updateData.system_prompt = system_prompt;

    const { data, error } = await supabase.from("shops").update(updateData).eq("id", req.params.id).select().single();
    if (error) throw error;
    res.json({ success: true, shop: data });
  } catch(e) { res.status(400).json({ error: e.message }); }
});

app.get("/api/admin/stats", authMW, async (req, res) => {
  try {
    if (req.auth.role !== "superadmin") return res.status(403).json({ error: "Forbidden" });

    // 1. Fetch Users Count
    // Safe fallback if users table fails
    let totalUsers = 0;
    try {
      const { count } = await supabase.from("users").select("*", { count: "exact", head: true });
      totalUsers = count || 0;
    } catch(e) {}

    // 2. Fetch Shops for Stats
    // Removed trial_expires_at and plan_expires_at to prevent crashing on older schemas
    const { data: allShops } = await supabase.from("shops").select("id, name, package_name, created_at, status");
    const totalShops = allShops ? allShops.length : 0;
    if (!totalUsers) totalUsers = totalShops;
    
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    let expiringShops = 0;
    // Without expires_at, we just assume 0 for now to prevent crashes
    
    const recentShops = allShops ? [...allShops].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5) : [];

    // 3. Fetch Payments (or Billing) for Revenue MRR
    let bills = [];
    try {
      // Try billing table first, then payments if needed
      const bResp = await supabase.from("billing").select("amount, created_at").eq("status", "paid");
      if (bResp.data) bills = bResp.data;
      else {
        const pResp = await supabase.from("payments").select("amount, created_at").eq("status", "paid");
        if (pResp.data) bills = pResp.data;
      }
    } catch(e) {}
    
    let currentMonthRevenue = 0;
    const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    
    const revenueData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      revenueData.push({ month: months[d.getMonth()], year: d.getFullYear(), value: 0 });
    }

    if (bills && bills.length > 0) {
      bills.forEach(p => {
        const d = new Date(p.created_at);
        const amountBaht = (p.amount || 0); // Assuming amount is in baht or close enough
        if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
          currentMonthRevenue += amountBaht;
        }
        const bucket = revenueData.find(b => b.month === months[d.getMonth()] && b.year === d.getFullYear());
        if (bucket) bucket.value += amountBaht;
      });
    }

    res.json({
      success: true,
      stats: {
        totalShops,
        totalUsers: totalUsers || 0,
        expiringShops,
        currentMonthRevenue,
        revenueData,
        recentShops
      }
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/admin/generate-prompt", authMW, async (req, res) => {
  try {
    const { brandIdea } = req.body;
    if (!brandIdea) return res.status(400).json({ error: "ต้องระบุ brandIdea" });
    
    // Using Claude 3.5 Sonnet directly for Prompt Generation (or fallback to top model)
    const { callAI } = require('../services/aiService');
    const systemPrompt = "คุณคือผู้เชี่ยวชาญด้านการเขียน System Prompt สำหรับ AI Chatbot ร้านค้าออนไลน์ หน้าที่ของคุณคือการนำ 'แนวคิด (Brand Idea)' ที่ผู้ใช้ให้มา เขียนเป็น System Prompt ที่ละเอียด รัดกุม และพร้อมใช้งานได้ทันที เน้นเรื่องบุคลิกภาพ การตอบคำถาม และกฎการขาย (ให้ตอบกลับมาเฉพาะเนื้อหา Prompt เท่านั้น ห้ามมีคำเกริ่นนำหรือคำอธิบายเพิ่มเติมใดๆ)";
    
    // Call the global model (use claude / openai as configured globally)
    const reply = await callAI("claude", "claude-3-5-sonnet-20241022", "", systemPrompt, [{ role: "user", content: `แนวคิดร้าน: ${brandIdea}` }]);
    res.json({ success: true, prompt: reply.trim() });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/bookings", authMW, async (req, res) => {
  try {
    const { name, phone, service, date, time, note } = req.body;
    if (!name || !service || !date || !time) return res.status(400).json({ error: "ต้องระบุ ชื่อ, บริการ, วันที่, เวลา" });
    const bookingId = await genBookingId(fSid(req));
    await appendSheet(fSid(req), "Bookings!A:K", [[
      bookingId,
      new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" }),
      name, phone || "-", service, date, time,
      "รอยืนยัน", "Dashboard", "", note || "",
    ]]);
    res.json({ success: true, bookingId });
  } catch(e) { res.status(500).json({ error: e.message }); }
});


// --- 51_API_-_Customers.js ---
// ═══════════════════════════════════════════════════════════
//  API - Customers
// ═══════════════════════════════════════════════════════════
app.get("/api/customers", authMW, async (req, res) => {
  try {
    if (!supabase) return res.json({ customers: [] });
    const { data, error } = await supabase.from("customers").select("*").eq("workspace_id", req.auth.shopId).order("created_at", { ascending: false });
    if (error) throw error;
    res.json({ customers: data || [] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/customers", authMW, async (req, res) => {
  try {
    if (!supabase) return res.status(500).json({ error: "No DB" });
    const { name, phone, email, address, tax_id, line_id } = req.body;
    if (!name) return res.status(400).json({ error: "Missing name" });
    const { data, error } = await supabase.from("customers").insert([{ workspace_id: req.auth.shopId, name, phone, email, address, tax_id, line_id }]).select();
    if (error) throw error;
    res.json({ success: true, customer: data[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put("/api/customers/:id", authMW, async (req, res) => {
  try {
    if (!supabase) return res.status(500).json({ error: "No DB" });
    const { name, phone, email, address, tax_id, line_id } = req.body;
    const { error } = await supabase.from("customers").update({ name, phone, email, address, tax_id, line_id, updated_at: new Date() }).eq("id", req.params.id).eq("workspace_id", req.auth.shopId);
    if (error) throw error;
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});


// --- 52_API_-_Documents__Quotations__Receipts__etc__.js ---
// ═══════════════════════════════════════════════════════════
//  API - Documents (Quotations, Receipts, etc.)
// ═══════════════════════════════════════════════════════════
app.get("/api/documents", authMW, async (req, res) => {
  try {
    if (!supabase) return res.json({ documents: [] });
    const { data, error } = await supabase.from("documents").select("*, customers(name)").eq("workspace_id", req.auth.shopId).order("created_at", { ascending: false });
    if (error) throw error;
    res.json({ documents: data || [] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/documents", authMW, async (req, res) => {
  try {
    if (!supabase) return res.status(500).json({ error: "No DB" });
    const { doc_type, customer_id, customer_info, items, subtotal, tax, discount, total, note } = req.body;
    // Generate Doc No
    const prefix = { "quotation": "QT", "receipt": "RE", "billing": "IV", "delivery": "DO" }[doc_type] || "DOC";
    const doc_no = `${prefix}${new Date().toISOString().slice(2, 10).replace(/-/g, "")}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    
    const { data, error } = await supabase.from("documents").insert([{
      workspace_id: req.auth.shopId, doc_no, doc_type, customer_id, customer_info, items, subtotal, tax, discount, total, note
    }]).select();
    if (error) throw error;
    res.json({ success: true, document: data[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/documents/:id/send", authMW, async (req, res) => {
  try {
    if (!supabase) return res.status(500).json({ error: "No DB" });
    const { id } = req.params;
    const { method, to_line_id, to_email } = req.body; // method = 'line' or 'email'
    
    const { data: doc, error } = await supabase.from("documents").select("*").eq("id", id).eq("workspace_id", req.auth.shopId).single();
    if (error || !doc) return res.status(404).json({ error: "Document not found" });

    const docUrl = `https://${req.get("host")}/doc/${id}`; // Web Link
    const typeName = { "quotation": "ใบเสนอราคา", "receipt": "ใบเสร็จรับเงิน", "billing": "ใบวางบิล", "delivery": "ใบส่งของ" }[doc.doc_type] || "เอกสาร";
    const msgText = `เรียนลูกค้า,\nทางร้านได้ออก${typeName} เลขที่ ${doc.doc_no} เรียบร้อยแล้วครับ\n\n📄 คลิกเพื่อดูหรือดาวน์โหลดเอกสาร:\n${docUrl}\n\nขอบคุณที่ใช้บริการครับ`;

    if (method === "line" && to_line_id) {
      const client = activeClients.find(c => c.shopId === req.auth.shopId);
      if (client?.lineToken) {
        await linePush(client.lineToken, to_line_id, msgText);
      } else {
        return res.status(400).json({ error: "LINE Token not configured" });
      }
    } else if (method === "email" && to_email) {
      // ── ส่งเอกสารทาง Email ด้วย Resend ────────────────────
      const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
      const SMTP_FROM      = process.env.SMTP_FROM || "BOTIFY <noreply@botify.app>";
      if (!RESEND_API_KEY) {
        return res.status(503).json({ error: "ยังไม่ได้ตั้งค่า RESEND_API_KEY — ไม่สามารถส่ง Email ได้" });
      }
      const { Resend } = require("resend");
      const resendClient = new Resend(RESEND_API_KEY);
      const emailHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
        body{font-family:system-ui,sans-serif;background:#f8fafc;margin:0;padding:20px}
        .card{max-width:500px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #e2e8f0}
        .logo{font-size:22px;font-weight:800;color:#1e293b;margin-bottom:20px}.logo span{color:#fbbf24}
        h2{color:#1e293b;font-size:18px;margin:0 0 12px}
        p{color:#64748b;font-size:14px;line-height:1.6;margin:0 0 16px}
        .btn{display:inline-block;background:linear-gradient(135deg,#3b82f6,#6366f1);color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px}
        .footer{color:#94a3b8;font-size:11px;margin-top:24px;text-align:center}
      </style></head><body><div class="card">
        <div class="logo">BOT<span>IFY</span></div>
        <h2>📄 ${typeName} เลขที่ ${doc.doc_no}</h2>
        <p>เรียนลูกค้า,<br>ทางร้านได้ออก${typeName} เลขที่ <strong>${doc.doc_no}</strong> เรียบร้อยแล้วครับ<br>กรุณากดปุ่มด้านล่างเพื่อดูหรือดาวน์โหลดเอกสาร</p>
        <a href="${docUrl}" class="btn">📄 ดูเอกสาร</a>
        <p class="footer">ขอบคุณที่ใช้บริการครับ<br>BOTIFY — AI Chatbot Platform</p>
      </div></body></html>`;
      const { error: emailErr } = await resendClient.emails.send({
        from: SMTP_FROM,
        to: [to_email],
        subject: `${typeName} เลขที่ ${doc.doc_no}`,
        html: emailHtml,
      });
      if (emailErr) return res.status(500).json({ error: "ส่ง Email ไม่สำเร็จ: " + emailErr.message });
      console.log(`📧 Document email sent: ${doc.doc_no} → ${to_email}`);
    }
    
    await supabase.from("documents").update({ status: "sent" }).eq("id", id);
    res.json({ success: true, url: docUrl });
  } catch (e) { res.status(500).json({ error: e.message }); }
});




};
