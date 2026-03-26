export interface PageContext {
  url: string;
  title: string;
  timestamp: number;
}

export type AnnotationIntent = 'fix' | 'change' | 'question' | 'approve';
export type AnnotationSeverity = 'blocking' | 'important' | 'suggestion';

export interface Annotation {
  id: string;
  timestamp: number;
  comment: string;

  // DOM
  elementPath: string;
  selector: string;
  elementTag: string;
  cssClasses: string[];
  attributes: Record<string, string>;
  textContent: string;
  selectedText?: string;

  // Position
  boundingBox: { x: number; y: number; width: number; height: number };
  viewport: { scrollX: number; scrollY: number; width: number; height: number };

  // Framework
  framework?: {
    name: string;
    componentName: string;
    componentPath?: string;
    componentNames?: string[];
    props?: Record<string, unknown>;
    state?: Record<string, unknown>;
  };

  // Source
  source?: {
    file: string;
    line: number;
    column: number;
    functionName?: string;
  };

  // Context
  nearbyText: string[];
  nearbyElements?: Array<{ tag: string; text: string; classes: string[] }>;
  computedStyles: Record<string, string>;
  accessibility?: { role?: string; ariaLabel?: string; focusable: boolean };
  fullPath?: string;

  // Multi-select
  isMultiSelect?: boolean;
  elementBoundingBoxes?: Array<{ x: number; y: number; width: number; height: number }>;
  isFixed?: boolean;

  // Metadata
  url?: string;
  intent?: AnnotationIntent;
  severity?: AnnotationSeverity;
}
