# Lazy Activation & i18n Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the toolbar appear only on demand (per-domain persistent state) and add full Chinese/English i18n across popup, toolbar, and annotation popup.

**Architecture:** A custom i18n module (`t()` function + dictionaries) provides runtime language switching. Domain activation state is stored in `chrome.storage.local` keyed by hostname. Content script lazy-initializes UI on first activation, then hides/shows Shadow DOM host on subsequent toggles. Background service worker acts as message hub between popup and content script.

**Tech Stack:** TypeScript, Vite + @crxjs/vite-plugin, Chrome Extension MV3, Vitest (jsdom)

**Spec:** `docs/superpowers/specs/2026-03-26-lazy-activation-i18n-design.md`

---

## File Structure

| File | Role |
|------|------|
| `src/shared/i18n.ts` | **New** — i18n module: dictionaries, `t()`, `initLocale()`, `setLocale()`, `getLocale()` |
| `src/shared/__tests__/i18n.test.ts` | **New** — i18n unit tests |
| `src/shared/messaging.ts` | **Modify** — add `GET_DOMAIN_STATE`, `SET_DOMAIN_STATE`, `DOMAIN_STATE` to `ExtensionMessage` |
| `src/shared/__tests__/messaging.test.ts` | **Modify** — add tests for new message types |
| `src/content/ui/host.ts` | **Modify** — add `hideAgentationHost()`, `showAgentationHost()` |
| `src/content/ui/__tests__/host.test.ts` | **Modify** — add tests for hide/show |
| `src/background/service-worker.ts` | **Modify** — domain state storage + message routing |
| `src/content/main.ts` | **Modify** — lazy init, `isActivated` guard, activation/deactivation lifecycle |
| `src/content/ui/toolbar.ts` | **Modify** — tooltip text via `t()` |
| `src/content/ui/__tests__/toolbar.test.ts` | **Modify** — test i18n tooltips |
| `src/content/ui/annotation-popup.ts` | **Modify** — form labels/buttons via `t()` |
| `src/content/ui/__tests__/annotation-popup.test.ts` | **Modify** — test i18n labels |
| `src/popup/popup.html` | **Modify** — redesign with toggle switch, language button |
| `src/popup/popup.ts` | **Modify** — toggle logic, language switching, i18n rendering |

---

## Task 1: i18n Module

**Files:**
- Create: `src/shared/i18n.ts`
- Create: `src/shared/__tests__/i18n.test.ts`

- [ ] **Step 1: Write failing tests for i18n module**

Create `src/shared/__tests__/i18n.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock chrome.storage.local
const mockStorage: Record<string, any> = {};
(globalThis as any).chrome = {
  storage: {
    local: {
      get: vi.fn((key: string) => Promise.resolve({ [key]: mockStorage[key] })),
      set: vi.fn((obj: Record<string, any>) => {
        Object.assign(mockStorage, obj);
        return Promise.resolve();
      }),
    },
  },
};

import { t, getLocale, setLocale, initLocale, _resetLocale } from '../i18n';

describe('i18n', () => {
  beforeEach(() => {
    for (const k of Object.keys(mockStorage)) delete mockStorage[k];
    _resetLocale(); // Reset to 'en' between tests
  });

  it('defaults to en', () => {
    expect(getLocale()).toBe('en');
  });

  it('t() returns English text by default', () => {
    expect(t('toolbar.toggleMarkers')).toBe('Toggle markers');
  });

  it('t() returns Chinese text after setLocale("zh")', async () => {
    await setLocale('zh');
    expect(getLocale()).toBe('zh');
    expect(t('toolbar.toggleMarkers')).toBe('切换标记');
  });

  it('t() returns key if translation missing', () => {
    expect(t('nonexistent.key')).toBe('nonexistent.key');
  });

  it('initLocale() picks zh from navigator.language', async () => {
    Object.defineProperty(navigator, 'language', { value: 'zh-CN', configurable: true });
    await initLocale();
    expect(getLocale()).toBe('zh');
  });

  it('initLocale() picks stored locale over navigator', async () => {
    mockStorage['agentation-locale'] = 'en';
    Object.defineProperty(navigator, 'language', { value: 'zh-CN', configurable: true });
    await initLocale();
    expect(getLocale()).toBe('en');
  });

  it('setLocale() persists to chrome.storage', async () => {
    await setLocale('zh');
    expect(chrome.storage.local.set).toHaveBeenCalledWith({ 'agentation-locale': 'zh' });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test src/shared/__tests__/i18n.test.ts`
Expected: FAIL — module `../i18n` does not exist

- [ ] **Step 3: Implement i18n module**

Create `src/shared/i18n.ts`:

```typescript
export type Locale = 'en' | 'zh';

const STORAGE_KEY = 'agentation-locale';

let currentLocale: Locale = 'en';

const dictionaries: Record<Locale, Record<string, string>> = {
  en: {
    // Toolbar
    'toolbar.toggleMarkers': 'Toggle markers',
    'toolbar.freeze': 'Freeze/unfreeze',
    'toolbar.areaMode': 'Area select mode',
    'toolbar.settings': 'Settings',
    'toolbar.copy': 'Copy annotations',
    'toolbar.send': 'Send',
    'toolbar.clear': 'Clear annotations',
    'toolbar.title': 'SnapMark',
    // Annotation popup
    'popup.comment': 'Add your comment...',
    'popup.cancel': 'Cancel',
    'popup.submit': 'Submit',
    'popup.fix': 'Fix',
    'popup.change': 'Change',
    'popup.question': 'Question',
    'popup.approve': 'Approve',
    'popup.suggestion': 'Suggestion',
    'popup.important': 'Important',
    'popup.blocking': 'Blocking',
    // Extension popup
    'ext.title': 'SnapMark',
    'ext.activate': 'Activate on this site',
    'ext.outputLevel': 'Output Detail Level',
    'ext.outputCompact': 'Compact',
    'ext.outputStandard': 'Standard',
    'ext.outputDetailed': 'Detailed',
    'ext.outputForensic': 'Forensic',
    'ext.reactFilter': 'React Filter Mode',
    'ext.reactAll': 'All',
    'ext.reactFiltered': 'Filtered',
    'ext.reactSmart': 'Smart',
    'ext.theme': 'Theme',
    'ext.themeAuto': 'Auto (follow system)',
    'ext.themeLight': 'Light',
    'ext.themeDark': 'Dark',
    'ext.blockInteractions': 'Block Page Interactions',
  },
  zh: {
    // Toolbar
    'toolbar.toggleMarkers': '切换标记',
    'toolbar.freeze': '冻结/解冻',
    'toolbar.areaMode': '区域选择模式',
    'toolbar.settings': '设置',
    'toolbar.copy': '复制标注',
    'toolbar.send': '发送',
    'toolbar.clear': '清除标注',
    'toolbar.title': 'SnapMark',
    // Annotation popup
    'popup.comment': '添加评论...',
    'popup.cancel': '取消',
    'popup.submit': '提交',
    'popup.fix': '修复',
    'popup.change': '变更',
    'popup.question': '疑问',
    'popup.approve': '通过',
    'popup.suggestion': '建议',
    'popup.important': '重要',
    'popup.blocking': '阻塞',
    // Extension popup
    'ext.title': 'SnapMark',
    'ext.activate': '在此站点激活',
    'ext.outputLevel': '输出详细等级',
    'ext.outputCompact': '紧凑',
    'ext.outputStandard': '标准',
    'ext.outputDetailed': '详细',
    'ext.outputForensic': '取证',
    'ext.reactFilter': 'React 过滤模式',
    'ext.reactAll': '全部',
    'ext.reactFiltered': '过滤',
    'ext.reactSmart': '智能',
    'ext.theme': '主题',
    'ext.themeAuto': '自动（跟随系统）',
    'ext.themeLight': '浅色',
    'ext.themeDark': '深色',
    'ext.blockInteractions': '阻止页面交互',
  },
};

export function getLocale(): Locale {
  return currentLocale;
}

export async function setLocale(lang: Locale): Promise<void> {
  currentLocale = lang;
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: lang });
  } catch {
    // Non-extension context
  }
}

export function t(key: string): string {
  return dictionaries[currentLocale][key] ?? key;
}

/** Reset locale to default — for testing only */
export function _resetLocale(): void {
  currentLocale = 'en';
}

export async function initLocale(): Promise<void> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const stored = result[STORAGE_KEY];
    if (stored === 'en' || stored === 'zh') {
      currentLocale = stored;
      return;
    }
  } catch {
    // Non-extension context
  }
  // Detect from browser language
  const lang = navigator.language ?? '';
  currentLocale = lang.startsWith('zh') ? 'zh' : 'en';
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test src/shared/__tests__/i18n.test.ts`
Expected: all 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/i18n.ts src/shared/__tests__/i18n.test.ts
git commit -m "feat: add i18n module with en/zh dictionaries"
```

---

## Task 2: Messaging Types

**Files:**
- Modify: `src/shared/messaging.ts`
- Modify: `src/shared/__tests__/messaging.test.ts`

- [ ] **Step 1: Write failing test for new message types**

Add to `src/shared/__tests__/messaging.test.ts`:

```typescript
it('createExtensionMessage creates GET_DOMAIN_STATE', () => {
  const msg = createExtensionMessage('GET_DOMAIN_STATE', { hostname: 'example.com' });
  expect(msg).toEqual({ type: 'GET_DOMAIN_STATE', payload: { hostname: 'example.com' } });
});

it('createExtensionMessage creates SET_DOMAIN_STATE', () => {
  const msg = createExtensionMessage('SET_DOMAIN_STATE', { hostname: 'example.com', active: true });
  expect(msg).toEqual({ type: 'SET_DOMAIN_STATE', payload: { hostname: 'example.com', active: true } });
});

it('createExtensionMessage creates DOMAIN_STATE', () => {
  const msg = createExtensionMessage('DOMAIN_STATE', { active: false });
  expect(msg).toEqual({ type: 'DOMAIN_STATE', payload: { active: false } });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/shared/__tests__/messaging.test.ts`
Expected: FAIL — type errors for unknown message types

- [ ] **Step 3: Add new message types to ExtensionMessage union**

In `src/shared/messaging.ts`, modify the `ExtensionMessage` type:

```typescript
export type ExtensionMessage =
  | { type: 'COPY_TO_CLIPBOARD'; payload: { text: string } }
  | { type: 'GET_DOMAIN_STATE'; payload?: { hostname: string } }
  | { type: 'SET_DOMAIN_STATE'; payload: { hostname: string; active: boolean } | { active: boolean } }
  | { type: 'DOMAIN_STATE'; payload: { active: boolean } };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test src/shared/__tests__/messaging.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/messaging.ts src/shared/__tests__/messaging.test.ts
git commit -m "feat: add domain state message types to ExtensionMessage"
```

---

## Task 3: Shadow DOM Host Hide/Show

**Files:**
- Modify: `src/content/ui/host.ts`
- Modify: `src/content/ui/__tests__/host.test.ts`

- [ ] **Step 1: Write failing tests for hide/show**

Add to `src/content/ui/__tests__/host.test.ts`:

```typescript
import { hideAgentationHost, showAgentationHost } from '../host';

describe('hideAgentationHost / showAgentationHost', () => {
  it('hides the host element', () => {
    createAgentationHost();
    hideAgentationHost();
    const host = document.querySelector('agentation-root') as HTMLElement;
    expect(host.style.display).toBe('none');
  });

  it('shows the host element', () => {
    createAgentationHost();
    hideAgentationHost();
    showAgentationHost();
    const host = document.querySelector('agentation-root') as HTMLElement;
    expect(host.style.display).toBe('');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test src/content/ui/__tests__/host.test.ts`
Expected: FAIL — `hideAgentationHost` is not exported

- [ ] **Step 3: Implement hide/show helpers**

Add to `src/content/ui/host.ts` before the closing of the file:

```typescript
export function hideAgentationHost(): void {
  const host = document.querySelector('agentation-root') as HTMLElement | null;
  if (host) host.style.display = 'none';
}

export function showAgentationHost(): void {
  const host = document.querySelector('agentation-root') as HTMLElement | null;
  if (host) host.style.display = '';
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test src/content/ui/__tests__/host.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/content/ui/host.ts src/content/ui/__tests__/host.test.ts
git commit -m "feat: add hideAgentationHost/showAgentationHost helpers"
```

---

## Task 4: Background Service Worker — Domain State

**Files:**
- Modify: `src/background/service-worker.ts`

- [ ] **Step 1: Implement domain state storage and message routing**

Replace `src/background/service-worker.ts` with:

```typescript
const DOMAIN_STATES_KEY = 'agentation-domain-states';

async function getDomainStates(): Promise<Record<string, boolean>> {
  try {
    const result = await chrome.storage.local.get(DOMAIN_STATES_KEY);
    return result[DOMAIN_STATES_KEY] ?? {};
  } catch {
    return {};
  }
}

async function setDomainState(hostname: string, active: boolean): Promise<void> {
  const states = await getDomainStates();
  states[hostname] = active;
  try {
    await chrome.storage.local.set({ [DOMAIN_STATES_KEY]: states });
  } catch {
    // Fallback
  }
}

async function getActiveTabHostname(): Promise<{ tabId: number; hostname: string } | null> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab.url) return null;
    const hostname = new URL(tab.url).hostname;
    return { tabId: tab.id, hostname };
  } catch {
    return null;
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'COPY_TO_CLIPBOARD': {
      break;
    }
    case 'OPEN_SETTINGS': {
      chrome.action.openPopup().catch(() => {
        chrome.tabs.create({ url: chrome.runtime.getURL('popup/popup.html') });
      });
      break;
    }
    case 'GET_DOMAIN_STATE': {
      // From content script (has hostname) or popup (no hostname, infer from active tab)
      if (message.payload?.hostname) {
        getDomainStates().then(states => {
          sendResponse({ type: 'DOMAIN_STATE', payload: { active: !!states[message.payload.hostname] } });
        });
        return true; // async sendResponse
      }
      // From popup — infer hostname from active tab
      getActiveTabHostname().then(async (info) => {
        if (!info) { sendResponse({ type: 'DOMAIN_STATE', payload: { active: false } }); return; }
        const states = await getDomainStates();
        sendResponse({ type: 'DOMAIN_STATE', payload: { active: !!states[info.hostname] } });
      });
      return true;
    }
    case 'SET_DOMAIN_STATE': {
      // From content script (has hostname) or popup (no hostname, infer)
      if (message.payload?.hostname) {
        setDomainState(message.payload.hostname, message.payload.active).then(() => sendResponse({ ok: true }));
        return true;
      }
      // From popup — infer hostname, then forward to content script
      getActiveTabHostname().then(async (info) => {
        if (!info) { sendResponse({ ok: false }); return; }
        await setDomainState(info.hostname, message.payload.active);
        // Forward to content script on the active tab
        chrome.tabs.sendMessage(info.tabId, {
          type: 'DOMAIN_STATE',
          payload: { active: message.payload.active },
        }).catch(() => {});
        sendResponse({ ok: true });
      });
      return true;
    }
  }
});

console.log('[agentation] service worker loaded');
```

- [ ] **Step 2: Verify build succeeds**

Run: `pnpm build`
Expected: Build completes without errors

- [ ] **Step 3: Commit**

```bash
git add src/background/service-worker.ts
git commit -m "feat: add domain state storage and message routing to service worker"
```

---

## Task 5: Content Script Lazy Initialization

**Files:**
- Modify: `src/content/main.ts`

- [ ] **Step 1: Refactor main.ts for lazy initialization**

First, update the imports at the top of `src/content/main.ts`. Add these new imports:

```typescript
import { hideAgentationHost, showAgentationHost } from './ui/host';
import { initLocale } from '../shared/i18n';
```

Keep all existing imports (including `createAgentationHost`, `Toolbar`, `HighlightManager`, `AnnotationPopup`, etc.). The existing `OPEN_SETTINGS` handler in toolbar events must also be preserved.

Then replace the initialization section (lines 57-129) and keyboard shortcut (lines 476-487) of `src/content/main.ts`. The key changes:

1. Add `isActivated` flag and `instancesCreated` flag at the top
2. Wrap UI creation in an `activate()` function
3. Add `deactivate()` function
4. Guard all event handlers with `isActivated`
5. Replace keyboard shortcut to toggle domain-level activation
6. On load: query background for domain state, activate if needed

```typescript
// === Activation State ===
let isActivated = false;
let instancesCreated = false;

// These are initialized lazily on first activation
let shadow: ShadowRoot;
let store: AnnotationStore;
let toolbar: Toolbar;
let highlights: HighlightManager;
let popup: AnnotationPopup;
let pendingElement: Element | null = null;
let outputLevel: OutputLevel = 'standard';

// Multi-select and area state remain as-is but are only used when isActivated

function activate() {
  if (isActivated) return;
  isActivated = true;

  if (!instancesCreated) {
    shadow = createAgentationHost();
    store = new AnnotationStore(window.location.pathname);
    toolbar = new Toolbar(shadow.getElementById('agentation-toolbar')!);
    highlights = new HighlightManager(
      shadow.getElementById('agentation-highlights')!,
      shadow.getElementById('agentation-markers')!,
    );
    popup = new AnnotationPopup(shadow.getElementById('agentation-popups')!);
    bindToolbarEvents();
    bindPopupEvents();
    instancesCreated = true;
  } else {
    showAgentationHost();
  }

  toolbar.activate();
  refreshMarkers();
}

function deactivate() {
  if (!isActivated) return;
  isActivated = false;

  if (instancesCreated) {
    toolbar.deactivate();
    popup.hide();
    highlights.clearHoverHighlight();
    hideAgentationHost();
    document.body.style.cursor = '';
    clearMultiSelectHighlights();
    pendingMultiSelectElements = [];
    areaMode = false;
    areaDragging = false;
    if (areaOverlay) { areaOverlay.remove(); areaOverlay = null; }
    pendingAreaBoundingBox = null;
  }

  // NOTE: deactivate() does NOT send SET_DOMAIN_STATE to background.
  // Callers (toggleActivation, keyboard shortcut) are responsible for notifying background.
  // This avoids feedback loops when deactivate() is triggered by an incoming DOMAIN_STATE message.
}

function toggleActivation() {
  if (isActivated) {
    deactivate();
    // Notify background (deactivate() does NOT send this to avoid feedback loops)
    const hostname = window.location.hostname;
    chrome.runtime.sendMessage({ type: 'SET_DOMAIN_STATE', payload: { hostname, active: false } });
  } else {
    activate();
    // Notify background
    const hostname = window.location.hostname;
    chrome.runtime.sendMessage({ type: 'SET_DOMAIN_STATE', payload: { hostname, active: true } });
  }
}
```

The existing event handlers on `document.body` need their guard updated from `if (!toolbar.isActive) return;` to `if (!isActivated) return;` at the top (before checking `toolbar.isActive`).

The keyboard shortcut handler becomes:

```typescript
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'F') {
    e.preventDefault();
    toggleActivation();
  }
});
```

Add message listener for background commands:

```typescript
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'DOMAIN_STATE') {
    if (message.payload.active && !isActivated) {
      activate();
    } else if (!message.payload.active && isActivated) {
      deactivate();
    }
  }
});
```

Startup: query domain state:

```typescript
// Initialize i18n and query domain state
initLocale().then(() => {
  const hostname = window.location.hostname;
  chrome.runtime.sendMessage(
    { type: 'GET_DOMAIN_STATE', payload: { hostname } },
    (response) => {
      if (response?.payload?.active) {
        activate();
      }
    },
  );
});
```

- [ ] **Step 2: Verify build succeeds**

Run: `pnpm build`
Expected: Build completes without errors

- [ ] **Step 3: Commit**

```bash
git add src/content/main.ts
git commit -m "feat: lazy initialization — toolbar hidden by default, per-domain activation"
```

---

## Task 6: Toolbar i18n

**Files:**
- Modify: `src/content/ui/toolbar.ts`
- Modify: `src/content/ui/__tests__/toolbar.test.ts`

- [ ] **Step 1: Write failing test for i18n tooltips**

Add to `src/content/ui/__tests__/toolbar.test.ts`:

```typescript
import { setLocale, _resetLocale } from '../../../shared/i18n';

// Ensure chrome.storage mock exists (needed by setLocale)
if (!(globalThis as any).chrome) {
  (globalThis as any).chrome = { storage: { local: { get: vi.fn(() => Promise.resolve({})), set: vi.fn(() => Promise.resolve()) } } };
}

afterEach(() => _resetLocale());

it('renders Chinese tooltips after setLocale("zh")', async () => {
  await setLocale('zh');
  const container = document.createElement('div');
  const tb = new Toolbar(container);
  tb.activate();
  const btn = container.querySelector('[data-action="markersToggle"]') as HTMLElement;
  expect(btn.title).toBe('切换标记');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/content/ui/__tests__/toolbar.test.ts`
Expected: FAIL — title is still English

- [ ] **Step 3: Update toolbar to use t()**

In `src/content/ui/toolbar.ts`:

1. Import `t` from `../../shared/i18n`
2. Replace the `BUTTON_DEFS` title strings with `t()` calls. Since `BUTTON_DEFS` is a constant, change to a function:

```typescript
import { t } from '../../shared/i18n';

// Replace the const BUTTON_DEFS with a function:
function getButtonDefs(): Array<{ action: ToolbarEvent; label: string; title: string }> {
  return [
    { action: 'markersToggle', label: '⦿', title: t('toolbar.toggleMarkers') },
    { action: 'freeze',        label: '⏸', title: t('toolbar.freeze') },
    { action: 'areaMode',      label: '▢', title: t('toolbar.areaMode') },
    { action: 'settings',      label: '⚙', title: t('toolbar.settings') },
    { action: 'copy',          label: '📋', title: t('toolbar.copy') },
    { action: 'send',          label: '➤', title: t('toolbar.send') },
    { action: 'clear',         label: '🗑', title: t('toolbar.clear') },
  ];
}
```

3. In `buildPanel()`, replace `BUTTON_DEFS` with `getButtonDefs()`
4. In `buildPanel()` header, replace `'Agentation'` with `t('toolbar.title')`
5. In `buildBadge()`, replace `badge.title = 'Agentation'` with `badge.title = t('toolbar.title')`

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test src/content/ui/__tests__/toolbar.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/content/ui/toolbar.ts src/content/ui/__tests__/toolbar.test.ts
git commit -m "feat: toolbar tooltips use i18n t() for en/zh support"
```

---

## Task 7: Annotation Popup i18n

**Files:**
- Modify: `src/content/ui/annotation-popup.ts`
- Modify: `src/content/ui/__tests__/annotation-popup.test.ts`

- [ ] **Step 1: Write failing test for i18n labels**

Add to `src/content/ui/__tests__/annotation-popup.test.ts`:

```typescript
import { setLocale, _resetLocale } from '../../../shared/i18n';

// Ensure chrome.storage mock exists (needed by setLocale)
if (!(globalThis as any).chrome) {
  (globalThis as any).chrome = { storage: { local: { get: vi.fn(() => Promise.resolve({})), set: vi.fn(() => Promise.resolve()) } } };
}

afterEach(() => _resetLocale());

it('renders Chinese labels after setLocale("zh")', async () => {
  await setLocale('zh');
  const container = document.createElement('div');
  const ap = new AnnotationPopup(container);
  ap.show({ x: 100, y: 100 }, 'test-el');
  const submitBtn = container.querySelector('.ag-popup-submit') as HTMLElement;
  expect(submitBtn.textContent).toBe('提交');
  const cancelBtn = container.querySelector('.ag-popup-cancel') as HTMLElement;
  expect(cancelBtn.textContent).toBe('取消');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/content/ui/__tests__/annotation-popup.test.ts`
Expected: FAIL — button text is still English

- [ ] **Step 3: Update annotation-popup.ts to use t()**

In `src/content/ui/annotation-popup.ts`:

1. Import `t` from `../../shared/i18n`
2. In the `show()` method, replace hardcoded strings in the innerHTML template:
   - `placeholder="Add your comment..."` → `placeholder="${t('popup.comment')}"`
   - `>Fix</option>` → `>${t('popup.fix')}</option>` (and all other option texts)
   - `>Cancel</button>` → `>${t('popup.cancel')}</button>`
   - `>Submit</button>` → `>${t('popup.submit')}</button>`

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test src/content/ui/__tests__/annotation-popup.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/content/ui/annotation-popup.ts src/content/ui/__tests__/annotation-popup.test.ts
git commit -m "feat: annotation popup labels use i18n t() for en/zh support"
```

---

## Task 8: Popup Redesign

**Files:**
- Modify: `src/popup/popup.html`
- Modify: `src/popup/popup.ts`

- [ ] **Step 1: Redesign popup.html**

Replace `src/popup/popup.html` with the new layout including:
- Language toggle button (EN / 中) at top-right of header
- Activation toggle switch with domain label
- All text rendered via `data-i18n` attributes (populated by JS)
- Settings section with existing controls
- Version footer

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>SnapMark</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { width: 320px; font-family: system-ui, sans-serif; padding: 16px; background: #fff; color: #1a1a1a; }
    .header { display: flex; align-items: center; margin-bottom: 14px; }
    .header h1 { font-size: 16px; flex: 1; display: flex; align-items: center; gap: 6px; }
    .header h1 span { color: #3b82f6; }
    .lang-btn { background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 4px; padding: 2px 8px; font-size: 12px; cursor: pointer; color: #475569; }
    .lang-btn:hover { background: #e2e8f0; }
    .activation { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 14px; }
    .activation-label { font-size: 13px; font-weight: 600; }
    .activation-domain { font-size: 11px; color: #94a3b8; margin-top: 2px; }
    .toggle-switch { position: relative; width: 44px; height: 24px; }
    .toggle-switch input { opacity: 0; width: 0; height: 0; }
    .toggle-slider { position: absolute; cursor: pointer; inset: 0; background: #cbd5e1; border-radius: 24px; transition: 0.2s; }
    .toggle-slider::before { content: ''; position: absolute; width: 18px; height: 18px; left: 3px; bottom: 3px; background: #fff; border-radius: 50%; transition: 0.2s; }
    .toggle-switch input:checked + .toggle-slider { background: #3b82f6; }
    .toggle-switch input:checked + .toggle-slider::before { transform: translateX(20px); }
    .divider { height: 1px; background: #f1f5f9; margin: 14px 0; }
    .setting { margin-bottom: 12px; }
    .setting label { display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; }
    .setting select { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; background: #fafafa; }
    .setting select:focus { outline: none; border-color: #3b82f6; }
    .toggle-row { display: flex; align-items: center; justify-content: space-between; }
    .toggle-row input[type="checkbox"] { width: 18px; height: 18px; accent-color: #3b82f6; }
    .version { margin-top: 12px; text-align: center; font-size: 11px; color: #ccc; }
  </style>
</head>
<body>
  <div class="header">
    <h1><span>A</span> <span id="title">SnapMark</span></h1>
    <button class="lang-btn" id="langToggle">EN</button>
  </div>

  <div class="activation">
    <div>
      <div class="activation-label" id="activateLabel">Activate on this site</div>
      <div class="activation-domain" id="domainLabel"></div>
    </div>
    <label class="toggle-switch">
      <input type="checkbox" id="activateToggle">
      <span class="toggle-slider"></span>
    </label>
  </div>

  <div class="divider"></div>

  <div class="setting">
    <label id="outputLevelLabel">Output Detail Level</label>
    <select id="outputLevel">
      <option value="compact" id="optCompact">Compact</option>
      <option value="standard" selected id="optStandard">Standard</option>
      <option value="detailed" id="optDetailed">Detailed</option>
      <option value="forensic" id="optForensic">Forensic</option>
    </select>
  </div>

  <div class="setting">
    <label id="reactFilterLabel">React Filter Mode</label>
    <select id="reactFilter">
      <option value="all" id="optReactAll">All</option>
      <option value="filtered" selected id="optReactFiltered">Filtered</option>
      <option value="smart" id="optReactSmart">Smart</option>
    </select>
  </div>

  <div class="setting">
    <label id="themeLabel">Theme</label>
    <select id="theme">
      <option value="auto" selected id="optThemeAuto">Auto (follow system)</option>
      <option value="light" id="optThemeLight">Light</option>
      <option value="dark" id="optThemeDark">Dark</option>
    </select>
  </div>

  <div class="setting toggle-row">
    <label id="blockLabel">Block Page Interactions</label>
    <input type="checkbox" id="blockInteractions" checked>
  </div>

  <div class="version">v0.1.7</div>

  <script type="module" src="popup.ts"></script>
</body>
</html>
```

- [ ] **Step 2: Rewrite popup.ts with toggle + i18n**

Replace `src/popup/popup.ts`:

```typescript
import { t, getLocale, setLocale, initLocale, type Locale } from '../shared/i18n';

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
  } catch {}
}

function renderI18n(): void {
  const $ = (id: string) => document.getElementById(id);
  $('activateLabel')!.textContent = t('ext.activate');
  $('outputLevelLabel')!.textContent = t('ext.outputLevel');
  $('optCompact')!.textContent = t('ext.outputCompact');
  $('optStandard')!.textContent = t('ext.outputStandard');
  $('optDetailed')!.textContent = t('ext.outputDetailed');
  $('optForensic')!.textContent = t('ext.outputForensic');
  $('reactFilterLabel')!.textContent = t('ext.reactFilter');
  $('optReactAll')!.textContent = t('ext.reactAll');
  $('optReactFiltered')!.textContent = t('ext.reactFiltered');
  $('optReactSmart')!.textContent = t('ext.reactSmart');
  $('themeLabel')!.textContent = t('ext.theme');
  $('optThemeAuto')!.textContent = t('ext.themeAuto');
  $('optThemeLight')!.textContent = t('ext.themeLight');
  $('optThemeDark')!.textContent = t('ext.themeDark');
  $('blockLabel')!.textContent = t('ext.blockInteractions');
  $('langToggle')!.textContent = getLocale() === 'en' ? 'EN' : '中';
}

async function init() {
  await initLocale();

  const settings = await loadSettings();

  // Populate form
  (document.getElementById('outputLevel') as HTMLSelectElement).value = settings.outputLevel;
  (document.getElementById('reactFilter') as HTMLSelectElement).value = settings.reactFilter;
  (document.getElementById('theme') as HTMLSelectElement).value = settings.theme;
  (document.getElementById('blockInteractions') as HTMLInputElement).checked = settings.blockInteractions;

  // Render i18n text
  renderI18n();

  // Query domain state for current tab
  chrome.runtime.sendMessage({ type: 'GET_DOMAIN_STATE' }, (response) => {
    if (response?.payload) {
      (document.getElementById('activateToggle') as HTMLInputElement).checked = response.payload.active;
    }
  });

  // Show current domain
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (tab?.url) {
      try {
        const hostname = new URL(tab.url).hostname;
        document.getElementById('domainLabel')!.textContent = hostname;
      } catch {}
    }
  });

  // Activation toggle
  document.getElementById('activateToggle')!.addEventListener('change', (e) => {
    const active = (e.target as HTMLInputElement).checked;
    chrome.runtime.sendMessage({ type: 'SET_DOMAIN_STATE', payload: { active } });
  });

  // Language toggle
  document.getElementById('langToggle')!.addEventListener('click', async () => {
    const newLang: Locale = getLocale() === 'en' ? 'zh' : 'en';
    await setLocale(newLang);
    renderI18n();
  });

  // Auto-save settings on change
  for (const id of ['outputLevel', 'reactFilter', 'theme', 'blockInteractions']) {
    document.getElementById(id)!.addEventListener('change', async () => {
      const current = await loadSettings();
      const el = document.getElementById(id)!;
      if (el instanceof HTMLInputElement && el.type === 'checkbox') {
        (current as any)[id] = el.checked;
      } else if (el instanceof HTMLSelectElement) {
        (current as any)[id] = el.value;
      }
      await saveSettings(current);
    });
  }
}

init();
```

- [ ] **Step 3: Verify build succeeds**

Run: `pnpm build`
Expected: Build completes without errors

- [ ] **Step 4: Commit**

```bash
git add src/popup/popup.html src/popup/popup.ts
git commit -m "feat: redesign popup with activation toggle and i18n language switch"
```

---

## Task 9: Integration Verification

- [ ] **Step 1: Run all tests**

Run: `pnpm test`
Expected: All tests pass

- [ ] **Step 2: Run production build**

Run: `pnpm build`
Expected: Build succeeds with no errors

- [ ] **Step 3: Manual verification checklist**

Load the extension in Chrome (`chrome://extensions` → Load unpacked → select `dist/`):

1. Open any website → no "A" badge visible ✓
2. Click extension icon → popup shows with toggle OFF and correct domain ✓
3. Toggle ON → toolbar appears on page ✓
4. Toggle OFF → toolbar disappears ✓
5. Toggle ON → reload page → toolbar still appears (persisted) ✓
6. Toggle OFF → reload page → no toolbar (persisted) ✓
7. Click EN/中 button → popup text switches instantly ✓
8. Ctrl+Shift+F → toolbar appears (activates) ✓
9. Ctrl+Shift+F again → toolbar disappears (deactivates) ✓
10. Toolbar button tooltips show correct language ✓
11. Click element → annotation popup labels show correct language ✓
12. Open two tabs on same domain → toggle on tab A → tab B unchanged until reload ✓

- [ ] **Step 4: Final commit if any fixes were needed**

```bash
git add -A && git commit -m "fix: integration fixes for lazy activation & i18n"
```
