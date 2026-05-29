import fs from 'fs';
let html = fs.readFileSync('../views/dashboard.html', 'utf8');
let start = html.indexOf('const { useState');
let end = html.lastIndexOf('</script>');
let jsx = html.slice(start, end);
jsx = "import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';\n" + jsx;

// Replace root rendering from ReactDOM.createRoot
// The original html had ReactDOM.createRoot(document.getElementById("root")).render(<App />);
// Let's remove it because main.jsx handles it.
jsx = jsx.replace(/const root = ReactDOM\.createRoot[\s\S]*?root\.render\(<App \/>\);/, 'export default App;');

fs.writeFileSync('./src/App.jsx', jsx);
