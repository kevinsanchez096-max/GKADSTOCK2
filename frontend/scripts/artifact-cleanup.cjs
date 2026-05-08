const fs = require('fs');
const path = require('path');

const COMPONENTS_DIR = path.join(__dirname, '../src/components');

const REPLACEMENTS = [
  [/\/\s*\[\d+\.\d+\]/g, ''], // Matches /[0.02] etc
  [/\/\s*\[0\.\d+\]/g, ''],
  [/\bdivide-slate-\d+\/\d+\b/g, 'divide-border'],
  [/\bbg-slate-\d+\/\d+\b/g, 'bg-muted'],
  [/\bborder-slate-\d+\/\d+\b/g, 'border-border'],
];

function processFile(filePath) {
  if (!filePath.endsWith('.tsx')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  
  for (const [pattern, replacement] of REPLACEMENTS) {
    content = content.replace(pattern, replacement);
  }
  
  // Clean up any double spaces that might have been created
  content = content.replace(/className="([^"]*)"/g, (match, p1) => {
    let cleaned = p1.replace(/\s+/g, ' ').trim();
    return `className="${cleaned}"`;
  });
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ ${path.basename(filePath)}`);
  }
}

function walkDir(dir) {
  fs.readdirSync(dir).forEach(f => {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walkDir(p);
    else processFile(p);
  });
}

walkDir(COMPONENTS_DIR);
console.log('\\nArtifact cleanup completado.');
