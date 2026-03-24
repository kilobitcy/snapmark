// Listen for messages from content script
chrome.runtime.onMessage.addListener((message) => {
  switch (message.type) {
    case 'COPY_TO_CLIPBOARD': {
      // In MV3 service worker, use offscreen document for clipboard
      // For now, the content script handles clipboard directly
      break;
    }
  }
});

console.log('[agentation] service worker loaded');
