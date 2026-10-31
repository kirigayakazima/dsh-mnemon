#!/usr/bin/env bash
# 把已验收的 Mnemon（dsh-mnemon 0.5.37 + 固定源码 7cbdefc6 重编 + Native CLI 0.2.13）
# 装进一个 DSH profile。只动 profile 与新建目录，不碰 heart 数据和旧记忆。
#
# 用法:
#   bash install.sh [--profile web] [--data-dir ~/.dsh/mnemon-data] [--tree ~/.dsh/mnemon-tree]
#
# 需要: node >= 22、npm（或 pnpm）、网络能访问 npm registry。
# 可重复运行；已装过会更新 lib 与配置，不会重复建 Space。
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STAGE="$HERE/stage"
DSH_HOME="${DSH_HOME:-$HOME/.dsh}"
PROFILE=""
DATA_DIR=""
TREE=""
NPM_REGISTRY="${NPM_REGISTRY:-}"

while [ $# -gt 0 ]; do
  case "$1" in
    --profile) PROFILE="$2"; shift 2 ;;
    --data-dir) DATA_DIR="$2"; shift 2 ;;
    --tree) TREE="$2"; shift 2 ;;
    -h|--help) sed -n '2,12p' "$0"; exit 0 ;;
    *) echo "未知参数: $1" >&2; exit 2 ;;
  esac
done

say() { printf '\n== %s\n' "$*"; }
die() { printf '\n!! %s\n' "$*" >&2; exit 1; }

say "预检"
command -v node >/dev/null || die "没有 node"
NODE_V="$(node -p 'process.versions.node')"
node -p 'Number(process.versions.node.split(".")[0]) >= 22' | grep -q true \
  || die "node 版本 $NODE_V 太旧，需要 >= 22"
echo "node $NODE_V"
command -v npm >/dev/null || die "没有 npm"
echo "npm $(npm -v)"
[ -d "$STAGE/dsh-mnemon" ] || die "缺少 stage/ 产物（应在 $STAGE）"
[ -d "$DSH_HOME/profiles" ] || die "找不到 $DSH_HOME/profiles"

if [ -z "$PROFILE" ]; then
  # 挑第一个装了 @dsh/heart 的 profile
  for p in "$DSH_HOME"/profiles/*/; do
    if [ -d "$p/node_modules/@dsh/heart" ]; then PROFILE="$(basename "$p")"; break; fi
  done
fi
[ -n "$PROFILE" ] || die "没找到装有 @dsh/heart 的 profile，请用 --profile 指定"
PROFILE_DIR="$DSH_HOME/profiles/$PROFILE"
[ -d "$PROFILE_DIR" ] || die "profile 不存在: $PROFILE_DIR"
echo "profile: $PROFILE ($PROFILE_DIR)"

TREE="${TREE:-$DSH_HOME/mnemon-tree}"
DATA_DIR="${DATA_DIR:-$DSH_HOME/mnemon-data}"
echo "依赖树: $TREE"
echo "数据目录: $DATA_DIR"

say "备份 profile 配置"
# 每个 profile 只留一份「首次安装前」的备份：重跑不会把已改过的配置当回退点
BK="$DSH_HOME/backups/mnemon/$PROFILE"
if [ -f "$BK/package.json" ]; then
  echo "沿用首次备份 $BK（重跑不覆盖）"
else
  mkdir -p "$BK"
  cp "$PROFILE_DIR/package.json" "$BK/"
  [ -f "$PROFILE_DIR/cordis.patch.yml" ] && cp "$PROFILE_DIR/cordis.patch.yml" "$BK/"
  echo "备份到 $BK"
fi

say "安装固定版本依赖（dsh-mnemon 0.5.37 + Native CLI 0.2.13）"
mkdir -p "$TREE"
[ -f "$TREE/package.json" ] || cat > "$TREE/package.json" <<'EOF'
{ "name": "dsh-mnemon-tree", "private": true, "dependencies": {} }
EOF
REG_ARGS=()
[ -n "$NPM_REGISTRY" ] && REG_ARGS=(--registry "$NPM_REGISTRY")
( cd "$TREE" && npm install --no-audit --no-fund --save-exact \
    "${REG_ARGS[@]}" dsh-mnemon@0.5.37 @mnemon-dev/mnemon@0.2.13 ) \
  || die "npm install 失败（可试 NPM_REGISTRY=https://registry.npmmirror.com bash install.sh）"

say "用固定源码重编的 JS 覆盖 5 个活跃模块"
for m in dsh-mnemon dsh-mnemon-source-runtime dsh-mnemon-source-memory-spaces \
         dsh-mnemon-provider-mnemon-native dsh-mnemon-strategy-default-three-tier; do
  target="$TREE/node_modules/$m"
  [ -d "$target" ] || die "依赖树里没有 $m"
  rm -rf "$target/lib"
  cp -R "$STAGE/$m" "$target/lib"
  V="$(node -e "try{console.log(JSON.parse(require('fs').readFileSync(process.argv[1],'utf8')).version)}catch{console.log('?')}" "$target/package.json")"
  echo "  $m@$V"
done

say "接到 profile"
node - "$PROFILE_DIR" "$TREE" "$DATA_DIR" <<'NODE'
const fs = require('fs')
const path = require('path')
const [profileDir, tree, dataDir] = process.argv.slice(2)
const nm = path.join(profileDir, 'node_modules')
fs.mkdirSync(nm, { recursive: true })

// 1) 用 junction/symlink 把 mnemon 的包挂进 profile（不复制、不覆盖其它插件）
const treeNm = path.join(tree, 'node_modules')
let linked = 0
for (const name of fs.readdirSync(treeNm)) {
  if (!name.startsWith('dsh-mnemon')) continue
  const target = fs.realpathSync(path.join(treeNm, name))
  const dest = path.join(nm, name)
  if (fs.existsSync(dest) || fs.lstatSync(dest, { throwIfNoEntry: false })?.isSymbolicLink?.()) {
    const st = fs.lstatSync(dest)
    if (!st.isSymbolicLink()) { console.log('  ! 已存在真实目录，跳过', name); continue }
    fs.unlinkSync(dest)
  }
  fs.symlinkSync(target, dest, process.platform === 'win32' ? 'junction' : 'dir')
  linked++
}
console.log('  junctions:', linked)

// 2) package.json：依赖条目 + bundles
const pkgPath = path.join(profileDir, 'package.json')
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
pkg.dependencies = pkg.dependencies || {}
pkg.dependencies['dsh-mnemon'] = 'file:' + path.join(treeNm, 'dsh-mnemon')
const bundles = (pkg.dsh && pkg.dsh.profile && pkg.dsh.profile.bundles) || []
if (!bundles.includes('dsh-mnemon')) {
  const i = bundles.indexOf('@dsh/heart')
  bundles.splice(i < 0 ? bundles.length : i, 0, 'dsh-mnemon')
}
pkg.dsh = pkg.dsh || {}
pkg.dsh.profile = pkg.dsh.profile || {}
pkg.dsh.profile.bundles = bundles
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
console.log('  bundles:', bundles.join(', '))
NODE

say "写 cordis 覆盖（第一次才追加，重跑不重复写）"
PATCH="$PROFILE_DIR/cordis.patch.yml"
if grep -q '^# ---- Mnemon' "$PATCH" 2>/dev/null; then
  echo "  已有 Mnemon 覆盖段，跳过"
else
  CLI="$TREE/node_modules/@mnemon-dev/mnemon/bin/mnemon.js"
  cat >> "$PATCH" <<EOF

# ---- Mnemon 记忆提供者（0.5.37，固定源码 7cbdefc6；由 install.sh 写入） ----
- id: mnemon
  config:
    storageScope: custom
    dataDir: '$DATA_DIR'
    cliPath: '$CLI'
    taskAgentModel:
      mode: inherit
    idleReview:
      enabled: false
    embedding:
      enabled: false
    gitSync:
      enabled: false
- id: mnemon-source-runtime
  disabled: true
- id: mnemon-source-documents
  disabled: true
- id: mnemon-source-skills
  disabled: true
- id: mnemon-strategy-auto-capture
  disabled: true
- id: mnemon-source-memory-spaces
  config:
    dataDir: '$DATA_DIR'
    cliPath: '$CLI'
    providers:
      - use: dsh-mnemon-provider-mnemon-native
        instanceId: mnemon-native
EOF
  echo "  已追加到 $PATCH"
fi

say "建固定 Space（已存在则跳过）"
CLI="$TREE/node_modules/@mnemon-dev/mnemon/bin/mnemon.js"
if node "$CLI" --data-dir "$DATA_DIR" store list 2>/dev/null | grep -q 'heart-main'; then
  echo "  heart-main 已存在"
else
  node "$CLI" --data-dir "$DATA_DIR" store create heart-main
fi

say "加载自检"
( cd "$PROFILE_DIR" && node -e "
const names=['dsh-mnemon','dsh-mnemon/bundle','dsh-mnemon-source-memory-spaces','dsh-mnemon-provider-mnemon-native','dsh-mnemon-strategy-default-three-tier'];
(async()=>{let bad=0;for(const n of names){try{await import(n)}catch(e){bad++;console.log('FAIL',n,e.message)}}process.exit(bad?1:0)})()
") || die "模块加载失败，先别重启；回退用 uninstall.sh"
if command -v dsh >/dev/null; then
  dsh --profile "$PROFILE" --dump-config >/dev/null || die "配置组合失败，先别重启"
  echo "  dsh --dump-config OK"
else
  echo "  没找到 dsh CLI，跳过 config 组合检查"
fi

cat <<EOF

完成。下一步：
  1. 重启 DSH（插件在宿主启动时加载）。
  2. 起来后确认工具列表里出现 mnemon_*，并且能建/读 heart-main。
  3. 回退: bash uninstall.sh --profile $PROFILE
EOF
