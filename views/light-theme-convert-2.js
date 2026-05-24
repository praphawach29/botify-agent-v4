const fs = require('fs');
const file = 'C:/Users/Jack/Documents/botify v4/botify-merged/views/dashboard.html';
let html = fs.readFileSync(file, 'utf8');

// Global replacements of the remaining specific classes in JS string literals
html = html.replace(/bg-slate-900\/60/g, 'bg-gray-50');
html = html.replace(/bg-slate-900\/40/g, 'bg-gray-50');
html = html.replace(/bg-slate-900\/50/g, 'bg-gray-50');
html = html.replace(/bg-slate-900/g, 'bg-white');

html = html.replace(/bg-slate-800\/60/g, 'bg-white');
html = html.replace(/bg-slate-800\/50/g, 'bg-white');
html = html.replace(/bg-slate-800\/40/g, 'bg-white');
html = html.replace(/bg-slate-800/g, 'bg-white border border-gray-200'); // Adding border here makes tabs look better

html = html.replace(/bg-slate-700\/50/g, 'bg-gray-100');
html = html.replace(/bg-slate-700/g, 'bg-gray-100');

html = html.replace(/border-slate-800/g, 'border-gray-100');
html = html.replace(/border-slate-700/g, 'border-gray-200');
html = html.replace(/border-slate-600/g, 'border-gray-300');
html = html.replace(/border-slate-500/g, 'border-gray-400');

html = html.replace(/text-slate-200/g, 'text-gray-800');
html = html.replace(/text-slate-300/g, 'text-gray-700');
html = html.replace(/text-slate-400/g, 'text-gray-500');

html = html.replace(/hover:bg-slate-800/g, 'hover:bg-gray-50');
html = html.replace(/hover:bg-slate-700/g, 'hover:bg-gray-100');
html = html.replace(/hover:bg-slate-600/g, 'hover:bg-gray-200');
html = html.replace(/hover:text-slate-300/g, 'hover:text-gray-700');
html = html.replace(/hover:text-white/g, 'hover:text-gray-900'); // We must be careful but mostly hover:text-white is on dark elements

html = html.replace(/divide-slate-800/g, 'divide-gray-100');
html = html.replace(/divide-slate-700/g, 'divide-gray-200');
html = html.replace(/ring-slate-700/g, 'ring-gray-200');
html = html.replace(/ring-slate-800/g, 'ring-gray-100');

// Fix text-white inside tab buttons 
html = html.replace(/"bg-white border border-gray-200 text-gray-500 hover:text-gray-900"/g, '"bg-white text-gray-500 hover:text-gray-900"'); // Remove border from button
html = html.replace(/bg-blue-600 text-gray-900/g, 'bg-blue-600 text-white'); // Revert buttons

fs.writeFileSync(file, html);
console.log('Replaced more dark classes.');
