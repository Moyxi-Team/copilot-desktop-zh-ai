# 贡献指南

感谢你帮助完善 GitHub Copilot 桌面端中文汉化。本项目的目标是提供可审阅、可回滚、尽量不影响官方应用的本地运行时译文。

## 开始之前

- 请先确认问题仍能在当前 Copilot 版本复现。
- 不要修改或提交 `github.exe`。
- 不要引入第三方翻译服务、上传界面文本或提交凭据。
- 不要提交日志、缓存、账号信息、令牌或其他敏感数据。
- 不要把真实本地路径、截图中的仓库名或可识别的会话内容直接提交到 Issue、词典或文档中；请先脱敏。

## 翻译修改

1. 在 `dictionary.json` 中优先使用精确文本；对带仓库名、账号名、数字等变量的文案使用 `textPatterns`。
2. 对 `placeholder`、`aria-label`、`title`、`alt` 等属性使用 `attrs` 或 `attrPatterns`。
3. 保留英文变量、命令、品牌名和文件名的原始含义。
4. 先搜索已有译文，避免重复或互相覆盖的规则。
5. 动态弹窗应同时考虑可见文本、整句节点和属性文本，避免出现中英文混合结果。

## 提交前检查

在仓库根目录运行：

```powershell
node -e "JSON.parse(require('fs').readFileSync('dictionary.json','utf8')); console.log('dictionary.json OK')"
node --check inject.js
```

同时确认新增 YAML 可解析、路径大小写与 README 中的文件名一致，并检查 `git diff --check`。

如果要测试运行时效果，请使用项目自带的 **`GitHub Copilot 中文运行版`** 文件夹和启动器；不要直接替换或修改官方 `github.exe`。

## 提交与 Issue

- Commit message 请简洁说明变更，例如 `fix: translate dynamic trust repository prompt`。
- 一个提交尽量只解决一个主题。
- Bug 报告请提供 Copilot 版本、Windows/WebView2 环境、复现步骤、预期/实际结果和脱敏日志。
- 功能建议请说明使用场景和希望覆盖的界面文案。

提交 Pull Request 前，请确认没有包含本地路径、截图中的敏感信息或未授权的第三方内容。
