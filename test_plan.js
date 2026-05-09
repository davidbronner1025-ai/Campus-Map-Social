const fs = require('fs');
const content = fs.readFileSync('artifacts/admin-panel/src/pages/locations.tsx', 'utf-8');

// Find all buttons without aria-label and have an icon child (or only icon child)
const lines = content.split('\n');
let findings = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('<button') && !line.includes('aria-label')) {
    // Check next few lines for icon components (like <X, <Trash2, <Search)
    const context = lines.slice(i, i + 3).join(' ');
    if (context.includes('<X ') || context.includes('<Trash2 ') || context.includes('<Layers ')) {
      findings.push(`Line ${i + 1}: ${line.trim()}`);
    }
  }
}

console.log(findings.join('\n'));
