# Agentation Chrome Extension — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Chrome extension that captures visual feedback from any web page (any framework) and generates structured Markdown output for AI coding agents to locate source code precisely.

**Architecture:** Chrome Extension (Manifest V3) with Content Script for UI/capture, MAIN world injection for framework detection, Background Service Worker for debugger/HTTP bridging, and a separate Node.js server (HTTP + MCP + SQLite) for AI agent integration.

**Tech Stack:** TypeScript, Vite + CRXJS, Vitest, Playwright, better-sqlite3, @modelcontextprotocol/sdk

**Spec:** `docs/superpowers/specs/2026-03-23-agentation-chrome-extension-design.md`

---

## Phase 1: Project Scaffolding & Types

### Task 1: Initialize monorepo and Chrome extension project

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.json`
- Create: `src/manifest.json`
- Create: `vite.config.ts`

- [ ] **Step 1: Initialize pnpm monorepo**

```bash
pnpm init
```

Edit `package.json`:
```json
{
  "name": "agentation-ext",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest"
  }
}
```

Create `pnpm-workspace.yaml`:
```yaml
packages:
  - "."
  - "packages/*"
```

- [ ] **Step 2: Install dependencies**

```bash
pnpm add -D typescript vite @crxjs/vite-plugin@beta vitest @types/chrome
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "sourceMap": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 4: Create manifest.json**

```json
{
  "manifest_version": 3,
  "name": "Agentation",
  "version": "0.1.0",
  "description": "Visual feedback for AI coding agents",
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
  },
  "action": {
    "default_popup": "popup/popup.html"
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

- [ ] **Step 5: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './src/manifest.json';

export default defineConfig({
  plugins: [crx({ manifest })],
  build: {
    rollupOptions: {
      input: {
        'content/main-world': 'src/content/main-world.ts',
      },
    },
  },
});
```

- [ ] **Step 6: Create stub entry files**

Create empty stub files so the project builds:
- `src/content/main.ts` → `console.log('[agentation] content script loaded');`
- `src/content/main-world.ts` → `console.log('[agentation] main world loaded');`
- `src/background/service-worker.ts` → `console.log('[agentation] service worker loaded');`
- `src/popup/popup.html` → minimal HTML
- `src/popup/popup.ts` → empty

- [ ] **Step 7: Verify build**

```bash
pnpm build
```

Expected: Build succeeds, `dist/` contains extension files.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: initialize chrome extension project with Vite + CRXJS"
```

---

### Task 2: Define shared types

**Files:**
- Create: `src/shared/types.ts`
- Test: `src/shared/__tests__/types.test.ts`

- [ ] **Step 1: Write type validation test**

```typescript
// src/shared/__tests__/types.test.ts
import { describe, it, expect } from 'vitest';
import type {
  Annotation, Session, ThreadMessage,
  AnnotationIntent, AnnotationSeverity, AnnotationStatus, SessionStatus,
} from '../types';

describe('types', () => {
  it('should create a minimal Annotation', () => {
    const a: Annotation = {
      id: '1', timestamp: Date.now(), comment: 'test',
      elementPath: 'div > p', selector: 'div > p:nth-child(1)',
      elementTag: 'p', cssClasses: [], attributes: {},
      textContent: 'hello',
      boundingBox: { x: 0, y: 0, width: 100, height: 20 },
      viewport: { scrollX: 0, scrollY: 0, width: 1920, height: 1080 },
      nearbyText: [],
      computedStyles: {},
    };
    expect(a.id).toBe('1');
  });

  it('should create a Session', () => {
    const s: Session = {
      id: 's1', url: 'http://localhost', status: 'active',
      createdAt: Date.now(), updatedAt: Date.now(),
    };
    expect(s.status).toBe('active');
  });

  it('should accept all AnnotationIntent values', () => {
    const intents: AnnotationIntent[] = ['fix', 'change', 'question', 'approve'];
    expect(intents).toHaveLength(4);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run src/shared/__tests__/types.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement types**

Create `src/shared/types.ts` with all types from the spec (Section 2): `AnnotationIntent`, `AnnotationSeverity`, `AnnotationStatus`, `SessionStatus`, `ThreadMessage`, `Session`, `SessionWithAnnotations`, `Annotation`. Export all.

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm vitest run src/shared/__tests__/types.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add shared type definitions (Annotation, Session, enums)"
```

---

### Task 3: Define messaging protocol

**Files:**
- Create: `src/shared/messaging.ts`
- Test: `src/shared/__tests__/messaging.test.ts`

- [ ] **Step 1: Write messaging test**

```typescript
// src/shared/__tests__/messaging.test.ts
import { describe, it, expect } from 'vitest';
import {
  createExtensionMessage, isMainWorldMessage, AGENTATION_SOURCE,
} from '../messaging';

describe('messaging', () => {
  it('should create typed extension messages', () => {
    const msg = createExtensionMessage('COPY_TO_CLIPBOARD', { text: 'hello' });
    expect(msg.type).toBe('COPY_TO_CLIPBOARD');
    expect(msg.payload.text).toBe('hello');
  });

  it('should identify main world messages by source', () => {
    const event = { data: { source: AGENTATION_SOURCE, type: 'AG_FREEZE', payload: { freeze: true } } };
    expect(isMainWorldMessage(event.data)).toBe(true);
  });

  it('should reject non-agentation messages', () => {
    expect(isMainWorldMessage({ type: 'AG_FREEZE' })).toBe(false);
    expect(isMainWorldMessage({ source: 'other', type: 'AG_FREEZE' })).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run src/shared/__tests__/messaging.test.ts
```

- [ ] **Step 3: Implement messaging**

Create `src/shared/messaging.ts`:
- `AGENTATION_SOURCE = 'agentation'` constant
- `ExtensionMessage` discriminated union type (spec Section 7.1)
- `MainWorldMessage` discriminated union type (spec Section 7.2)
- `createExtensionMessage(type, payload)` helper
- `createMainWorldMessage(type, payload)` helper — wraps with `source: AGENTATION_SOURCE`
- `isMainWorldMessage(data)` guard — checks `data.source === AGENTATION_SOURCE`

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm vitest run src/shared/__tests__/messaging.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add typed messaging protocol (extension + main world)"
```

---

## Phase 2: Element Capture & Markdown Output

### Task 4: Implement element path generation

**Files:**
- Create: `src/content/capture/selector.ts`
- Test: `src/content/capture/__tests__/selector.test.ts`

- [ ] **Step 1: Write selector tests**

```typescript
// src/content/capture/__tests__/selector.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { generateElementPath, generateUniqueSelector, isHashClassName } from '../selector';

describe('isHashClassName', () => {
  it('filters CSS Module hash classes', () => {
    expect(isHashClassName('button_a3b2c1d4e5')).toBe(true);
    expect(isHashClassName('sc-bdVTJa')).toBe(true);
    expect(isHashClassName('css-1a2b3c')).toBe(true);
  });
  it('keeps meaningful classes', () => {
    expect(isHashClassName('btn-primary')).toBe(false);
    expect(isHashClassName('user-card')).toBe(false);
    expect(isHashClassName('container')).toBe(false);
  });
});

describe('generateElementPath', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <main>
        <div class="user-panel">
          <button id="submit" class="btn btn-primary">Submit</button>
        </div>
      </main>
    `;
  });

  it('generates readable path with max 4 levels', () => {
    const el = document.getElementById('submit')!;
    const path = generateElementPath(el);
    expect(path).toContain('button#submit');
    expect(path.split(' > ').length).toBeLessThanOrEqual(4);
  });

  it('uses id when available', () => {
    const el = document.getElementById('submit')!;
    const path = generateElementPath(el);
    expect(path).toContain('#submit');
  });
});

describe('generateUniqueSelector', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <ul>
        <li>Item 1</li>
        <li>Item 2</li>
        <li class="active">Item 3</li>
      </ul>
    `;
  });

  it('generates unique selector for element with class', () => {
    const el = document.querySelector('.active')!;
    const sel = generateUniqueSelector(el);
    expect(document.querySelectorAll(sel)).toHaveLength(1);
  });

  it('uses nth-child as fallback', () => {
    const el = document.querySelectorAll('li')[1];
    const sel = generateUniqueSelector(el);
    expect(document.querySelectorAll(sel)).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run src/content/capture/__tests__/selector.test.ts
```

- [ ] **Step 3: Implement selector.ts**

Create `src/content/capture/selector.ts` with:
- `isHashClassName(cls: string): boolean` — regex patterns for CSS Module, styled-components, Tailwind hashes
- `generateElementPath(el: Element, maxDepth?: number): string` — human-readable path, max 4 levels, `#id > tag.class > tag` format, `⟨shadow⟩` markers
- `generateUniqueSelector(el: Element): string` — unique CSS selector with priority: `#id` → `[data-testid]` → `[data-*]` → `.classes` → `nth-child`, uniqueness verified via `querySelectorAll`
- `deepElementFromPoint(x: number, y: number): Element | null` — pierces Shadow DOM via `shadowRoot.elementFromPoint()`

- [ ] **Step 4: Run tests**

```bash
pnpm vitest run src/content/capture/__tests__/selector.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add element path + unique selector generation"
```

---

### Task 5: Implement element info extraction

**Files:**
- Create: `src/content/capture/element-info.ts`
- Test: `src/content/capture/__tests__/element-info.test.ts`

- [ ] **Step 1: Write element-info tests**

```typescript
// src/content/capture/__tests__/element-info.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { extractElementInfo } from '../element-info';

describe('extractElementInfo', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <main>
        <button class="btn primary" data-testid="submit-btn" aria-label="Submit form">
          Submit Order
        </button>
        <p>Some nearby text</p>
      </main>
    `;
  });

  it('extracts tag, classes, and text content', () => {
    const el = document.querySelector('button')!;
    const info = extractElementInfo(el);
    expect(info.elementTag).toBe('button');
    expect(info.cssClasses).toContain('btn');
    expect(info.textContent).toBe('Submit Order');
  });

  it('truncates text content for buttons at 25 chars', () => {
    document.body.innerHTML = '<button>This is a very long button label that exceeds</button>';
    const el = document.querySelector('button')!;
    const info = extractElementInfo(el);
    expect(info.textContent.length).toBeLessThanOrEqual(28); // 25 + "..."
  });

  it('extracts key attributes', () => {
    const el = document.querySelector('button')!;
    const info = extractElementInfo(el);
    expect(info.attributes['data-testid']).toBe('submit-btn');
  });

  it('extracts accessibility info', () => {
    const el = document.querySelector('button')!;
    const info = extractElementInfo(el);
    expect(info.accessibility?.ariaLabel).toBe('Submit form');
  });

  it('extracts nearby text from siblings', () => {
    const el = document.querySelector('button')!;
    const info = extractElementInfo(el);
    expect(info.nearbyText).toContain('Some nearby text');
  });

  it('extracts computed styles subset', () => {
    const el = document.querySelector('button')!;
    const info = extractElementInfo(el);
    expect(info.computedStyles).toHaveProperty('color');
    expect(info.computedStyles).toHaveProperty('fontSize');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run src/content/capture/__tests__/element-info.test.ts
```

- [ ] **Step 3: Implement element-info.ts**

Create `src/content/capture/element-info.ts`:
- `extractElementInfo(el: Element): Partial<Annotation>` — extracts all DOM-level fields:
  - `elementTag`, `cssClasses` (filtered), `attributes` (data-*, id, aria-*), `textContent` (truncated: 25 for buttons/links, 40 for others)
  - `boundingBox` via `getBoundingClientRect()`
  - `viewport` from `window` properties
  - `nearbyText` — up to 4 sibling elements' text
  - `nearbyElements` — tag/text/classes of siblings
  - `computedStyles` — curated subset (color, backgroundColor, fontSize, fontWeight, padding, margin, display, position)
  - `accessibility` — role, ariaLabel, focusable (tabIndex >= 0 or interactive element)
  - `isFixed` — check if `position: fixed` in computed styles
  - `elementPath` and `selector` via `selector.ts`

- [ ] **Step 4: Run tests**

```bash
pnpm vitest run src/content/capture/__tests__/element-info.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add element info extraction (DOM, styles, accessibility)"
```

---

### Task 6: Implement text selection capture

**Files:**
- Create: `src/content/capture/text-selection.ts`
- Test: `src/content/capture/__tests__/text-selection.test.ts`

- [ ] **Step 1: Write text-selection tests**

```typescript
// src/content/capture/__tests__/text-selection.test.ts
import { describe, it, expect } from 'vitest';
import { getTextSelection } from '../text-selection';

describe('getTextSelection', () => {
  it('returns null when no selection', () => {
    expect(getTextSelection()).toBeNull();
  });

  it('returns selected text and containing element', () => {
    document.body.innerHTML = '<p id="target">Hello World</p>';
    // Note: programmatic selection is limited in jsdom/vitest,
    // so we test the extraction logic with a mock
  });
});
```

- [ ] **Step 2: Implement text-selection.ts**

Create `src/content/capture/text-selection.ts`:
- `getTextSelection(): { text: string; element: Element } | null` — reads `window.getSelection()`, returns selected text and the nearest common ancestor element

- [ ] **Step 3: Run tests, commit**

```bash
pnpm vitest run src/content/capture/__tests__/text-selection.test.ts
git add -A && git commit -m "feat: add text selection capture"
```

---

### Task 7: Implement Markdown output generator (4 levels)

**Files:**
- Create: `src/shared/markdown.ts`
- Test: `src/shared/__tests__/markdown.test.ts`

- [ ] **Step 1: Write markdown tests**

```typescript
// src/shared/__tests__/markdown.test.ts
import { describe, it, expect } from 'vitest';
import { generateOutput } from '../markdown';
import type { Annotation } from '../types';

const baseAnnotation: Annotation = {
  id: '1', timestamp: 1711200000000, comment: 'Fix button color',
  elementPath: 'main > .panel > button.btn', selector: 'main > .panel > button.btn:nth-child(2)',
  elementTag: 'button', cssClasses: ['btn', 'primary'],
  attributes: { 'data-testid': 'submit' }, textContent: 'Submit',
  boundingBox: { x: 100, y: 200, width: 80, height: 32 },
  viewport: { scrollX: 0, scrollY: 0, width: 1920, height: 1080 },
  nearbyText: ['Cancel', 'Total: $42'], computedStyles: { color: '#fff', fontSize: '14px' },
};

describe('generateOutput', () => {
  it('compact: one line per annotation', () => {
    const out = generateOutput([baseAnnotation], 'compact');
    expect(out.split('\n').filter(l => l.startsWith('#1')).length).toBe(1);
    expect(out).toContain('button.btn');
    expect(out).toContain('Fix button color');
  });

  it('standard: includes path and location', () => {
    const out = generateOutput([baseAnnotation], 'standard');
    expect(out).toContain('**Path:**');
    expect(out).toContain('**Location:**');
  });

  it('detailed: includes selector, styles, boundingBox', () => {
    const out = generateOutput([baseAnnotation], 'detailed');
    expect(out).toContain('**Selector:**');
    expect(out).toContain('**Styles:**');
    expect(out).toContain('**Bounding Box:**');
  });

  it('forensic: includes viewport, full path', () => {
    const ann = { ...baseAnnotation, fullPath: 'html > body > main > .panel > button.btn', url: 'http://localhost:3000' };
    const out = generateOutput([ann], 'forensic');
    expect(out).toContain('**Viewport:**');
    expect(out).toContain('**Full DOM Path:**');
  });

  it('includes selectedText when present', () => {
    const ann = { ...baseAnnotation, selectedText: 'Submit' };
    const out = generateOutput([ann], 'standard');
    expect(out).toContain('**Selected text:**');
  });

  it('includes framework info when present', () => {
    const ann = { ...baseAnnotation, framework: { name: 'vue', componentName: 'OrderForm', componentPath: 'App > OrderForm' } };
    const out = generateOutput([ann], 'standard');
    expect(out).toContain('OrderForm');
  });

  it('includes source info when present', () => {
    const ann = { ...baseAnnotation, source: { file: 'src/App.vue', line: 42, column: 5 } };
    const out = generateOutput([ann], 'standard');
    expect(out).toContain('src/App.vue:42:5');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run src/shared/__tests__/markdown.test.ts
```

- [ ] **Step 3: Implement markdown.ts**

Create `src/shared/markdown.ts`:
- `type OutputLevel = 'compact' | 'standard' | 'detailed' | 'forensic'`
- `generateOutput(annotations: Annotation[], level: OutputLevel): string`
- Each level builds on the previous, following the exact Markdown templates from spec Section 2.

- [ ] **Step 4: Run tests**

```bash
pnpm vitest run src/shared/__tests__/markdown.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add structured Markdown output generator (4 levels)"
```

---

## Phase 3: Content Script UI

### Task 8: Implement Shadow DOM host and styles

**Files:**
- Create: `src/content/ui/styles.css`
- Create: `src/content/ui/host.ts`
- Test: `src/content/ui/__tests__/host.test.ts`

- [ ] **Step 1: Write host tests**

```typescript
// src/content/ui/__tests__/host.test.ts
import { describe, it, expect, afterEach } from 'vitest';
import { createAgentationHost, getAgentationRoot } from '../host';

describe('createAgentationHost', () => {
  afterEach(() => {
    document.querySelector('agentation-root')?.remove();
  });

  it('creates a custom element with closed shadow DOM', () => {
    const shadow = createAgentationHost();
    const host = document.querySelector('agentation-root');
    expect(host).not.toBeNull();
    expect(shadow).toBeDefined();
  });

  it('does not create duplicate hosts', () => {
    createAgentationHost();
    createAgentationHost();
    expect(document.querySelectorAll('agentation-root')).toHaveLength(1);
  });

  it('contains toolbar and highlights containers', () => {
    const shadow = createAgentationHost();
    expect(shadow.getElementById('agentation-toolbar')).not.toBeNull();
    expect(shadow.getElementById('agentation-highlights')).not.toBeNull();
    expect(shadow.getElementById('agentation-markers')).not.toBeNull();
    expect(shadow.getElementById('agentation-popups')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement host.ts**

Create `src/content/ui/host.ts`:
- `createAgentationHost(): ShadowRoot` — creates `<agentation-root>` with `mode: 'closed'`, injects styles, creates `#agentation-toolbar`, `#agentation-highlights`, `#agentation-markers`, `#agentation-popups` containers
- `getAgentationRoot(): ShadowRoot | null` — returns existing shadow root

Create `src/content/ui/styles.css` with CSS variables for theming (spec Section 5):
```css
:host {
  --ag-bg: #fff; --ag-text: #1a1a1a; --ag-accent: #3b82f6;
  --ag-radius: 8px; --ag-shadow: 0 2px 8px rgba(0,0,0,0.15);
  all: initial; font-family: system-ui, sans-serif;
}
:host(.dark) {
  --ag-bg: #1e1e1e; --ag-text: #e5e5e5; --ag-accent: #60a5fa;
}
```

- [ ] **Step 4: Run tests, commit**

```bash
pnpm vitest run src/content/ui/__tests__/host.test.ts
git add -A && git commit -m "feat: add Shadow DOM host with theme support"
```

---

### Task 9: Implement toolbar (44px badge ↔ expanded panel)

**Files:**
- Create: `src/content/ui/toolbar.ts`
- Test: `src/content/ui/__tests__/toolbar.test.ts`

- [ ] **Step 1: Write toolbar tests**

```typescript
// src/content/ui/__tests__/toolbar.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Toolbar } from '../toolbar';

describe('Toolbar', () => {
  let container: HTMLDivElement;
  let toolbar: Toolbar;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    toolbar = new Toolbar(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('starts in collapsed (inactive) state', () => {
    expect(toolbar.isActive).toBe(false);
    expect(container.querySelector('.ag-toolbar--collapsed')).not.toBeNull();
  });

  it('expands on activate', () => {
    toolbar.activate();
    expect(toolbar.isActive).toBe(true);
    expect(container.querySelector('.ag-toolbar--expanded')).not.toBeNull();
  });

  it('collapses on deactivate', () => {
    toolbar.activate();
    toolbar.deactivate();
    expect(toolbar.isActive).toBe(false);
  });

  it('renders all action buttons when expanded', () => {
    toolbar.activate();
    const buttons = container.querySelectorAll('.ag-toolbar-btn');
    // markers, freeze, settings, copy, send, clear = 6
    expect(buttons.length).toBe(6);
  });

  it('shows annotation count', () => {
    toolbar.activate();
    toolbar.setAnnotationCount(5);
    expect(container.textContent).toContain('5');
  });

  it('emits toggle event on badge click', () => {
    let toggled = false;
    toolbar.on('toggle', () => { toggled = true; });
    const badge = container.querySelector('.ag-toolbar--collapsed')!;
    (badge as HTMLElement).click();
    expect(toggled).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement toolbar.ts**

Create `src/content/ui/toolbar.ts`:
- `class Toolbar` with event emitter pattern
- Collapsed state: 44px circle badge, fixed bottom-right
- Expanded state: panel with 6 buttons (markers toggle, freeze, settings, copy, send, clear) + header (connection status + count)
- Draggable via `mousedown`/`mousemove`/`mouseup`, constrained to viewport with 20px padding
- Methods: `activate()`, `deactivate()`, `toggle()`, `setAnnotationCount(n)`, `setConnectionStatus(s)`
- Events: `toggle`, `copy`, `clear`, `freeze`, `send`, `settings`

- [ ] **Step 4: Run tests, commit**

```bash
pnpm vitest run src/content/ui/__tests__/toolbar.test.ts
git add -A && git commit -m "feat: add toolbar component (badge ↔ expanded panel)"
```

---

### Task 10: Implement highlight overlay and markers

**Files:**
- Create: `src/content/ui/highlight.ts`
- Test: `src/content/ui/__tests__/highlight.test.ts`

- [ ] **Step 1: Write highlight tests**

```typescript
// src/content/ui/__tests__/highlight.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { HighlightManager } from '../highlight';

describe('HighlightManager', () => {
  let highlightContainer: HTMLDivElement;
  let markerContainer: HTMLDivElement;
  let manager: HighlightManager;

  beforeEach(() => {
    highlightContainer = document.createElement('div');
    markerContainer = document.createElement('div');
    document.body.appendChild(highlightContainer);
    document.body.appendChild(markerContainer);
    manager = new HighlightManager(highlightContainer, markerContainer);
  });

  afterEach(() => {
    highlightContainer.remove();
    markerContainer.remove();
  });

  it('shows hover highlight for element', () => {
    document.body.innerHTML += '<button id="target">Click</button>';
    const el = document.getElementById('target')!;
    manager.showHoverHighlight(el);
    expect(highlightContainer.querySelector('.ag-hover-highlight')).not.toBeNull();
  });

  it('clears hover highlight', () => {
    document.body.innerHTML += '<button id="t2">Click</button>';
    manager.showHoverHighlight(document.getElementById('t2')!);
    manager.clearHoverHighlight();
    expect(highlightContainer.querySelector('.ag-hover-highlight')).toBeNull();
  });

  it('adds numbered marker at annotation position', () => {
    manager.addMarker('a1', { x: 100, y: 200 }, 1);
    const marker = markerContainer.querySelector('.ag-marker');
    expect(marker).not.toBeNull();
    expect(marker?.textContent).toContain('1');
  });

  it('removes marker', () => {
    manager.addMarker('a1', { x: 100, y: 200 }, 1);
    manager.removeMarker('a1');
    expect(markerContainer.querySelector('.ag-marker')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement highlight.ts**

Create `src/content/ui/highlight.ts`:
- `class HighlightManager` — manages hover highlights and annotation markers
- `showHoverHighlight(el: Element)` — positions highlight box over target using `getBoundingClientRect()`, accounts for `isFixed`
- `clearHoverHighlight()`
- `addMarker(id: string, position: {x, y}, number: number)` — numbered circle at annotation position
- `removeMarker(id: string)`
- `clearAllMarkers()`
- `updatePositions()` — recalculate on scroll/resize

- [ ] **Step 4: Run tests, commit**

```bash
pnpm vitest run src/content/ui/__tests__/highlight.test.ts
git add -A && git commit -m "feat: add highlight manager (hover + annotation markers)"
```

---

### Task 11: Implement annotation popup

**Files:**
- Create: `src/content/ui/annotation-popup.ts`
- Test: `src/content/ui/__tests__/annotation-popup.test.ts`

- [ ] **Step 1: Write annotation popup tests**

```typescript
// src/content/ui/__tests__/annotation-popup.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AnnotationPopup } from '../annotation-popup';

describe('AnnotationPopup', () => {
  let container: HTMLDivElement;
  let popup: AnnotationPopup;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    popup = new AnnotationPopup(container);
  });

  afterEach(() => { container.remove(); });

  it('shows popup with comment input', () => {
    popup.show({ x: 100, y: 200 }, 'button.btn');
    expect(container.querySelector('.ag-popup')).not.toBeNull();
    expect(container.querySelector('textarea')).not.toBeNull();
  });

  it('displays element identifier', () => {
    popup.show({ x: 100, y: 200 }, 'button.btn-primary');
    expect(container.textContent).toContain('button.btn-primary');
  });

  it('emits submit with comment, intent, severity', () => {
    let result: any;
    popup.on('submit', (data: any) => { result = data; });
    popup.show({ x: 100, y: 200 }, 'btn');

    const textarea = container.querySelector('textarea')!;
    textarea.value = 'Fix this';
    const submitBtn = container.querySelector('.ag-popup-submit')!;
    (submitBtn as HTMLElement).click();

    expect(result.comment).toBe('Fix this');
  });

  it('emits cancel', () => {
    let cancelled = false;
    popup.on('cancel', () => { cancelled = true; });
    popup.show({ x: 100, y: 200 }, 'btn');

    const cancelBtn = container.querySelector('.ag-popup-cancel')!;
    (cancelBtn as HTMLElement).click();
    expect(cancelled).toBe(true);
  });

  it('hides on cancel', () => {
    popup.show({ x: 100, y: 200 }, 'btn');
    popup.hide();
    expect(container.querySelector('.ag-popup')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement annotation-popup.ts**

Create `src/content/ui/annotation-popup.ts`:
- `class AnnotationPopup` with event emitter
- `show(position, elementName)` — renders popup near clicked element with: element identifier label, textarea for comment, intent dropdown (fix/change/question/approve), severity dropdown (blocking/important/suggestion), Submit + Cancel buttons
- `hide()` — removes popup
- Events: `submit` (comment, intent, severity), `cancel`

- [ ] **Step 4: Run tests, commit**

```bash
pnpm vitest run src/content/ui/__tests__/annotation-popup.test.ts
git add -A && git commit -m "feat: add annotation popup (comment, intent, severity)"
```

---

### Task 12: Wire content script main.ts (core annotation flow)

**Files:**
- Modify: `src/content/main.ts`
- Create: `src/content/annotation-store.ts`
- Test: `src/content/capture/__tests__/annotation-store.test.ts`

- [ ] **Step 1: Write annotation store tests**

```typescript
// src/content/__tests__/annotation-store.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { AnnotationStore } from '../annotation-store';

describe('AnnotationStore', () => {
  let store: AnnotationStore;

  beforeEach(() => {
    localStorage.clear();
    store = new AnnotationStore('/test-page');
  });

  it('starts empty', () => {
    expect(store.getAll()).toHaveLength(0);
  });

  it('adds annotation and assigns id', () => {
    const a = store.add({ comment: 'test', elementTag: 'button' } as any);
    expect(a.id).toBeDefined();
    expect(store.getAll()).toHaveLength(1);
  });

  it('deletes annotation', () => {
    const a = store.add({ comment: 'test' } as any);
    store.delete(a.id);
    expect(store.getAll()).toHaveLength(0);
  });

  it('clears all', () => {
    store.add({ comment: '1' } as any);
    store.add({ comment: '2' } as any);
    store.clearAll();
    expect(store.getAll()).toHaveLength(0);
  });

  it('persists to localStorage', () => {
    store.add({ comment: 'persist' } as any);
    const store2 = new AnnotationStore('/test-page');
    expect(store2.getAll()).toHaveLength(1);
  });

  it('filters out annotations older than 7 days', () => {
    const old = store.add({ comment: 'old' } as any);
    // Manually set old timestamp
    const all = store.getAll();
    all[0].timestamp = Date.now() - 8 * 24 * 60 * 60 * 1000;
    store['save'](all);
    const store2 = new AnnotationStore('/test-page');
    expect(store2.getAll()).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement annotation-store.ts**

Create `src/content/annotation-store.ts`:
- `class AnnotationStore` — manages annotations in memory + localStorage
- Constructor loads from `localStorage` key `agentation-annotations-{pathname}`, filters out >7 day old entries
- `add(partial)` — assigns `id` (crypto.randomUUID()), `timestamp`, saves
- `update(id, updates)`, `delete(id)`, `clearAll()`
- `getAll()` — returns current annotations
- Private `save(annotations)` and `load()` methods

- [ ] **Step 4: Run tests**

```bash
pnpm vitest run src/content/__tests__/annotation-store.test.ts
```

- [ ] **Step 5: Wire main.ts**

Update `src/content/main.ts` to:
1. Create Shadow DOM host
2. Initialize Toolbar, HighlightManager, AnnotationPopup, AnnotationStore
3. On toolbar `toggle` → activate/deactivate
4. When active: add `mousemove` listener on `document.body` → `deepElementFromPoint()` → `showHoverHighlight()`
5. When active: add `click` listener on `document.body` → extract element info → show AnnotationPopup
6. On popup `submit` → create annotation, add marker, sync (future)
7. On popup `cancel` → clear pending state
8. On toolbar `copy` → `generateOutput()` + clipboard
9. On toolbar `clear` → `store.clearAll()` + clear markers
10. `blockInteractions` setting controls `preventDefault/stopPropagation`
11. Keyboard shortcut `Cmd/Ctrl+Shift+F` to toggle

- [ ] **Step 6: Manual test — load extension in Chrome**

```bash
pnpm build
```

Load `dist/` as unpacked extension in `chrome://extensions`. Visit any page. Click badge → toolbar expands → click element → popup appears → submit → marker shows.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: wire content script with full annotation flow"
```

---

## Phase 4: Framework Detection

### Task 13: Implement framework detector infrastructure

**Files:**
- Create: `src/content/frameworks/detector.ts`
- Create: `src/content/frameworks/types.ts`
- Test: `src/content/frameworks/__tests__/detector.test.ts`

- [ ] **Step 1: Write detector tests**

```typescript
// src/content/frameworks/__tests__/detector.test.ts
import { describe, it, expect } from 'vitest';
import { FrameworkDetectorManager } from '../detector';
import type { FrameworkDetector } from '../types';

describe('FrameworkDetectorManager', () => {
  it('registers and runs detectors', () => {
    const manager = new FrameworkDetectorManager();
    const mockDetector: FrameworkDetector = {
      name: 'test-framework',
      detect: () => true,
      getComponentInfo: () => ({ name: 'test-framework', componentName: 'TestComp' }),
    };
    manager.register(mockDetector);
    const detected = manager.detectAll();
    expect(detected).toContain('test-framework');
  });

  it('caches detection results', () => {
    const manager = new FrameworkDetectorManager();
    let callCount = 0;
    manager.register({
      name: 'counter',
      detect: () => { callCount++; return true; },
      getComponentInfo: () => null,
    });
    manager.detectAll();
    manager.detectAll();
    expect(callCount).toBe(1); // cached
  });

  it('returns null for undetected frameworks', () => {
    const manager = new FrameworkDetectorManager();
    manager.register({
      name: 'absent',
      detect: () => false,
      getComponentInfo: () => ({ name: 'absent', componentName: 'X' }),
    });
    const el = document.createElement('div');
    expect(manager.getComponentInfo(el)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement detector.ts and types.ts**

Create `src/content/frameworks/types.ts`:
```typescript
export interface FrameworkInfo {
  name: string;
  componentName: string;
  componentPath?: string;
  componentNames?: string[];
  props?: Record<string, unknown>;
  state?: Record<string, unknown>;
}

export interface SourceInfo {
  file: string;
  line: number;
  column: number;
}

export interface FrameworkDetector {
  name: string;
  detect(): boolean;
  getComponentInfo(el: Element): FrameworkInfo | null;
  getSourceInfo?(el: Element): SourceInfo | null;
}
```

Create `src/content/frameworks/detector.ts`:
- `class FrameworkDetectorManager`
- `register(detector)`, `detectAll(): string[]` (with cache), `resetCache()`
- `getComponentInfo(el: Element): FrameworkInfo | null` — walks up ancestors, tries each detected framework
- `getSourceInfo(el: Element): SourceInfo | null` — tries `getSourceInfo` for each detected framework

- [ ] **Step 4: Run tests, commit**

```bash
pnpm vitest run src/content/frameworks/__tests__/detector.test.ts
git add -A && git commit -m "feat: add framework detector manager infrastructure"
```

---

### Task 14: Implement React detector

**Files:**
- Create: `src/content/frameworks/react.ts`
- Test: `src/content/frameworks/__tests__/react.test.ts`

- [ ] **Step 1: Write React detector tests**

```typescript
// src/content/frameworks/__tests__/react.test.ts
import { describe, it, expect } from 'vitest';
import { ReactDetector, findFiberNode, extractReactComponents, INFRASTRUCTURE_COMPONENTS } from '../react';

describe('ReactDetector', () => {
  const detector = new ReactDetector();

  it('detect() returns false when no React present', () => {
    expect(detector.detect()).toBe(false);
  });

  it('identifies infrastructure components', () => {
    expect(INFRASTRUCTURE_COMPONENTS).toContain('Provider');
    expect(INFRASTRUCTURE_COMPONENTS).toContain('Router');
    expect(INFRASTRUCTURE_COMPONENTS).toContain('Suspense');
  });
});

describe('findFiberNode', () => {
  it('returns null for plain DOM elements', () => {
    const el = document.createElement('div');
    expect(findFiberNode(el)).toBeNull();
  });
});

describe('extractReactComponents', () => {
  it('filters out single-letter names in filtered mode', () => {
    // This would need a mock fiber tree — test the filtering logic
    const names = ['App', 'e', 'Layout', 'a', 'UserCard'];
    const filtered = names.filter(n => n.length > 1 && !/^[a-z]$/.test(n));
    expect(filtered).toEqual(['App', 'Layout', 'UserCard']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement react.ts**

Create `src/content/frameworks/react.ts`:
- `class ReactDetector implements FrameworkDetector`
- `detect()` — scans DOM for `__reactFiber$*` or `_reactRootContainer` properties
- `findFiberNode(el: Element)` — finds `__reactFiber$*` key on element
- `getComponentInfo(el, filterMode = 'filtered')` — traverses fiber tree upward, extracts `type.name`/`displayName`, `memoizedProps`, `memoizedState`
- `getSourceInfo(el)` — reads `_debugSource` from fiber node: `{ fileName, lineNumber, columnNumber }`
- `probeSource(el)` — fallback: call component function with throwing hooks dispatcher, parse stack trace, clean bundler prefixes
- Three filter modes: `all`, `filtered` (skip INFRASTRUCTURE_COMPONENTS + single-letter), `smart` (validate against DOM classes)
- `INFRASTRUCTURE_COMPONENTS` list: `['Provider', 'Consumer', 'Router', 'Route', 'Switch', 'Suspense', 'ErrorBoundary', 'Fragment', 'StrictMode', 'Profiler', 'Outlet']`

- [ ] **Step 4: Run tests, commit**

```bash
pnpm vitest run src/content/frameworks/__tests__/react.test.ts
git add -A && git commit -m "feat: add React framework detector (fiber, _debugSource, probe)"
```

---

### Task 15: Implement Vue detector

**Files:**
- Create: `src/content/frameworks/vue.ts`
- Test: `src/content/frameworks/__tests__/vue.test.ts`

- [ ] **Step 1: Write Vue detector tests**

```typescript
// src/content/frameworks/__tests__/vue.test.ts
import { describe, it, expect } from 'vitest';
import { VueDetector } from '../vue';

describe('VueDetector', () => {
  const detector = new VueDetector();

  it('detect() returns false when no Vue present', () => {
    expect(detector.detect()).toBe(false);
  });

  it('getComponentInfo returns null for plain elements', () => {
    const el = document.createElement('div');
    expect(detector.getComponentInfo(el)).toBeNull();
  });
});
```

- [ ] **Step 2: Implement vue.ts**

Create `src/content/frameworks/vue.ts`:
- `class VueDetector implements FrameworkDetector`
- `detect()` — checks for `__vue_app__` (Vue 3) or `__vue__` (Vue 2) on DOM elements
- `getComponentInfo(el)`:
  - Vue 3: reads `__vueParentComponent`, extracts `type.name`/`type.__name`, `props`, `setupState`
  - Vue 2: reads `__vue__`, extracts `$options.name`, `$props`, `$data`
- `getSourceInfo(el)`:
  - Vue 3: reads `type.__file`
  - Vue 2: reads `$options.__file`

- [ ] **Step 3: Run tests, commit**

```bash
pnpm vitest run src/content/frameworks/__tests__/vue.test.ts
git add -A && git commit -m "feat: add Vue 2/3 framework detector"
```

---

### Task 16: Implement Svelte, Angular, Solid, Qwik detectors

**Files:**
- Create: `src/content/frameworks/svelte.ts`
- Create: `src/content/frameworks/angular.ts`
- Create: `src/content/frameworks/solid.ts`
- Create: `src/content/frameworks/qwik.ts`
- Test: one test file per detector

- [ ] **Step 1: Write tests for each detector** (same pattern as Vue — detect returns false, getComponentInfo returns null for plain elements)

- [ ] **Step 2: Implement each detector**

Each follows the `FrameworkDetector` interface. Key detection properties per spec Section 3:
- **Svelte**: `__svelte_meta`, source via `__svelte_meta.loc`
- **Angular**: `ng.getComponent()` / `__ngContext__`, source needs Source Map fallback
- **Solid**: `__r` / `_$owner`, source needs Source Map fallback
- **Qwik**: `q:container`, source needs Source Map fallback

- [ ] **Step 3: Run all detector tests**

```bash
pnpm vitest run src/content/frameworks/__tests__/
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add Svelte, Angular, Solid, Qwik framework detectors"
```

---

### Task 17: Wire MAIN world script for framework detection

**Files:**
- Modify: `src/content/main-world.ts`
- Modify: `src/content/main.ts`

- [ ] **Step 1: Implement main-world.ts**

Update `src/content/main-world.ts`:
1. Import and register all framework detectors
2. Run detection polling (5 attempts, 2s interval)
3. Post `AG_FRAMEWORK_DETECT_RESULT` with detected frameworks
4. Listen for `AG_COMPONENT_INFO_REQUEST` → extract info → post `AG_COMPONENT_INFO`
5. Listen for `AG_PROBE_SOURCE` → try probe/source extraction → post `AG_PROBE_RESULT` or `AG_SOURCE_INFO`
6. Listen for `AG_FREEZE` → execute freeze/unfreeze logic
7. All messages wrapped with `source: 'agentation'`

- [ ] **Step 2: Update main.ts to communicate with MAIN world**

Add `window.postMessage` listener in Content Script to receive framework results. On element click, post `AG_COMPONENT_INFO_REQUEST` to MAIN world, await response, merge into annotation.

- [ ] **Step 3: Manual test — visit a React/Vue dev page, click element, verify framework info appears**

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: wire MAIN world script for framework detection + source location"
```

---

## Phase 5: Background Service Worker & Source Map

### Task 18: Implement Background Service Worker

**Files:**
- Modify: `src/background/service-worker.ts`
- Create: `src/background/debugger.ts`
- Create: `src/background/server-bridge.ts`

- [ ] **Step 1: Implement service-worker.ts**

Update `src/background/service-worker.ts`:
- Listen for `chrome.runtime.onMessage` from Content Script
- Route messages: `RESOLVE_SOURCEMAP` → `debugger.ts`, `COPY_TO_CLIPBOARD` → `navigator.clipboard`, `SYNC_ANNOTATION`/`CREATE_SESSION` → `server-bridge.ts`

- [ ] **Step 2: Implement debugger.ts**

Create `src/background/debugger.ts`:
- `resolveSourceMap(tabId, scriptUrl, funcSignature)`:
  1. `chrome.debugger.attach({ tabId }, '1.3')`
  2. `Debugger.enable`
  3. Search loaded scripts for `funcSignature` match
  4. Fetch source map via `//# sourceMappingURL=` or `Debugger.getScriptSource`
  5. Parse source map, call `originalPositionFor()`
  6. `chrome.debugger.detach({ tabId })`
  7. Return `{ file, line, column }` or `null`

- [ ] **Step 3: Implement server-bridge.ts**

Create `src/background/server-bridge.ts`:
- `class ServerBridge`
- `constructor(baseUrl = 'http://localhost:4747')`
- `createSession(url)` → `POST /sessions`
- `syncAnnotation(sessionId, annotation)` → `POST /sessions/:id/annotations`
- `updateAnnotation(id, updates)` → `PATCH /annotations/:id`
- `deleteAnnotation(id)` → `DELETE /annotations/:id`
- `connectSSE()` → `EventSource` to `/events`, listen for `command.requested` events
- `submitCommandResult(commandId, result)` → `POST /commands/:id/result`
- Handle `take_screenshot` command → `chrome.tabs.captureVisibleTab()`
- Handle `get_page_info` command → forward to Content Script
- All methods have try/catch, fail silently if server unreachable

- [ ] **Step 4: Manual test — verify clipboard copy works, debugger attaches/detaches**

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add background service worker (debugger, server bridge, SSE)"
```

---

## Phase 6: Server (HTTP + MCP + SQLite)

### Task 19: Initialize server package

**Files:**
- Create: `packages/server/package.json`
- Create: `packages/server/tsconfig.json`

- [ ] **Step 1: Initialize server package**

```bash
cd packages/server
pnpm init
pnpm add better-sqlite3 @modelcontextprotocol/sdk express cors
pnpm add -D @types/better-sqlite3 @types/express @types/cors tsx vitest
```

- [ ] **Step 2: Create package.json**

```json
{
  "name": "agentation-server",
  "version": "0.1.0",
  "type": "module",
  "bin": { "agentation-server": "./dist/cli.js" },
  "scripts": {
    "dev": "tsx src/cli.ts",
    "build": "tsc",
    "test": "vitest"
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: initialize server package with dependencies"
```

---

### Task 20: Implement SQLite store

**Files:**
- Create: `packages/server/src/store.ts`
- Test: `packages/server/src/__tests__/store.test.ts`

- [ ] **Step 1: Write store tests**

```typescript
// packages/server/src/__tests__/store.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createStore } from '../store';

describe('AFSStore', () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore(':memory:');
  });

  it('creates and retrieves session', () => {
    const s = store.createSession('http://localhost');
    expect(s.id).toBeDefined();
    expect(store.getSession(s.id)?.url).toBe('http://localhost');
  });

  it('lists sessions', () => {
    store.createSession('http://a.com');
    store.createSession('http://b.com');
    expect(store.listSessions()).toHaveLength(2);
  });

  it('adds annotation to session', () => {
    const s = store.createSession('http://localhost');
    const a = store.addAnnotation(s.id, { comment: 'test', elementTag: 'div' } as any);
    expect(a.id).toBeDefined();
    expect(store.getSessionAnnotations(s.id)).toHaveLength(1);
  });

  it('updates annotation status', () => {
    const s = store.createSession('http://localhost');
    const a = store.addAnnotation(s.id, { comment: 'test' } as any);
    store.updateAnnotationStatus(a.id, 'acknowledged');
    expect(store.getAnnotation(a.id)?.status).toBe('acknowledged');
  });

  it('gets pending annotations', () => {
    const s = store.createSession('http://localhost');
    store.addAnnotation(s.id, { comment: 'a' } as any);
    store.addAnnotation(s.id, { comment: 'b' } as any);
    expect(store.getPendingAnnotations(s.id)).toHaveLength(2);
  });

  it('deletes annotation', () => {
    const s = store.createSession('http://localhost');
    const a = store.addAnnotation(s.id, { comment: 'x' } as any);
    store.deleteAnnotation(a.id);
    expect(store.getAnnotation(a.id)).toBeNull();
  });

  it('adds thread message', () => {
    const s = store.createSession('http://localhost');
    const a = store.addAnnotation(s.id, { comment: 'x' } as any);
    store.addThreadMessage(a.id, { id: 't1', role: 'agent', content: 'Got it', timestamp: Date.now() });
    const ann = store.getAnnotation(a.id);
    expect(ann?.thread).toHaveLength(1);
  });

  it('tracks events with sequence numbers', () => {
    const s = store.createSession('http://localhost');
    store.addAnnotation(s.id, { comment: 'x' } as any);
    const events = store.getEventsSince(0);
    expect(events.length).toBeGreaterThan(0);
    expect(events[0].seq).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement store.ts**

Create `packages/server/src/store.ts`:
- `createStore(dbPath?: string): AFSStore` — uses `better-sqlite3`, falls back to in-memory if path fails
- Initialize tables: `sessions`, `annotations`, `thread_messages`, `events`
- Implement all `AFSStore` interface methods from spec Section 6.3
- Each mutation (add/update/delete) also inserts an event record with auto-incrementing seq
- 7-day retention: `getPendingAnnotations` filters by timestamp

- [ ] **Step 4: Run tests**

```bash
cd packages/server && pnpm vitest run src/__tests__/store.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add SQLite store with session/annotation/event management"
```

---

### Task 21: Implement HTTP server

**Files:**
- Create: `packages/server/src/http-server.ts`
- Create: `packages/server/src/events.ts`
- Test: `packages/server/src/__tests__/http-server.test.ts`

- [ ] **Step 1: Write HTTP server tests**

```typescript
// packages/server/src/__tests__/http-server.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createHttpServer } from '../http-server';
import { createStore } from '../store';

describe('HTTP Server', () => {
  let server: ReturnType<typeof createHttpServer>;
  let baseUrl: string;

  beforeAll(async () => {
    const store = createStore(':memory:');
    server = createHttpServer(store, 0); // random port
    const address = server.address();
    baseUrl = `http://localhost:${typeof address === 'object' ? address?.port : address}`;
  });

  afterAll(() => { server.close(); });

  it('POST /sessions creates session', async () => {
    const res = await fetch(`${baseUrl}/sessions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'http://test.com' }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.id).toBeDefined();
  });

  it('GET /sessions lists sessions', async () => {
    const res = await fetch(`${baseUrl}/sessions`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it('POST /sessions/:id/annotations adds annotation', async () => {
    // Create session first
    const sRes = await fetch(`${baseUrl}/sessions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'http://test2.com' }),
    });
    const session = await sRes.json();

    const res = await fetch(`${baseUrl}/sessions/${session.id}/annotations`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment: 'Fix this', elementTag: 'button' }),
    });
    expect(res.status).toBe(201);
  });

  it('PATCH /annotations/:id updates annotation', async () => {
    const sRes = await fetch(`${baseUrl}/sessions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'http://test3.com' }),
    });
    const session = await sRes.json();
    const aRes = await fetch(`${baseUrl}/sessions/${session.id}/annotations`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment: 'Original' }),
    });
    const annotation = await aRes.json();

    const res = await fetch(`${baseUrl}/annotations/${annotation.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'acknowledged' }),
    });
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement http-server.ts and events.ts**

Create `packages/server/src/events.ts`:
- `class EventEmitterSSE` — manages SSE connections, broadcasts events
- `addClient(res)` — sets SSE headers, keeps connection open
- `broadcast(event)` — sends `data: JSON\n\n` to all clients
- `createCommand(command, params)` — stores pending command, broadcasts `command.requested`
- `resolveCommand(commandId, result)` — resolves waiting promise

Create `packages/server/src/http-server.ts`:
- Express app with CORS
- All routes from spec Section 6.4
- `GET /events` → SSE endpoint
- `POST /commands/:id/result` → resolve pending command

- [ ] **Step 4: Run tests, commit**

```bash
cd packages/server && pnpm vitest run src/__tests__/http-server.test.ts
git add -A && git commit -m "feat: add HTTP server with REST API + SSE events"
```

---

### Task 22: Implement MCP server

**Files:**
- Create: `packages/server/src/mcp-server.ts`
- Test: `packages/server/src/__tests__/mcp-server.test.ts`

- [ ] **Step 1: Write MCP server tests**

```typescript
// packages/server/src/__tests__/mcp-server.test.ts
import { describe, it, expect } from 'vitest';
import { createMcpTools } from '../mcp-server';
import { createStore } from '../store';

describe('MCP Tools', () => {
  const store = createStore(':memory:');
  const tools = createMcpTools(store);

  it('list_sessions returns empty array initially', async () => {
    const result = await tools.list_sessions({});
    expect(JSON.parse(result.content[0].text)).toEqual([]);
  });

  it('get_pending returns pending annotations', async () => {
    const s = store.createSession('http://test.com');
    store.addAnnotation(s.id, { comment: 'fix' } as any);
    const result = await tools.get_pending({ sessionId: s.id });
    const annotations = JSON.parse(result.content[0].text);
    expect(annotations).toHaveLength(1);
  });

  it('acknowledge changes status', async () => {
    const s = store.createSession('http://test.com');
    const a = store.addAnnotation(s.id, { comment: 'x' } as any);
    await tools.acknowledge({ annotationId: a.id });
    expect(store.getAnnotation(a.id)?.status).toBe('acknowledged');
  });

  it('resolve changes status and adds summary', async () => {
    const s = store.createSession('http://test.com');
    const a = store.addAnnotation(s.id, { comment: 'y' } as any);
    await tools.resolve({ annotationId: a.id, summary: 'Fixed the color' });
    const ann = store.getAnnotation(a.id);
    expect(ann?.status).toBe('resolved');
  });

  it('reply adds thread message', async () => {
    const s = store.createSession('http://test.com');
    const a = store.addAnnotation(s.id, { comment: 'z' } as any);
    await tools.reply({ annotationId: a.id, message: 'Working on it' });
    const ann = store.getAnnotation(a.id);
    expect(ann?.thread).toHaveLength(1);
    expect(ann?.thread?.[0].role).toBe('agent');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement mcp-server.ts**

Create `packages/server/src/mcp-server.ts`:
- `createMcpTools(store, eventEmitter?)` — returns object with all 11 MCP tool handlers
- Each tool returns `{ content: [{ type: 'text', text: string }], isError?: boolean }`
- `watch_annotations` — polls `store.getEventsSince(lastSeq)` with configurable `batchWindowSeconds` (default 10) and `timeoutSeconds` (default 120)
- `get_page_info` and `take_screenshot` — create command via `eventEmitter.createCommand()`, await result
- `createMcpServer(store, eventEmitter)` — wraps tools with `@modelcontextprotocol/sdk` Server for stdio transport

- [ ] **Step 4: Run tests, commit**

```bash
cd packages/server && pnpm vitest run src/__tests__/mcp-server.test.ts
git add -A && git commit -m "feat: add MCP server with 11 tools"
```

---

### Task 23: Implement CLI

**Files:**
- Create: `packages/server/src/cli.ts`

- [ ] **Step 1: Implement cli.ts**

Create `packages/server/src/cli.ts`:
- Parse args: `init`, `start`, `doctor`
- `init` — interactive setup: check Claude Code config, register MCP server
- `start` — create store (`~/.agentation/store.db`), start HTTP server (default port 4747), start MCP server on stdio if `--stdio` flag
- `doctor` — check Node.js version, Claude Code config, server connectivity
- `--port` flag for custom port, `--mcp-only` for MCP without HTTP

- [ ] **Step 2: Manual test**

```bash
cd packages/server && npx tsx src/cli.ts start --port 4747
```

Verify: server starts, `curl http://localhost:4747/sessions` returns `[]`.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add CLI (init, start, doctor)"
```

---

## Phase 7: Advanced Features

### Task 24: Implement animation freezing

**Files:**
- Create: `src/content/freeze.ts` (runs in MAIN world)
- Test: `src/content/__tests__/freeze.test.ts`

- [ ] **Step 1: Write freeze tests**

```typescript
// src/content/__tests__/freeze.test.ts
import { describe, it, expect } from 'vitest';
import { freezePage, unfreezePage } from '../freeze';

describe('freezePage', () => {
  it('pauses CSS animations', () => {
    document.body.innerHTML = '<div style="animation: spin 1s infinite">test</div>';
    freezePage();
    const el = document.querySelector('div')!;
    expect(getComputedStyle(el).animationPlayState).toBe('paused');
  });

  it('excludes agentation UI elements', () => {
    document.body.innerHTML = '<div data-agentation style="animation: spin 1s infinite">toolbar</div>';
    freezePage();
    const el = document.querySelector('[data-agentation]')!;
    // Should not be paused
    expect(el.style.animationPlayState).not.toBe('paused');
  });

  it('restores on unfreeze', () => {
    document.body.innerHTML = '<div style="animation: spin 1s infinite">test</div>';
    freezePage();
    unfreezePage();
    const el = document.querySelector('div')!;
    expect(el.style.animationPlayState).not.toBe('paused');
  });
});
```

- [ ] **Step 2: Implement freeze.ts**

Per spec Section 5: CSS animations, CSS transitions, WAAPI, JS timers (setTimeout/setInterval/rAF), video/audio. Exclude `[data-agentation]` elements.

- [ ] **Step 3: Run tests, commit**

```bash
pnpm vitest run src/content/__tests__/freeze.test.ts
git add -A && git commit -m "feat: add animation freezing (CSS, WAAPI, timers, media)"
```

---

### Task 25: Implement multi-select and area annotation

**Files:**
- Modify: `src/content/main.ts`
- Modify: `src/content/ui/highlight.ts`

- [ ] **Step 1: Add multi-select support**

In `main.ts`, add:
- `Cmd/Ctrl+Shift+Click` toggles elements in/out of pending multi-select set
- Drag creates bounding box, selects all elements within
- On submit, creates single annotation with `isMultiSelect: true` and `elementBoundingBoxes` array

- [ ] **Step 2: Add area annotation support**

- Toolbar toggle for "area mode"
- Mouse drag draws rectangle on page
- On release, creates annotation for the area region

- [ ] **Step 3: Manual test — multi-select and area annotation**

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add multi-select (Cmd+Shift+Click) and area annotation"
```

---

### Task 26: Implement popup settings page

**Files:**
- Modify: `src/popup/popup.html`
- Modify: `src/popup/popup.ts`

- [ ] **Step 1: Implement popup**

Create popup with settings:
- Output detail level (compact/standard/detailed/forensic)
- React filter mode (all/filtered/smart)
- Block interactions toggle
- Source Map on/off
- Server URL (default http://localhost:4747)
- Theme (auto/light/dark)

All settings stored in `chrome.storage.local`.

- [ ] **Step 2: Manual test — open popup, change settings, verify they persist**

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add popup settings page"
```

---

### Task 27: End-to-end integration test

**Files:**
- Create: `test/e2e/extension.test.ts`
- Create: `test/fixtures/react-app/` (minimal React app)
- Create: `test/fixtures/vue-app/` (minimal Vue app)

- [ ] **Step 1: Set up Playwright with Chrome extension loading**

```bash
pnpm add -D @playwright/test
```

- [ ] **Step 2: Create minimal test fixture apps**

- React app: single component with `_debugSource` in dev mode
- Vue app: single SFC component

- [ ] **Step 3: Write E2E test**

```typescript
// test/e2e/extension.test.ts
import { test, expect, chromium } from '@playwright/test';
import path from 'path';

test('annotate React element and copy markdown', async () => {
  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [`--disable-extensions-except=${path.resolve('dist')}`, `--load-extension=${path.resolve('dist')}`],
  });
  const page = await context.newPage();
  await page.goto('http://localhost:3001'); // React fixture app

  // Click extension badge to activate
  // Click an element
  // Type comment
  // Submit
  // Click copy
  // Verify clipboard contains structured markdown
});
```

- [ ] **Step 4: Run E2E test**

```bash
pnpm build
pnpm playwright test test/e2e/extension.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "test: add E2E integration tests with Playwright"
```

---

## Summary

| Phase | Tasks | What it delivers |
|-------|-------|-----------------|
| 1: Scaffolding & Types | 1-3 | Building project, types, messaging |
| 2: Element Capture | 4-7 | Selector gen, element info, text select, markdown output |
| 3: Content Script UI | 8-12 | Shadow DOM, toolbar, highlights, popup, annotation flow |
| 4: Framework Detection | 13-17 | Detector infra, React, Vue, Svelte, Angular, Solid, Qwik, MAIN world |
| 5: Background Worker | 18 | Service worker, debugger, server bridge |
| 6: Server | 19-23 | SQLite store, HTTP API, MCP tools, CLI |
| 7: Advanced Features | 24-27 | Freeze, multi-select, popup settings, E2E tests |

Each phase produces a buildable, testable increment. Phases 1-3 deliver a working extension (DOM-only, no framework detection). Phase 4 adds framework intelligence. Phases 5-6 add server integration. Phase 7 adds polish.
