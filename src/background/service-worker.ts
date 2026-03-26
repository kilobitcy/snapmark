const DOMAIN_STATES_KEY = 'agentation-domain-states';

async function getDomainStates(): Promise<Record<string, boolean>> {
  try {
    const result = await chrome.storage.local.get(DOMAIN_STATES_KEY);
    return result[DOMAIN_STATES_KEY] ?? {};
  } catch {
    return {};
  }
}

async function setDomainState(hostname: string, active: boolean): Promise<void> {
  const states = await getDomainStates();
  states[hostname] = active;
  try {
    await chrome.storage.local.set({ [DOMAIN_STATES_KEY]: states });
  } catch {
    // Fallback
  }
}

async function getActiveTabHostname(): Promise<{ tabId: number; hostname: string } | null> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab.url) return null;
    const hostname = new URL(tab.url).hostname;
    return { tabId: tab.id, hostname };
  } catch {
    return null;
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'COPY_TO_CLIPBOARD': {
      break;
    }
    case 'OPEN_SETTINGS': {
      chrome.action.openPopup().catch(() => {
        chrome.tabs.create({ url: chrome.runtime.getURL('popup/popup.html') });
      });
      break;
    }
    case 'GET_DOMAIN_STATE': {
      // From content script (has hostname) or popup (no hostname, infer from active tab)
      if (message.payload?.hostname) {
        getDomainStates().then(states => {
          sendResponse({ type: 'DOMAIN_STATE', payload: { active: !!states[message.payload.hostname] } });
        });
        return true; // async sendResponse
      }
      // From popup — infer hostname from active tab
      getActiveTabHostname().then(async (info) => {
        if (!info) { sendResponse({ type: 'DOMAIN_STATE', payload: { active: false } }); return; }
        const states = await getDomainStates();
        sendResponse({ type: 'DOMAIN_STATE', payload: { active: !!states[info.hostname] } });
      });
      return true;
    }
    case 'SET_DOMAIN_STATE': {
      // From content script (has hostname) or popup (no hostname, infer)
      if (message.payload?.hostname) {
        setDomainState(message.payload.hostname, message.payload.active).then(() => sendResponse({ ok: true }));
        return true;
      }
      // From popup — infer hostname, then forward to content script
      getActiveTabHostname().then(async (info) => {
        if (!info) { sendResponse({ ok: false }); return; }
        await setDomainState(info.hostname, message.payload.active);
        // Forward to content script on the active tab
        chrome.tabs.sendMessage(info.tabId, {
          type: 'DOMAIN_STATE',
          payload: { active: message.payload.active },
        }).catch(() => {});
        sendResponse({ ok: true });
      });
      return true;
    }
  }
});

console.log('[agentation] service worker loaded');
