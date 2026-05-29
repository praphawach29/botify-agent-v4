const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "";

let supabase = null;
let supabaseAuth = null; // Separate client for auth

if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });
  supabaseAuth = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  console.log("🔐 Supabase Auth: ✅ Connected");
} else {
  console.log("🔐 Supabase Auth: ❌ Not configured (API Key auth only)");
}

module.exports = {
  supabase,
  supabaseAuth,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
};
