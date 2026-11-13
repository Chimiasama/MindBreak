import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

const directory = new URL('../.github/workflows/', import.meta.url);
for (const file of readdirSync(directory).filter((name) => /\.ya?ml$/.test(name))) {
  test(`${file} can only be started manually`, () => {
    const source = readFileSync(new URL(file, directory), 'utf8');
    const trigger = source.match(/^on:\s*\n((?:[ \t]+[^\n]*\n)*)/m);
    assert.ok(trigger, 'A plain on block is required for auditing triggers');
    const declarations = trigger[1].split('\n').map((line) => line.trim()).filter((line) => line && !line.startsWith('#'));
    assert.deepEqual(declarations, ['workflow_dispatch:']);
  });
}

test('manual APK workflow validates before building and uploads an installable signed debug APK', () => {
  const workflow = readFileSync(new URL('manual-checks.yml', directory), 'utf8');
  assert.match(workflow, /runs-on: ubuntu-26\.04/);
  assert.doesNotMatch(workflow, /ubuntu-latest|actions\/checkout@v4|actions\/setup-node@v4/);
  assert.match(workflow, /java-version: '21'/);
  assert.ok(workflow.indexOf('run: npm test') < workflow.indexOf('assembleDebug'));
  assert.ok(workflow.indexOf('npm run build:android') < workflow.indexOf('npm run android:sync'));
  assert.ok(workflow.indexOf('npm run android:sync') < workflow.indexOf('assembleDebug'));
  assert.match(workflow, /apksigner.*verify/);
  assert.match(workflow, /uses: actions\/upload-artifact@[a-f0-9]{40}/);
  assert.match(workflow, /if-no-files-found: error/);
  assert.match(workflow, /path: apk\//);
  assert.match(workflow, /MindBreak-debug\.apk/);
  assert.doesNotMatch(workflow, /workflow run|workflow_run:|gh release|publish.*store/i);
});
