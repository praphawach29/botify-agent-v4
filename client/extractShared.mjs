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

// We want to extract: Icon, Icons, TokenManager, api, Toast, Loader, DropdownSelect, Field, Modal
const toExtractFunctions = ['Toast', 'Loader', 'DropdownSelect', 'Field', 'Modal', 'Icon', 'api'];
const toExtractVars = ['Icons', 'TokenManager'];

const extracted = {};

traverse(ast, {
  FunctionDeclaration(path) {
    if (path.node.id && toExtractFunctions.includes(path.node.id.name)) {
      extracted[path.node.id.name] = generate(path.node).code;
      path.remove();
    }
  },
  VariableDeclaration(path) {
    path.node.declarations.forEach(decl => {
      if (decl.id && (toExtractVars.includes(decl.id.name) || toExtractFunctions.includes(decl.id.name))) {
        extracted[decl.id.name] = generate(path.node).code;
        path.remove();
      }
    });
  }
});

let sharedCode = `import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';\n\nconst API_BASE = "";\n\n`;

for (const [name, compCode] of Object.entries(extracted)) {
  sharedCode += `export ${compCode}\n\n`;
}

// Write to Shared.jsx
if (!fs.existsSync('./src/components')) fs.mkdirSync('./src/components', { recursive: true });
fs.writeFileSync('./src/components/Shared.jsx', sharedCode);

// Add imports to App.jsx
let newAppCode = generate(ast).code;
const namesToImport = Object.keys(extracted).join(', ');
newAppCode = `import { ${namesToImport} } from './components/Shared';\n` + newAppCode;

fs.writeFileSync('./src/App.jsx', newAppCode);
console.log('Shared components extracted.');
