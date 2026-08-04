import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const schemaRoot = resolve(here, '..');
const githubReposRoot = resolve(schemaRoot, '..');
const workspaceRoot = resolve(githubReposRoot, '..', '..');
const execute = process.argv.includes('--execute');
const injectedGroup = process.env.AON_CONTRACT_CI_INJECT_FAILURE;

const requiredSchemaFiles = [
  'goal-event-name-v0.2.json',
  'offer-schema-v0.2.json',
  'offer-query-schema-v0.2.json',
  'offer-query-response-v0.2.json',
  'offer-provider-request-v0.2.json',
  'offer-provider-response-v0.2.json',
  'postback-partner-payload-v0.2.json',
  'postback-agent-payload-v0.2.json',
];

const extensionTests = [
  'location-contract-sync.test.mjs',
  'location-helpers.test.mjs',
  'location-matching-semantics.test.mjs',
  'location-search-contract.test.mjs',
  'offer-consumer-action.test.mjs',
  'offer-query-location-age.test.mjs',
  'offer-schema-location-age.test.mjs',
  'offer-type-optional.test.mjs',
];

function run(command, args, label) {
  const result = spawnSync(command, args, {
    cwd: schemaRoot,
    encoding: 'utf8',
    env: { ...process.env, AON_CONTRACT_CI_INJECT_FAILURE: '' },
  });
  process.stdout.write(result.stdout ?? '');
  process.stderr.write(result.stderr ?? '');
  assert.equal(result.status, 0, `${label} failed with exit code ${result.status}`);
}

function hasMonorepoContractTopology() {
  return existsSync(resolve(githubReposRoot, 'examples/http/offer-response-v0.2.json'))
    && existsSync(resolve(githubReposRoot, 'protocol/specs/query-api.md'))
    && existsSync(resolve(workspaceRoot, 'protocol/docs/contract-governance/contracts.json'));
}

async function runStandaloneSchemaChecks() {
  const { createSchemaRegistry, readJson, schemaRoot: localSchemaRoot } = await import('./protocol-v0.2-vector-helpers.mjs');
  const registry = createSchemaRegistry();
  assert.equal(registry.schemasById.size, requiredSchemaFiles.length, 'all v0.2 schemas must register exactly once');
  for (const file of requiredSchemaFiles) {
    const schema = readJson(resolve(localSchemaRoot, 'json-schema', file));
    assert.equal(typeof schema.$id, 'string', `${file} must define a schema id`);
    assert(registry.ajv.getSchema(schema.$id), `${file} must compile in the v0.2 registry`);
  }
  const semanticVectors = readJson(resolve(localSchemaRoot, 'fixtures/protocol-v0.2-semantic-vectors.json'));
  assert(Array.isArray(semanticVectors.cases) && semanticVectors.cases.length > 0, 'semantic vectors must not be empty');
}

async function runStandaloneSemanticChecks() {
  const { validateOfferV02Semantics } = await import('../validators/offer-v0.2-semantics.mjs');
  const { validateTaxonomyConstraintsV02 } = await import('../validators/taxonomy-v0.2-semantics.mjs');
  const { validatePostbackDeclaredGoalContext } = await import('../validators/postback-v0.2-semantics.mjs');
  assert.equal(
    validateOfferV02Semantics({ goals: [{ event: 'trial' }, { event: 'trial' }] }).valid,
    false,
    'semantic offer validation must reject duplicate goal events',
  );
  assert.equal(
    validateTaxonomyConstraintsV02({ constraints: { category_ids: ['unknown.category'] } }).valid,
    false,
    'semantic taxonomy validation must reject unregistered categories',
  );
  assert.equal(
    validatePostbackDeclaredGoalContext({ event_name: 'subscription' }, { declared_goal_events: ['trial'] }).valid,
    false,
    'semantic postback validation must reject an undeclared event',
  );
}

async function runStandaloneOfferProviderChecks() {
  const { createSchemaRegistry } = await import('./protocol-v0.2-vector-helpers.mjs');
  const registry = createSchemaRegistry();
  const request = registry.schemasById.get('https://agentoffernetwork.org/schema/offer-provider-request/v0.2');
  const response = registry.schemasById.get('https://agentoffernetwork.org/schema/offer-provider-response/v0.2');
  assert.equal(request.allOf?.[0].$ref, 'https://agentoffernetwork.org/schema/offer-query/v0.2', 'OfferProvider request must reuse the Query contract');
  assert(request.allOf?.[1].required?.includes('request_id'), 'OfferProvider request must require request_id');
  assert(Array.isArray(response.oneOf) && response.oneOf.length === 2, 'OfferProvider response must distinguish success and error envelopes');
  const vectors = JSON.stringify(readFileSync(resolve(schemaRoot, 'fixtures/protocol-v0.2-contract-vectors.json'), 'utf8'));
  for (const fixture of [
    'examples/http/offer-provider/basic-query-v0.2.json',
    'examples/http/offer-provider/full-query-v0.2.json',
    'examples/http/offer-provider/success-v0.2.json',
    'examples/http/offer-provider/error-bad-request-v0.2.json',
  ]) {
    assert(vectors.includes(fixture), `contract vectors must bind ${fixture}`);
  }
}

function runExtensions() {
  const tests = hasMonorepoContractTopology()
    ? extensionTests
    : extensionTests.filter((test) => [
      'location-contract-sync.test.mjs',
      'location-helpers.test.mjs',
      'location-matching-semantics.test.mjs',
      'offer-query-location-age.test.mjs',
      'offer-schema-location-age.test.mjs',
      'offer-type-optional.test.mjs',
    ].includes(test));
  for (const test of tests) run(process.execPath, [resolve(here, test)], `extension ${test}`);
}

async function runGroup(name, action) {
  process.stdout.write(`\n>>> contract-ci group: ${name}\n`);
  if (injectedGroup === `schema:${name}`) {
    throw new Error(`injected schema contract-ci failure: ${name}`);
  }
  await action();
  process.stdout.write(`PASS contract-ci group: ${name}\n`);
}

export async function runs_all_v02_contract_groups() {
  await runGroup('baseline', async () => {
    if (hasMonorepoContractTopology()) run(process.execPath, [resolve(here, 'protocol-v0.2-contract-baseline.test.mjs')], 'baseline');
    else await runStandaloneSchemaChecks();
  });
  await runGroup('semantic', async () => {
    if (hasMonorepoContractTopology()) run(process.execPath, [resolve(here, 'protocol-v0.2-semantic-vectors.test.mjs')], 'semantic vectors');
    else await runStandaloneSemanticChecks();
  });
  await runGroup('taxonomy', async () => {
    run(process.execPath, [resolve(schemaRoot, 'scripts/validate-taxonomy-v1.mjs')], 'taxonomy validation');
  });
  await runGroup('typescript', async () => {
    run(resolve(schemaRoot, 'node_modules/.bin/tsc'), [
      '--noEmit', '--strict', '--module', 'ESNext', '--moduleResolution', 'bundler',
      'types/offer-v0.2.types.ts', 'test/offer-v0.2.types.test-d.ts',
    ], 'TypeScript contract types');
  });
  await runGroup('postback', async () => {
    if (hasMonorepoContractTopology()) {
      run('python3', [resolve(here, 'verify-postback-v0.2.py')], 'postback reference verifier');
      run('bash', [resolve(here, 'validate-postback.sh')], 'postback schema vectors');
    } else {
      await runStandaloneSchemaChecks();
    }
  });
  await runGroup('offer-provider-examples', async () => {
    if (hasMonorepoContractTopology()) run(process.execPath, [resolve(here, 'protocol-v0.2-contract-baseline.test.mjs')], 'OfferProvider and examples baseline');
    else await runStandaloneOfferProviderChecks();
  });
  await runGroup('extensions', async () => runExtensions());
}

export function exits_nonzero_when_any_contract_group_fails() {
  const success = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--execute'], {
    cwd: schemaRoot,
    encoding: 'utf8',
  });
  assert.equal(success.status, 0, `complete suite must pass: ${success.stderr}`);
  assert.match(success.stdout, /PASS contract-ci group: extensions/, 'complete suite must report every group');

  const failure = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--execute'], {
    cwd: schemaRoot,
    encoding: 'utf8',
    env: { ...process.env, AON_CONTRACT_CI_INJECT_FAILURE: 'schema:semantic' },
  });
  assert.notEqual(failure.status, 0, 'an injected group failure must fail the suite');
  assert.match(failure.stderr, /injected schema contract-ci failure: semantic/);
}

async function main() {
  if (execute) {
    try {
      await runs_all_v02_contract_groups();
    } catch (error) {
      const detail = error instanceof Error ? error.stack ?? error.message : String(error);
      console.error(`schema contract-ci FAILED\n${detail}`);
      process.exitCode = 1;
    }
    return;
  }
  await runs_all_v02_contract_groups();
  exits_nonzero_when_any_contract_group_fails();
  console.log('schema contract-ci suite T-001/T-002 OK');
}

await main();
