import rehypeRaw from 'rehype-raw';
import { toHtml } from 'hast-util-to-html';
import type { Element, Root, RootContent } from 'hast';
import { withBase } from './paths';

// URL tokenization follows srcset's whitespace boundary; commas inside data URLs remain part of the URL.
export function baseSrcset(value: string, base: string): string {
  let cursor = 0;
  let output = '';
  while (cursor < value.length) {
    const start = cursor;
    while (cursor < value.length && /[\t\n\f\r ,]/.test(value[cursor])) cursor++;
    output += value.slice(start, cursor);
    const urlStart = cursor;
    while (cursor < value.length && !/[\t\n\f\r ]/.test(value[cursor])) cursor++;
    const token = value.slice(urlStart, cursor);
    const url = token.replace(/,+$/, '');
    output += withBase(url, base) + token.slice(url.length);
    if (url.length !== token.length) continue;
    const descriptorStart = cursor;
    let parentheses = 0;
    while (cursor < value.length) {
      const char = value[cursor++];
      if (char === '(') parentheses++;
      if (char === ')') parentheses--;
      if (char === ',' && parentheses === 0) break;
    }
    output += value.slice(descriptorStart, cursor);
  }
  return output;
}

export default function rehypeBaseUrls({ base = '/' }: { base?: string } = {}) {
  const parseRaw = rehypeRaw();
  return (tree: Root, file: Parameters<typeof parseRaw>[1]) => {
    const parsed = parseRaw(tree, file);
    const visit = (node: Root | RootContent, excluded = false): void => {
      if (node.type === 'element') {
        excluded ||= node.tagName === 'code' || node.tagName === 'pre';
        if (!excluded) {
          for (const key of ['href', 'src', 'poster', 'dataSrc']) {
            const value = node.properties[key];
            if (typeof value === 'string') node.properties[key] = withBase(value, base);
          }
          for (const key of ['srcSet', 'dataSrcset']) {
            const value = node.properties[key];
            if (typeof value === 'string') node.properties[key] = baseSrcset(value, base);
          }
        }
        if (node.content) visit(node.content, excluded);
      }
      if ('children' in node) node.children.forEach(child => visit(child, excluded));
    };
    const preserveTemplates = (node: Root | Element): void => {
      for (let index = 0; index < node.children.length; index++) {
        const child = node.children[index];
        if (child.type !== 'element') continue;
        // Astro's later rehypeRaw reads children, not template.content; keep inert subtrees raw until that pass.
        if (child.tagName === 'template' && child.content) node.children[index] = { type: 'raw', value: toHtml(child) };
        else preserveTemplates(child);
      }
    };
    visit(parsed);
    preserveTemplates(parsed);
    return parsed;
  };
}
