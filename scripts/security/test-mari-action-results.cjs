const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('packages/ai/src/mariActions.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: exportsObject });
(async () => {
  for (const type of ['CREATE_TASK', 'DRAFT_EMAIL', 'GENERATE_REPORT', 'ADD_CONTACT', 'TRIGGER_WORKFLOW', 'GENERATE_FLYER']) {
    const result = await exportsObject.executeMariAction({ type, payload: { title: 'Synthetic test' } });
    assert.equal(result.success, false, type);
    assert.equal(result.code, 'ACTION_NOT_IMPLEMENTED', type);
    assert.equal(result.outputData, undefined, 'No invented IDs or download links.');
  }
  for (const route of ['//example.invalid', '/\\example.invalid', 'https://example.invalid', '/growth\n']) {
    assert.equal((await exportsObject.executeMariAction({ type: 'NAVIGATE', payload: { route } })).outputData.route, '/growth');
  }
  const navigation = await exportsObject.executeMariAction({ type: 'NAVIGATE', payload: { route: '/social' } });
  assert.equal(navigation.success, true);
  assert.equal(navigation.outputData.route, '/social');
  assert.equal((await exportsObject.executeMariAction({ type: 'UNKNOWN' })).success, false);
  console.log('PASS: Mari cannot claim unimplemented mutations succeeded or invent outputs; local navigation remains available and rejects external redirects.');
})().catch(error => { console.error(error); process.exitCode = 1; });
