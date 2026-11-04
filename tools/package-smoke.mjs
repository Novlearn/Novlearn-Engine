import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { builtinModules } from 'node:module';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { rolldown } from 'rolldown';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workspace = join(root, '.cache', `package-smoke-${Date.now()}`);
const archive = join(workspace, 'archive');
const consumer = join(workspace, 'consumer');
const npmCli =
  process.env.npm_execpath ??
  join(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
await mkdir(archive, { recursive: true });
await mkdir(consumer);
function run(args, cwd = root) {
  const result = spawnSync(process.execPath, args, {
    cwd,
    encoding: 'utf8',
    timeout: 120000,
    maxBuffer: 8 * 1024 * 1024,
  });
  assert.equal(
    result.status,
    0,
    result.stderr || result.error?.message || result.stdout,
  );
  return result.stdout;
}
const packed = JSON.parse(
  run([npmCli, 'pack', '--json', '--pack-destination', archive]),
)[0];
assert(
  packed.files.every(
    (file) =>
      ['package.json', 'README.md'].includes(file.path) ||
      file.path.startsWith('dist/'),
  ),
);
const tarball = join(archive, packed.filename);
const sha256 = createHash('sha256')
  .update(await readFile(tarball))
  .digest('hex');
await writeFile(
  join(consumer, 'package.json'),
  JSON.stringify({
    name: 'isolated-package-consumer',
    private: true,
    type: 'module',
  }),
);
run(
  [
    npmCli,
    'install',
    '--prefer-offline',
    '--ignore-scripts',
    '--no-audit',
    '--no-fund',
    '--cache',
    join(root, '.cache/m9-linux-validation/.npm-cache'),
    tarball,
  ],
  consumer,
);
await copyFile(
  join(root, 'tests/fixtures/legacy/adapted/78.definition.json'),
  join(consumer, 'definition.json'),
);
await copyFile(
  join(root, 'examples/persistence/attempt.ts'),
  join(consumer, 'attempt.ts'),
);
const smoke = `import * as engine from 'novlearn-exercise-engine';
import { adaptLegacyExercise } from 'novlearn-exercise-engine/legacy';
import { createNodeHost } from 'novlearn-exercise-engine/node-host';
const keys=Object.keys(engine).sort();
const wanted=['GRAPH_PROFILE','sampleDisplayGraph','generateVariables','gradeAnswer','instantiateExercise','parseMathInput','projectPublicInstance','validateDefinition','validateSubmission'].sort();
if(JSON.stringify(keys)!==JSON.stringify(wanted))throw Error('exports');
if(typeof adaptLegacyExercise!=='function'||typeof createNodeHost!=='function')throw Error('subpaths');
const definition=JSON.parse(await (await import('node:fs/promises')).readFile(new URL('./definition.json',import.meta.url),'utf8'));
const generated=engine.instantiateExercise(definition,{seed:42,instanceId:'external-consumer'});
if(!generated.ok)throw Error('instantiate');
const official=JSON.parse(JSON.stringify(generated.value));
const result=engine.gradeAnswer(official,{schemaVersion:5,instanceId:official.instanceId,questionId:'1781009000002',answer:{format:'latex',source:'\\\\sqrt{10}'}});
if(result.state!=='correct')throw Error('grade');
const graphDefinition={schemaVersion:5,kind:'composed',id:'installed-graph',revision:'1',title:'Installed graph',generation:{schemaVersion:5,definitions:[],constraints:[],maxAttempts:4,maxDraws:16},variables:[{name:'x',domain:'real'}],elements:[{id:'g',type:'function-graph',variable:'x',window:{xMin:{latex:'-1'},xMax:{latex:'1'},yMin:{latex:'-1'},yMax:{latex:'2'}},showGrid:true,functions:[{id:'f',latex:'x^2',color:'#2563eb',showExpression:true}]}]};
const curve=engine.instantiateExercise(graphDefinition,{seed:42,instanceId:'external-graph'});
if(!curve.ok||engine.GRAPH_PROFILE!=='display-graph-v1')throw Error('graph-contract');
const samples=await engine.sampleDisplayGraph(curve.value,'g');
if(!samples.ok||samples.value.state!=='complete'||samples.value.series[0].points.length!==65||samples.value.series[0].segments.length!==64)throw Error('graph-sampling');
const publicInstance=engine.projectPublicInstance(official);
console.log(JSON.stringify({keys,graphSampling:{profile:samples.value.profile,state:samples.value.state,points:samples.value.series[0].points.length},state:result.state,questions:publicInstance.elements.filter(e=>e.type==='question'||e.type==='mcq').length}));
`;
await writeFile(join(consumer, 'smoke.mjs'), smoke);
const nativeSmoke = `import { createNodeHost } from 'novlearn-exercise-engine/node-host';
let isolatedHost = {status:'not-executed',platform:process.platform};
if(process.platform==='win32'&&process.arch==='x64') {
 const host=createNodeHost();
 try {
  const isolated=await host.run(JSON.stringify({protocolVersion:1,requestId:'packaged-host',operation:'parseMathInput',payload:{source:' 1+2 ',context:{},profile:'scalar-latex-v1'}}));
  if(!isolated.ok||!isolated.value.ok||isolated.value.source!==' 1+2 ')throw Error('packaged-host:'+JSON.stringify(isolated));
  if(!(isolated.metrics.peakCommittedBytes>0&&isolated.metrics.peakCommittedBytes<=384*1048576))throw Error('packaged-host-memory');
  let alive=false;
  try {process.kill(isolated.metrics.workerPid,0);alive=true;} catch(error) {if(error.code!=='ESRCH')throw error;}
  if(alive)throw Error('packaged-host-cleanup');
  isolatedHost={status:'pass',platform:process.platform,elapsedMs:isolated.metrics.elapsedMs,peakCommittedBytes:isolated.metrics.peakCommittedBytes};
 } finally {await host.close();}
 if(JSON.stringify(host.stats())!==JSON.stringify({active:0,queued:0,queuedBytes:0,closed:true}))throw Error('packaged-host-stats');
}
console.log(JSON.stringify(isolatedHost));
`;
await writeFile(join(consumer, 'native.mjs'), nativeSmoke);
const nodeEvidence = JSON.parse(run([join(consumer, 'smoke.mjs')], consumer));
await writeFile(
  join(consumer, 'types.ts'),
  `import type { ExerciseDefinition, ExerciseInstance, AnswerSubmission, CorrectionResult, PublicInstance, GraphSamplingResult } from 'novlearn-exercise-engine';
import { instantiateExercise, projectPublicInstance, gradeAnswer, sampleDisplayGraph } from 'novlearn-exercise-engine';
import type { LegacyRecipe } from 'novlearn-exercise-engine/legacy';
import { createNodeHost } from 'novlearn-exercise-engine/node-host';
export async function consumeGraph(official:ExerciseInstance):Promise<GraphSamplingResult>{return sampleDisplayGraph(official,'g');}
export function consume(definition:ExerciseDefinition, submission:AnswerSubmission, recipe:LegacyRecipe):PublicInstance|CorrectionResult|undefined {
 const result=instantiateExercise(definition,{seed:42,instanceId:'types'});
 if(!result.ok)return undefined;
 const official:ExerciseInstance=result.value;
 void recipe; void createNodeHost;
 return submission.questionId ? gradeAnswer(official,submission) : projectPublicInstance(official);
}
`,
);
await writeFile(
  join(consumer, 'tsconfig.json'),
  JSON.stringify({
    compilerOptions: {
      noEmit: true,
      strict: true,
      target: 'ES2022',
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      types: [],
    },
    files: ['types.ts', 'attempt.ts'],
  }),
);
run(
  [
    join(root, 'node_modules/typescript/bin/tsc'),
    '--project',
    join(consumer, 'tsconfig.json'),
  ],
  consumer,
);
await writeFile(
  join(consumer, 'browser.mjs'),
  `import * as engine from 'novlearn-exercise-engine';
const source=engine.parseMathInput('1{,}25',{},'school-latex-v1');
if(!source.ok)throw Error('browser-parse');
export const result={exports:Object.keys(engine).sort(),source:source.source,ok:source.ok};
`,
);
const seen = new Set();
const bundle = await rolldown({
  input: join(consumer, 'browser.mjs'),
  platform: 'browser',
  plugins: [
    {
      name: 'deny-node-builtins',
      resolveId(source) {
        assert(
          !source.startsWith('node:') && !builtinModules.includes(source),
          `Node builtin in browser: ${source}`,
        );
      },
      moduleParsed(info) {
        seen.add(info.id);
      },
    },
  ],
  onLog(level, log) {
    if (level === 'warn' || level === 'error') throw new Error(log.message);
  },
});
let output;
try {
  output = await bundle.write({
    file: join(consumer, 'browser-bundle.mjs'),
    format: 'esm',
  });
} finally {
  await bundle.close();
}
assert(
  output.output.every(
    (item) =>
      item.type !== 'chunk' ||
      (!item.imports.length && !item.dynamicImports.length),
  ),
);
assert(
  [...seen].every((id) => !id.includes('/node-host/') && !id.includes('node:')),
);
const browserEvidence = await import(
  pathToFileURL(join(consumer, 'browser-bundle.mjs'))
);
assert.equal(browserEvidence.result.ok, true);
let nativeHost;
try {
  nativeHost = JSON.parse(run([join(consumer, 'native.mjs')], consumer));
} catch (error) {
  await writeFile(
    join(workspace, 'report.json'),
    JSON.stringify(
      {
        schemaVersion: 1,
        node: process.version,
        packageVersion: packed.version,
        sha256,
        integrity: packed.integrity,
        files: packed.entryCount,
        nodeEvidence,
        typesPassed: true,
        browserEvidence: browserEvidence.result,
        nativeHost: { status: 'fail', platform: process.platform },
        consumer,
      },
      null,
      2,
    ),
  );
  throw error;
}
await writeFile(
  join(workspace, 'report.json'),
  JSON.stringify(
    {
      schemaVersion: 1,
      node: process.version,
      packageVersion: packed.version,
      sha256,
      integrity: packed.integrity,
      files: packed.entryCount,
      nodeEvidence,
      nativeHost,
      browserEvidence: browserEvidence.result,
      browserModules: seen.size,
      browserBytes: (await readFile(join(consumer, 'browser-bundle.mjs')))
        .byteLength,
      consumer,
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify({
    workspace,
    sha256,
    node: nodeEvidence,
    nativeHost,
    browser: browserEvidence.result,
  }),
);
