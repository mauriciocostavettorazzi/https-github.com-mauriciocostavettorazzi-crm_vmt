import * as fs from 'fs';
import * as path from 'path';

const componentsDir = path.join(process.cwd(), 'src', 'components');

const replacements: [RegExp, string][] = [
  [/hover:bg-blue-900/g, 'hover:bg-emerald-700'],
  [/bg-\[#F4F6F9\]/g, 'bg-background'],
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
