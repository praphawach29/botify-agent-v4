import fs from 'fs';
import parser from '@babel/parser';
import _traverse from '@babel/traverse';
import _generate from '@babel/generator';

const traverse = _traverse.default || _traverse;
const generate = _generate.default || _generate;

const code = fs.readFileSync('./src/App.jsx', 'utf8');

const ast = parser.parse(code, {
  sourceType: 'module',
  plugins: ['jsx']
});

const pagesToExtract = [
  'LoginScreen', 'SmoothAreaChart', 'StatsPage', 'ShopSettings', 'BotConfig', 
  'PromotionsPage', 'BookingsPage', 'ChannelSettingsPage', 'NotificationSettingsPage', 
  'ChatHistoryPage', 'ShopManagementPage', 'SADashboardPage', 'PackageManagementPage', 
  'AIKeyInput', 'AIManagementPage', 'BillingPage', 'BroadcastPage', 'ActivityLogPage', 
  'OnboardingWizard', 'UserManagementPage', 'ShopPicker', 'PaymentPage', 'SAPaymentPage', 
  'CustomerManagementPage', 'DocumentPreview', 'DocumentsPage'
];
const extractedComponents = {};

traverse(ast, {
  FunctionDeclaration(path) {
    if (path.node.id && pagesToExtract.includes(path.node.id.name)) {
      const name = path.node.id.name;
      const componentCode = generate(path.node).code;
      extractedComponents[name] = componentCode;
      
      // Remove from App.jsx
      path.remove();
    }
  }
});

if (!fs.existsSync('./src/pages')) fs.mkdirSync('./src/pages', { recursive: true });

for (const [name, compCode] of Object.entries(extractedComponents)) {
  const content = `import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';\nimport { Icon, Icons, api, TokenManager, Loader, Toast, Modal, Field, DropdownSelect } from '../components/Shared';\n\nexport default ${compCode}\n`;
  fs.writeFileSync(`./src/pages/${name}.jsx`, content);
  console.log(`Extracted ${name}.jsx`);
}

let newAppCode = generate(ast).code;

const imports = Object.keys(extractedComponents).map(name => `import ${name} from './pages/${name}';`).join('\n');
newAppCode = imports + '\n\n' + newAppCode;

fs.writeFileSync('./src/App.jsx', newAppCode);
console.log('App.jsx updated with all pages');
