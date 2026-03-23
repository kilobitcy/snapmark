export interface FrameworkInfo {
  name: string;
  componentName: string;
  componentPath?: string;
  componentNames?: string[];
  props?: Record<string, unknown>;
  state?: Record<string, unknown>;
}

export interface SourceInfo {
  file: string;
  line: number;
  column: number;
}

export interface FrameworkDetector {
  name: string;
  detect(): boolean;
  getComponentInfo(el: Element): FrameworkInfo | null;
  getSourceInfo?(el: Element): SourceInfo | null;
}
