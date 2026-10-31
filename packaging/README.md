# mnemon-install：把已验收的 Mnemon 装进任意 DSH profile

整理于 2026-10-30。这个目录原先只是我在本机给自己装 Mnemon 时的一堆临时文件，
现在分成「本机构建工作区」和「可分发安装包」两块，妹妹的 Linux/arm64 也能用同一份。

## 为什么不能直接打一个包发过去

Mnemon 由两部分组成：

| 部分 | 平台相关性 | 怎么给 |
|---|---|---|
| 5 个活跃宿主模块（dsh-mnemon、source-runtime、source-memory-spaces、provider-mnemon-native、strategy-default-three-tier） | 纯 ESM JS，平台无关 | 用固定源码 `7cbdefc6` 编好，随包发（`dist/stage/`） |
| `@mnemon-dev/mnemon` CLI 0.2.13 | 自带各平台二进制（linux-arm64 等） | 必须在目标机上 `npm install`，不能跨平台复制 |

所以安装包 = 编好的 JS + 一个在目标机上执行的 `install.sh`，脚本负责装同版本依赖、
用我们的 JS 覆盖那 5 个包的 lib、接进 profile、建 Space、自检。

## 目录

```
projects/mnemon-install/
  build-stage.mjs      从固定源码 commit 重编 5 个模块（与已验收的 live-bootstrap.mjs 同一入口表）
  gen-manifest.py      生成 dist/VERSIONS.json（33 个文件的哈希）
  pkg/                 本机构建用的依赖树（pnpm，含 @mnemon-dev CLI 的 win 二进制）
  stage/               本机构建产物（= dist/stage 的来源）
  dist/                分发包
    install.sh         在目标机执行：装依赖、覆盖 lib、接 profile、建 Space、自检
    uninstall.sh       回退（只删链接、恢复首次安装前的 profile 配置）
    stage/             5 个模块编译后的 lib
    VERSIONS.json      版本、源码 commit、每个文件的 sha256
  dist/mnemon-install-0.5.37.tar.gz   推给手机的那份
  backup/              本机 desktop profile 装之前的两个配置副本
  INSTALL.md           本机（Windows desktop profile）实际装了什么、怎么校验、怎么退
  _fixture/            脚本的端到端测试用假 DSH_HOME（可删）
```

## 版本（与已验证的那套一致，不擅自升级）

- dsh-mnemon 0.5.37
- 固定源码 `7cbdefc64c019a073cfdb493b0b516b5b7177bb6` → source-runtime 0.5.16、source-memory-spaces 0.5.24、provider-mnemon-native 0.5.10、strategy-default-three-tier 0.5.11
- Native CLI `@mnemon-dev/mnemon` 0.2.13
- node >= 22

## 在手机（proot Ubuntu / arm64）上装

```bash
# 把 tar 解到任意目录（不用放进 profile）
tar -xzf /sdcard/dshproject/mnemon-install-0.5.37.tar.gz -C /root
cd /root/mnemon-install

# 默认 DSH_HOME=~/.dsh，自动挑装有 @dsh/heart 的 profile；也可以显式指定
bash install.sh --profile web
```

npm 慢或不通时：

```bash
NPM_REGISTRY=https://registry.npmmirror.com bash install.sh --profile web
```

脚本做的事：装依赖到 `~/.dsh/mnemon-tree` → 用 `stage/` 覆盖 5 个包的 lib →
在 profile 的 node_modules 里建 19 个链接 → 改 `package.json`（依赖 + bundles）→
往 `cordis.patch.yml` 追加 Mnemon 覆盖段（Runtime/Documents/Skills/ActiveCapture 关、
embedding/idleReview/gitSync 关、`taskAgentModel: inherit`、Native Provider 挂上）→
在 `~/.dsh/mnemon-data` 建唯一 Space `heart-main` → 逐个 import 自检 → 有 `dsh` 就 `--dump-config`。

**不会**：动 heart 的数据和 `memoryMode`、动 home 级 `$DSH_HOME/cordis.patch.yml`、
删旧记忆、停宿主。装完要**重启 DSH** 才生效。

## 回退

```bash
cd /root/mnemon-install
bash uninstall.sh --profile web          # 只删链接 + 恢复首次安装前的两个配置
bash uninstall.sh --profile web --purge  # 再把依赖树删掉
rm -rf ~/.dsh/mnemon-data                # 确认不要这段时间的 Mnemon 记忆再删
```

备份策略：每个 profile 只留一份**首次安装前**的备份（`$DSH_HOME/backups/mnemon/<profile>`），
重跑安装不会把它覆盖成已改过的版本。

## 已经验过什么

- 本机 Windows：装进 desktop profile，重启后 `mnemon_status` 报 healthy、CLI 0.2.13、space `heart-main` 激活、Native Provider 8 项能力全开、writeEnabled。
- 脚本端到端：用假 DSH_HOME 跑 install 两次 → uninstall 一次，profile 的 bundles 与 node_modules 都回到装前状态（`_fixture/` 就是那次测试）。
- **没验过**：Linux/arm64 上 `npm install` 与原生 CLI 的实际运行（要等手机上跑）。她的 node 版本若 <22，脚本会在预检处停住并报出来。
