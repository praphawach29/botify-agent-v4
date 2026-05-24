const fs = require('fs');
const file = 'C:/Users/Jack/Documents/botify v4/botify-merged/views/dashboard.html';
let html = fs.readFileSync(file, 'utf8');

const map = {
  'bg-slate-900/60': 'bg-gray-50',
  'bg-slate-900/40': 'bg-gray-50',
  'bg-slate-900/50': 'bg-gray-50',
  'bg-slate-900': 'bg-white',
  'bg-slate-800/60': 'bg-white',
  'bg-slate-800/50': 'bg-white',
  'bg-slate-800/40': 'bg-white',
  'bg-slate-800': 'bg-white',
  'bg-slate-700/50': 'bg-gray-100',
  'bg-slate-700': 'bg-gray-100',
  'border-slate-800': 'border-gray-100',
  'border-slate-700': 'border-gray-200',
  'border-slate-600': 'border-gray-300',
  'border-slate-500': 'border-gray-400',
  'text-slate-200': 'text-gray-800',
  'text-slate-300': 'text-gray-700',
  'text-slate-400': 'text-gray-500',
  'hover:bg-slate-800': 'hover:bg-gray-50',
  'hover:bg-slate-700': 'hover:bg-gray-100',
  'hover:bg-slate-600': 'hover:bg-gray-200',
  'hover:text-white': 'hover:text-gray-900',
  'divide-slate-800': 'divide-gray-100',
  'divide-slate-700': 'divide-gray-200',
  'ring-slate-700': 'ring-gray-200',
  'ring-slate-800': 'ring-gray-100',
};

// Regex to find class="xyz" or className="xyz"
let modified = html.replace(/class(?:Name)?=["']([^"']+)["']/g, (match, classes) => {
  let tokens = classes.split(/\s+/);
  let hasDarkBg = false;
  
  if (tokens.some(t => /^bg-(blue|emerald|red|green|purple|indigo|amber|orange)-[567]00/.test(t) || t === 'bg-[#111827]' || t === 'bg-amber-600')) {
    hasDarkBg = true;
  }
  
  let newTokens = tokens.map(t => {
    if (map[t]) return map[t];
    if (t === 'text-white') return hasDarkBg ? 'text-white' : 'text-gray-900';
    if (t === 'text-slate-500') return 'text-gray-400';
    return t;
  });
  
  return match.replace(classes, newTokens.join(' '));
});

// There is also an inline style definition inside `ShopSettings` and other places, e.g. `const inputCls = "w-full bg-slate-900/60 border border-slate-600 ... text-white";`
// Since that uses string literals instead of class="", we need to replace it there too.
modified = modified.replace(/const\s+inputCls\s*=\s*["']([^"']+)["']/g, (match, classes) => {
  let tokens = classes.split(/\s+/);
  let newTokens = tokens.map(t => {
    if (map[t]) return map[t];
    if (t === 'text-white') return 'text-gray-900';
    return t;
  });
  return match.replace(classes, newTokens.join(' '));
});

// Also there might be `className={"px-4 py-2 ... " + (cond ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white")}`
// Let's replace strings inside JS logic that contain slate colors.
modified = modified.replace(/["']([^"']+)["']/g, (match, str) => {
  if (match.includes('class') || match.includes('px-') || match.includes('bg-slate') || match.includes('text-slate')) {
    let tokens = str.split(/\s+/);
    let changed = false;
    let hasDarkBg = tokens.some(t => /^bg-(blue|emerald|red|green|purple|indigo|amber|orange)-[567]00/.test(t) || t === 'bg-[#111827]' || t === 'bg-amber-600');
    let newTokens = tokens.map(t => {
      if (map[t]) { changed = true; return map[t]; }
      if (t === 'text-white') { 
        if (!hasDarkBg) { changed = true; return 'text-gray-900'; }
      }
      return t;
    });
    if (changed) {
      return match[0] + newTokens.join(' ') + match[match.length - 1]; // keep original quote marks
    }
  }
  return match;
});

fs.writeFileSync(file + '.bak', html);
fs.writeFileSync(file, modified);
console.log('Replaced dark classes. Saved backup as dashboard.html.bak');
