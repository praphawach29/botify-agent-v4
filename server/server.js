require("dotenv").config({ path: "../.env" });
const app = require("./app");

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 BOTIFY AI (Refactored) — port ${PORT}`);
  console.log("✅ MVC Architecture Initialized");
});
