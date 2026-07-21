import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const roots = ['packages/core/dist', 'packages/web/dist', 'packages/e2e/dist'];
await Promise.all(roots.map(directory => rm(resolve(directory), { recursive: true, force: true })));
