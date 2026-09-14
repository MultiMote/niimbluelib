import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const version = process.argv[2];

if (!version) {
  console.error('Usage: node get-changelog.js <version>');
  process.exit(1);
}

const changelogPath = resolve(process.cwd(), 'CHANGELOG.md');
const changelog = await readFile(changelogPath, 'utf8');

const lines = changelog.split(/\r?\n/);

const headerIndex = lines.findIndex(
  (line) => line.match(/^#\s+(.+?)\s*$/)?.[1] === version
);

if (headerIndex === -1) {
  console.error(`Version ${version} not found in CHANGELOG.md`);
  process.exit(1);
}

const nextHeaderIndex = lines.findIndex(
  (line, index) => index > headerIndex && /^#\s+.+?\s*$/.test(line)
);

const endIndex = nextHeaderIndex === -1
  ? lines.length
  : nextHeaderIndex;

const result = lines
  .slice(headerIndex + 1, endIndex)
  .join('\n')
  .trim();

console.log(result);
