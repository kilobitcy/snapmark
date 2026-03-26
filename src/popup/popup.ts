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
