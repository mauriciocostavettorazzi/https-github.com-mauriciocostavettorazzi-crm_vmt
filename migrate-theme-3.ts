import * as fs from 'fs';
import * as path from 'path';

const componentsDir = path.join(process.cwd(), 'src', 'components');

const replacements: [RegExp, string][] = [
  [/\[#D4A017\]/g, '[#1D9E75]'],
  [/\[#0A2463\]/g, '[#1F2220]'], // fallback for any remaining dark blue
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
