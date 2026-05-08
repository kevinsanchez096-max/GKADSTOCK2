const fs = require('fs');
const path = require('path');

const COMPONENTS_DIR = path.join(__dirname, '../src/components');

// Replace all opacity-based text tokens that are invisible in light mode
const REPLACEMENTS = [
  [/\btext-foreground\/10\b/g, 'text-muted-foreground'],
  [/\btext-foreground\/20\b/g, 'text-muted-foreground'],
  [/\btext-foreground\/30\b/g, 'text-muted-foreground'],
  [/\btext-foreground\/40\b/g, 'text-muted-foreground'],
  [/\bbg-card\/\[0\.0[1-9]\]\b/g, 'bg-card'],
  [/\bbg-card\/5\b/g, 'bg-card'],
  [/\bbg-white\/\[0\.0[1-9]\]\b/g, 'bg-muted'],
];

function processFile(filePath) {
  if (!filePath.endsWith('.tsx')) return;
  if (filePath.endsWith('.bak')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  
  for (const [pattern, replacement] of REPLACEMENTS) {
    content = content.replace(pattern, replacement);
  }
  
  content = content.replace(/  +/g, ' ');
  
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
console.log('\\nOpacity fixes completados.');
