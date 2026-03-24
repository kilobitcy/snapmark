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
