import fs from 'node:fs';
import path from 'node:path';

const ROOT = '/home/daytona/codebase/.tmp-harness';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };

export async function install(root) {
  const dir = root ?? ROOT;
  const handler = async (route) => {
    const url = new URL(route.request().url());
    const rel = url.pathname === '/' ? '/index.html' : url.pathname;
    const file = path.join(dir, rel);
    if (!file.startsWith(dir) || !fs.existsSync(file)) {
      return route.fulfill({ status: 404, body: 'not found' });
    }
    route.fulfill({
      status: 200,
      contentType: TYPES[path.extname(file)] ?? 'application/octet-stream',
      body: fs.readFileSync(file),
    });
  };
  return handler;
}
