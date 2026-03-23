import type { FrameworkDetector, FrameworkInfo, SourceInfo } from './types';

export class FrameworkDetectorManager {
  private detectors: FrameworkDetector[] = [];
  private detectedFrameworks: string[] | null = null;

  register(detector: FrameworkDetector): void {
    this.detectors.push(detector);
  }

  detectAll(): string[] {
    if (this.detectedFrameworks !== null) return this.detectedFrameworks;
    this.detectedFrameworks = this.detectors
      .filter(d => { try { return d.detect(); } catch { return false; } })
      .map(d => d.name);
    return this.detectedFrameworks;
  }

  resetCache(): void {
    this.detectedFrameworks = null;
  }

  getComponentInfo(el: Element): FrameworkInfo | null {
    const detected = this.detectAll();
    for (const detector of this.detectors) {
      if (!detected.includes(detector.name)) continue;
      try {
        const info = detector.getComponentInfo(el);
        if (info) return info;
      } catch { /* skip failing detectors */ }
    }
    return null;
  }

  getSourceInfo(el: Element): SourceInfo | null {
    const detected = this.detectAll();
    for (const detector of this.detectors) {
      if (!detected.includes(detector.name)) continue;
      if (!detector.getSourceInfo) continue;
      try {
        const info = detector.getSourceInfo(el);
        if (info) return info;
      } catch { /* skip */ }
    }
    return null;
  }
}
