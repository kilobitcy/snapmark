const STYLES = `
:host {
  all: initial;
  font-family: system-ui, -apple-system, sans-serif;
  --ag-bg: #ffffff;
  --ag-text: #1a1a1a;
  --ag-accent: #3b82f6;
  --ag-border: #e5e5e5;
  --ag-radius: 8px;
  --ag-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

@media (prefers-color-scheme: dark) {
  :host {
    --ag-bg: #1e1e1e;
    --ag-text: #e5e5e5;
    --ag-accent: #60a5fa;
    --ag-border: #404040;
  }
}

:host(.dark) {
  --ag-bg: #1e1e1e;
  --ag-text: #e5e5e5;
  --ag-accent: #60a5fa;
  --ag-border: #404040;
}

#agentation-toolbar,
#agentation-highlights,
#agentation-markers,
#agentation-popups {
  position: fixed;
  z-index: 2147483647;
  pointer-events: none;
}

#agentation-toolbar {
  pointer-events: auto;
}
`;

let shadowRoot: ShadowRoot | null = null;

export function createAgentationHost(): ShadowRoot {
  if (shadowRoot) return shadowRoot;

  const existing = document.querySelector('agentation-root');
  if (existing) {
    existing.remove();
  }

  const host = document.createElement('agentation-root');
  host.setAttribute('data-agentation', '');
  shadowRoot = host.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = STYLES;
  shadowRoot.appendChild(style);

  for (const id of ['agentation-toolbar', 'agentation-highlights', 'agentation-markers', 'agentation-popups']) {
    const div = document.createElement('div');
    div.id = id;
    shadowRoot.appendChild(div);
  }

  document.body.appendChild(host);
  return shadowRoot;
}

export function getAgentationShadow(): ShadowRoot | null {
  return shadowRoot;
}

/** Reset module state — for testing only */
export function _resetAgentationHost(): void {
  shadowRoot = null;
}
