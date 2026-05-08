const fs = require('fs');
const path = require('path');

const DIRS = [path.join(__dirname, '../src/components')];

const REPLACEMENTS = [
  // bg-white standalone → bg-card (NOT inside branded elements with text-brand or text-white)
  [/\bbg-white\b/g, 'bg-card'],
  // Remaining zinc/slate hardcodes
  [/\bbg-zinc-800\b/g, 'bg-muted'],
  [/\bbg-zinc-600\b/g, 'bg-muted'],
  [/\bbg-zinc-500\b/g, 'bg-muted'],
  [/\bbg-slate-500\b/g, 'bg-muted-foreground'],
  [/\bbg-slate-400\b/g, 'bg-muted-foreground'],
  [/\bbg-slate-300\b/g, 'bg-border'],
  [/\bbg-slate-700\b/g, 'bg-card'],
  [/\bbg-slate-900\b/g, 'bg-background'],
  [/\bbg-gray-800\b/g, 'bg-card'],
  [/\btext-zinc-900\b/g, 'text-foreground'],
  [/\btext-slate-200\b/g, 'text-muted-foreground'],
  [/\bborder-slate-500\b/g, 'border-border'],
  [/\bborder-slate-700\b/g, 'border-border'],
  [/\bborder-zinc-900\b/g, 'border-border'],
  [/\bborder-zinc-700\b/g, 'border-border'],
  [/\bborder-zinc-500\b/g, 'border-border'],
  [/\bborder-zinc-300\b/g, 'border-border'],
  [/\bborder-gray-700\b/g, 'border-border'],
];

// Lines containing these should NOT have bg-white replaced (buttons on colored bg)
const PROTECT_BG_WHITE = ['text-brand-', 'bg-brand-', 'bg-gradient', 'text-red-', 'shadow-2xl'];

function processFile(filePath) {
  if (!filePath.endsWith('.tsx')) return;
  if (filePath.endsWith('.bak')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  
  let lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    for (const [pattern, replacement] of REPLACEMENTS) {
      if (pattern.source === '\\bbg-white\\b') {
        // Only replace bg-white if it's NOT on a line with a branded element
        if (!PROTECT_BG_WHITE.some(p => line.includes(p))) {
          line = line.replace(pattern, replacement);
        }
      } else {
        line = line.replace(pattern, replacement);
      }
    }
    
    lines[i] = line;
  }
  
  content = lines.join('\n');
  // Cleanup
  content = content.replace(/  +/g, ' ');
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ ${path.basename(filePath)}`);
  }
}

function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walkDir(p);
    else processFile(p);
  });
}

DIRS.forEach(d => walkDir(d));
console.log('\\nTercera pasada completada.');
