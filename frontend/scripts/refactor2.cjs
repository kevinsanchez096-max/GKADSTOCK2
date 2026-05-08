const fs = require('fs');
const path = require('path');

const COMPONENTS_DIR = path.join(__dirname, '../src/components');

// Extended replacement map for second pass - specifically targets remaining hardcoded classes
const REPLACEMENTS = [
  // --- BACKGROUNDS ---
  ['bg-white/\\[0\\.02\\]', 'bg-card/5 dark:bg-card/5'],
  ['bg-white/\\[0\\.03\\]', 'bg-muted'],
  ['bg-white/\\[0\\.04\\]', 'bg-muted'],
  ['bg-white/\\[0\\.07\\]', 'bg-muted'],
  ['bg-white/20', 'bg-card/20'],
  ['bg-white/5', 'bg-muted'],
  ['bg-white /20', 'bg-card'],
  ['bg-white /40', 'bg-card'],
  ['bg-white /50', 'bg-card'],
  ['bg-slate-50 /40', 'bg-muted'],
  ['bg-slate-50 /60', 'bg-card'],
  ['bg-slate-50', 'bg-muted'],
  ['bg-zinc-50', 'bg-muted'],
  ['bg-zinc-100/50', 'bg-muted'],
  ['bg-zinc-200', 'bg-muted'],
  ['bg-gray-100', 'bg-muted'],
  ['hover:bg-gray-100', 'hover:bg-muted'],
  ['hover:bg-white', 'hover:bg-card'],
  ['dark:hover:bg-white/5', 'dark:hover:bg-muted'],
  ['dark:hover:bg-white/10', 'dark:hover:bg-muted'],
  
  // --- BORDERS ---
  ['border-slate-100', 'border-border'],
  ['border-slate-200', 'border-border'],
  ['border-slate-300', 'border-border'],
  ['border-zinc-100', 'border-border'],
  ['border-zinc-200', 'border-border'],
  ['border-gray-100', 'border-border'],
  ['border-gray-300', 'border-border'],
  ['dark:border-white/5', 'dark:border-border'],
  ['dark:border-white/10', 'dark:border-border'],
  ['dark:border-slate-800/80', 'dark:border-border'],
  ['border-white/5', 'border-border'],
  ['border-white/10', 'border-border'],
  
  // --- TEXT ---
  ['text-slate-900', 'text-foreground'],
  ['text-slate-800', 'text-foreground'],
  ['text-slate-700', 'text-foreground'],
  ['text-slate-600', 'text-muted-foreground'],
  ['text-slate-500', 'text-muted-foreground'],
  ['text-slate-400', 'text-muted-foreground'],
  ['text-slate-300', 'text-muted-foreground'],
  ['text-zinc-700', 'text-foreground'],
  ['text-zinc-600', 'text-muted-foreground'],
  ['text-zinc-300', 'text-muted-foreground'],
  ['text-zinc-200', 'text-foreground'],
  ['text-gray-700', 'text-foreground'],
  ['text-gray-500', 'text-muted-foreground'],
  ['text-gray-300', 'text-muted-foreground'],
  ['dark:text-zinc-200', ''],
  ['dark:text-zinc-300', ''],
  ['dark:text-zinc-400', ''],
  ['dark:text-zinc-500', ''],
  
  // --- HOVER TEXT ---
  ['hover:text-gray-900', 'hover:text-foreground'],
  ['hover:text-slate-900', 'hover:text-foreground'],
  ['dark:hover:text-foreground', ''],
  ['dark:hover:text-white', ''],

  // --- PLACEHOLDER ---
  ['placeholder:text-slate-400', 'placeholder:text-muted-foreground'],
  ['placeholder:text-zinc-600', 'placeholder:text-muted-foreground'],
  ['dark:placeholder:text-muted-foreground', ''],

  // --- DIVIDERS ---
  ['bg-zinc-200', 'bg-border'],
  ['bg-slate-200', 'bg-border'],
  ['dark:bg-zinc-800', 'dark:bg-border'],
  
  // --- HOVER BG ---
  ['hover:bg-slate-50', 'hover:bg-muted'],
  ['hover:bg-zinc-100', 'hover:bg-muted'],
  ['hover:bg-slate-200', 'hover:bg-muted'],
  ['hover:bg-zinc-200', 'hover:bg-muted'],
  ['dark:hover:bg-card', ''],
];

// Context patterns to SKIP (semantic business colors, charts, branded elements)
const SKIP_PATTERNS = [
  /recharts/i,
  /chart/i,
  /bg-red-\d/,
  /bg-green-\d/,
  /bg-emerald-\d/,
  /bg-amber-\d/,
  /bg-blue-\d/,
  /bg-brand-/,
  /bg-indigo-/,
  /bg-purple-/,
  /bg-rose-/,
  /bg-\[#FF/,
  /bg-\[#ff/,
  /bg-gradient/,
  /text-white/,  // Preserve text-white globally (already handled)
];

function shouldSkipLine(line) {
  // Only skip if the line is primarily about semantic colors like success/danger badges
  return false; // We handle protection at regex level instead
}

function processFile(filePath) {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
  if (filePath.includes('node_modules')) return;
  // Don't re-process backups
  if (filePath.endsWith('.bak')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  
  for (const [pattern, replacement] of REPLACEMENTS) {
    // Use word boundary regex
    const regex = new RegExp(`\\b${pattern}\\b`, 'g');
    content = content.replace(regex, replacement);
  }
  
  // Clean up double spaces and empty class artifacts
  content = content.replace(/  +/g, ' ');
  content = content.replace(/ "/g, '"');
  content = content.replace(/" /g, '"');
  // Fix cases where className=" text-" (leading space after quote)
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
      walkDir(fullPath);
    } else {
      processFile(fullPath);
    }
  }
}

walkDir(COMPONENTS_DIR);
console.log('\\nSegunda pasada completada.');
