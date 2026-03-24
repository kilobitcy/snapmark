# Agentation: Pure Annotation Tool Simplification

**Date:** 2026-03-24
**Approach:** Option A — In-place simplification of existing Chrome extension

## Goal

Transform the current Agentation Chrome extension from a full agent-feedback platform (with server sync, MCP, debugger) into a **pure annotation tool**: select elements on any webpage, add annotations, copy prompt-ready Markdown to clipboard, persist locally.

## What to Remove

### Entire directories
- `packages/server/` — HTTP server, MCP server, store, events, CLI
- `test/` — E2E tests (depend on server)

### Single files
- `src/background/debugger.ts` — Chrome Debugger API integration
- `src/background/server-bridge.ts` — Server communication bridge
- `playwright.config.ts` — E2E test configuration
- `pnpm-workspace.yaml` — Monorepo configuration

### Code cleanup in existing files

**`src/background/service-worker.ts`:**
- Remove imports and calls to debugger/server-bridge
- Keep only basic extension lifecycle management

**`src/shared/types.ts`:**
- Remove types: `Session`, `SessionWithAnnotations`, `SessionStatus`, `ThreadMessage`, `AnnotationStatus`
- Remove from `Annotation`: `sessionId`, `_syncedTo`, `status`, `thread`, `resolvedAt`, `resolvedBy`, `createdAt`, `updatedAt` fields (`timestamp` already serves as creation time)
- Keep: `AnnotationIntent`, `AnnotationSeverity`, `Annotation` (core fields)

**`src/shared/messaging.ts`:**
- Remove `AnnotationStatus` import
- Remove server/debugger message types from `ExtensionMessage`: `RESOLVE_SOURCEMAP`, `DEBUGGER_ATTACH`, `DEBUGGER_DETACH`, `SYNC_ANNOTATION`, `CREATE_SESSION`, `SOURCEMAP_RESULT`, `SESSION_CREATED`, `ANNOTATION_STATUS_CHANGED`
- Keep: `COPY_TO_CLIPBOARD` and all `MainWorldMessage` types, `AGENTATION_SOURCE` constant

**`src/shared/__tests__/messaging.test.ts`:**
- Remove tests for deleted message types (`RESOLVE_SOURCEMAP`, `SYNC_ANNOTATION`, `CREATE_SESSION`)

**`src/shared/__tests__/types.test.ts`:**
- Remove tests for deleted types (`Session`, `SessionWithAnnotations`, `ThreadMessage`, `AnnotationStatus`, `SessionStatus`)

**`src/popup/popup.ts`:**
- Remove `serverUrl` setting and default `'http://localhost:4747'`
- Remove `checkServer()` function
- Remove server connection status check and UI update

**`src/popup/popup.html`:**
- Remove server URL input field
- Remove server connection status indicator (dot + text)
- Remove Source Map Resolution toggle (depends on deleted `debugger.ts`)

**`src/manifest.json`:**
- Remove `"debugger"` from permissions
- Keep `host_permissions: ["<all_urls>"]` (needed for content script injection on all pages)
- Final permissions: `["activeTab", "clipboardWrite", "storage", "scripting"]`

**`package.json`:**
- Remove `"test:e2e"` script
- Remove `@playwright/test` dependency

**`vite.config.ts` / `tsconfig.json` / `vitest.config.ts`:**
- No changes needed (confirmed no `packages/server` references)

## What to Keep

### Element selection & capture
- `src/content/capture/selector.ts` — `deepElementFromPoint`, `generateElementPath`
- `src/content/capture/element-info.ts` — `extractElementInfo`
- `src/content/capture/text-selection.ts` — text selection capture

### UI layer
- `src/content/ui/host.ts` — Shadow DOM host, style isolation
- `src/content/ui/toolbar.ts` — toolbar (toggle, copy, clear, area mode)
- `src/content/ui/highlight.ts` — hover highlight + annotation markers
- `src/content/ui/annotation-popup.ts` — annotation popup (comment, intent, severity)
- `src/content/ui/styles.css`

### Data & output
- `src/content/annotation-store.ts` — localStorage, 7-day expiry, per-pathname key
- `src/shared/markdown.ts` — 4-level Markdown output (compact/standard/detailed/forensic)
- `src/shared/messaging.ts` — content script <-> main world communication constants

### Framework detection (best-effort)
- `src/content/frameworks/` — all detectors (React, Vue, Svelte, Angular, Solid, Qwik)
- `src/content/main-world.ts` — MAIN world framework probing

### Selection modes
- Single click selection
- Multi-select (Cmd/Ctrl+Shift+Click)
- Area selection (drag rectangle)

### Entry points
- `src/content/main.ts` — main content script orchestrator
- `src/content/freeze.ts` — page freeze functionality
- `src/popup/popup.html` + `src/popup/popup.ts` — extension popup

### Tests
- All `__tests__/` unit tests that accompany retained modules

## Architecture (post-simplification)

```
src/
  manifest.json              # MV3 manifest (no debugger permission)
  content/
    main.ts                  # Orchestrator: selection -> annotation -> store
    annotation-store.ts      # localStorage persistence
    freeze.ts                # Page freeze
    capture/
      selector.ts            # DOM element targeting
      element-info.ts        # Element metadata extraction
      text-selection.ts      # Text selection capture
    ui/
      host.ts                # Shadow DOM isolation
      toolbar.ts             # Control toolbar
      highlight.ts           # Visual highlights & markers
      annotation-popup.ts    # Annotation input form
      styles.css
    frameworks/
      detector.ts            # Auto-detect framework
      types.ts               # Framework/source info types
      react.ts, vue.ts, svelte.ts, angular.ts, solid.ts, qwik.ts
  background/
    service-worker.ts        # Minimal lifecycle (no debugger/server)
  shared/
    types.ts                 # Annotation types (simplified)
    messaging.ts             # Message constants
    markdown.ts              # Markdown prompt generation
  popup/
    popup.html
    popup.ts
```

## User Flow (unchanged)

1. `Cmd+Shift+F` or click toolbar to activate
2. Hover to see element highlights
3. Click to select element (or Cmd+Shift+Click for multi-select, or drag for area)
4. Add comment with intent and severity in popup
5. Click "Copy" in toolbar to get Markdown prompt in clipboard
6. Paste into AI conversation

## Non-goals

- No server sync
- No MCP integration
- No Chrome Debugger Protocol usage
- No custom prompt templates (use existing 4-level Markdown output)
