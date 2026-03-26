# Lazy Activation & i18n Design

## Problem

The SnapMark toolbar ("A" badge) appears on every website immediately after enabling the extension, degrading browsing experience.

## Goals

1. Toolbar UI only appears when the user explicitly activates it
2. Per-domain activation state is persisted — revisiting a domain restores last state
3. Full i18n support (English + Chinese) across popup, toolbar, and annotation popup
4. Language auto-detected from browser, with manual override in popup

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
- **Flow:**
  1. Content script loads → sends `GET_DOMAIN_STATE` to background
  2. Background reads `chrome.storage.local`, returns `{ active: boolean }`
  3. If `true` → content script creates UI and activates toolbar
  4. If `false` → no UI created, only keyboard shortcut and message listeners active
- **State changes** (popup toggle, keyboard shortcut, toolbar close) → notify background → update storage

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

- On open: query background for current tab's domain state, set toggle accordingly
- Toggle change: send `SET_DOMAIN_STATE` to background, which forwards `TOGGLE_ACTIVATION` to content script
- Language button click: call `setLocale()`, re-render all popup text immediately

## 4. Content Script Lazy Initialization (`src/content/main.ts`)

### On Load (always)

- `initLocale()`
- Register keyboard shortcut listener (`Ctrl+Shift+F`)
- Register `chrome.runtime.onMessage` listener
- Send `GET_DOMAIN_STATE` to background

### On Activate (on demand)

- `createAgentationHost()` — create Shadow DOM
- Instantiate `Toolbar`, `HighlightManager`, `AnnotationPopup`
- Bind all mouse/click event handlers
- `refreshMarkers()`

### On Deactivate

- `toolbar.destroy()`
- Remove Shadow DOM host element
- Clean up mouse/click event listeners
- Notify background: `SET_DOMAIN_STATE` → `false`

### Activation Triggers

- Background query returns `active: true`
- Popup toggle switch
- Keyboard shortcut `Ctrl+Shift+F`

## 5. Message Protocol

```
content → background:
  { type: 'GET_DOMAIN_STATE', hostname: string }
  { type: 'SET_DOMAIN_STATE', hostname: string, active: boolean }

background → content (chrome.tabs.sendMessage):
  { type: 'TOGGLE_ACTIVATION' }
  { type: 'DOMAIN_STATE', active: boolean }

popup → background:
  { type: 'GET_DOMAIN_STATE' }
  { type: 'SET_DOMAIN_STATE', active: boolean }
```

Background acts as intermediary: holds `chrome.storage` access, forwards popup commands to the correct tab's content script.

## 6. Files Changed

| File | Change |
|------|--------|
| `src/shared/i18n.ts` | **New** — i18n module with dictionaries and `t()` |
| `src/shared/messaging.ts` | Add new message type definitions |
| `src/background/service-worker.ts` | Add domain state storage, message routing |
| `src/popup/popup.html` | Redesign: toggle switch, language button, i18n text |
| `src/popup/popup.ts` | Toggle logic, language switching, i18n rendering |
| `src/content/main.ts` | Lazy init: create/destroy UI on demand |
| `src/content/ui/toolbar.ts` | Tooltip text via `t()` |
| `src/content/ui/annotation-popup.ts` | Form labels/buttons via `t()` |

## 7. What Does NOT Change

- `manifest.json` content_scripts config (still `<all_urls>`, `document_idle`)
- Annotation data model (`shared/types.ts`)
- Markdown export (`shared/markdown.ts`)
- Element capture logic (`capture/`)
- Framework detection (`frameworks/`)
