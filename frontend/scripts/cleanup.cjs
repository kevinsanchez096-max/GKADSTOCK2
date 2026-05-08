const fs = require('fs');
const path = require('path');

const COMPONENTS_DIR = path.join(__dirname, '../src/components');

// Cleanup: remove redundant old classes that appear NEXT TO their semantic replacement
const CLEANUP_PATTERNS = [
  // Remove old class when followed by (or before) its semantic replacement
  /\btext-zinc-900 text-foreground\b/g,
  /\btext-foreground text-zinc-900\b/g,
  /\btext-slate-900 text-foreground\b/g,
  /\btext-gray-900 text-foreground\b/g,
  /\btext-foreground text-slate-900\b/g,
  /\btext-foreground text-gray-900\b/g,
  /\bbg-white bg-card\b/g,
  /\bbg-card bg-white\b/g,
  /\bborder-slate-200 border-border\b/g,
  /\bborder-border border-slate-200\b/g,
  /\bbg-zinc-100 bg-muted\b/g,
  /\bbg-muted bg-zinc-100\b/g,
  /\btext-muted-foreground dark:text-muted-foreground\b/g,
  // These are the patterns from first script that doubled up
  /\btext-gray-600 text-muted-foreground\b/g,
  /\btext-gray-900 text-foreground\b/g,
  /\bbg-gray-50 bg-background\b/g,
  /\bbg-background bg-gray-50\b/g,
  /\bborder-gray-200 border-border\b/g,
  /\bborder-border border-gray-200\b/g,
];

const CLEANUP_REPLACEMENTS = [
  'text-foreground',
  'text-foreground',
  'text-foreground',
  'text-foreground',
  'text-foreground',
  'text-foreground',
  'bg-card',
  'bg-card',
  'border-border',
  'border-border',
  'bg-muted',
  'bg-muted',
  'text-muted-foreground',
  'text-muted-foreground',
  'text-foreground',
  'bg-background',
  'bg-background',
  'border-border',
  'border-border',
];

// Additional standalone replacements
const EXTRA_REPLACEMENTS = {
  'bg-white dark:bg-card': 'bg-card',
  'border-slate-200 dark:border-border': 'border-border',
  'text-slate-900 dark:text-foreground': 'text-foreground',
  'bg-slate-100 dark:bg-muted': 'bg-muted',
  'text-zinc-500 dark:text-muted-foreground': 'text-muted-foreground',
  'bg-zinc-50 dark:bg-muted': 'bg-muted',
  'text-slate-500 dark:text-muted-foreground': 'text-muted-foreground',
  'dark:bg-slate-800/50 ': '',
  'dark:border-slate-700 ': '',
  'hover:bg-muted dark:hover:bg-muted': 'hover:bg-muted',
  'border-border dark:border-border': 'border-border',
  'bg-muted dark:bg-muted': 'bg-muted',
  'text-foreground dark:text-foreground': 'text-foreground',
  'text-muted-foreground dark:text-muted-foreground': 'text-muted-foreground',
};

function processFile(filePath) {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
  if (filePath.includes('node_modules') || filePath.endsWith('.bak')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  
  // Apply cleanup patterns
  for (let i = 0; i < CLEANUP_PATTERNS.length; i++) {
    content = content.replace(CLEANUP_PATTERNS[i], CLEANUP_REPLACEMENTS[i]);
  }
  
  // Apply extra string replacements
  for (const [old, replacement] of Object.entries(EXTRA_REPLACEMENTS)) {
    while (content.includes(old)) {
      content = content.replace(old, replacement);
    }
  }
  
  // Clean up double/triple spaces in className strings
  content = content.replace(/  +/g, ' ');
  
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
// Also process src root files
const srcDir = path.join(__dirname, '../src');
const srcFiles = fs.readdirSync(srcDir).filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));
srcFiles.forEach(f => processFile(path.join(srcDir, f)));

console.log('\\nLimpieza de duplicados completada.');
