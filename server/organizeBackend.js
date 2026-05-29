const fs = require('fs');
const path = require('path');

const chunksDir = path.join(__dirname, 'chunks');
const routesDir = path.join(__dirname, 'routes');
const servicesDir = path.join(__dirname, 'services');
const middlewaresDir = path.join(__dirname, 'middlewares');
const configDir = path.join(__dirname, 'config');

[routesDir, servicesDir, middlewaresDir, configDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Groupings
const groupings = {
  'routes/auth.js': ['28', '29'],
  'routes/api.js': ['30', '41', '51', '52'],
  'routes/webhook.js': ['26', '27'],
  'routes/payment.js': ['35', '36', '37', '38'],
  'routes/admin.js': ['31', '32', '33', '34', '39', '40'],
  'routes/misc.js': ['43', '44', '45', '46', '47', '53'],
  'services/aiService.js': ['08', '24', '25', '21'],
  'services/sheetService.js': ['10'],
  'services/notificationService.js': ['12', '13', '14', '20'],
  'services/bookingService.js': ['23'],
  'utils/helpers.js': ['02', '03', '11', '16'],
  'config/globals.js': ['05', '07'],
};

for (const [targetFile, chunkPrefixes] of Object.entries(groupings)) {
  const targetPath = path.join(__dirname, targetFile);
  let content = `// Auto-generated from chunks\n\n`;
  
  const files = fs.readdirSync(chunksDir);
  for (const prefix of chunkPrefixes) {
    const chunkFile = files.find(f => f.startsWith(prefix + '_'));
    if (chunkFile) {
      content += `// --- ${chunkFile} ---\n`;
      content += fs.readFileSync(path.join(chunksDir, chunkFile), 'utf8') + '\n\n';
    }
  }
  
  // Ensure target dir exists
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  
  fs.writeFileSync(targetPath, content);
  console.log(`Generated ${targetFile}`);
}

console.log('Backend code has been organized into MVC folders!');
