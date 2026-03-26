# Lazy Activation & i18n Design

## Problem

The SnapMark toolbar ("A" badge) appears on every website immediately after enabling the extension, degrading browsing experience.

## Goals

1. Toolbar UI only appears when the user explicitly activates it
2. Per-domain activation state is persisted — revisiting a domain restores last state
3. Full i18n support (English + Chinese) across popup, toolbar, and annotation popup
4. Language auto-detected from browser, with manual override in popup

## Design Decisions

- **Custom i18n over Chrome `chrome.i18n` API:** Chrome's native i18n (`_locales/`) does not support runtime language switching — it requires extension reload. Since the popup needs instant language toggle, a custom module is the right choice.
- **`chrome.storage.local` fallback:** All storage reads/writes use try/catch with sensible defaults, matching the existing pattern in `popup.ts`, to support development contexts without full extension APIs.

---

## 1. i18n Module (`src/shared/i18n.ts`)

- **Supported languages:** `'en' | 'zh'`
- **Dictionary structure:** `Record<string, Record<string, string>>` — flat key-value per language
- **API:**
  - `getLocale(): Locale` — returns current language
  - `setLocale(lang: Locale): Promise<void>` — sets language, persists to `chrome.storage.local`
  - `t(key: string): string` — returns translated text for current locale
  - `initLocale(): Promise<void>` — startup call, resolves language by priority:
    1. `chrome.storage.local` user selection
    2. `navigator.language` prefix match (`zh` → Chinese)
    3. Default `'en'`
- **Coverage:** popup labels/options, toolbar button tooltips, annotation popup form labels and buttons

## 2. Domain Activation State

- **Storage key:** `'agentation-domain-states'`
- **Storage structure:** `Record<string, boolean>` (hostname → active)
- **Domain extraction:** `new URL(url).hostname`
- **Default state:** `false` (inactive)
- **Scope:** Per-domain, per-tab activation. The stored value is the *default* for new tabs on that domain. Each tab manages its own active/inactive state independently after initial load.
- **Flow:**
  1. Content script loads → sends `GET_DOMAIN_STATE` to background with hostname
  2. Background reads `chrome.storage.local`, responds with `{ active: boolean }`
  3. If `true` → content script creates UI and activates toolbar
  4. If `false` → no UI created, only keyboard shortcut and message listeners active
- **State changes** (popup toggle, keyboard shortcut, toolbar close) → notify background → update storage
- **Multi-tab behavior:** Toggling activation on one tab updates the stored domain default but does NOT broadcast to other open tabs on the same domain. Other tabs pick up the new default when they are next opened/reloaded. This avoids complexity and unexpected UI appearing on tabs the user isn't looking at.

**Note:** `AnnotationStore` scopes data by `window.location.pathname` (per-page). Domain activation state scopes by `hostname` (per-domain). These are intentionally different: annotations are page-specific, but the "should toolbar be active?" preference is domain-wide.

## 3. Popup Redesign (`src/popup/popup.html` + `popup.ts`)

### Layout

- **Header:** "SnapMark" title + version, language toggle button (EN / 中) at top-right
- **Activation toggle:** Prominent switch with label "Activate on this site" / "在此站点激活", current hostname shown below
- **Settings section** (existing items, text i18n'd):
  - Output Detail Level / 输出详细等级
  - React Filter Mode / React 过滤模式
  - Theme / 主题
  - Block Page Interactions / 阻止页面交互
- **Footer:** Version number

### Behavior

- On open: query background for current tab's domain state (background infers hostname from active tab via `chrome.tabs.query`), set toggle accordingly
- Toggle change: send `SET_DOMAIN_STATE` to background (background infers hostname from active tab), which forwards `DOMAIN_STATE { active }` to content script
- Language button click: call `setLocale()`, re-render all popup text immediately

## 4. Content Script Lazy Initialization (`src/content/main.ts`)

### On Load (always)

- `initLocale()`
- Register keyboard shortcut listener (`Ctrl+Shift+F`)
- Register `chrome.runtime.onMessage` listener
- Send `GET_DOMAIN_STATE` to background

### On Activate (on demand)

- `createAgentationHost()` — create Shadow DOM (idempotent via existing singleton check)
- Instantiate `Toolbar`, `HighlightManager`, `AnnotationPopup`
- Bind all mouse/click event handlers
- `refreshMarkers()`

### On Deactivate

- `toolbar.destroy()`, `popup.hide()`
- **Hide** Shadow DOM host (`agentation-root` element) via `display: none` rather than removing it — avoids stale singleton reference in `host.ts` and re-initialization overhead on re-activate
- Event listeners on `document.body` remain registered but are guarded by an `isActivated` flag (extending the existing `toolbar.isActive` pattern). When inactive, handlers are no-ops.
- Notify background: `SET_DOMAIN_STATE { hostname, active: false }`

### On Re-Activate

- **Show** Shadow DOM host (`display: ''`)
- Re-render toolbar (already handles this via `toolbar.activate()`)

### Activation Triggers

- Background query returns `active: true`
- Popup toggle switch
- Keyboard shortcut `Ctrl+Shift+F`

## 5. Message Protocol

All new message types are added to the `ExtensionMessage` union in `src/shared/messaging.ts` for type safety.

```
content → background:
  { type: 'GET_DOMAIN_STATE', hostname: string }
  { type: 'SET_DOMAIN_STATE', hostname: string, active: boolean }

background → content (chrome.tabs.sendMessage):
  { type: 'DOMAIN_STATE', active: boolean }

popup → background:
  { type: 'GET_DOMAIN_STATE' }
  { type: 'SET_DOMAIN_STATE', active: boolean }
```

- **Popup messages omit hostname** — background infers it from the active tab via `chrome.tabs.query({ active: true, currentWindow: true })`.
- **Single response message `DOMAIN_STATE`** — used for both initial query response and popup-triggered state changes. Content script compares against its current state and activates/deactivates accordingly. No separate `TOGGLE_ACTIVATION` message needed.

Background acts as intermediary: holds `chrome.storage` access, forwards popup commands to the correct tab's content script.

## 6. Files Changed

| File | Change |
|------|--------|
| `src/shared/i18n.ts` | **New** — i18n module with dictionaries and `t()` |
| `src/shared/messaging.ts` | Add `GET_DOMAIN_STATE`, `SET_DOMAIN_STATE`, `DOMAIN_STATE` to `ExtensionMessage` union |
| `src/background/service-worker.ts` | Add domain state storage, message routing, active-tab hostname inference |
| `src/popup/popup.html` | Redesign: toggle switch, language button, i18n text |
| `src/popup/popup.ts` | Toggle logic, language switching, i18n rendering |
| `src/content/main.ts` | Lazy init: create/show/hide UI on demand, `isActivated` guard |
| `src/content/ui/host.ts` | Add `hideAgentationHost()` / `showAgentationHost()` helpers |
| `src/content/ui/toolbar.ts` | Tooltip text via `t()` |
| `src/content/ui/annotation-popup.ts` | Form labels/buttons via `t()` |

## 7. What Does NOT Change

- `manifest.json` content_scripts config (still `<all_urls>`, `document_idle`)
- Annotation data model (`shared/types.ts`)
- Markdown export (`shared/markdown.ts`)
- Element capture logic (`capture/`)
- Framework detection (`frameworks/`)
