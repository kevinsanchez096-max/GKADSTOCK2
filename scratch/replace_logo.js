const fs = require('fs');
const path = 'c:/Users/Kevin/OneDrive/Escritorio/GKADSTOCK/GKADSTOCK2/frontend/src/components/DashboardLayout.tsx';
let content = fs.readFileSync(path, 'utf8');

const oldLogo = /<div className="flex items-center gap-3">[\s\S]*?<\/div>\s*?\)\s*?\}\s*?<\/div>/m;
const newLogo = '<GkadLogo showText={!isCollapsed} />';

// This regex might be risky. Let's find by line numbers 123 to 132.
const lines = content.split('\n');
lines.splice(122, 10, '        <GkadLogo showText={!isCollapsed} />');
const newContent = lines.join('\n');

fs.writeFileSync(path, newContent);
console.log('Logo replaced successfully');
