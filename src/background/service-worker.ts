import { ServerBridge } from './server-bridge';
import { resolveSourceMap } from './debugger';

const bridge = new ServerBridge();

// Connect SSE for server commands
bridge.connectSSE();

// Handle take_screenshot command from server
bridge.onCommand('take_screenshot', async (params) => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return { error: 'No active tab' };

    const dataUrl = await chrome.tabs.captureVisibleTab(undefined, {
      format: 'png',
      quality: 90,
    });
    return { screenshot: dataUrl };
  } catch (e) {
    return { error: String(e) };
  }
});

// Handle get_page_info command from server
bridge.onCommand('get_page_info', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return { error: 'No active tab' };
    return {
      url: tab.url,
      title: tab.title,
      tabId: tab.id,
    };
  } catch (e) {
    return { error: String(e) };
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'RESOLVE_SOURCEMAP': {
      const { scriptUrl, funcSignature } = message.payload;
      const tabId = sender.tab?.id;
      if (tabId) {
        resolveSourceMap(tabId, scriptUrl, funcSignature)
          .then(result => sendResponse({ type: 'SOURCEMAP_RESULT', payload: result }))
          .catch(() => sendResponse({ type: 'SOURCEMAP_RESULT', payload: null }));
        return true; // async response
      }
      break;
    }

    case 'COPY_TO_CLIPBOARD': {
      // In MV3 service worker, use offscreen document for clipboard
      // For now, the content script handles clipboard directly
      break;
    }

    case 'SYNC_ANNOTATION': {
      const { sessionId, annotation } = message.payload;
      bridge.syncAnnotation(sessionId, annotation)
        .then(result => sendResponse(result))
        .catch(() => sendResponse(null));
      return true;
    }

    case 'CREATE_SESSION': {
      bridge.createSession(message.payload.url)
        .then(result => sendResponse(result))
        .catch(() => sendResponse(null));
      return true;
    }
  }
});

console.log('[agentation] service worker loaded');
