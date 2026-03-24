# SnapMark

[English](README.md) | [中文](README_zh.md)

一个 Chrome 浏览器扩展，用于标注网页元素并生成 AI 就绪的提示词。

在任意网页上选择元素、添加标注，然后将结构化的 Markdown 复制到剪贴板——直接粘贴到 AI 对话中使用。

## 功能特性

- **元素选择** — 悬停高亮，点击选择任意 DOM 元素
- **多选模式** — `Cmd/Ctrl+Shift+Click` 同时选择多个元素
- **区域选择** — 拖拽画框，标注一个区域
- **框架检测** — 自动检测 React、Vue、Svelte、Angular、Solid、Qwik 组件（尽力检测）
- **Markdown 导出** — 4 个详细级别（紧凑/标准/详细/取证），一键复制到剪贴板
- **本地存储** — 标注按页面路径保存在 localStorage 中（7 天自动过期）
- **页面冻结** — 冻结 CSS 动画、定时器和媒体，方便稳定标注

## 安装方法

### 1. 构建扩展

```bash
# 克隆仓库
git clone https://github.com/kilobitcy/snapmark.git
cd snapmark

# 安装依赖
pnpm install

# 构建
pnpm build
```

### 2. 在 Chrome 中加载扩展

1. 打开 Chrome 浏览器，地址栏输入 `chrome://extensions/` 并回车
2. 打开右上角的 **开发者模式** 开关
3. 点击左上角的 **加载已解压的扩展程序** 按钮
4. 在弹出的文件选择器中，选择项目目录下的 `dist/` 文件夹
5. SnapMark 扩展会出现在扩展列表中

### 3. 验证安装成功

安装成功后，你会看到以下标志：

- Chrome 工具栏中出现 **SnapMark 图标**（字母 "A"）。如果没看到，点击工具栏右侧的拼图图标 🧩，在下拉列表中找到 SnapMark 并点击📌图钉固定
- 点击图标会弹出 **设置面板**，包含输出详细级别、React 过滤模式、主题、阻止页面交互等选项
- 在任意网页上按 `Cmd+Shift+F`（Mac）或 `Ctrl+Shift+F`（Windows/Linux），页面右下角会出现一个**浮动工具栏**
- 工具栏激活状态下，鼠标悬停在页面元素上会显示**蓝色高亮边框**

如果以上都能看到，说明插件已成功安装并启用。

## 使用方法

### 基本工作流

1. **激活** — 按 `Cmd+Shift+F`（Mac）/ `Ctrl+Shift+F`（Windows/Linux），或点击浮动工具栏上的开关按钮
2. **选择元素** — 鼠标悬停在任意元素上查看高亮效果，点击即可选中
3. **添加标注** — 弹出标注窗口，可以：
   - 写一段**评论**，描述问题或需要的修改
   - 选择**意图**：修复（Fix）/ 修改（Change）/ 提问（Question）/ 通过（Approve）
   - 选择**严重程度**：阻塞（Blocking）/ 重要（Important）/ 建议（Suggestion）
4. **复制** — 点击工具栏上的 📋 按钮，所有标注会以 Markdown 格式复制到剪贴板
5. **粘贴** — 将 Markdown 粘贴到 ChatGPT、Claude 或任意 AI 助手的对话框中

### 高级选择模式

| 模式 | 操作方式 | 适用场景 |
|------|---------|---------|
| **单选** | 直接点击元素 | 标注单个元素 |
| **多选** | `Cmd/Ctrl+Shift+Click` 逐个添加元素，最后普通点击完成 | 将多个相关元素作为一组标注 |
| **区域选择** | 点击工具栏 ⚙ 进入区域模式，然后拖拽画框 | 标注不对应单个元素的区域 |

### 工具栏按钮说明

| 按钮 | 功能 |
|------|------|
| ⦿ | 显示/隐藏标注标记 |
| ⏸ | 冻结/解冻页面动画 |
| ⚙ | 切换区域选择模式 |
| 📋 | 复制所有标注为 Markdown |
| 🗑 | 清除所有标注 |

### 设置选项（通过扩展弹窗）

点击 Chrome 工具栏中的 SnapMark 图标进行配置：

- **输出详细级别** — 控制复制时包含多少信息：
  - *紧凑（Compact）*：每条标注一行
  - *标准（Standard）*：元素信息 + 评论 + 框架/源码
  - *详细（Detailed）*：增加选择器、属性、附近文本、样式
  - *取证（Forensic）*：完整 DOM 路径、视口、无障碍信息、时间戳
- **React 过滤模式** — React 组件检测过滤（全部 / 过滤 / 智能）
- **主题** — 自动 / 浅色 / 深色
- **阻止页面交互** — 标注时阻止对页面的误操作点击

## 开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器（支持热更新）
pnpm dev

# 运行测试
pnpm test

# 生产构建
pnpm build
```

## 技术栈

- TypeScript
- Vite + [@crxjs/vite-plugin](https://github.com/nicedoc/crxjs)
- Chrome Extension Manifest V3
- Vitest（单元测试）

## 致谢

本项目受 [agentation](https://github.com/benjitaylor/agentation) 启发并在其基础上构建。agentation 是一个面向 AI 编程代理的可视化反馈工具，SnapMark 将其精简为一个专注于提示词生成的独立标注工具。

## 许可证

MIT
