const fs = require('fs');
const path = require('path');

const COMPONENTS_DIR = path.join(__dirname, '../src/components');

// Comprehensive cleanup
const REPLACEMENTS = [
  // Duplicated classes
  [/\btext-foreground text-foreground\b/g, 'text-foreground'],
  [/\btext-muted-foreground text-muted-foreground\b/g, 'text-muted-foreground'],
  [/\bbg-card bg-card\b/g, 'bg-card'],
  [/\bbg-muted bg-muted\b/g, 'bg-muted'],
  [/\bborder-border border-border\b/g, 'border-border'],
  
  // Incorrect opacity patterns
  [/\bbg-muted \/40\b/g, 'bg-muted/40'],
  [/\bbg-background\/50\/50\b/g, 'bg-background/50'],
  [/\bbg-white \/60\b/g, 'bg-card'], // Fallback for previous failed matches
  
  // Dark redundants with slashes
  [/\bdark:bg-card\/\[0\.0[1-9]\]\b/g, ''],
  [/\bdark:bg-card\/5\b/g, ''],
  [/\bdark:bg-card\/10\b/g, ''],
  [/\bdark:bg-muted\/50\b/g, ''],
  [/\bdark:border-border\/60\b/g, ''],
  [/\bdark:divide-white\/5\b/g, 'dark:divide-border'],
  
  // Specific fixes for Inventory.tsx
  [/\btext-foreground text-foreground\b/g, 'text-foreground'],
  [/\btext-foreground text-foreground\b/g, 'text-foreground'], // Run multiple times just in case
];

function processFile(filePath) {
  if (!filePath.endsWith('.tsx')) return;
  if (filePath.endsWith('.bak')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  
  for (const [pattern, replacement] of REPLACEMENTS) {
    content = content.replace(pattern, replacement);
  }
  
  // Final cleanup of spaces inside className
  content = content.replace(/className="([^"]+)"/g, (match, p1) => {
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
console.log('\\nDeep cleanup completado.');
