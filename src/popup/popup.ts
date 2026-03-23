// Settings keys in chrome.storage.local
interface Settings {
  outputLevel: 'compact' | 'standard' | 'detailed' | 'forensic';
  reactFilter: 'all' | 'filtered' | 'smart';
  theme: 'auto' | 'light' | 'dark';
  blockInteractions: boolean;
  sourceMap: boolean;
  serverUrl: string;
}

const DEFAULTS: Settings = {
  outputLevel: 'standard',
  reactFilter: 'filtered',
  theme: 'auto',
  blockInteractions: true,
  sourceMap: true,
  serverUrl: 'http://localhost:4747',
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

async function checkServer(url: string): Promise<boolean> {
  try {
    const res = await fetch(`${url}/sessions`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function init() {
  const settings = await loadSettings();

  // Populate form
  (document.getElementById('outputLevel') as HTMLSelectElement).value = settings.outputLevel;
  (document.getElementById('reactFilter') as HTMLSelectElement).value = settings.reactFilter;
  (document.getElementById('theme') as HTMLSelectElement).value = settings.theme;
  (document.getElementById('blockInteractions') as HTMLInputElement).checked = settings.blockInteractions;
  (document.getElementById('sourceMap') as HTMLInputElement).checked = settings.sourceMap;
  (document.getElementById('serverUrl') as HTMLInputElement).value = settings.serverUrl;

  // Auto-save on change
  const elements = ['outputLevel', 'reactFilter', 'theme', 'blockInteractions', 'sourceMap', 'serverUrl'];
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

  // Check server status
  const connected = await checkServer(settings.serverUrl);
  const dot = document.getElementById('statusDot')!;
  const text = document.getElementById('statusText')!;
  if (connected) {
    dot.className = 'dot connected';
    text.textContent = 'Connected';
  } else {
    dot.className = 'dot disconnected';
    text.textContent = 'Not connected';
  }
}

init();
