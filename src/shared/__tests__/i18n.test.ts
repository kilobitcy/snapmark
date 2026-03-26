import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock chrome.storage.local
const mockStorage: Record<string, any> = {};
(globalThis as any).chrome = {
  storage: {
    local: {
      get: vi.fn((key: string) => Promise.resolve({ [key]: mockStorage[key] })),
      set: vi.fn((obj: Record<string, any>) => {
        Object.assign(mockStorage, obj);
        return Promise.resolve();
      }),
    },
  },
};

import { t, getLocale, setLocale, initLocale, _resetLocale } from '../i18n';

describe('i18n', () => {
  beforeEach(() => {
    for (const k of Object.keys(mockStorage)) delete mockStorage[k];
    _resetLocale();
  });

  it('defaults to en', () => {
    expect(getLocale()).toBe('en');
  });

  it('t() returns English text by default', () => {
    expect(t('toolbar.toggleMarkers')).toBe('Toggle markers');
  });

  it('t() returns Chinese text after setLocale("zh")', async () => {
    await setLocale('zh');
    expect(getLocale()).toBe('zh');
    expect(t('toolbar.toggleMarkers')).toBe('切换标记');
  });

  it('t() returns key if translation missing', () => {
    expect(t('nonexistent.key')).toBe('nonexistent.key');
  });

  it('initLocale() picks zh from navigator.language', async () => {
    Object.defineProperty(navigator, 'language', { value: 'zh-CN', configurable: true });
    await initLocale();
    expect(getLocale()).toBe('zh');
  });

  it('initLocale() picks stored locale over navigator', async () => {
    mockStorage['agentation-locale'] = 'en';
    Object.defineProperty(navigator, 'language', { value: 'zh-CN', configurable: true });
    await initLocale();
    expect(getLocale()).toBe('en');
  });

  it('setLocale() persists to chrome.storage', async () => {
    await setLocale('zh');
    expect(chrome.storage.local.set).toHaveBeenCalledWith({ 'agentation-locale': 'zh' });
  });
});
