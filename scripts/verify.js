'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const required = [
  'index.html', 'vercel.json', 'robots.txt', 'package.json',
  'assets/favicon.svg', 'assets/css/style.css', 'assets/js/app.js', 'data/catalog.json'
];
const failures = [];
for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) failures.push(`Missing required file: ${file}`);
}
let catalog;
try { catalog = JSON.parse(fs.readFileSync(path.join(root, 'data/catalog.json'), 'utf8')); }
catch (error) { failures.push(`Invalid data/catalog.json: ${error.message}`); }
if (Array.isArray(catalog)) {
  const seen = new Set();
  catalog.forEach((item, index) => {
    if (!item || typeof item.id !== 'string' || !item.id.trim()) failures.push(`Catalog item ${index + 1} has no valid id`);
    if (item && seen.has(item.id)) failures.push(`Duplicate catalog id: ${item.id}`);
    if (item) seen.add(item.id);
    if (item && !['heart', 'love', 'couple', 'cards', 'birthday', 'tools', 'other'].includes(item.category)) failures.push(`Invalid category for ${item?.id}`);
    if (item && !['web', 'website', 'game'].includes(item.type)) failures.push(`Invalid type for ${item?.id}`);
    if (item && item.url && !/^https?:\/\//i.test(item.url)) failures.push(`External URL must begin with https:// or http:// for ${item.id}`);
  });
}
try { JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8')); }
catch (error) { failures.push(`Invalid vercel.json: ${error.message}`); }
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
if (!/<html lang="vi">/.test(html)) failures.push('index.html should declare Vietnamese as its language');
if (!/LUAVANG/.test(html)) failures.push('LUAVANG branding was not found in index.html');
if (/kis\.v2|adblock360|Devpan|LoveLy/i.test(html)) failures.push('Potential browser-injected or old-brand script/text remains in index.html');
const js = fs.readFileSync(path.join(root, 'assets/js/app.js'), 'utf8');
if (!js.includes("fetch('/data/catalog.json'")) failures.push('Catalog loader reference is missing');
if (failures.length) {
  console.error('LUAVANG source validation failed:');
  failures.forEach(message => console.error(` - ${message}`));
  process.exitCode = 1;
} else {
  console.log(`LUAVANG source validation passed. ${catalog.length} catalog entries are valid; ${required.length} required files are present.`);
}
