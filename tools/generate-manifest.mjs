import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'artefacts/phase1/manifests/batch01-files.sha256.json');
const excluded = new Set([
  path.relative(root, output).replaceAll('\\\\', '/'),
]);

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true })
    .flatMap(entry => {
      if (entry.name === '.git' || entry.name === 'node_modules') return [];
      const full = path.join(dir, entry.name);
      return entry.isDirectory() ? walk(full) : [full];
    });
}

const files = walk(root)
  .map(full => ({ full, rel: path.relative(root, full).replaceAll('\\\\', '/') }))
  .filter(({ rel }) => !excluded.has(rel) && !rel.endsWith('.zip'))
  .sort((a,b) => a.rel.localeCompare(b.rel));

const entries = files.map(({ full, rel }) => {
  const data = fs.readFileSync(full);
  return {
    path: rel,
    size_bytes: data.length,
    sha256: crypto.createHash('sha256').update(data).digest('hex')
  };
});

const manifest = {
  package: 'BF-P1-Implementation-Batch-01',
  version: '0.1.0',
  generated_at: new Date().toISOString(),
  files: entries
};
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(manifest, null, 2) + '\n');
console.log(`Manifest written: ${entries.length} files`);
