import * as fs from 'fs';
import * as path from 'path';

const componentsDir = path.join(process.cwd(), 'src', 'components');

const replacements: [RegExp, string][] = [
  [/bg-\[#18181A\]/g, 'bg-background'],
  [/bg-\[#1F2220\]/g, 'bg-surface'],
  [/bg-\[#2A2E2C\]/g, 'bg-surface-hover'],
  [/bg-\[#1A1D1B\]/g, 'bg-surface-alt'],
  [/border-\[#333333\]/g, 'border-border'],
  [/border-\[#444444\]/g, 'border-border-hover'],
  [/divide-\[#333333\]/g, 'divide-border'],
  [/text-zinc-100/g, 'text-primary'],
  [/text-zinc-300/g, 'text-secondary'],
  [/text-zinc-400/g, 'text-muted'],
  [/text-zinc-500/g, 'text-placeholder'],
  [/text-zinc-600/g, 'text-placeholder'],
  [/hover:bg-\[#2A2E2C\]/g, 'hover:bg-surface-hover'],
  [/hover:text-zinc-300/g, 'hover:text-secondary'],
  [/border-zinc-400/g, 'border-border-hover'],
  [/border-zinc-600/g, 'border-border'],
  [/text-zinc-200/g, 'text-primary'],
];

function processFile(fullPath: string) {
  let content = fs.readFileSync(fullPath, 'utf8');
  for (const [regex, replacement] of replacements) {
    // @ts-ignore
    content = content.replace(regex, replacement);
  }
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`Processed ${fullPath}`);
}

function processDirectory(dir: string) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      processFile(fullPath);
    }
  }
}

processDirectory(componentsDir);
processFile(path.join(process.cwd(), 'src', 'App.tsx'));
