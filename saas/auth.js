// ================================================================
//  saas/auth.js — JWT Authentication + Password Helpers
//  ต้องตั้ง env: JWT_SECRET (string ลับ ยาวๆ อย่าง random)
// ================================================================
const jwt    = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const JWT_SECRET  = process.env.JWT_SECRET || "botify-change-this-secret-in-production";
const JWT_EXPIRES = "30d";

// ── Token ─────────────────────────────────────────────────────

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

// ── Password ──────────────────────────────────────────────────

async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

// ── Express Middleware ────────────────────────────────────────

/**
 * jwtMiddleware — ตรวจ Bearer token จาก Authorization header
 * ถ้าผ่าน → ใส่ req.auth = { userId, workspaceId, role }
 */
function jwtMiddleware(req, res, next) {
  const header = req.headers["authorization"] || "";
  const token  = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "กรุณาเข้าสู่ระบบก่อนใช้งาน" });
  }

  try {
    req.auth = verifyToken(token);
    next();
  } catch (e) {
    return res.status(401).json({ error: "Session หมดอายุ กรุณาเข้าสู่ระบบใหม่" });
  }
}

/**
 * requireRole — ตรวจว่า role ถูกต้องไหม (ใช้หลัง jwtMiddleware)
 * ตัวอย่าง: router.delete('/user/:id', jwtMiddleware, requireRole('owner'), ...)
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.auth?.role)) {
      return res.status(403).json({ error: "ไม่มีสิทธิ์ดำเนินการนี้" });
    }
    next();
  };
}

module.exports = { signToken, verifyToken, hashPassword, comparePassword, jwtMiddleware, requireRole };
