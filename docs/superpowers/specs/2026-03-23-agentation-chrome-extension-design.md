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
│   │   └── server-bridge.ts       # HTTP 通信 + SSE 命令监听
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
│   └── server/                    # 独立 Node.js 服务
│       ├── src/
│       │   ├── cli.ts             # CLI 入口（init / start / doctor）
│       │   ├── http-server.ts     # HTTP Server（接收标注、会话管理）
│       │   ├── mcp-server.ts      # MCP Server（stdio，暴露 tools 给 AI 代理）
│       │   ├── store.ts           # 数据持久化（SQLite / 内存回退）
│       │   └── events.ts          # SSE 事件流
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
  "permissions": ["activeTab", "debugger", "clipboardWrite", "storage", "scripting"],
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
  → selector.ts 生成 elementPath + 唯一选择器
  → element-info.ts 提取元素详细信息（文本、属性、样式、无障碍）
  → main-world.ts（MAIN world）探测框架、提取组件信息、探针法源码定位
  → resolver.ts ←(消息)→ background/debugger.ts 查询 Source Map（回退）
  → 用户添加评论、选择 intent/severity
  → markdown.ts 生成结构化输出（4 级详细度）
  → 剪贴板复制
  → background ←(HTTP)→ agentation-server 同步标注/会话
  → MCP Server ← AI 代理拉取标注并处理
```

---

## 2. 数据模型

### Annotation 核心类型

```typescript
// === 枚举类型 ===
type AnnotationIntent = 'fix' | 'change' | 'question' | 'approve';
type AnnotationSeverity = 'blocking' | 'important' | 'suggestion';
type AnnotationStatus = 'pending' | 'acknowledged' | 'resolved' | 'dismissed';
type SessionStatus = 'active' | 'approved' | 'closed';

interface ThreadMessage {
  id: string;
  role: 'human' | 'agent';
  content: string;
  timestamp: number;
}

// === 会话 ===
interface Session {
  id: string;
  url: string;
  status: SessionStatus;
  projectId?: string;
  metadata?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

// === 标注核心类型 ===
interface Annotation {
  id: string;
  timestamp: number;
  comment: string;

  // DOM 定位
  elementPath: string;        // 人类可读路径 "div.container > article > p"（最大深度 4 层）
  selector: string;           // 唯一 CSS 选择器路径（用于精确定位）
  elementTag: string;         // 如 "button", "div"
  cssClasses: string[];       // 类名列表（过滤 CSS Module hash 类名）
  attributes: Record<string, string>; // data-*, id, aria-* 等关键属性
  textContent: string;        // 元素文本内容（按钮 25 字符、段落 40 字符截断）
  selectedText?: string;      // 用户选中的文本片段

  // 位置信息
  boundingBox: { x: number; y: number; width: number; height: number };
  viewport: { scrollX: number; scrollY: number; width: number; height: number };

  // 框架信息（探测到时填充）
  framework?: {
    name: string;             // "react" | "vue" | "svelte" | "angular" | "solid" | "qwik"
    componentName: string;    // 如 "UserCard"
    componentPath?: string;   // 组件层级 "<App> <Layout> <UserCard>"
    componentNames?: string[];// 组件名数组（内到外）
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
  nearbyText: string[];       // 相邻元素的文本（最多 4 个），辅助 grep 定位
  nearbyElements?: Array<{ tag: string; text: string; classes: string[] }>;
  computedStyles: Record<string, string>; // 精选样式（color, background, font-size 等，非全量）
  accessibility?: { role?: string; ariaLabel?: string; focusable: boolean };
  fullPath?: string;          // 完整 DOM 祖先路径（forensic 模式用）

  // 多选标记
  isMultiSelect?: boolean;
  elementBoundingBoxes?: Array<{ x: number; y: number; width: number; height: number }>;
  isFixed?: boolean;          // 元素是否 fixed 定位（影响高亮框跟随逻辑：fixed 元素不随滚动移动）

  // 协议字段（与服务器同步时使用）
  sessionId?: string;
  url?: string;
  intent?: AnnotationIntent;
  severity?: AnnotationSeverity;
  status?: AnnotationStatus;
  thread?: ThreadMessage[];
  createdAt?: number;
  updatedAt?: number;
  resolvedAt?: number;
  resolvedBy?: string;
  _syncedTo?: string;        // 内部字段：追踪已同步到哪个 session
}
```

### 状态管理

**浏览器端**：
- **运行时**：标注数据存储在 Content Script 的内存数组中，per-tab 隔离
- **本地持久化**：标注通过 `localStorage` 存储，key 为 `agentation-annotations-{pathname}`，7 天保留策略。注意：Content Script 的 `localStorage` 与页面共享，页面调用 `localStorage.clear()` 会清除标注数据。这是对齐 agentation 原版行为的设计选择；服务端同步可作为持久化保障
- **会话 ID**：通过 `localStorage`（`agentation-session-{pathname}`）持久化
- **工具栏状态**：通过 `sessionStorage` 存储（per-tab，标签页关闭即清除）
- **用户设置**：通过 `chrome.storage.local` 存储（主题、输出级别、Source Map 开关、React 过滤模式等）

**服务端同步**：
- 标注创建/更新/删除时，Background Service Worker 通过 HTTP 同步到服务器
- 服务器不可达时自动降级为本地模式，不阻断使用
- `_syncedTo` 字段追踪标注是否已同步到服务器端会话

### 结构化 Markdown 输出格式

支持 4 个详细级别，用户可在工具栏设置中切换：

**Compact** — 每个标注一行，适合快速概览：
```markdown
#1 [button.btn-primary] "Submit Order" (src/components/OrderForm.vue:87) — "按钮颜色改成蓝色"
#2 [h2.title] "Order Summary" — "标题字号太小"
```

**Standard**（默认）— 加位置和 DOM 路径：
```markdown
## Annotation #1 — "按钮颜色改成蓝色"
**Element:** `<button class="btn btn-primary">` "Submit Order"
**Selected text:** "Submit"  ← 仅在用户选中文本时出现
**Path:** `main > .user-panel > button.btn-primary`
**Component:** `<OrderForm>` (Vue 3)
**Source:** `src/components/OrderForm.vue:87:5`
**Location:** x=420, y=380
```

> **selectedText 展示规则**：当用户通过文本选择模式标注时，所有级别（含 compact）都展示选中文本。Compact 格式中追加 `[selected: "xxx"]`，其他格式用独立行 `**Selected text:**`。

**Detailed** — 加 CSS 类名、boundingBox、上下文：
```markdown
## Annotation #1 — "按钮颜色改成蓝色"
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

**Forensic** — 完整环境数据，用于调试复杂问题：
```markdown
## Annotation #1 — "按钮颜色改成蓝色"
（包含 Detailed 全部内容，另加：）
**URL:** http://localhost:3000/orders/42
**Viewport:** 1920x1080, scrollX=0, scrollY=240, DPR=2
**User Agent:** Chrome/120.0...
**Timestamp:** 2026-03-23T14:30:00Z
**Full DOM Path:** `html > body > div#app > main.layout > section.order-page > form > div.actions > button.btn-primary`
**Accessibility:** role=button, focusable=true, aria-label="Submit order"
**Full Styles:** { color, background, font-size, padding, margin, border, display, position, ... }
**Nearby Elements:** [{ tag: "button", text: "Cancel", classes: ["btn-secondary"] }, ...]
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
| **React** | 元素上存在 `__reactFiber$*` 或 `_reactRootContainer` | 遍历 Fiber 树，读取 `type.name`/`displayName`、`memoizedProps`、`memoizedState`；三种过滤模式（见下方）；源码：`_debugSource` → 探针法回退（见 4.1） |
| **Vue 2** | 元素上存在 `__vue__` | 读取 `$options.name`、`$props`、`$data`；源码：读取 `$options.__file` |
| **Vue 3** | 元素上存在 `__vue_app__` 或 `__vueParentComponent` | 读取 `type.name` / `type.__name`、`props`、`setupState`；源码：读取 `type.__file` |
| **Svelte** | 元素上存在 `__svelte_meta` 或 `$on` 方法 | 读取组件元数据，`ctx` 上下文；源码：读取 `__svelte_meta.loc` |
| **Angular** | `ng.getComponent()` 全局函数，或 `__ngContext__` | 读取 `constructor.name`，通过 `ng.getComponent()` 获取实例；源码：需 Source Map 回退 |
| **Solid** | 元素上存在 `__r` 或 `_$owner` | 通过 owner 链追溯组件名；源码：需 Source Map 回退 |
| **Qwik** | 元素上存在 `q:container` | 读取序列化的组件上下文；源码：需 Source Map 回退 |

> **注意**：框架内部属性（如 `__reactFiber$*`）是实现细节，可能随版本变化。目标兼容版本：React 16.8+~19.x、Vue 2.6+/3.x、Svelte 3+/4+/5+、Angular 12+、Solid 1.x、Qwik 1.x。探测器需要处理属性不存在的情况。

### React 组件过滤模式

React Fiber 树包含大量框架内部组件（Provider、Router、ErrorBoundary 等），需要过滤以提取有意义的用户组件。支持三种过滤模式（可在设置中切换）：

| 模式 | 行为 | 适用场景 |
|------|------|---------|
| **all** | 不过滤，包含所有组件（使用 WeakMap 缓存性能） | 调试框架内部 |
| **filtered**（默认） | 跳过已知框架基础设施组件（Provider、Router、Suspense 等）和单字母/混淆名称 | 日常使用 |
| **smart** | 在 filtered 基础上，验证组件名是否与 DOM 上的类名相关联 | 精确模式 |

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

**策略 1a — 框架调试元数据**（在 MAIN world 中执行）：
- React（开发模式）：Fiber 节点的 `_debugSource` 直接包含 `{ fileName, lineNumber, columnNumber }`
- Vue SFC：组件 `type.__file` 包含源文件路径（如 `src/components/OrderForm.vue`）
- Svelte：`__svelte_meta.loc` 包含 `{ file, line, column }`
- 这些信息在**开发模式**下可用，生产构建通常不包含

**策略 1b — React 探针法**（`_debugSource` 不可用时的回退，对齐 agentation）：
- 获取 Fiber 节点的组件函数引用
- 构造一个会抛异常的 hooks dispatcher（模拟 `useState` 等 hook 调用时立即 throw）
- 调用组件函数，捕获异常的 **error stack trace**
- 从 stack trace 中解析出源码路径和行号
- 清理 bundler 前缀（webpack-internal://、turbopack://、vite 的 /@fs/ 等）
- 适用于 React 16.8+ ~ 19.x，涵盖 SWC/Babel 编译产物和生产构建

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
| **多选模式** | `Cmd/Ctrl+Shift+Click` 切换元素 + 拖拽框选 | 框选区域内所有元素，生成单个多元素标注 |
| **区域标注** | 工具栏切换区域模式 | 自由绘制矩形区域 |
| **冻结动画** | 工具栏冻结按钮 | 暂停所有 CSS 动画、JS 定时器、视频 |

### 元素路径与选择器生成（selector.ts）

生成两种互补的定位信息：

**1. elementPath — 人类可读路径**（对齐 agentation）

用于 Markdown 输出中的 `Path` 字段，便于 AI 代理和人类快速理解元素位置。

- 最大深度 4 层，从目标元素向上取祖先
- 每层优先用 `#id`，其次用 `tag.meaningfulClass`，最后用 `tag`
- **Hash 类名过滤**：排除 CSS Module 生成的 hash 类（匹配 `/^[a-zA-Z][\w-]*_[a-zA-Z0-9]{5,}$/` 等模式）
- **Shadow DOM 标记**：跨 shadow 边界时插入 `⟨shadow⟩` 标记
- 示例：`main > .user-panel > ⟨shadow⟩ > button.btn-primary`

**2. selector — 唯一 CSS 选择器**（超越 agentation）

用于精确定位元素，可直接在 `document.querySelector()` 中使用。

算法优先级：
1. `#id` — 如果元素有唯一 ID，直接使用
2. `[data-testid="value"]` — 测试属性优先（稳定性最好）
3. `[data-*="value"]` — 其他 data 属性
4. `.class1.class2` — 类名组合（排除 hash 类名）
5. `parent > tag:nth-child(n)` — 最短路径 nth-child 选择器

每一步验证 `document.querySelectorAll(selector).length === 1`，确保唯一性。如果单步不唯一，向上追加父级选择器直到唯一。

### 冻结动画实现

冻结功能需要在 **MAIN world** 中执行（通过 `chrome.scripting.executeScript({ world: "MAIN" })`），因为需要猴子补丁全局 API：

- **CSS 动画**：对所有元素设置 `animation-play-state: paused`
- **CSS Transitions**：设置 `transition-duration: 0s`
- **Web Animations API (WAAPI)**：遍历 `document.getAnimations()` 手动 `.pause()`，解冻时恢复（需先恢复 WAAPI 再移除 CSS 覆盖，避免创建新动画对象）
- **JS 定时器**：保存原始 `setTimeout`/`setInterval`/`requestAnimationFrame` 引用，替换为队列化空操作；解冻时异步回放排队的回调
- **视频/音频**：`document.querySelectorAll('video, audio')` 调用 `.pause()`，记录播放状态以便恢复

**重要**：扩展自身的 UI 元素（带 `data-agentation` 属性）必须排除在冻结范围之外，确保工具栏在冻结状态下仍可操作。冻结逻辑内部使用保存的原始 `setTimeout` 引用来执行自身定时任务。

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

## 6. 服务端集成（对齐 agentation 架构）

### 6.1 双服务器架构

Manifest V3 的 Background Service Worker **无法**启动 TCP/WebSocket 服务器。服务端作为**独立 Node.js 进程**运行，包含两个角色：

```
Claude Code (MCP Client)
    │
    │ stdio（MCP 协议）
    │
┌───┴──────────────────────────┐
│  agentation-server 进程       │
│  ├── MCP Server (stdio)      │ ← AI 代理调用 tools
│  ├── HTTP Server (:4747)     │ ← Chrome 扩展推送标注
│  ├── SSE 事件流               │ ← 实时通知
│  └── SQLite Store            │ ← ~/.agentation/store.db
└───┬──────────────────────────┘
    │
    │ HTTP POST/GET (localhost:4747)
    │
Background Service Worker
    │
    │ chrome.runtime.sendMessage
    │
Content Script (标注数据)
```

**为什么用 HTTP 而非 Native Messaging？**
agentation 的浏览器端组件直接通过 HTTP 与服务器通信。Chrome 扩展同样可以从 Background Service Worker 发起 HTTP 请求（`fetch`），无需 Native Messaging。HTTP 方案更简单、更通用，且与 agentation 原版架构一致。

### 6.2 安装方式

```bash
# 全局安装
npm install -g agentation-server

# 交互式初始化（检测 Claude Code 配置、注册 MCP）
agentation-server init

# 启动服务器（HTTP + MCP）
agentation-server start
# 等同于 agentation-server start --port 4747

# 仅 MCP 模式（Claude Code 直接管理进程）
# 在 Claude Code MCP 配置中添加：
# { "command": "agentation-server", "args": ["--stdio"] }

# 诊断检查
agentation-server doctor
```

### 6.3 数据持久化

```typescript
// store.ts — AFSStore 接口
interface AFSStore {
  // 会话管理
  createSession(url: string, projectId?: string): Session;
  getSession(id: string): Session | null;
  getSessionWithAnnotations(id: string): SessionWithAnnotations | null;
  listSessions(): Session[];
  updateSessionStatus(id: string, status: SessionStatus): void;

  // 标注操作
  addAnnotation(sessionId: string, annotation: Annotation): Annotation;
  getAnnotation(id: string): Annotation | null;
  updateAnnotation(id: string, updates: Partial<Annotation>): void;
  updateAnnotationStatus(id: string, status: AnnotationStatus): void;
  deleteAnnotation(id: string): void;
  getSessionAnnotations(sessionId: string): Annotation[];
  getPendingAnnotations(sessionId?: string): Annotation[];

  // 线程
  addThreadMessage(annotationId: string, message: ThreadMessage): void;

  // 事件流
  getEventsSince(seqNum: number): Event[];
}
```

- **主存储**：SQLite（`~/.agentation/store.db`），可通过 `AGENTATION_STORE` 环境变量配置
- **回退**：SQLite 不可用时自动切换内存存储
- **保留策略**：标注默认保留 7 天，可配置

### 6.4 HTTP API

Chrome 扩展的 Background Service Worker 通过 HTTP 与服务器交互：

| 端点 | 方法 | 描述 |
|------|------|------|
| `/sessions` | GET | 列出所有会话 |
| `/sessions` | POST | 创建新会话 |
| `/sessions/:id` | GET | 获取会话详情（含标注） |
| `/sessions/:id/annotations` | POST | 同步标注到服务器 |
| `/sessions/:id/action` | POST | 请求 AI 代理执行动作 |
| `/annotations/:id` | PATCH | 更新标注 |
| `/annotations/:id` | DELETE | 删除标注 |
| `/events` | GET (SSE) | 实时事件流（含服务器→扩展的命令） |
| `/commands/:id/result` | POST | 扩展提交命令执行结果 |

### 6.5 服务器→扩展通信（SSE 命令通道）

`take_screenshot` 和 `get_page_info` 需要服务器主动向浏览器扩展发送请求。通过 SSE 事件流实现：

```
AI 代理调用 take_screenshot
  → MCP Server 在 HTTP Server 创建 command 记录
  → SSE 推送 { type: "command.requested", command: "take_screenshot", commandId: "xxx" }
  → Background Service Worker（长连接 SSE 监听）收到命令
  → 调用 chrome.tabs.captureVisibleTab() 截图
  → HTTP POST /commands/xxx/result 提交结果（base64 图片）
  → MCP Server 收到结果，返回给 AI 代理
```

Background Service Worker 启动时建立到 HTTP Server 的 SSE 长连接，监听 `command.requested` 事件。Service Worker 休眠后 SSE 连接断开，下次 HTTP 请求时自动重连。

### 6.6 MCP Tools

与 agentation 对齐的 9 个 tools + 扩展的 2 个工具：

| Tool | 描述 | 输入 |
|------|------|------|
| `list_sessions` | 列出所有活跃会话 | — |
| `get_session` | 获取会话及其标注 | `sessionId` |
| `get_pending` | 获取某会话未处理的标注 | `sessionId` |
| `get_all_pending` | 获取所有会话的未处理标注 | — |
| `acknowledge` | 标记标注为已确认 | `annotationId` |
| `resolve` | 标记标注为已解决 | `annotationId`, `summary?` |
| `dismiss` | 驳回标注 | `annotationId`, `reason` |
| `reply` | 向标注线程添加回复 | `annotationId`, `message` |
| `watch_annotations` | 阻塞等待新标注（核心工作流） | `sessionId?`, `batchWindowSeconds?`, `timeoutSeconds?` |
| `get_page_info` | 获取当前页面信息 | — |
| `take_screenshot` | 截取当前页面 | `fullPage?` |

### 6.7 AI 代理自动化工作流

`watch_annotations` 是 AI 代理的核心循环工具：

```
AI 代理工作流：
1. 调用 watch_annotations（阻塞等待，默认超时 120 秒）
2. 用户在浏览器中标注元素
3. watch_annotations 返回新标注列表（批量窗口 10 秒）
4. AI 代理调用 acknowledge 确认收到
5. AI 代理根据标注修改代码
6. AI 代理调用 resolve 标记完成，附上 summary
7. 回到步骤 1，继续等待
```

---

## 7. 消息通信协议

三个通信边界，各自使用不同机制：

### 7.1 Content Script ↔ Background Service Worker（chrome.runtime.sendMessage）

```typescript
type ExtensionMessage =
  // Content Script → Background
  | { type: 'RESOLVE_SOURCEMAP'; payload: { scriptUrl: string; funcSignature: string } }
  | { type: 'COPY_TO_CLIPBOARD'; payload: { text: string } }
  | { type: 'DEBUGGER_ATTACH'; payload: { tabId: number } }
  | { type: 'DEBUGGER_DETACH'; payload: { tabId: number } }
  | { type: 'SYNC_ANNOTATION'; payload: { sessionId: string; annotation: Annotation } }
  | { type: 'CREATE_SESSION'; payload: { url: string } }

  // Background → Content Script
  | { type: 'SOURCEMAP_RESULT'; payload: { file: string; line: number; column: number } | null }
  | { type: 'SESSION_CREATED'; payload: { sessionId: string } }
  | { type: 'ANNOTATION_STATUS_CHANGED'; payload: { annotationId: string; status: AnnotationStatus } }
```

### 7.2 MAIN World ↔ Content Script（window.postMessage）

```typescript
// 所有消息携带 source: 'agentation' 标识，避免与页面消息冲突
type MainWorldMessage =
  | { type: 'AG_FRAMEWORK_DETECT_RESULT'; payload: { frameworks: string[] } }
  | { type: 'AG_COMPONENT_INFO_REQUEST'; payload: { elementSelector: string } }
  | { type: 'AG_COMPONENT_INFO'; payload: FrameworkInfo | null }
  | { type: 'AG_SOURCE_INFO'; payload: { file: string; line: number; column: number } | null }
  | { type: 'AG_FREEZE'; payload: { freeze: boolean } }
  | { type: 'AG_PROBE_SOURCE'; payload: { elementSelector: string } }
  | { type: 'AG_PROBE_RESULT'; payload: { file: string; line: number } | null }
```

### 7.3 Background Service Worker ↔ HTTP Server（fetch）

标准 RESTful HTTP 调用（见 6.4 节），无需自定义消息协议。

---

## 8. 错误处理与测试策略

### 错误处理 — 静默降级原则

| 失败场景 | 降级行为 |
|---------|---------|
| 框架探测失败 | `framework` 留空，输出纯 DOM 信息 |
| React `_debugSource` 不可用 | 尝试探针法（stack trace 解析），仍失败则 `source` 留空 |
| Source Map 不可用 | `source` 留空，保留组件名和选择器 |
| `chrome.debugger` 被拒 | 跳过 Source Map，提示用户可重新授权 |
| HTTP Server 不可达 | 自动降级为本地模式（localStorage 持久化），不阻断使用 |
| SQLite 不可用 | 服务端自动切换内存存储 |
| HTTP 端口被占 | 自动尝试下一个端口 |
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
