# dsh-mnemon (DSHA 主权分支与离线记忆引擎)

> **定位**: 本仓库是 [`omdsh-dev/dsh-mnemon`](https://github.com/omdsh-dev/dsh-mnemon) 的 DSHA 主权 Fork 分支（版本：`v0.5.37-sovereign`）。为 DSHA 双端协同智能体（PC 端阿醒 / 手机端小满）提供稳定、可回溯、零外部依赖的三层记忆架构底层。

---

## 🌟 主权魔改与核心特性

1. **源码架构精确固化**：
   - 锁定经过生产验证的 commit `7cbdefc64c019a073cfdb493b0b516b5b7177bb6`；
   - 包含重编加固的 5 大核心模块（Core、source-runtime、source-memory-spaces、provider-native、strategy-default-three-tier）。
2. **纯本地 Native Space 空间隔离 (`heart-main`)**：
   - 统一采用轻量高效的 `mnemon-native` 提供者，数据全量落盘于纯文本与 JSON 本地存储（PC 端 `~/.dsh/mnemon-data`，手机端 `/root/.dsh/mnemon-data`）；
   - 写入模式严格设定为 `exact`（精准记录关键事实），删除模式设定为软删除（Soft Delete），杜绝意外丢失。
3. **极简极稳与 Token 零浪费策略**：
   - 关闭易引发 Token 膨胀的运行时常驻注入（Runtime Memory）与文档 RAG（Project Documents）；
   - 关闭后台模型自动捕获（Auto-capture）与沉重的本地向量 Embedding，不依赖外部模型 API，消除记忆幻觉。
4. **自包含移动端安装工具链**：
   - 内置 `packaging/` 离线依赖树打包工具与安装引导脚本，实现红米手机端 Proot 容器内原子级离线安装。

---

## 🛠️ 安装与部署

### PC 端打包并推送到手机端
```bash
uv run python scripts/deploy_to_phone.py --plugin mnemon
```

### 手机容器端激活
```bash
INSTALL_MNEMON=1 sh /sdcard/dshproject/updates/install_or_update.sh
```

---

## 🙏 致谢与声明 (Acknowledgments)

- 诚挚感谢原作者团队 [`omdsh-dev/dsh-mnemon`](https://github.com/omdsh-dev/dsh-mnemon) 开源的先进分层记忆系统与模块化设计。
- 本项目遵循 MIT 许可证进行自主托管与衍生维护。
