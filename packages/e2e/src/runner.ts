import { readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

interface IntegrationTest {
  name: string;
  fn: () => void | Promise<void>;
}

function isIntegrationTest(value: unknown): value is IntegrationTest {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<IntegrationTest>;
  return typeof candidate.name === 'string' && typeof candidate.fn === 'function';
}

async function discoverIntegrationTests() {
  const testDirectory = join(dirname(fileURLToPath(import.meta.url)), 'tests');
  const files = (await readdir(testDirectory))
    .filter((file) => file.endsWith('.ts'))
    .sort();
  const tests: IntegrationTest[] = [];
  const emptyModules: string[] = [];

  for (const file of files) {
    const module = await import(pathToFileURL(join(testDirectory, file)).href);
    const exportedSuites = Object.entries(module)
      .filter(([name, value]) => name.endsWith('Tests') && Array.isArray(value))
      .flatMap(([, value]) => value as unknown[])
      .filter(isIntegrationTest);

    if (exportedSuites.length === 0) emptyModules.push(file);
    tests.push(...exportedSuites);
  }

  if (emptyModules.length > 0) {
    throw new Error(`Integration modules without an exported *Tests suite: ${emptyModules.join(', ')}`);
  }

  return { files, tests };
}

async function runAll() {
  const { files, tests } = await discoverIntegrationTests();
  let passed = 0;
  let failed = 0;

  console.log(`Integration + SSR: ${tests.length} tests discovered in ${files.length} modules.`);

  for (const test of tests) {
    try {
      await test.fn();
      console.log(`[PASS] ${test.name}`);
      passed += 1;
    } catch (error) {
      console.error(`[FAIL] ${test.name}`);
      console.error(error);
      failed += 1;
    }
  }

  console.log(`\nIntegration + SSR summary: ${passed} passed, ${failed} failed.`);
  process.exitCode = failed > 0 ? 1 : 0;
}

await runAll();
