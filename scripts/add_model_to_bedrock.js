const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'backend', 'Bedrock 21.5.26.json');
const raw = fs.readFileSync(file, 'utf8');
let data = JSON.parse(raw);
let changed = false;
for (const obj of data) {
  if (!obj || typeof obj !== 'object') continue;
  if (!obj.model) {
    const size = obj.size || '';
    const design = obj.design || '';
    const type = obj.type || '';
    let modelParts = [];
    if (size) modelParts.push(size);
    if (design) modelParts.push(design);
    if (!modelParts.length && obj.category) modelParts.push(obj.category);
    if (!modelParts.length && type) modelParts.push(type);
    const model = modelParts.join(' ').trim();
    if (model) {
      obj.model = model;
      changed = true;
    }
  }
}
if (changed) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  console.log('Updated file with model fields.');
} else {
  console.log('No changes needed.');
}
