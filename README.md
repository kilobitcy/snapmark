# SnapMark

[English](README.md) | [中文](README_zh.md)

A Chrome extension for annotating web page elements and generating AI-ready prompts.

Select any element on a webpage, add annotations, and copy structured Markdown to your clipboard — ready to paste into AI conversations.

## Features

- **Element Selection** — hover to highlight, click to select any DOM element
- **Multi-Select** — `Cmd/Ctrl+Shift+Click` to select multiple elements at once
- **Area Selection** — drag to draw a rectangle and annotate a region
- **Framework Detection** — automatically detects React, Vue, Svelte, Angular, Solid, Qwik components (best-effort)
- **Markdown Export** — 4 detail levels (compact / standard / detailed / forensic), copied to clipboard
- **Local Storage** — annotations persist per page in localStorage (7-day retention)
- **Page Freeze** — freeze CSS animations, timers, and media for stable annotation

## Installation

### 1. Build the Extension

```bash
# Clone the repo
git clone https://github.com/kilobitcy/snapmark.git
cd snapmark

# Install dependencies
pnpm install

# Build
pnpm build
```

### 2. Load in Chrome

1. Open Chrome, navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `dist/` folder inside the project directory
5. The SnapMark extension will appear in your extensions list

### 3. Verify Installation

You'll know SnapMark is successfully installed when:

- The **SnapMark icon** (a pen icon) appears in the Chrome toolbar (you may need to click the puzzle icon to pin it)
- Clicking the icon opens a **Settings popup** with options for Output Detail Level, React Filter Mode, Theme, and Block Page Interactions
- On any webpage, pressing `Cmd+Shift+F` (Mac) or `Ctrl+Shift+F` (Windows/Linux) shows a **floating toolbar** at the bottom-right corner of the page
- Hovering over page elements while the toolbar is active shows **blue highlight overlays**

## Usage

### Basic Workflow

1. **Activate** — Press `Cmd+Shift+F` (Mac) / `Ctrl+Shift+F` (Windows/Linux), or click the toggle button on the floating toolbar
2. **Select** — Hover over any element to see it highlighted, then click to select it
3. **Annotate** — A popup appears where you can:
   - Write a **comment** describing the issue or change
   - Choose an **intent**: Fix / Change / Question / Approve
   - Choose a **severity**: Blocking / Important / Suggestion
4. **Copy** — Click the 📋 button in the toolbar to copy all annotations as Markdown to your clipboard
5. **Paste** — Paste the Markdown into ChatGPT, Claude, or any AI assistant

### Advanced Selection

| Mode | How to Use | When to Use |
|------|-----------|-------------|
| **Single Select** | Click on an element | Annotate one element |
| **Multi-Select** | `Cmd/Ctrl+Shift+Click` to add elements, then normal click to finish | Annotate a group of related elements together |
| **Area Select** | Click ⚙ in toolbar to enter area mode, then drag a rectangle | Annotate a region that doesn't map to a single element |

### Toolbar Buttons

| Button | Action |
|--------|--------|
| ⦿ | Toggle annotation markers on/off |
| ⏸ | Freeze/unfreeze page animations |
| ⚙ | Toggle area selection mode |
| 📋 | Copy all annotations as Markdown |
| 🗑 | Clear all annotations |

### Settings (via Extension Popup)

Click the SnapMark icon in Chrome toolbar to configure:

- **Output Detail Level** — Controls how much info is included when copying:
  - *Compact*: one-line per annotation
  - *Standard*: element info + comment + framework/source
  - *Detailed*: adds selector, props, nearby text, styles
  - *Forensic*: full DOM path, viewport, accessibility, timestamps
- **React Filter Mode** — Filter React component detection (All / Filtered / Smart)
- **Theme** — Auto / Light / Dark
- **Block Page Interactions** — Prevent accidental clicks on the page while annotating

## Development

```bash
# Install dependencies
pnpm install

# Start dev server (with HMR)
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build
```

## Tech Stack

- TypeScript
- Vite + [@crxjs/vite-plugin](https://github.com/nicedoc/crxjs)
- Chrome Extension Manifest V3
- Vitest (unit tests)

## Acknowledgments

This project is inspired by and built upon [agentation](https://github.com/benjitaylor/agentation) — a visual feedback tool for AI coding agents. SnapMark simplifies it into a standalone annotation tool focused on prompt generation.

## License

MIT
