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

---

## 1. 整体架构

```
agentation-ext/
├── src/
│   ├── manifest.json              # Chrome Extension Manifest V3
│   ├── background/
│   │   ├── service-worker.ts      # Background Service Worker
│   │   ├── debugger.ts            # chrome.debugger → Source Map 获取
│   │   └── mcp-server.ts          # WebSocket MCP Server
│   ├── content/
│   │   ├── main.ts                # Content Script 入口
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
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

### 核心数据流

```
用户点击元素 → Content Script 捕获
  → selector.ts 生成唯一选择器
  → element-info.ts 提取元素详细信息
  → detector.ts 识别框架 → react/vue/... 提取组件信息
  → resolver.ts ←(消息)→ background/debugger.ts 查询 Source Map
  → markdown.ts 生成结构化输出
  → 剪贴板 / MCP Server 输出
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
  computedStyles: Record<string, string>; // 关键样式
}
```

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

### 探测器接口

```typescript
interface FrameworkDetector {
  name: string;
  detect(): boolean;
  getComponentInfo(el: Element): FrameworkInfo | null;
}
```

### 各框架探测方式

| 框架 | 探测方式 | 组件信息提取方式 |
|------|---------|----------------|
| **React** | 元素上存在 `__reactFiber$*` 或 `_reactRootContainer` | 遍历 Fiber 树，读取 `type.name`、`memoizedProps`、`memoizedState` |
| **Vue 2** | 元素上存在 `__vue__` | 读取 `$options.name`、`$props`、`$data` |
| **Vue 3** | 元素上存在 `__vue_app__` 或 `__vueParentComponent` | 读取 `type.name` / `type.__name`、`props`、`setupState` |
| **Svelte** | 元素上存在 `__svelte_meta` 或 `$on` 方法 | 读取组件元数据，`ctx` 上下文 |
| **Angular** | `ng.getComponent()` 全局函数，或 `__ngContext__` | 读取 `constructor.name`，通过 `ng.getComponent()` 获取实例 |
| **Solid** | 元素上存在 `__r` 或 `_$owner` | 通过 owner 链追溯组件名 |
| **Qwik** | 元素上存在 `q:container` | 读取序列化的组件上下文 |

### 执行流程

1. 页面加载 → `detector.ts` 轮询所有探测器
2. 缓存检测结果（一个页面可能混合多个框架）
3. 用户点击元素 → 从元素向上遍历 DOM 树
4. 对每个祖先节点，用已检测到的框架探测器提取组件信息
5. 返回最近的组件匹配结果

### 降级策略

探测失败时不阻断流程，`framework` 字段留空，仅输出 DOM 级别信息。保证对任何页面（包括静态 HTML、jQuery 等老项目）的基础可用性。

---

## 4. Source Map 解析

### 工作流程

```
Content Script                    Background Service Worker
     │                                      │
     │  1. 用户点击元素                       │
     │  2. 获取元素对应的 <script> src        │
     │                                      │
     │ ── message: {scriptUrl, line, col} ──→│
     │                                      │ 3. chrome.debugger.attach(tabId)
     │                                      │ 4. Debugger.getScriptSource(scriptId)
     │                                      │    或 fetch(scriptUrl + ".map")
     │                                      │ 5. 解析 Source Map
     │                                      │ 6. originalPositionFor(line, col)
     │                                      │
     │←── message: {file, line, column} ─────│
     │                                      │ 7. chrome.debugger.detach()
     │  8. 填充 annotation.source            │
```

### Source Map 获取策略（按优先级）

1. `_debugSource` / `__file` 等框架内置调试信息 → 直接使用
2. `//# sourceMappingURL=` 注释 → fetch 对应 .map 文件
3. `chrome.debugger` → `Debugger.getScriptSource` 获取内联 Source Map
4. 全部失败 → `source` 字段留空，不阻断流程

### 权限模型

- `chrome.debugger` 需要用户确认授权
- 仅在需要 Source Map 时 attach，用完立即 detach
- 用户可在 popup 设置中关闭 Source Map 功能

---

## 5. UI 交互与样式隔离

### 交互模式

| 模式 | 触发 | 行为 |
|------|------|------|
| **单击标注** | 工具栏激活后点击元素 | 高亮元素、弹出标注输入框 |
| **文本选择** | 选中页面文本后点击标注 | 捕获选中文本及其所在元素 |
| **多选模式** | 按住 Shift 拖拽 | 框选区域内所有元素 |
| **区域标注** | 工具栏切换区域模式 | 自由绘制矩形区域 |
| **冻结动画** | 工具栏冻结按钮 | 暂停所有 CSS 动画、JS 定时器、视频 |

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

```
Claude Code (MCP Client)
    │
    │ WebSocket (localhost:3581)
    │
Background Service Worker (MCP Server)
    │
    │ chrome.runtime.sendMessage
    │
Content Script (标注数据)
```

### MCP Tools

| Tool | 描述 | 输入 | 输出 |
|------|------|------|------|
| `get_annotations` | 获取当前页面所有标注 | `{ format?: "markdown" \| "json" }` | 结构化标注数据 |
| `get_page_info` | 获取当前页面基本信息 | — | URL、标题、检测到的框架 |
| `clear_annotations` | 清空当前页面标注 | — | 确认信息 |
| `take_screenshot` | 截取当前页面（含高亮标记） | `{ fullPage?: boolean }` | base64 图片 |

### 连接管理

- 默认端口 3581，可配置
- 支持多客户端同时连接
- 心跳机制保活，断线自动清理

---

## 7. 错误处理与测试策略

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
