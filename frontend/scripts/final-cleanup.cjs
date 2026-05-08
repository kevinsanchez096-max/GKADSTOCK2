const fs = require('fs');
const path = require('path');

const DIRS = [
  path.join(__dirname, '../src/components'),
  path.join(__dirname, '../src')
];

// Final pass: very specific targeted replacements
const REPLACEMENTS = [
  // Dark-only leftovers that should be removed since semantic tokens handle them
  [/\bdark:border-slate-800\b/g, 'dark:border-border'],
  [/\bdark:border-slate-700\b/g, 'dark:border-border'],
  [/\bdark:bg-slate-900\b/g, 'dark:bg-card'],
  [/\bdark:bg-slate-800\/80\b/g, 'dark:bg-card'],
  [/\bdark:bg-slate-800\b/g, 'dark:bg-card'],
  [/\bdark:hover:bg-slate-800\b/g, 'dark:hover:bg-card'],
  [/\bdark:text-zinc-800\b/g, ''],
  [/\btext-zinc-800\b/g, 'text-foreground'],
  [/\bbg-slate-100\b/g, 'bg-muted'],
  [/\bbg-slate-900\/40\b/g, 'bg-foreground/40'],
  [/\bbg-white \/60\b/g, 'bg-card'],
  [/\bbg-white \/40\b/g, 'bg-card'],
  [/\bbg-white \/20\b/g, 'bg-card'],
  [/\bbg-white \/50\b/g, 'bg-card'],
  [/\bbg-white(?=["'\s,])/g, 'bg-card'], // bg-white at end of class or followed by space/quote
  [/\bhover:text-zinc-\d+\b/g, 'hover:text-foreground'],
  [/\bgroup-hover:text-zinc-\d+\b/g, 'group-hover:text-foreground'],
  
  // Redundant dark: prefixed tokens (semantic tokens already handle dark mode)
  [/\s*dark:border-border\b/g, ''],
  [/\s*dark:bg-card\b/g, ''],
  [/\s*dark:bg-border\b/g, ''],
  [/\s*dark:text-muted-foreground\b/g, ''],
  [/\s*dark:text-foreground\b/g, ''],
  [/\s*dark:hover:bg-card\b/g, ''],
  [/\s*dark:hover:bg-muted\b/g, ''],
];

function processFile(filePath) {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
  if (filePath.includes('node_modules') || filePath.endsWith('.bak')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  
  for (const [pattern, replacement] of REPLACEMENTS) {
    content = content.replace(pattern, replacement);
  }
  
  // Cleanup double spaces
  content = content.replace(/  +/g, ' ');
  content = content.replace(/className=" /g, 'className="');
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ ${path.basename(filePath)}`);
  }
}

function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file === 'node_modules' || file === 'store' || file === 'lib') continue;
      walkDir(fullPath);
    } else {
      processFile(fullPath);
    }
  }
}

DIRS.forEach(d => walkDir(d));
console.log('\\nLimpieza final completada.');
