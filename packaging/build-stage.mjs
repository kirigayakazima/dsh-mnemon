// 从固定源码 commit 重编 Mnemon 的 5 个活跃宿主模块。
// 产物是平台无关的 ESM JS，可以拿到别的机器上用。
//
// 用法: node build-stage.mjs [--repo <mnemon 源码克隆>] [--out <产物目录>]
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { build } from 'esbuild'

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1'))
const arg = (name, dflt) => {
  const i = process.argv.indexOf('--' + name)
  return i > 0 ? process.argv[i + 1] : dflt
}
const repo = arg('repo', path.resolve(here, '..'))
const out = arg('out', path.join(here, 'stage'))
const EXPECTED = '7cbdefc64c019a073cfdb493b0b516b5b7177bb6'

const head = execFileSync('git', ['-C', repo, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
if (head !== EXPECTED) throw new Error(`源码 commit 不对: ${head}（要求 ${EXPECTED}）`)

// 与已验证的 live-bootstrap.mjs 相同的入口表
const spec = {
  'dsh-mnemon': {
    index: 'src/index.ts', starter: 'src/starter.ts', bundle: 'src/bundle.ts',
    core: 'src/core/plugin.ts', contracts: 'src/core/contracts/index.ts',
    'extension-sdk': 'src/sdk/index.ts', testing: 'src/sdk/testing.ts',
  },
  'dsh-mnemon-source-runtime': ['contracts', 'index'],
  'dsh-mnemon-source-memory-spaces': ['native-cli', 'contracts', 'index', 'provider-sdk', 'testing', 'space-identity'],
  'dsh-mnemon-provider-mnemon-native': ['index', 'descriptor'],
  'dsh-mnemon-strategy-default-three-tier': ['index', 'extension-sdk'],
}

fs.rmSync(out, { recursive: true, force: true })
for (const [name, entries] of Object.entries(spec)) {
  const srcRoot = name === 'dsh-mnemon' ? repo : path.join(repo, 'plugins', name)
  const points = Array.isArray(entries)
    ? Object.fromEntries(entries.map((n) => [n, path.join(srcRoot, 'src', n + '.ts')]))
    : Object.fromEntries(Object.entries(entries).map(([k, v]) => [k, path.join(srcRoot, v)]))
  await build({
    entryPoints: points,
    outdir: path.join(out, name),
    bundle: true, splitting: true, platform: 'node', format: 'esm', target: 'es2022',
    packages: 'external', tsconfigRaw: { compilerOptions: { experimentalDecorators: false } },
    logLevel: 'warning',
  })
  console.log('built', name)
}
console.log('stage ->', out)
