# GitHub Copilot 桌面端中文汉化 (copilot-desktop-zh)

> 非官方汉化补丁 · 运行时注入 · 不动应用本体 · 升级不失效

如果你在 Windows 上使用 GitHub Copilot 桌面版，希望把固定界面文案切换为中文，同时保留官方应用本体和用户内容不变，这个项目提供了一套可审阅、可扩展、可回滚的本地运行时汉化方案。

## 这是什么

给 **GitHub Copilot 桌面版** (Tauri + WebView2 架构) 提供中文界面的运行时汉化。

> ⚠️ **背景**:该应用没有内置中文,也没有语言文件/插件机制(二进制中无 zh-CN 字符串、
> 无 i18next、无 locales 加载逻辑,界面文案硬编码在 exe 里)。因此唯一的汉化方式是
> 通过 WebView2 调试端口做**运行时注入** —— 本项目即为此实现。

## 致谢与 AI 辅助说明

本项目基于 [zhao818/copilot-desktop-zh](https://github.com/zhao818/copilot-desktop-zh) 原版项目继续完善，并保留原项目 MIT License。使用 AI 辅助检查客户端界面与内嵌选项文案；新增中文译文由维护者直接翻译并纳入词典，不调用第三方机器翻译服务，也不上传界面文本。

## 特性

- **不动应用本体**：不修改 `github.exe`，应用升级后可独立回滚；
- **覆盖常用界面**：侧边栏、主页、聊天、设置、自动化、命令面板、快捷键、弹窗和属性提示等；
- **动态文案可翻译**：通过 `textPatterns`、`attrPatterns` 和整句规则处理仓库名、大小、百分比等变量；
- **实时重新应用**：页面内 `MutationObserver` 加 3 秒轮询兜底，React 重渲染或刷新后自动重新应用；
- **不误翻用户内容**：跳过 AI 回复、代码块、技能名、会话标题和用户名等内容；
- **词典可审阅扩展**：所有译文集中在 `dictionary.json`，保存后无需重启即可重新读取；
- **上游词典同步**：可读取 `zhao818/copilot-desktop-zh` 的公开词典，本地自定义译文优先保留。

## 效果截图与演示

本仓库目前不提交未经脱敏和核验的截图，也不使用虚假的下载量、覆盖率或兼容性徽章。想快速确认效果，可以按下面步骤进行本地演示：

1. 用中文版启动器打开 Copilot；
2. 打开侧边栏、会话菜单或设置页，观察固定界面文案是否显示为中文；
3. 运行 `启动 GitHub Copilot 中文版.cmd` 查看注入器日志；
4. 修改 `dictionary.json` 中的测试译文，等待约 3 秒后观察页面是否重新应用。

如果提交效果截图，请使用脱敏后的前后对比图，并在图片旁注明 Copilot 版本、Windows/WebView2 环境和验证日期；不要包含账号、仓库私密信息、令牌或本地敏感路径。

## 环境要求

- Windows + GitHub Copilot 桌面版 (v1.1.x);
- **Node.js** (>= 18,用于运行注入器): https://nodejs.org
- **GitHub CLI** (`gh`,可选;用于同步上游词典): https://cli.github.com

## 快速开始

1. 安装 [Node.js 18 或更高版本](https://nodejs.org/)；
2. 将本文件夹放在 `github.exe` 所在目录的子目录中（例如 `<安装目录>\GitHub Copilot 中文运行版`），确保启动器中的 `..\github.exe` 路径有效；
3. 双击 **`启动 GitHub Copilot 中文版.vbs`** 启动中文版；需要查看日志时运行 **`启动 GitHub Copilot 中文版.cmd`**；
4. 等待 Copilot 页面加载，注入器会持续应用汉化；关闭启动器窗口将停止实时汉化。

> ⚠️ **注意**:必须用这个启动器打开应用才是中文;直接点官方图标启动的仍是英文。

## 安装与卸载

- **安装**：将项目文件夹完整复制到 `github.exe` 所在目录下，并保留文件夹名 **`GitHub Copilot 中文运行版`**；首次启动前确认已安装 Node.js 和 GitHub CLI（GitHub CLI 可选）。
- **启动**：运行 **`启动 GitHub Copilot 中文版.vbs`**；需要查看日志时运行 **`启动 GitHub Copilot 中文版.cmd`**。
- **卸载**：先退出由中文版启动器打开的 Copilot 和注入器，再删除 **`GitHub Copilot 中文运行版`** 文件夹即可。本项目不修改 `github.exe`，不会留下应用本体补丁。

## 兼容性与边界

- **已验证平台**：Windows；项目当前按 GitHub Copilot 桌面版 `1.1.x` 和 WebView2 运行时设计。
- **适用范围**：可被 WebView2 DOM 访问的固定界面文案、属性文本和部分动态整句。
- **不保证覆盖**：图片或图标中的文字、未收录的新文案、远程服务内容、AI 回复、用户输入，以及桌面原生层无法被注入器访问的内容。
- **版本变化**：Copilot 更新后，页面结构、文案或调试参数可能变化；遇到漏译请附版本和脱敏复现信息，不要直接替换官方程序文件。

## 安全说明

- 注入器只通过本机 WebView2 CDP 端口 `127.0.0.1:9222` 访问 Copilot 页面，不应将该端口暴露到网络。
- 本项目不上传界面文本、账号信息或日志，也不提交令牌、缓存和本地路径；上游词典同步只读取公开词典。
- 仅从可信来源获取项目文件，并在启动前检查 `启动 GitHub Copilot 中文版.cmd`、`inject.js` 和 `dictionary.json` 的内容。
- 如果 Copilot 以管理员权限运行，WebView2 可能忽略用户级调试参数；优先使用普通权限启动，避免扩大本机调试权限。

## 工作原理

1. 启动器设置环境变量 `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9222` 后启动应用(WebView2 官方调试开关);
2. 注入器 (`inject.js`) 通过 CDP 连接 Copilot 主页面 (`http://tauri.localhost`) 和 Azure DevOps 独立画布页面 (`http://127.0.0.1:<端口>/canvases/<实例 ID>`),把字典注入这些页面:
   - 精确匹配文本节点 → 替换为中文;
   - 同步翻译 placeholder / aria-label / title / alt;
   - 正则模式处理动态文案(如 `9% used` → `$1% 已使用`);
   - 整句机制处理被拆分的文本节点;
   - 将 `Thinking` 状态统一显示为加粗的“思考中”，在常驻文字上叠加动态扫光，合并拆分或重复渲染的中英文状态文本;
   - 跳过代码块 / 输入框 / 用户内容。

## 自定义翻译

编辑 `dictionary.json`:

| 区块 | 作用 | 示例 |
|---|---|---|
| `texts` | 精确文本替换 | `"Home": "主页"` |
| `textPatterns` | 文本正则替换 | `["^(\\d+)% used$", "$1% 已使用", ""]` |
| `attrs` | 属性精确替换 | `"Command palette": "命令面板"` |
| `attrPatterns` | 属性正则替换 | `["^Open user menu for (.+)$", "打开 $1 的用户菜单", ""]` |
| `wholeElements` | 整句(多文本节点)替换 | `"Chat: New chat": "聊天: 新建聊天"` |

保存后注入器会在 3 秒内自动重新读取并应用。

### 上游词典自动同步

注入器会通过 GitHub CLI 读取 `zhao818/copilot-desktop-zh` 的公开 `dictionary.json`,将上游新增条目与本地词典合并。本地已有条目优先,不会被上游覆盖。若 `gh` 不可用、网络失败或上游词典无法解析,注入器会记录警告并继续使用本地词典。

此功能只同步上游词典中**已经人工提供的译文**，不会提交客户端界面文本进行机器翻译。客户端更新后出现的新文案，需要由维护者审阅并手工补入 `dictionary.json`；不会调用第三方翻译服务，也不会上传待翻译内容。

## 故障排查

- 隐藏启动后仍显示英文：检查 `COPILOT_ZH_CACHE_DIR` 下的 `injector.log`。如果反复出现“无法连接 CDP 端口 9222”，说明 WebView2 没有开放调试接口，注入器尚未连接到页面。
- WebView2 Runtime 150 及更高版本会在宿主进程以管理员权限运行时忽略用户级 `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS`。可改为以普通权限启动 Copilot；若必须以管理员权限运行，则需要管理员按 Microsoft WebView2 文档配置机器级策略 `HKLM\Software\Policies\Microsoft\Edge\WebView2\AdditionalBrowserArguments`，其中字符串值 `github.exe` 设置为 `--remote-debugging-port=9222`。此设置会持续生效，并允许本机程序调试 Copilot 页面；请勿将该端口暴露到网络。
- 更新策略或启动参数后，先完全退出 Copilot，再重新运行中文版启动器。确认 `http://127.0.0.1:9222/json` 能返回页面目标后，注入才会生效。

## 常见问题

### 为什么直接启动官方 Copilot 还是英文？

汉化依赖启动器设置的 WebView2 调试参数。请完全退出官方 Copilot，改用 **`启动 GitHub Copilot 中文版.vbs`** 或 **`.cmd`** 启动。

### 为什么有些英文仍然存在？

本项目只处理词典中已收录且能被 WebView2 访问的界面文案。图片文字、用户内容、远程内容和桌面原生层文本不会被强行替换。可以通过 Issue 提交英文原文、出现位置、Copilot 版本和脱敏截图。

### 修改 `dictionary.json` 后需要重启吗？

通常不需要。注入器会定期重新读取词典并重新应用；如果页面没有重新渲染，可先等待轮询完成，仍无效时再完全退出并通过中文版启动器重新打开。

### 如何恢复官方状态？

退出中文版启动器和注入器后，直接使用官方 Copilot 启动方式即可。项目不会修改 `github.exe`。

## 版本与更新

本项目目前以 `main` 分支和 Git 提交记录发布，没有伪造的版本号或发布徽章。每次更新主要包括新增词典规则、兼容性修复和文档调整；使用前请查看 [提交记录](https://github.com/Moyxi/copilot-desktop-zh-ai/commits/main) 和 README 中的兼容性说明。

Copilot 升级后建议重新验证：启动器、WebView2 调试端口、固定界面文案和动态弹窗。如果发现回归，请在 Issue 中提供可复现步骤和脱敏日志。

## 文件结构

```
GitHub Copilot 中文运行版/
├── 启动 GitHub Copilot 中文版.vbs   # 隐藏终端启动
├── 启动 GitHub Copilot 中文版.cmd   # 一键启动器(设置调试参数 → 启动应用 → 运行注入器)
├── inject.js                        # CDP 注入器(Node.js,每次轮询重读字典)
├── dictionary.json                  # 翻译字典(文本/属性/正则/整句)
├── README.md
└── LICENSE                          # MIT
```

## 已知限制

- 图标 / 图片内嵌的英文无法翻译;
- 未收录的普通动态文案会保留英文;由维护者翻译并加入词典后，运行时即可应用对应译文;
- 本轮静态审查针对 Copilot 1.1.33 安装包中可读的 Azure DevOps 扩展界面及 Word、PowerPoint、Excel 画布预览页面。此范围不代表全客户端已无英文：主程序 `github.exe` 中的内嵌界面、运行时生成的状态、远程服务内容、AI 或用户提供的内容，以及图标和图片中的文字，仍需通过运行时界面核验;
- 调试端口 9222 仅供本机访问;如与其他调试器冲突,可自行改端口(需同步改启动器与 `inject.js`);
- 汉化是运行时注入,关闭注入器或刷新页面后恢复英文(重新打开启动器即恢复中文)。

## 免责声明

本项目是**非官方**社区汉化,与 GitHub 公司无关。仅供学习交流使用,请遵守 GitHub Copilot 服务条款。

## License

MIT

## 贡献与反馈

请先阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。发现未汉化文案时，欢迎提交可复现步骤、Copilot 版本、脱敏截图或最小化词典补丁；也可以使用 [Bug 报告表单](.github/ISSUE_TEMPLATE/bug_report.yml) 或 [功能建议表单](.github/ISSUE_TEMPLATE/feature_request.yml)。

如果这个项目解决了你的中文使用需求，欢迎在 GitHub 上点 Star，让更多需要中文界面的用户发现它；遇到新文案或兼容性问题，请优先提交 Issue，并附上可验证、已脱敏的信息。