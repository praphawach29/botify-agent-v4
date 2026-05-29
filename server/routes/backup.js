const archiver = require("archiver");
const { parse } = require("json2csv");
const { authMW } = require("../middleware/auth");
const { supabase } = require("../config/db");

module.exports = function(app) {
  // ─── Shop Owner Backup ─────────────────────────────────────
  app.get("/api/backup/shop", authMW, async (req, res) => {
    try {
      const shopId = req.auth.shopId;
      if (!shopId || !supabase) {
        return res.status(400).json({ error: "ไม่พบร้าน หรือไม่ได้ต่อ Database" });
      }

      // ดึงข้อมูล
      const [productsRes, ordersRes, customersRes] = await Promise.all([
        supabase.from("products").select("*").eq("shop_id", shopId),
        supabase.from("orders").select("*").eq("shop_id", shopId),
        supabase.from("customers").select("*").eq("workspace_id", shopId)
      ]);

      const archive = archiver("zip", { zlib: { level: 9 } });
      res.attachment(`botify_backup_shop_${new Date().toISOString().slice(0,10)}.zip`);
      archive.pipe(res);

      if (productsRes.data && productsRes.data.length > 0) {
        archive.append(parse(productsRes.data), { name: "products.csv" });
      } else {
        archive.append("No data", { name: "products.csv" });
      }

      if (ordersRes.data && ordersRes.data.length > 0) {
        archive.append(parse(ordersRes.data), { name: "orders.csv" });
      } else {
        archive.append("No data", { name: "orders.csv" });
      }

      if (customersRes.data && customersRes.data.length > 0) {
        archive.append(parse(customersRes.data), { name: "customers.csv" });
      } else {
        archive.append("No data", { name: "customers.csv" });
      }

      archive.finalize();
    } catch (e) {
      if (!res.headersSent) res.status(500).json({ error: e.message });
    }
  });

  // ─── Super Admin Backup ────────────────────────────────────
  app.get("/api/backup/admin", authMW, async (req, res) => {
    try {
      if (req.auth.role !== "superadmin") {
        return res.status(403).json({ error: "ต้องเป็น Super Admin เท่านั้น" });
      }
      if (!supabase) return res.status(400).json({ error: "ไม่ได้ต่อ Database" });

      const [shopsRes, billingRes, usersRes] = await Promise.all([
        supabase.from("shops").select("*"),
        supabase.from("billing").select("*"),
        supabase.from("users").select("id, role, workspace_id, name")
      ]);

      const archive = archiver("zip", { zlib: { level: 9 } });
      res.attachment(`botify_backup_admin_${new Date().toISOString().slice(0,10)}.zip`);
      archive.pipe(res);

      archive.append(shopsRes.data ? parse(shopsRes.data) : "No data", { name: "shops.csv" });
      archive.append(billingRes.data ? parse(billingRes.data) : "No data", { name: "billing.csv" });
      archive.append(usersRes.data ? parse(usersRes.data) : "No data", { name: "users.csv" });

      archive.finalize();
    } catch (e) {
      if (!res.headersSent) res.status(500).json({ error: e.message });
    }
  });
};
