import fs from 'fs';
import path from 'path';
import parser from '@babel/parser';
import _traverse from '@babel/traverse';
import { fileURLToPath } from 'url';

const traverse = _traverse.default || _traverse;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filesToExport = [
  'config/globals.js',
  'utils/helpers.js',
  'services/aiService.js',
  'services/sheetService.js',
  'services/notificationService.js',
  'services/bookingService.js'
];

filesToExport.forEach(relPath => {
  const filePath = path.join(__dirname, relPath);
  if (!fs.existsSync(filePath)) return;
  
  const code = fs.readFileSync(filePath, 'utf8');
  
  // Use loose parsing to tolerate some non-module syntax if any
  const ast = parser.parse(code, {
    sourceType: 'module',
    allowReturnOutsideFunction: true
  });
  
  const exportsList = new Set();
  
  traverse(ast, {
    FunctionDeclaration(p) {
      if (p.node.id && p.parent.type === 'Program') {
        exportsList.add(p.node.id.name);
      }
    },
    VariableDeclaration(p) {
      if (p.parent.type === 'Program') {
        p.node.declarations.forEach(decl => {
          if (decl.id && decl.id.name) {
            exportsList.add(decl.id.name);
          } else if (decl.id && decl.id.type === 'ObjectPattern') {
             decl.id.properties.forEach(prop => {
                 if (prop.value && prop.value.name) exportsList.add(prop.value.name);
             });
          }
        });
      }
    }
  });
  
  if (exportsList.size > 0) {
    const exportStatement = `\nmodule.exports = { ${Array.from(exportsList).join(', ')} };\n`;
    if (!code.includes('module.exports = {')) {
      fs.writeFileSync(filePath, code + exportStatement);
      console.log(`Added exports to ${relPath}:`, Array.from(exportsList).join(', '));
    }
  }
});
