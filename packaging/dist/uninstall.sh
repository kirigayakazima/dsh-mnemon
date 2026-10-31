#!/usr/bin/env bash
# 撤掉 install.sh 做的改动。默认保留依赖树和 Mnemon 数据（不删记忆）。
#
# 用法: bash uninstall.sh [--profile web] [--purge]
#   --purge  同时删除依赖树（默认 $DSH_HOME/mnemon-tree）；数据目录仍需手动删
set -euo pipefail
DSH_HOME="${DSH_HOME:-$HOME/.dsh}"
PROFILE=""
PURGE=0
while [ $# -gt 0 ]; do
  case "$1" in
    --profile) PROFILE="$2"; shift 2 ;;
    --purge) PURGE=1; shift ;;
    *) echo "未知参数: $1" >&2; exit 2 ;;
  esac
done
[ -n "$PROFILE" ] || { echo "需要 --profile <name>"; exit 2; }
PROFILE_DIR="$DSH_HOME/profiles/$PROFILE"

echo "== 删 profile 里的 mnemon symlink"
node - "$PROFILE_DIR" <<'NODE'
const fs = require('fs'), path = require('path')
const nm = path.join(process.argv[2], 'node_modules')
let n = 0
for (const name of fs.readdirSync(nm)) {
  if (!name.startsWith('dsh-mnemon')) continue
  const p = path.join(nm, name)
  const st = fs.lstatSync(p)
  if (st.isSymbolicLink()) { fs.unlinkSync(p); n++ } else console.log('  保留真实目录', name)
}
console.log('  删除链接:', n)
NODE

echo "== 恢复最近的 profile 备份"
BK="$DSH_HOME/backups/mnemon/$PROFILE"
[ -d "$BK" ] || BK=$(ls -dt "$DSH_HOME"/backups/mnemon-* 2>/dev/null | head -1 || true)
if [ -n "${BK:-}" ] && [ -f "$BK/package.json" ]; then
  cp "$BK/package.json" "$PROFILE_DIR/package.json"
  [ -f "$BK/cordis.patch.yml" ] && cp "$BK/cordis.patch.yml" "$PROFILE_DIR/cordis.patch.yml"
  echo "  已恢复 $BK"
else
  echo "  没有备份，手动清理包 package.json 里的 dsh-mnemon 条目与 bundles 项" >&2
fi

[ "$PURGE" = 1 ] && { echo "== 删依赖树"; rm -rf "$DSH_HOME/mnemon-tree"; }

cat <<'EOF'
完成。重启 DSH 后生效。
Mnemon 数据目录未动（默认 ~/.dsh/mnemon-data）；确认不要了再 rm -rf。
EOF
