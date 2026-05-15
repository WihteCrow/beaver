# Beaver

**Beaver** 是以「海狸筑坝」为隐喻的 TypeScript **插件化与流程自动化** 单体仓库：用 [Nx](https://nx.dev) 管理多包，覆盖插件内核、Action 编排、Shell/Web/浏览器扩展等场景。

## 简介

- **插件系统**：注册、依赖解析、生命周期（如 init / destroy）、统一由 `PluginManager` 调度。
- **流程与自动化**：基于 Action 的任务编排，可衔接 Shell、文件、Git、下载等能力。
- **产品形态**：Next.js Web 端（arteffix-web）、浏览器扩展（arteffix-extension）等与核心库协同。

更细的 API 与模块说明见各子目录下的 `README.md` 及源码注释。

## 环境要求

- **Node.js**：建议与仓库一致（`package.json` 中 `@types/node` 等约束可参考），推荐使用 **Node 18+**。
- **包管理**： **[pnpm](https://pnpm.io)**（仓库根目录安装与脚本均按 pnpm 约定）。

## 快速开始

```bash
# 安装依赖
pnpm install

# 仅构建核心库（可按需增减项目名）
nx build beaver-kernel
nx build action-core
nx build shell-flow

# 启动 Web 开发服务（Next.js dev）
nx dev arteffix-web

# 运行单包测试示例
nx test beaver-kernel
nx test action-core
nx test shell-flow
```

一次性构建多个目标可使用：

```bash
pnpm exec nx run-many -t build --projects=beaver-kernel,action-core,shell-flow
```

查看依赖与任务图：

```bash
pnpm exec nx graph
```

## Monorepo 包一览

### 核心与流程

| 包                                       | 说明                                       |
| ---------------------------------------- | ------------------------------------------ |
| [beaver-kernel](beaver-kernel/README.md) | 插件内核：注册、依赖、生命周期、自动初始化 |
| [action-core](action-core/README.md)     | Action 基础库：编排、中断、重试等          |
| [action-flow](action-flow/README.md)     | 动作流程：定义、执行与状态                 |
| [shell-flow](shell-flow/README.md)       | 面向 Shell 的流程编排与命令执行            |

### Web 与扩展

| 包                                                 | 说明              |
| -------------------------------------------------- | ----------------- |
| [arteffix-web](arteffix-web/README.md)             | Next.js 管理界面  |
| [arteffix-extension](arteffix-extension/README.md) | 浏览器扩展        |
| [arteffix-shell](arteffix-shell/README.md)         | Shell 相关集成    |
| [arteffix-ai](arteffix-ai/README.md)               | AI / 终端相关能力 |

### Action 模块

| 包                                           | 说明                      |
| -------------------------------------------- | ------------------------- |
| [action-download](action-download/README.md) | 下载相关 Action           |
| [download](download/README.md)               | 下载能力库（Rollup 构建） |
| [action-drive](action-drive/README.md)       | 驱动相关                  |
| [action-exec](action-exec/README.md)         | 执行相关                  |
| [action-fs](action-fs/README.md)             | 文件系统                  |
| [action-git](action-git/README.md)           | Git                       |
| [action-io](action-io/README.md)             | IO                        |
| [action-parse](action-parse/README.md)       | 解析                      |
| [action-shell](action-shell/README.md)       | Shell                     |

### 工具与其它

| 包                                             | 说明           |
| ---------------------------------------------- | -------------- |
| [shell-conda](shell-conda/README.md)           | Conda 环境相关 |
| [system-info](system-info/README.md)           | 系统信息       |
| [arteffix-utils](arteffix-utils/README.md)     | 通用工具       |
| [arteffix-library](arteffix-library/README.md) | 共享库与资源   |
| [interceptor](interceptor/README.md)           | 拦截器         |
| [types](types/README.md)                       | 类型定义库     |

## 插件开发

实现符合约定的插件，通过 `PluginManager.register` 注册；支持声明依赖、自动初始化及生命周期钩子。具体接口与示例见 [beaver-kernel](beaver-kernel/README.md)。

## 参与贡献

欢迎通过 Issue / PR 反馈。改动前建议阅读目标包的 README 与既有代码风格。

## 开源与许可

本项目**源代码公开**，可在许可条件允许范围内自由使用、修改与再分发；**禁止商业使用**（定义与例外以英文许可全文为准）。商业用途须事先取得版权方书面授权。

**完整许可条款（英文）**见仓库根目录 [`LICENSE`](LICENSE)（Beaver Non-Commercial Source License）。
