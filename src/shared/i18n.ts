export type Locale = 'en' | 'zh';

const STORAGE_KEY = 'agentation-locale';

let currentLocale: Locale = 'en';

const dictionaries: Record<Locale, Record<string, string>> = {
  en: {
    'toolbar.toggleMarkers': 'Toggle markers',
    'toolbar.freeze': 'Freeze/unfreeze',
    'toolbar.settings': 'Settings',
    'toolbar.copy': 'Copy annotations',
    'toolbar.clear': 'Clear annotations',
    'toolbar.title': 'SnapMark',
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
    'toolbar.toggleMarkers': '切换标记',
    'toolbar.freeze': '冻结/解冻',
    'toolbar.settings': '设置',
    'toolbar.copy': '复制标注',
    'toolbar.clear': '清除标注',
    'toolbar.title': 'SnapMark',
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
  const lang = navigator.language ?? '';
  currentLocale = lang.startsWith('zh') ? 'zh' : 'en';
}
