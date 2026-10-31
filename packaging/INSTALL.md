# Mnemon 0.5.37 装进 desktop profile（2026-10-30）

按已验收版本装，不升级、不改算法。Heart 仍是 legacy（没切 external）。

## 版本与来源

| 项 | 值 |
|---|---|
| dsh-mnemon | 0.5.37（registry 包） |
| 固定源码 | `7cbdefc64c019a073cfdb493b0b516b5b7177bb6`（`projects/memory-provider-validation/mnemon`，构建前已核对 HEAD） |
| 源码重编的 5 个活跃模块 | dsh-mnemon 0.5.37、dsh-mnemon-source-runtime 0.5.16、dsh-mnemon-source-memory-spaces 0.5.24、dsh-mnemon-provider-mnemon-native 0.5.10、dsh-mnemon-strategy-default-three-tier 0.5.11 |
| Native CLI | @mnemon-dev/mnemon 0.2.13 |
| 构建方式 | 照抄 `memory-provider-validation/live-bootstrap.mjs` 的 esbuild 配置（bundle+splitting、packages external），产物在 `stage/` |
| 依赖树 | `pkg/`（pnpm 默认隔离布局，`pkg/node_modules/.pnpm`） |

## 实际改动（全在 profile 与新建目录，没动生产记忆）

1. 新建 `projects/mnemon-install/`（依赖树 `pkg/`、源码构建产物 `stage/`、备份 `backup/`）。
2. `~/.dsh/profiles/desktop/node_modules/` 增加 24 个 junction，指向 `pkg/node_modules/.pnpm` 里的包（`@deepseek-ai/*` 一律不接，宿主自己提供）。
3. `~/.dsh/profiles/desktop/package.json`：dependencies 加 `dsh-mnemon: link:…`；bundles 加 `dsh-mnemon`（放在 `@dsh/heart` 之前）。
4. `~/.dsh/profiles/desktop/cordis.patch.yml` 末尾追加：mnemon 主配置（custom storage、dataDir=`C:\Users\xuaner\.dsh\mnemon-data`、cliPath 指向 0.2.13、`taskAgentModel: inherit`、embedding/idleReview/gitSync 全关）、Runtime/Documents/Skills/ActiveCapture 关闭、Native Provider 实例挂载。
5. 新建 `C:\Users\xuaner\.dsh\mnemon-data`，用官方 CLI 建了唯一 Space `heart-main`。

**没动**：home 级 `$DSH_HOME/cordis.patch.yml`；heart 的 `memoryMode`（仍 legacy）；任何 facts/MEMORY；没有停宿主。

## 校验记录

- `dsh --profile desktop --dump-config` rc=0，mnemon 行已按覆盖值组合出来（`projects/mnemon-install/dump-config.txt`）。
- 6 个入口逐个 `import` 通过（dsh-mnemon、/bundle、source-runtime、source-memory-spaces、provider-native、strategy-default-three-tier）。
- CLI 可用：`mnemon store list` → `heart-main`。

## 生效与回退

生效：重启 DSH（宿主启动时才加载插件）。重启后检查 `GET /api/dsh-heart/state` 仍正常、工具列表里出现 `mnemon_*`。

回退（任一步都不会丢旧记忆）：

```bash
cp projects/mnemon-install/backup/package.json.before-mnemon ~/.dsh/profiles/desktop/package.json
cp projects/mnemon-install/backup/cordis.patch.yml.before-mnemon ~/.dsh/profiles/desktop/cordis.patch.yml
# 删掉那 24 个 junction（只删链接，不删目标）：
node -e "const fs=require('fs'),p='C:/Users/xuaner/.dsh/profiles/desktop/node_modules';for(const n of fs.readdirSync(p))if(/^dsh-mnemon/.test(n)&&fs.lstatSync(p+'/'+n).isSymbolicLink())fs.unlinkSync(p+'/'+n)"
rm -rf ~/.dsh/mnemon-data        # 仅在确定不要这段时间的 Mnemon 记忆时
```

注意：之后再对 desktop profile 跑 `pnpm install` 会清掉这些手工 junction（`.modules.yaml` 里没有它们）。要装别的插件时先记一笔。

## 已知代价

- 工具数 +17，首次请求 prompt 约 +3.7k token（验收实测 8,993 vs 5,298）。
- Heart 仍是 legacy：facts 继续注入，Mnemon 的事实不会自动进提示词。两套并存期间可能重复记账——这是下一步要决定的事，不是这次的 bug。
