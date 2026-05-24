const fs = require('fs');
const file = 'C:/Users/Jack/Documents/botify v4/botify-merged/views/dashboard.html';
let html = fs.readFileSync(file, 'utf8');

// Fix Tabs in Orders & Bookings
html = html.replace(/"bg-blue-600\/30 border-blue-500 text-blue-300"/g, '"bg-blue-50 border-blue-500 text-blue-700"');

// Fix text color in modal inputs (Field component)
html = html.replace(/text-white text-sm outline-none focus:border-blue-500 transition"/g, 'text-gray-900 text-sm outline-none focus:border-blue-500 transition"');

// Fix Payment page styling
// We can just replace the specific hardcoded dark colors
html = html.replace(/rgba\(30,41,59,0\.6\)/g, '#ffffff');
html = html.replace(/rgba\(51,65,85,0\.5\)/g, '#e5e7eb');
html = html.replace(/rgba\(51,65,85,0\.3\)/g, '#f3f4f6');
html = html.replace(/color: "#60a5fa"/g, 'color: "#3b82f6"'); // Package price
html = html.replace(/color: "#e2e8f0"/g, 'color: "#111827"'); // History text
html = html.replace(/color: "#94a3b8"/g, 'color: "#6b7280"'); // History secondary text / table headers
html = html.replace(/rgba\(100,116,139,0\.3\)/g, '#e5e7eb'); // Disabled button bg
html = html.replace(/"#94a3b8" \? "#fff" : "#fff"/g, 'pkg.price === 0 ? "#6b7280" : "#fff"'); // Fix text color logic in button if messed up. Actually it's `pkg.price === 0 ? "#94a3b8" : "#fff"`.
html = html.replace(/color: pkg.price === 0 \? "#94a3b8" : "#fff"/g, 'color: pkg.price === 0 ? "#6b7280" : "#fff"');

fs.writeFileSync(file, html);
console.log("Fixed UI colors");
