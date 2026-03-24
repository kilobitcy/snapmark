# SnapMark

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

## Usage

1. Install the extension in Chrome (load unpacked from `dist/`)
2. Press `Cmd+Shift+F` (or click the toolbar) to activate
3. Hover over elements to see highlights
4. Click an element to annotate it
5. Add a comment, select intent and severity
6. Click **Copy** in the toolbar to get Markdown in your clipboard
7. Paste into your AI conversation

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
