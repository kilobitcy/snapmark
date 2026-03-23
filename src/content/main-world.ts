// This script runs in the page's MAIN world (not isolated content script world)
// It has access to page JS context: framework internals, global objects, etc.

import { FrameworkDetectorManager } from './frameworks/detector';
import { ReactDetector } from './frameworks/react';
import { VueDetector } from './frameworks/vue';
import { SvelteDetector } from './frameworks/svelte';
import { AngularDetector } from './frameworks/angular';
import { SolidDetector } from './frameworks/solid';
import { QwikDetector } from './frameworks/qwik';
import { AGENTATION_SOURCE } from '../shared/messaging';
import type { FrameworkInfo, SourceInfo } from './frameworks/types';

const manager = new FrameworkDetectorManager();
manager.register(new ReactDetector());
manager.register(new VueDetector());
manager.register(new SvelteDetector());
manager.register(new AngularDetector());
manager.register(new SolidDetector());
manager.register(new QwikDetector());

// Detection polling: try up to 5 times, every 2 seconds
let pollCount = 0;
const maxPolls = 5;
const pollInterval = 2000;

function pollDetection() {
  manager.resetCache();
  const detected = manager.detectAll();

  // Post detection results
  window.postMessage({
    source: AGENTATION_SOURCE,
    type: 'AG_FRAMEWORK_DETECT_RESULT',
    payload: { frameworks: detected },
  }, '*');

  pollCount++;
  if (pollCount < maxPolls && detected.length === 0) {
    setTimeout(pollDetection, pollInterval);
  }
}

// Start detection after a short delay (let frameworks initialize)
setTimeout(pollDetection, 500);

// Listen for requests from Content Script
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  const data = event.data;
  if (!data || data.source !== AGENTATION_SOURCE) return;

  switch (data.type) {
    case 'AG_COMPONENT_INFO_REQUEST': {
      const selector = data.payload?.elementSelector;
      if (!selector) break;
      const el = document.querySelector(selector);
      const info = el ? manager.getComponentInfo(el) : null;
      window.postMessage({
        source: AGENTATION_SOURCE,
        type: 'AG_COMPONENT_INFO',
        payload: info,
      }, '*');
      break;
    }

    case 'AG_PROBE_SOURCE': {
      const selector = data.payload?.elementSelector;
      if (!selector) break;
      const el = document.querySelector(selector);
      const sourceInfo = el ? manager.getSourceInfo(el) : null;
      window.postMessage({
        source: AGENTATION_SOURCE,
        type: 'AG_SOURCE_INFO',
        payload: sourceInfo,
      }, '*');
      break;
    }

    case 'AG_FREEZE': {
      // Will be wired in Task 24
      break;
    }
  }
});

console.log('[agentation] main world script loaded');
