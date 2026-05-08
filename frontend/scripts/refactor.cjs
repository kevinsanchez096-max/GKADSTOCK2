const fs = require('fs');
const path = require('path');

const DIRECTORIES_TO_SCAN = [
  path.join(__dirname, '../src/components'),
  path.join(__dirname, '../src')
];

// Reemplazos directos y seguros
const SAFE_REPLACEMENTS = {
  'bg-zinc-950': 'bg-background',
  'bg-[#09090b]': 'bg-background',
  'bg-zinc-900': 'bg-card',
  'text-gray-900': 'text-foreground',
  'bg-gray-50': 'bg-background',
  'border-gray-200': 'border-border',
  'text-gray-600': 'text-muted-foreground',
  'bg-zinc-100': 'bg-muted',
  'border-zinc-200': 'border-border',
  'dark:bg-slate-800/50': 'dark:bg-card',
  'dark:border-slate-700': 'dark:border-border',
  'bg-[#18181b]': 'bg-card',
  'border-zinc-800': 'border-border',
  'border-[#27272a]': 'border-border',
  'text-gray-400': 'text-muted-foreground',
  'text-zinc-400': 'text-muted-foreground',
  'text-slate-400': 'text-muted-foreground',
  'text-gray-500': 'text-muted-foreground',
  'text-zinc-500': 'text-muted-foreground',
  'dark:text-white': 'text-foreground',
  'dark:text-zinc-100': 'text-foreground',
  'dark:bg-zinc-900': 'dark:bg-card',
  'dark:bg-zinc-950': 'dark:bg-background',
  'dark:border-zinc-800': 'dark:border-border'
};

// Clases que indican que NO debemos reemplazar text-white o bg-black porque es un badge o botón semántico
const PROTECTED_CONTEXTS = [
  'bg-red-', 'bg-green-', 'bg-blue-', 'bg-emerald-', 'bg-amber-', 'bg-yellow-', 'bg-brand-', 'bg-rose-', 'bg-indigo-', 'bg-purple-',
  'badge', 'recharts', 'chart', 'Alert'
];

function shouldProtectContext(line) {
  return PROTECTED_CONTEXTS.some(ctx => line.includes(ctx));
}

function processFile(filePath) {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
  // Ignorar este mismo script u otros en la carpeta o módulos
  if (filePath.includes('node_modules') || filePath.includes('ui-components.tsx') || filePath.includes('DashboardLayout.tsx') || filePath.includes('App.tsx')) return;

  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  let lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Reemplazos seguros (1 a 1)
    for (const [oldClass, newClass] of Object.entries(SAFE_REPLACEMENTS)) {
      // Regex para asegurar match completo de la palabra (className) y no parte de otra
      const regex = new RegExp(`\\b${oldClass.replace(/\[/g, '\\[').replace(/\]/g, '\\]')}\\b`, 'g');
      line = line.replace(regex, newClass);
    }

    // Reemplazo condicional de text-white
    if (line.includes('text-white')) {
      if (!shouldProtectContext(line)) {
        // Asegurarse de que no está en un comentario
        if (!line.trim().startsWith('//')) {
           line = line.replace(/\btext-white\b/g, 'text-foreground');
        }
      }
    }

    // Reemplazo condicional de bg-black
    if (line.includes('bg-black')) {
      if (!shouldProtectContext(line)) {
        if (!line.trim().startsWith('//')) {
           line = line.replace(/\bbg-black\b/g, 'bg-foreground text-background'); // O tal vez bg-card dependiendo. bg-foreground es mejor inversión.
           // Pero mejor solo lo cambiamos a bg-background si parece layout
           line = line.replace(/\bbg-foreground text-background\b/g, 'bg-background');
        }
      }
    }

    // Cleanup de dark: redundant (ya que los tokens son adaptativos)
    line = line.replace(/\bdark:text-foreground\b/g, ''); // si ya era text-foreground, dark no hace falta
    line = line.replace(/\bdark:bg-background\b/g, '');
    line = line.replace(/\bdark:bg-card\b/g, '');
    line = line.replace(/\bdark:border-border\b/g, '');
    
    // Limpiar dobles espacios que puedan haber quedado
    line = line.replace(/  +/g, ' ');

    lines[i] = line;
  }

  const newContent = lines.join('\n');
  if (newContent !== originalContent) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Updated: ${path.basename(filePath)}`);
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

DIRECTORIES_TO_SCAN.forEach(dir => walkDir(dir));
console.log('Refactorización completada.');
