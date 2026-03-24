// Listen for messages from content script
chrome.runtime.onMessage.addListener((message) => {
  switch (message.type) {
    case 'COPY_TO_CLIPBOARD': {
      // In MV3 service worker, use offscreen document for clipboard
      // For now, the content script handles clipboard directly
      break;
    }
    case 'OPEN_SETTINGS': {
      chrome.action.openPopup().catch(() => {
        // Fallback: open popup.html in a new tab if openPopup is unavailable
        chrome.tabs.create({ url: chrome.runtime.getURL('popup/popup.html') });
      });
      break;
    }
  }
});

console.log('[agentation] service worker loaded');
