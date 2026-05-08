const fs = require('fs');
const path = require('path');

const COMPONENTS_DIR = path.join(__dirname, '../src/components');

// Extended Cleanup Map
const REPLACEMENTS = [
  // Duplicated classes (case-insensitive)
  [/\btext-foreground text-foreground\b/gi, 'text-foreground'],
  [/\btext-muted-foreground text-muted-foreground\b/gi, 'text-muted-foreground'],
  [/\bbg-card bg-card\b/gi, 'bg-card'],
  [/\bbg-muted bg-muted\b/gi, 'bg-muted'],
  [/\bborder-border border-border\b/gi, 'border-border'],
  
  // Opacity fixes (removing spaces and fixing double modifiers)
  [/\bbg-muted \/\d+\b/g, (m) => m.replace(' ', '')],
  [/\bborder-border \/\d+\b/g, (m) => m.replace(' ', '')],
  [/\bbg-card \/\d+\b/g, (m) => m.replace(' ', '')],
  [/\bbg-white \/\d+\b/g, 'bg-card'],
  [/\bbg-background\/50\/50\b/g, 'bg-background/50'],
  [/\bbg-card\/\d+ \/\d+\b/g, (m) => m.split(' ')[0]],
  [/\bbg-muted\/\d+ \/\d+\b/g, (m) => m.split(' ')[0]],
  [/\bbg-background\/\d+ \/\d+\b/g, (m) => m.split(' ')[0]],
  
  // Specific patterns found in the logs
  ['bg-muted /40', 'bg-muted/40'],
  ['border-border /80', 'border-border/80'],
  ['bg-muted /20', 'bg-muted/20'],
  ['bg-card/40 /40', 'bg-card/40'],
  ['bg-card/50 /20', 'bg-card/50'],
  ['bg-muted/50 /30', 'bg-muted/50'],
  ['bg-background/50/50', 'bg-background/50'],

  // Remove redundant dark: prefixes for semantic tokens
  // Matching dark:[token] or dark:[token]/[opacity]
  [/\bdark:bg-card(\/\d+)?\b/g, ''],
  [/\bdark:bg-muted(\/\d+)?\b/g, ''],
  [/\bdark:bg-background(\/\d+)?\b/g, ''],
  [/\bdark:border-border(\/\d+)?\b/g, ''],
  [/\bdark:text-foreground\b/g, ''],
  [/\bdark:text-muted-foreground\b/g, ''],
  [/\bdark:divide-border\b/g, ''],
  [/\bdark:hover:bg-muted\b/g, ''],
  [/\bdark:hover:bg-card\b/g, ''],
  [/\bdark:bg-transparent\b/g, ''],
];

function processFile(filePath) {
  if (!filePath.endsWith('.tsx')) return;
  if (filePath.endsWith('.bak')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  
  for (const [pattern, replacement] of REPLACEMENTS) {
    if (typeof pattern === 'string') {
        while (content.includes(pattern)) {
            content = content.replace(pattern, replacement);
        }
    } else {
        content = content.replace(pattern, replacement);
    }
  }
  
  // Cleanup spaces inside className attributes
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
console.log('\\nFinal structural cleanup completado.');
