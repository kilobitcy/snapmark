import type { Annotation } from './types';

export type OutputLevel = 'compact' | 'standard' | 'detailed' | 'forensic';

export function generateOutput(annotations: Annotation[], level: OutputLevel): string {
  return annotations.map((a, i) => formatAnnotation(a, i + 1, level)).join('\n\n');
}

function formatAnnotation(a: Annotation, num: number, level: OutputLevel): string {
  switch (level) {
    case 'compact': return formatCompact(a, num);
    case 'standard': return formatStandard(a, num);
    case 'detailed': return formatDetailed(a, num);
    case 'forensic': return formatForensic(a, num);
  }
}

function elementLabel(a: Annotation): string {
  const classes = a.cssClasses.length > 0 ? `.${a.cssClasses[0]}` : '';
  return `${a.elementTag}${classes}`;
}

function formatCompact(a: Annotation, num: number): string {
  const parts = [`#${num}`];
  parts.push(`[${elementLabel(a)}]`);
  parts.push(`"${a.textContent}"`);
  if (a.source) parts.push(`(${a.source.file}:${a.source.line})`);
  if (a.selectedText) parts.push(`[selected: "${a.selectedText}"]`);
  parts.push(`— "${a.comment}"`);
  return parts.join(' ');
}

function formatStandard(a: Annotation, num: number): string {
  const lines: string[] = [];
  lines.push(`## Annotation #${num} — "${a.comment}"`);
  lines.push(`**Element:** \`<${a.elementTag} class="${a.cssClasses.join(' ')}">\` "${a.textContent}"`);
  if (a.selectedText) lines.push(`**Selected text:** "${a.selectedText}"`);
  lines.push(`**Path:** \`${a.elementPath}\``);
  if (a.framework) {
    const fw = a.framework.name.charAt(0).toUpperCase() + a.framework.name.slice(1);
    lines.push(`**Component:** \`<${a.framework.componentName}>\` (${fw})`);
  }
  if (a.source) lines.push(`**Source:** \`${a.source.file}:${a.source.line}:${a.source.column}\``);
  lines.push(`**Location:** x=${a.boundingBox.x}, y=${a.boundingBox.y}`);
  return lines.join('\n');
}

function formatDetailed(a: Annotation, num: number): string {
  const lines: string[] = [];
  lines.push(`## Annotation #${num} — "${a.comment}"`);
  lines.push(`**Element:** \`<${a.elementTag} class="${a.cssClasses.join(' ')}">\``);
  lines.push(`**Selector:** \`${a.selector}\``);
  lines.push(`**Text:** "${a.textContent}"`);
  if (a.selectedText) lines.push(`**Selected text:** "${a.selectedText}"`);
  lines.push('');
  if (a.framework) {
    const fw = a.framework.name.charAt(0).toUpperCase() + a.framework.name.slice(1);
    lines.push(`**Framework:** ${fw}`);
    lines.push(`**Component:** \`${a.framework.componentName}\` (path: \`${a.framework.componentPath || a.framework.componentName}\`)`);
    if (a.framework.props) lines.push(`**Props:** \`${JSON.stringify(a.framework.props)}\``);
  }
  if (a.source) lines.push(`**Source:** \`${a.source.file}:${a.source.line}:${a.source.column}\``);
  lines.push('');
  lines.push(`**Nearby text:** ${JSON.stringify(a.nearbyText)}`);
  lines.push(`**Styles:** \`${JSON.stringify(a.computedStyles)}\``);
  lines.push(`**Bounding Box:** x=${a.boundingBox.x}, y=${a.boundingBox.y}, w=${a.boundingBox.width}, h=${a.boundingBox.height}`);
  return lines.join('\n');
}

function formatForensic(a: Annotation, num: number): string {
  const lines = [formatDetailed(a, num)];
  if (a.url) lines.push(`**URL:** ${a.url}`);
  lines.push(`**Viewport:** ${a.viewport.width}x${a.viewport.height}, scrollX=${a.viewport.scrollX}, scrollY=${a.viewport.scrollY}`);
  lines.push(`**Timestamp:** ${new Date(a.timestamp).toISOString()}`);
  if (a.fullPath) lines.push(`**Full DOM Path:** \`${a.fullPath}\``);
  if (a.accessibility) {
    lines.push(`**Accessibility:** role=${a.accessibility.role || 'none'}, focusable=${a.accessibility.focusable}${a.accessibility.ariaLabel ? `, aria-label="${a.accessibility.ariaLabel}"` : ''}`);
  }
  if (a.nearbyElements) {
    lines.push(`**Nearby Elements:** ${JSON.stringify(a.nearbyElements)}`);
  }
  return lines.join('\n');
}
