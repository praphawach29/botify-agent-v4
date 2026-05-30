require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const app = require("./app");

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 BOTIFY AI (Refactored) — port ${PORT}`);
  console.log("✅ MVC Architecture Initialized");
});
