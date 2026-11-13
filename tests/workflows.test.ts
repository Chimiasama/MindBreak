import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

// Deliberately narrow contract: every current workflow has only a plain manual trigger.
// If manual inputs are introduced later, extend this check without allowing automatic events.
const directory = new URL('../.github/workflows/', import.meta.url);
for (const file of readdirSync(directory).filter((name) => /\.ya?ml$/.test(name))) {
  test(`${file} is manual only and never generates an APK as part of quality checks`, () => {
    const source = readFileSync(new URL(file, directory), 'utf8');
    const trigger = source.match(/^on:\s*\n((?:[ \t]+[^\n]*\n)*)/m);
    assert.ok(trigger, 'A plain on block is required for auditing triggers');
    const declarations = trigger[1].split('\n').map((line) => line.trim()).filter((line) => line && !line.startsWith('#'));
    assert.deepEqual(declarations, ['workflow_dispatch:']);
    if (file === 'manual-checks.yml') assert.doesNotMatch(source, /assembleDebug|assembleRelease|bundleRelease|cap sync/);
  });
}
