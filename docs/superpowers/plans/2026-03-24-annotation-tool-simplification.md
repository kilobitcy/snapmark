# Annotation Tool Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify the Agentation Chrome extension into a pure annotation tool by removing server, debugger, and server-bridge modules.

**Architecture:** In-place simplification — delete entire server/debugger modules, clean up references in retained files (types, messaging, popup, service-worker, tests), update manifest permissions.

**Tech Stack:** TypeScript, Vite + @crxjs/vite-plugin, Vitest, Chrome Extension MV3

---

### Task 1: Delete server and e2e directories

**Files:**
- Delete: `packages/server/` (entire directory)
- Delete: `test/` (entire directory)
- Delete: `pnpm-workspace.yaml`
- Delete: `playwright.config.ts`

- [ ] **Step 1: Delete directories and files**

```bash
rm -rf packages/server test
rm pnpm-workspace.yaml playwright.config.ts
```

- [ ] **Step 2: Remove `@playwright/test` from devDependencies and `test:e2e` script**

In `package.json`, remove:
- `"test:e2e": "playwright test"` from scripts
- `"@playwright/test": "^1.58.2"` from devDependencies

Final `package.json`:
```json
{
  "name": "agentation-ext",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest"
  },
  "packageManager": "pnpm@10.20.0",
  "devDependencies": {
    "@crxjs/vite-plugin": "2.4.0",
    "@types/chrome": "^0.1.38",
    "@vitest/browser": "^2.1.9",
    "jsdom": "^29.0.1",
    "typescript": "^5.9.3",
    "vite": "^5.4.21",
    "vitest": "^2.1.9"
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove server package, e2e tests, and monorepo config"
```

---

### Task 2: Delete background debugger and server-bridge modules

**Files:**
- Delete: `src/background/debugger.ts`
- Delete: `src/background/server-bridge.ts`

- [ ] **Step 1: Delete files**

```bash
rm src/background/debugger.ts src/background/server-bridge.ts
```

- [ ] **Step 2: Rewrite `src/background/service-worker.ts`**

Replace entire file with minimal service worker that only handles `COPY_TO_CLIPBOARD`:

```typescript
// Listen for messages from content script
chrome.runtime.onMessage.addListener((message) => {
  switch (message.type) {
    case 'COPY_TO_CLIPBOARD': {
      // In MV3 service worker, use offscreen document for clipboard
      // For now, the content script handles clipboard directly
      break;
    }
  }
});

console.log('[agentation] service worker loaded');
```

- [ ] **Step 3: Remove `"debugger"` from `src/manifest.json` permissions**

Change line 6 from:
```json
"permissions": ["activeTab", "debugger", "clipboardWrite", "storage", "scripting"],
```
to:
```json
"permissions": ["activeTab", "clipboardWrite", "storage", "scripting"],
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove debugger and server-bridge from background"
```

---

### Task 3: Simplify shared types

**Files:**
- Modify: `src/shared/types.ts`

- [ ] **Step 1: Rewrite `src/shared/types.ts`**

Remove: `AnnotationStatus`, `SessionStatus`, `ThreadMessage`, `Session`, `SessionWithAnnotations` types.
Remove from `Annotation`: `sessionId`, `_syncedTo`, `status`, `thread`, `resolvedAt`, `resolvedBy`, `createdAt`, `updatedAt` fields.

Final file:

```typescript
export type AnnotationIntent = 'fix' | 'change' | 'question' | 'approve';
export type AnnotationSeverity = 'blocking' | 'important' | 'suggestion';

export interface Annotation {
  id: string;
  timestamp: number;
  comment: string;

  // DOM
  elementPath: string;
  selector: string;
  elementTag: string;
  cssClasses: string[];
  attributes: Record<string, string>;
  textContent: string;
  selectedText?: string;

  // Position
  boundingBox: { x: number; y: number; width: number; height: number };
  viewport: { scrollX: number; scrollY: number; width: number; height: number };

  // Framework
  framework?: {
    name: string;
    componentName: string;
    componentPath?: string;
    componentNames?: string[];
    props?: Record<string, unknown>;
    state?: Record<string, unknown>;
  };

  // Source
  source?: {
    file: string;
    line: number;
    column: number;
    functionName?: string;
  };

  // Context
  nearbyText: string[];
  nearbyElements?: Array<{ tag: string; text: string; classes: string[] }>;
  computedStyles: Record<string, string>;
  accessibility?: { role?: string; ariaLabel?: string; focusable: boolean };
  fullPath?: string;

  // Multi-select
  isMultiSelect?: boolean;
  elementBoundingBoxes?: Array<{ x: number; y: number; width: number; height: number }>;
  isFixed?: boolean;

  // Metadata
  url?: string;
  intent?: AnnotationIntent;
  severity?: AnnotationSeverity;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/types.ts
git commit -m "chore: remove server-sync types from shared/types"
```

---

### Task 4: Simplify shared messaging

**Files:**
- Modify: `src/shared/messaging.ts`

- [ ] **Step 1: Rewrite `src/shared/messaging.ts`**

Remove `AnnotationStatus` import. Remove all server/debugger message types from `ExtensionMessage`. Keep only `COPY_TO_CLIPBOARD` and all `MainWorldMessage` types.

Final file:

```typescript
export const AGENTATION_SOURCE = 'agentation' as const;

// === Extension Messages (Content Script <-> Background Service Worker) ===

export type ExtensionMessage =
  | { type: 'COPY_TO_CLIPBOARD'; payload: { text: string } };

// === Main World Messages (MAIN World <-> Content Script via window.postMessage) ===

export type MainWorldMessagePayload =
  | { type: 'AG_FRAMEWORK_DETECT_RESULT'; payload: { frameworks: string[] } }
  | { type: 'AG_COMPONENT_INFO_REQUEST'; payload: { elementSelector: string } }
  | { type: 'AG_COMPONENT_INFO'; payload: { name: string; componentName: string; componentPath?: string } | null }
  | { type: 'AG_SOURCE_INFO'; payload: { file: string; line: number; column: number } | null }
  | { type: 'AG_FREEZE'; payload: { freeze: boolean } }
  | { type: 'AG_PROBE_SOURCE'; payload: { elementSelector: string } }
  | { type: 'AG_PROBE_RESULT'; payload: { file: string; line: number } | null };

export type MainWorldMessage = MainWorldMessagePayload & { source: typeof AGENTATION_SOURCE };

// === Helpers ===

export function createExtensionMessage<T extends ExtensionMessage['type']>(
  type: T,
  payload: Extract<ExtensionMessage, { type: T }>['payload'],
): Extract<ExtensionMessage, { type: T }> {
  return { type, payload } as Extract<ExtensionMessage, { type: T }>;
}

export function createMainWorldMessage<T extends MainWorldMessagePayload['type']>(
  type: T,
  payload: Extract<MainWorldMessagePayload, { type: T }>['payload'],
): MainWorldMessage {
  return { source: AGENTATION_SOURCE, type, payload } as unknown as MainWorldMessage;
}

export function isMainWorldMessage(data: unknown): data is MainWorldMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    'source' in data &&
    (data as any).source === AGENTATION_SOURCE
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/messaging.ts
git commit -m "chore: remove server/debugger message types from messaging"
```

---

### Task 5: Clean up shared tests

**Files:**
- Modify: `src/shared/__tests__/types.test.ts`
- Modify: `src/shared/__tests__/messaging.test.ts`

- [ ] **Step 1: Rewrite `src/shared/__tests__/types.test.ts`**

Remove tests for `Session`, `SessionWithAnnotations`, `ThreadMessage`, `AnnotationStatus`, `SessionStatus`. Remove server-sync fields from optional fields test. Keep tests for `Annotation`, `AnnotationIntent`, `AnnotationSeverity`.

```typescript
import { describe, it, expect } from 'vitest';
import type { Annotation, AnnotationIntent, AnnotationSeverity } from '../types';

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

  it('should accept all AnnotationIntent values', () => {
    const intents: AnnotationIntent[] = ['fix', 'change', 'question', 'approve'];
    expect(intents).toHaveLength(4);
  });

  it('should accept all AnnotationSeverity values', () => {
    const severities: AnnotationSeverity[] = ['blocking', 'important', 'suggestion'];
    expect(severities).toHaveLength(3);
  });

  it('should accept optional Annotation fields', () => {
    const a: Annotation = {
      id: '2', timestamp: Date.now(), comment: 'with extras',
      elementPath: 'div', selector: '#app > div', elementTag: 'div',
      cssClasses: ['container'], attributes: { id: 'main' },
      textContent: 'Hello',
      boundingBox: { x: 0, y: 0, width: 100, height: 100 },
      viewport: { scrollX: 0, scrollY: 0, width: 1920, height: 1080 },
      nearbyText: ['nearby'],
      computedStyles: { color: 'red' },
      selectedText: 'selected',
      framework: { name: 'react', componentName: 'App', componentPath: '<App>', componentNames: ['App'], props: {}, state: {} },
      source: { file: 'src/App.tsx', line: 10, column: 3, functionName: 'render' },
      accessibility: { role: 'button', ariaLabel: 'Click me', focusable: true },
      nearbyElements: [{ tag: 'span', text: 'hello', classes: [] }],
      fullPath: 'html > body > div',
      isMultiSelect: false,
      elementBoundingBoxes: [],
      isFixed: false,
      url: 'http://localhost',
      intent: 'fix',
      severity: 'blocking',
    };
    expect(a.framework?.componentName).toBe('App');
    expect(a.source?.file).toBe('src/App.tsx');
  });
});
```

- [ ] **Step 2: Rewrite `src/shared/__tests__/messaging.test.ts`**

Remove the "should create all extension message types" test (it tested deleted types). Keep all other tests.

```typescript
import { describe, it, expect } from 'vitest';
import {
  createExtensionMessage, createMainWorldMessage, isMainWorldMessage, AGENTATION_SOURCE,
} from '../messaging';

describe('messaging', () => {
  it('should create typed extension messages', () => {
    const msg = createExtensionMessage('COPY_TO_CLIPBOARD', { text: 'hello' });
    expect(msg.type).toBe('COPY_TO_CLIPBOARD');
    expect(msg.payload.text).toBe('hello');
  });

  it('should create main world messages with source tag', () => {
    const msg = createMainWorldMessage('AG_FREEZE', { freeze: true });
    expect(msg.source).toBe(AGENTATION_SOURCE);
    expect(msg.type).toBe('AG_FREEZE');
    expect(msg.payload.freeze).toBe(true);
  });

  it('should identify main world messages by source', () => {
    const data = { source: AGENTATION_SOURCE, type: 'AG_FREEZE', payload: { freeze: true } };
    expect(isMainWorldMessage(data)).toBe(true);
  });

  it('should reject non-agentation messages', () => {
    expect(isMainWorldMessage({ type: 'AG_FREEZE' })).toBe(false);
    expect(isMainWorldMessage({ source: 'other', type: 'AG_FREEZE' })).toBe(false);
    expect(isMainWorldMessage(null)).toBe(false);
    expect(isMainWorldMessage(undefined)).toBe(false);
    expect(isMainWorldMessage('string')).toBe(false);
  });

  it('should create all main world message types', () => {
    const m1 = createMainWorldMessage('AG_FRAMEWORK_DETECT_RESULT', { frameworks: ['react'] });
    expect(m1.payload.frameworks).toContain('react');

    const m2 = createMainWorldMessage('AG_COMPONENT_INFO_REQUEST', { elementSelector: '#app' });
    expect(m2.payload.elementSelector).toBe('#app');

    const m3 = createMainWorldMessage('AG_PROBE_SOURCE', { elementSelector: '.btn' });
    expect(m3.type).toBe('AG_PROBE_SOURCE');
  });
});
```

- [ ] **Step 3: Run tests to verify**

```bash
cd /data/bak20250527/agentation && npx vitest run src/shared/__tests__/
```

Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/shared/__tests__/
git commit -m "chore: update shared tests for simplified types and messaging"
```

---

### Task 6: Clean up popup UI

**Files:**
- Modify: `src/popup/popup.ts`
- Modify: `src/popup/popup.html`

- [ ] **Step 1: Rewrite `src/popup/popup.ts`**

Remove `sourceMap`, `serverUrl` from Settings. Remove `checkServer()`. Remove server status check from `init()`.

```typescript
interface Settings {
  outputLevel: 'compact' | 'standard' | 'detailed' | 'forensic';
  reactFilter: 'all' | 'filtered' | 'smart';
  theme: 'auto' | 'light' | 'dark';
  blockInteractions: boolean;
}

const DEFAULTS: Settings = {
  outputLevel: 'standard',
  reactFilter: 'filtered',
  theme: 'auto',
  blockInteractions: true,
};

async function loadSettings(): Promise<Settings> {
  try {
    const result = await chrome.storage.local.get('agentation-settings');
    return { ...DEFAULTS, ...result['agentation-settings'] };
  } catch {
    return DEFAULTS;
  }
}

async function saveSettings(settings: Settings): Promise<void> {
  try {
    await chrome.storage.local.set({ 'agentation-settings': settings });
  } catch {
    // Fallback for non-extension context
  }
}

async function init() {
  const settings = await loadSettings();

  // Populate form
  (document.getElementById('outputLevel') as HTMLSelectElement).value = settings.outputLevel;
  (document.getElementById('reactFilter') as HTMLSelectElement).value = settings.reactFilter;
  (document.getElementById('theme') as HTMLSelectElement).value = settings.theme;
  (document.getElementById('blockInteractions') as HTMLInputElement).checked = settings.blockInteractions;

  // Auto-save on change
  const elements = ['outputLevel', 'reactFilter', 'theme', 'blockInteractions'];
  for (const id of elements) {
    const el = document.getElementById(id)!;
    el.addEventListener('change', async () => {
      const current = await loadSettings();
      if (el instanceof HTMLSelectElement || el instanceof HTMLInputElement) {
        if (el.type === 'checkbox') {
          (current as any)[id] = (el as HTMLInputElement).checked;
        } else {
          (current as any)[id] = el.value;
        }
      }
      await saveSettings(current);
    });
  }
}

init();
```

- [ ] **Step 2: Rewrite `src/popup/popup.html`**

Remove Source Map toggle, Server URL input, and server status indicator.

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Agentation Settings</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { width: 320px; font-family: system-ui, sans-serif; padding: 16px; background: #fff; color: #1a1a1a; }
    h1 { font-size: 16px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
    h1 span { color: #3b82f6; }
    .setting { margin-bottom: 12px; }
    .setting label { display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
    .setting select, .setting input[type="text"] {
      width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 6px;
      font-size: 13px; background: #fafafa;
    }
    .setting select:focus, .setting input:focus { outline: none; border-color: #3b82f6; }
    .toggle { display: flex; align-items: center; justify-content: space-between; }
    .toggle input[type="checkbox"] { width: 18px; height: 18px; accent-color: #3b82f6; }
    .version { margin-top: 12px; text-align: center; font-size: 11px; color: #ccc; }
  </style>
</head>
<body>
  <h1><span>A</span> Agentation</h1>

  <div class="setting">
    <label>Output Detail Level</label>
    <select id="outputLevel">
      <option value="compact">Compact</option>
      <option value="standard" selected>Standard</option>
      <option value="detailed">Detailed</option>
      <option value="forensic">Forensic</option>
    </select>
  </div>

  <div class="setting">
    <label>React Filter Mode</label>
    <select id="reactFilter">
      <option value="all">All</option>
      <option value="filtered" selected>Filtered</option>
      <option value="smart">Smart</option>
    </select>
  </div>

  <div class="setting">
    <label>Theme</label>
    <select id="theme">
      <option value="auto" selected>Auto (follow system)</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </div>

  <div class="setting toggle">
    <label>Block Page Interactions</label>
    <input type="checkbox" id="blockInteractions" checked>
  </div>

  <div class="version">v0.1.0</div>

  <script src="popup.ts"></script>
</body>
</html>
```

- [ ] **Step 3: Commit**

```bash
git add src/popup/
git commit -m "chore: remove server/sourcemap settings from popup"
```

---

### Task 7: Run full test suite and build

- [ ] **Step 1: Run all unit tests**

```bash
cd /data/bak20250527/agentation && npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 2: Run build**

```bash
cd /data/bak20250527/agentation && npx vite build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Verify dist output**

```bash
ls dist/
```

Expected: `manifest.json`, `popup/`, `assets/`, `service-worker-loader.js` — no server-related files.

- [ ] **Step 4: Final commit if any fixups were needed**

```bash
git add -A
git commit -m "chore: complete annotation tool simplification"
```
