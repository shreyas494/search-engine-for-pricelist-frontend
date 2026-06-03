const fs = require('fs/promises');
const path = require('path');
const file = path.join(__dirname, '..', 'backend', 'Bedrock 21.5.26.json');

async function run() {
  const txt = await fs.readFile(file, 'utf8');
  let arr;
  try {
    arr = JSON.parse(txt);
  } catch (e) {
    console.error('Failed to parse JSON:', e.message);
    process.exit(1);
  }
  const out = arr.map(obj => {
    if (!obj.model) {
      const design = (obj.design || '').toString().trim();
      const size = (obj.size || '').toString().trim();
      const model = (design + (size ? ' ' + size : '')).trim();
      if (model) obj.model = model;
    }
    return obj;
  });
  const lines = out.map(o => JSON.stringify(o));
  const content = '[\n' + lines.join(',\n') + '\n]\n';
  await fs.writeFile(file, content, 'utf8');
  console.log('Wrote', out.length, 'records to', file);
}

run().catch(err => { console.error(err); process.exit(1); });
