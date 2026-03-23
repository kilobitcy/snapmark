export interface TextSelectionResult {
  text: string;
  element: Element;
}

export function getTextSelection(): TextSelectionResult | null {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || !selection.toString().trim()) {
    return null;
  }

  const text = selection.toString().trim();

  // Find the nearest common ancestor element
  const range = selection.getRangeAt(0);
  let element = range.commonAncestorContainer as Element;

  // If it's a text node, get its parent element
  if (element.nodeType === Node.TEXT_NODE) {
    element = element.parentElement!;
  }

  if (!element) return null;

  return { text, element };
}
