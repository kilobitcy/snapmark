# Agentation Chrome Extension — 设计文档

## 概述

实现一个 Chrome 扩展，提供与 [agentation](https://github.com/benjitaylor/agentation) 相同甚至更强的视觉反馈功能。用户通过点击页面元素添加标注，生成结构化 Markdown 输出，帮助 AI 编码代理精准定位源代码。

**核心差异**：原版 agentation 是 React 专属组件；本项目是 Chrome 扩展，天然支持任何前端框架。

## 目标

1. **精准定位代码**：从视觉元素反向定位到源码文件+行号
2. **多框架支持**：React、Vue、Svelte、Angular、Solid、Qwik
3. **双输出通道**：剪贴板复制 + MCP Server 集成
4. **静默降级**：任何环节失败不阻断核心流程

## 技术栈

- **语言**：TypeScript
- **构建**：Vite + CRXJS
- **测试**：Vitest（单元） + Playwright（集成）
- **扩展规范**：Chrome Extension Manifest V3

## 不在范围内

- 修改用户页面源码或实时重载
- 替代 DevTools 完整功能
- 移动端浏览器支持
- 跨浏览器（Firefox/Safari）支持（MVP 仅 Chrome）

---

## 1. 整体架构

```
agentation-ext/
├── src/
│   ├── manifest.json              # Chrome Extension Manifest V3
│   ├── background/
│   │   ├── service-worker.ts      # Background Service Worker
│   │   ├── debugger.ts            # chrome.debugger → Source Map 获取
│   │   └── native-messaging.ts    # 与本地 MCP Server 进程通信
│   ├── content/
│   │   ├── main.ts                # Content Script 入口（isolated world）
│   │   ├── main-world.ts          # MAIN world 注入脚本（冻结动画、框架探测）
│   │   ├── ui/                    # UI 组件（工具栏、覆盖层、弹窗）
│   │   │   ├── toolbar.ts
│   │   │   ├── overlay.ts
│   │   │   ├── annotation-popup.ts
│   │   │   └── styles.css
│   │   ├── capture/               # 数据采集
│   │   │   ├── selector.ts        # CSS 选择器生成
│   │   │   ├── element-info.ts    # 元素信息提取
│   │   │   └── text-selection.ts  # 文本选择处理
│   │   ├── frameworks/            # 框架探测与组件识别
│   │   │   ├── detector.ts        # 框架自动检测
│   │   │   ├── react.ts
│   │   │   ├── vue.ts
│   │   │   ├── svelte.ts
│   │   │   ├── angular.ts
│   │   │   ├── solid.ts
│   │   │   └── qwik.ts
│   │   └── sourcemap/
│   │       └── resolver.ts        # Source Map 反查（与 background 通信）
│   ├── shared/
│   │   ├── types.ts               # 共享类型定义
│   │   ├── markdown.ts            # 结构化 Markdown 生成
│   │   └── messaging.ts           # 跨上下文消息通信
│   └── popup/
│       ├── popup.html             # 扩展弹窗（设置/状态）
│       └── popup.ts
├── packages/
│   └── mcp-server/                # 独立 Node.js MCP Server
│       ├── index.ts               # WebSocket Server + MCP 协议
│       ├── native-host.json       # Native Messaging Host 清单
│       └── package.json
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

### Manifest V3 权限

```json
{
  "manifest_version": 3,
  "permissions": ["activeTab", "debugger", "clipboardWrite", "storage", "nativeMessaging", "scripting"],
  "host_permissions": ["<all_urls>"],
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content/main.ts"],
    "run_at": "document_idle"
  }],
  "background": {
    "service_worker": "background/service-worker.ts",
    "type": "module"
  }
}
```

### 核心数据流

```
用户点击元素 → Content Script 捕获
  → selector.ts 生成唯一选择器
  → element-info.ts 提取元素详细信息
  → main-world.ts（MAIN world）探测框架、提取组件信息
  → resolver.ts ←(消息)→ background/debugger.ts 查询 Source Map
  → markdown.ts 生成结构化输出
  → 剪贴板 复制
  → background ←(Native Messaging)→ MCP Server 输出
```

---

## 2. 数据模型

### Annotation 核心类型

```typescript
interface Annotation {
  id: string;
  timestamp: number;
  comment: string;

  // DOM 定位
  selector: string;           // 唯一 CSS 选择器路径
  xpath: string;              // XPath 备选路径
  elementTag: string;         // 如 "button", "div"
  cssClasses: string[];       // 类名列表
  attributes: Record<string, string>; // data-*, id 等关键属性
  textContent: string;        // 元素文本内容（截断）
  selectedText?: string;      // 用户选中的文本片段

  // 位置信息
  boundingBox: { x: number; y: number; width: number; height: number };
  viewport: { scrollX: number; scrollY: number; width: number; height: number };

  // 框架信息（探测到时填充）
  framework?: {
    name: string;             // "react" | "vue" | "svelte" | "angular" | "solid" | "qwik"
    componentName: string;    // 如 "UserCard"
    componentPath?: string;   // 组件在组件树中的路径 "App > Layout > UserCard"
    props?: Record<string, unknown>;
    state?: Record<string, unknown>;
  };

  // 源码定位（Source Map 解析成功时填充）
  source?: {
    file: string;             // "src/components/UserCard.tsx"
    line: number;
    column: number;
    functionName?: string;
  };

  // 上下文
  nearbyText: string[];       // 相邻元素的文本，辅助 grep 定位
  computedStyles: Record<string, string>; // 精选样式（color, background, font-size 等，非全量）
}
```

### 状态管理

- **运行时**：标注数据存储在 Content Script 的内存数组中，per-tab 隔离
- **持久化**：用户设置（主题、MCP 端口、Source Map 开关等）存储在 `chrome.storage.local`
- **生命周期**：页面导航或刷新时标注自动清除（标注是即时反馈工具，非持久化存储）
- **导出**：用户可随时通过剪贴板或 MCP 导出当前标注

### 结构化 Markdown 输出格式

```markdown
## Annotation #1 — "这个按钮颜色需要改成蓝色"

**Element:** `<button class="btn btn-primary">`
**Selector:** `main > .user-panel > button.btn-primary:nth-child(2)`
**Text:** "Submit Order"

**Framework:** Vue 3
**Component:** `OrderForm` (path: `App > Layout > OrderPage > OrderForm`)
**Props:** `{ disabled: false, type: "submit" }`

**Source:** `src/components/OrderForm.vue:87:5`

**Nearby text:** ["Order Total: $42.00", "Cancel", "Submit Order"]
**Styles:** `{ color: "#fff", background: "#6c757d", font-size: "14px" }`

**Bounding Box:** x=420, y=380, w=120, h=36
```

---

## 3. 框架探测机制

### 重要说明：MAIN World 注入

框架探测需要访问页面的 JavaScript 上下文（如 `__reactFiber$*`、`__vue_app__` 等属性）。Content Script 运行在 isolated world 中，无法直接访问这些属性。因此框架探测逻辑通过 `chrome.scripting.executeScript({ world: "MAIN" })` 注入 `main-world.ts` 到页面上下文执行，结果通过 `window.postMessage` 传回 Content Script。

### 探测器接口

```typescript
interface FrameworkDetector {
  name: string;
  detect(): boolean;
  getComponentInfo(el: Element): FrameworkInfo | null;
  getSourceInfo?(el: Element): { file: string; line: number; column: number } | null;
}
```

### 各框架探测方式

| 框架 | 探测方式 | 组件信息提取方式 |
|------|---------|----------------|
| **React** | 元素上存在 `__reactFiber$*` 或 `_reactRootContainer` | 遍历 Fiber 树，读取 `type.name`、`memoizedProps`、`memoizedState`；源码：读取 `_debugSource: { fileName, lineNumber }` |
| **Vue 2** | 元素上存在 `__vue__` | 读取 `$options.name`、`$props`、`$data`；源码：读取 `$options.__file` |
| **Vue 3** | 元素上存在 `__vue_app__` 或 `__vueParentComponent` | 读取 `type.name` / `type.__name`、`props`、`setupState`；源码：读取 `type.__file` |
| **Svelte** | 元素上存在 `__svelte_meta` 或 `$on` 方法 | 读取组件元数据，`ctx` 上下文；源码：读取 `__svelte_meta.loc` |
| **Angular** | `ng.getComponent()` 全局函数，或 `__ngContext__` | 读取 `constructor.name`，通过 `ng.getComponent()` 获取实例；源码：需 Source Map 回退 |
| **Solid** | 元素上存在 `__r` 或 `_$owner` | 通过 owner 链追溯组件名；源码：需 Source Map 回退 |
| **Qwik** | 元素上存在 `q:container` | 读取序列化的组件上下文；源码：需 Source Map 回退 |

> **注意**：框架内部属性（如 `__reactFiber$*`）是实现细节，可能随版本变化。目标兼容版本：React 16+、Vue 2.6+/3.x、Svelte 3+/4+/5+、Angular 12+、Solid 1.x、Qwik 1.x。探测器需要处理属性不存在的情况。

### 执行流程

1. 页面加载 → `detector.ts` 轮询所有探测器（最多 5 次，间隔 2 秒，共 10 秒后停止）
2. 缓存检测结果（一个页面可能混合多个框架）
3. 用户点击元素 → 从元素向上遍历 DOM 树
4. 对每个祖先节点，用已检测到的框架探测器提取组件信息
5. 同时尝试通过 `getSourceInfo()` 获取源码位置（优先于 Source Map 回退）
6. 返回最近的组件匹配结果

### 降级策略

探测失败时不阻断流程，`framework` 字段留空，仅输出 DOM 级别信息。保证对任何页面（包括静态 HTML、jQuery 等老项目）的基础可用性。

---

## 4. 源码定位

从视觉元素反向定位到源码是本项目的核心难题。采用分层策略，优先使用高精度的框架内置调试信息，Source Map 作为回退。

### 4.1 元素到源码的映射策略（按优先级）

| 优先级 | 策略 | 适用场景 | 精度 |
|--------|------|---------|------|
| 1 | **框架调试元数据** | React `_debugSource`、Vue `__file`、Svelte `__svelte_meta.loc` | 文件+行号 |
| 2 | **框架组件名推断** | 所有框架的 `componentName` → 搜索 `componentName.tsx/vue/svelte` | 文件级 |
| 3 | **Source Map 反查** | Angular、Solid、Qwik 等缺乏调试元数据的框架 | 文件+行号 |
| 4 | **DOM 信息兜底** | 静态 HTML、jQuery 等无框架页面 | 选择器+文本（grep 级） |

**策略 1 — 框架调试元数据**（在 MAIN world 中执行）：
- React（开发模式）：Fiber 节点的 `_debugSource` 直接包含 `{ fileName, lineNumber, columnNumber }`
- Vue SFC：组件 `type.__file` 包含源文件路径（如 `src/components/OrderForm.vue`）
- Svelte：`__svelte_meta.loc` 包含 `{ file, line, column }`
- 这些信息在**开发模式**下可用，生产构建通常不包含

**策略 2 — 组件名推断**：
- 从框架探测中已获得 `componentName`（如 `UserCard`）
- AI 代理可直接搜索 `UserCard.tsx`、`UserCard.vue` 等文件
- 精度略低（无行号），但在生产构建中也可能可用

**策略 3 — Source Map 反查**：
- 适用于策略 1/2 均不可用的情况
- 需要知道目标元素对应的**编译后脚本位置**，这是难点
- 实现方式见下方 4.2 节

**策略 4 — DOM 兜底**：
- 输出选择器路径、CSS 类名、文本内容
- AI 代理通过 `grep` 在代码中查找匹配

### 4.2 Source Map 反查流程

仅在策略 1 不可用时触发。需要解决的核心问题：**如何从 DOM 元素找到其对应的编译后脚本位置？**

```
MAIN World Script                  Content Script              Background Service Worker
     │                                  │                              │
     │  1. 获取组件构造函数引用          │                              │
     │  2. Function.toString() 获取      │                              │
     │     函数体特征文本                │                              │
     │                                  │                              │
     │ ── postMessage: {funcSignature,  │                              │
     │     scriptUrls} ────────────────→│                              │
     │                                  │── message: {scriptUrl,       │
     │                                  │   funcSignature} ───────────→│
     │                                  │                              │ 3. chrome.debugger.attach()
     │                                  │                              │ 4. 搜索脚本内容匹配函数签名
     │                                  │                              │ 5. 获取 Source Map
     │                                  │                              │ 6. originalPositionFor()
     │                                  │                              │
     │                                  │←── {file, line, column} ─────│
     │                                  │                              │ 7. chrome.debugger.detach()
```

**关键限制**：Source Map 反查依赖函数签名匹配，在高度压缩/混淆的生产构建中可能失败。此时降级到策略 2 或 4。

### 4.3 权限模型

- `chrome.debugger` 需要用户在扩展弹窗中确认授权
- 仅在需要 Source Map 时 attach，用完立即 detach
- 用户可在 popup 设置中关闭 Source Map 功能
- 首次使用时 Chrome 会弹出"正在调试此标签页"的横幅提示

---

## 5. UI 交互与样式隔离

### 激活/停用模型

扩展有两个状态：**停用**（默认）和**激活**。

- **停用状态**：所有事件透传给页面，不拦截任何交互。工具栏仅显示激活按钮。
- **激活状态**：覆盖层启用 `pointer-events`，拦截页面点击用于标注。通过 `event.preventDefault()` 和 `event.stopPropagation()` 阻止默认浏览器行为。
- 切换方式：点击工具栏按钮，或键盘快捷键 `Alt+A`（可配置）。

### 交互模式

| 模式 | 触发 | 行为 |
|------|------|------|
| **单击标注** | 工具栏激活后点击元素 | 高亮元素、弹出标注输入框 |
| **文本选择** | 选中页面文本后点击标注 | 捕获选中文本及其所在元素 |
| **多选模式** | 工具栏切换多选模式后拖拽 | 框选区域内所有元素 |
| **区域标注** | 工具栏切换区域模式 | 自由绘制矩形区域 |
| **冻结动画** | 工具栏冻结按钮 | 暂停所有 CSS 动画、JS 定时器、视频 |

### 选择器生成算法（selector.ts）

目标：为每个标注元素生成**唯一、稳定、可读**的 CSS 选择器。

算法优先级：
1. `#id` — 如果元素有唯一 ID，直接使用
2. `[data-testid="value"]` — 测试属性优先（稳定性最好）
3. `[data-*="value"]` — 其他 data 属性
4. `.class1.class2` — 类名组合（排除动态类如 hash 类名）
5. `parent > tag:nth-child(n)` — 最短路径 nth-child 选择器

每一步验证 `document.querySelectorAll(selector).length === 1`，确保唯一性。如果单步不唯一，向上追加父级选择器直到唯一。

### 冻结动画实现

冻结功能需要在 **MAIN world** 中执行（通过 `chrome.scripting.executeScript({ world: "MAIN" })`），因为需要猴子补丁全局 API：

- **CSS 动画**：`document.querySelectorAll('*')` 对所有元素设置 `animation-play-state: paused`
- **JS 定时器**：保存原始 `setTimeout`/`setInterval`/`requestAnimationFrame` 引用，替换为空操作；解冻时恢复
- **视频/音频**：`document.querySelectorAll('video, audio')` 调用 `.pause()`
- **CSS Transitions**：设置 `transition-duration: 0s`

### 样式隔离 — Shadow DOM

```typescript
const host = document.createElement('agentation-root');
const shadow = host.attachShadow({ mode: 'closed' });

shadow.innerHTML = `
  <style>${toolbarStyles}</style>
  <div id="agentation-toolbar">...</div>
  <div id="agentation-overlay">...</div>
`;

document.body.appendChild(host);
```

### 覆盖层结构

```
页面 DOM
  └── agentation-root (Custom Element)
        └── Shadow DOM
              ├── #toolbar        — 工具栏浮窗（fixed 定位）
              ├── #overlay        — 透明覆盖层（pointer-events 按需切换）
              ├── #highlights     — 元素高亮框（absolute，跟随目标元素）
              └── #popups         — 标注弹窗
```

### 主题

支持深色/浅色模式，跟随系统 `prefers-color-scheme`，可手动切换。

```css
:host { --ag-bg: #fff; --ag-text: #1a1a1a; --ag-accent: #3b82f6; }
:host(.dark) { --ag-bg: #1e1e1e; --ag-text: #e5e5e5; --ag-accent: #60a5fa; }
```

---

## 6. MCP Server 集成

### 架构

Manifest V3 的 Background Service Worker **无法**启动 TCP/WebSocket 服务器（ephemeral 且无 `net` API）。MCP Server 作为**独立 Node.js 进程**运行，通过 Chrome Native Messaging 与扩展通信。

```
Claude Code (MCP Client)
    │
    │ stdio / WebSocket (localhost:3581)
    │
MCP Server (独立 Node.js 进程)
    │
    │ Chrome Native Messaging (stdin/stdout)
    │
Background Service Worker
    │
    │ chrome.runtime.sendMessage
    │
Content Script (标注数据)
```

### 安装方式

```bash
# 全局安装 MCP Server CLI
npm install -g agentation-mcp-server

# 注册 Native Messaging Host（自动写入 manifest 到 Chrome 目录）
agentation-mcp-server install

# 在 Claude Code 的 MCP 配置中添加
# { "command": "agentation-mcp-server", "args": ["--stdio"] }
```

### MCP Tools

| Tool | 描述 | 输入 | 输出 |
|------|------|------|------|
| `get_annotations` | 获取当前页面所有标注 | `{ format?: "markdown" \| "json" }` | 结构化标注数据 |
| `get_page_info` | 获取当前页面基本信息 | — | URL、标题、检测到的框架 |
| `clear_annotations` | 清空当前页面标注 | — | 确认信息 |
| `take_screenshot` | 截取当前页面（含高亮标记） | `{ fullPage?: boolean }` | base64 图片 |

### 连接管理

- MCP Server 支持 stdio 模式（Claude Code 直接管理进程生命周期）和 WebSocket 模式（独立运行，默认端口 3581）
- 通过 Native Messaging 与扩展的 Background Service Worker 双向通信
- Service Worker 唤醒：Native Messaging 消息会自动唤醒休眠的 Service Worker

---

## 7. 消息通信协议

Content Script、Background Service Worker、MAIN World Script 之间通过类型化消息通信。

```typescript
// shared/messaging.ts
type Message =
  // Content Script → Background
  | { type: 'RESOLVE_SOURCEMAP'; payload: { scriptUrl: string; funcSignature: string } }
  | { type: 'COPY_TO_CLIPBOARD'; payload: { text: string } }
  | { type: 'DEBUGGER_ATTACH'; payload: { tabId: number } }
  | { type: 'DEBUGGER_DETACH'; payload: { tabId: number } }

  // Background → Content Script
  | { type: 'SOURCEMAP_RESULT'; payload: { file: string; line: number; column: number } | null }
  | { type: 'MCP_GET_ANNOTATIONS'; payload: { format: 'markdown' | 'json' } }
  | { type: 'MCP_CLEAR_ANNOTATIONS'; payload: {} }
  | { type: 'MCP_GET_PAGE_INFO'; payload: {} }

  // MAIN World ↔ Content Script (via window.postMessage)
  | { type: 'AG_FRAMEWORK_DETECT_RESULT'; payload: { frameworks: string[] } }
  | { type: 'AG_COMPONENT_INFO'; payload: FrameworkInfo | null }
  | { type: 'AG_SOURCE_INFO'; payload: { file: string; line: number; column: number } | null }
  | { type: 'AG_FREEZE'; payload: { freeze: boolean } }

// 所有 window.postMessage 消息携带 source: 'agentation' 标识，避免与页面消息冲突
```

---

## 8. 错误处理与测试策略

### 错误处理 — 静默降级原则

| 失败场景 | 降级行为 |
|---------|---------|
| 框架探测失败 | `framework` 留空，输出纯 DOM 信息 |
| Source Map 不可用 | `source` 留空，保留组件名和选择器 |
| `chrome.debugger` 被拒 | 跳过 Source Map，提示用户可重新授权 |
| MCP WebSocket 端口被占 | 自动尝试下一个端口 |
| Shadow DOM 内元素点击 | 尝试穿透 `shadowRoot` 获取内部元素 |

### 测试策略

```
单元测试 (Vitest)
├── selector.ts     — 选择器生成的准确性和唯一性
├── markdown.ts     — 输出格式正确性
├── detector.ts     — 各框架探测逻辑
├── resolver.ts     — Source Map 解析逻辑
└── messaging.ts    — 消息通信协议

集成测试 (Playwright + Chrome Extension 加载)
├── 加载扩展 → 激活工具栏 → 点击元素 → 验证标注数据
├── 各框架测试页面（React/Vue/Svelte/Angular/Solid/Qwik 各一个）
├── Source Map 场景测试
└── MCP Server 连接与数据拉取
```

测试页面放在 `test/fixtures/` 下，每个框架一个最小应用，CI 中用 Playwright 加载扩展并自动化验证。
