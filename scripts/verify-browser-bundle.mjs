import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadEnv } from 'vite';

const secrets = new Set();
for (const mode of ['development', 'production']) {
  const env = loadEnv(mode, process.cwd(), '');
  for (const name of ['ZALEX_API_KEY', 'VITE_' + 'ZALEX_API_KEY']) {
    if (env[name]) secrets.add(env[name]);
  }
}
// Compare raw and JSON-escaped representations, without printing secret values.
const representations = [...secrets].flatMap(value => [value, JSON.stringify(value).slice(1, -1)]);
let checked = 0;
async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await scan(path);
    else {
      const content = await readFile(path, 'utf8');
      if (representations.some(value => content.includes(value))) throw new Error('Credential detected in browser build');
      if (content.includes('VITE_' + 'ZALEX_API_KEY') || content.includes('subscription-key')) throw new Error('Credential integration detected in browser build');
      checked++;
    }
  }
}
await scan('dist');
console.log(`Verified ${checked} browser assets; ${secrets.size} configured credential values absent.`);
if (!secrets.size) console.log('No configured credential available for value comparison.');
