const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync('packages/ai/src/creativeAsset.service.ts', 'utf8');
const exportsObject = {};
const deleted = [];
vm.runInNewContext(
  ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText,
  {
    exports: exportsObject,
    require(name) {
      assert.equal(name, './storage/index');
      return {
        getProductionStorageProvider() {
          return {
            async delete(path) { deleted.push(path); },
          };
        },
      };
    },
    Buffer,
    process,
    console,
    Date,
    setTimeout,
    clearTimeout,
  }
);

(async () => {
  const service = exportsObject.CreativeAssetService;
  const owned = 'organizations/org-a/workspaces/ws-a/assets/asset-1/raw/asset-1-raw.jpg';
  const foreign = 'organizations/org-b/workspaces/ws-b/assets/asset-2/raw/asset-2-raw.jpg';

  assert.equal(await service.deleteRawBinaryAsset({
    rawStoragePath: owned,
    organizationId: 'org-a',
    workspaceId: 'ws-a',
  }), true);
  assert.deepEqual(deleted, [owned]);

  assert.equal(await service.deleteRawBinaryAsset({
    rawStoragePath: foreign,
    organizationId: 'org-a',
    workspaceId: 'ws-a',
  }), false);
  assert.deepEqual(deleted, [owned], 'foreign tenant raw asset must never be deleted');

  const orchestrator = fs.readFileSync('packages/ai/src/creativeOrchestrator.service.ts', 'utf8');
  for (const errorCode of [
    'THIRD_PARTY_BRANDING_REJECTED',
    'TEXT_FIDELITY_REJECTED',
    'SEMANTIC_RELEVANCE_REJECTED',
    'FAILED_STORAGE',
  ]) {
    const errorIndex = orchestrator.indexOf(`errorCode: '${errorCode}'`);
    assert(errorIndex > 0, `missing ${errorCode} branch`);
    const preceding = orchestrator.slice(Math.max(0, errorIndex - 1100), errorIndex);
    assert.match(preceding, /await cleanupRejectedRawAsset\(\)/, `${errorCode} must purge raw storage before returning`);
  }

  console.log('PASS: rejected creative generations purge tenant-scoped raw storage and refuse cross-tenant cleanup.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
