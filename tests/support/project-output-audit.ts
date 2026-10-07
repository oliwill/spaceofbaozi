// Reuse the HTML5 parser already frozen in Astro's dependency tree. No product bundle/import or new dependency.
import { stripBase } from "../../src/lib/site/paths";
import { parse, type DefaultTreeAdapterMap } from "parse5";
import type { ProjectImage } from "../../src/lib/projects/schema";

type Node = DefaultTreeAdapterMap["node"];
type Element = DefaultTreeAdapterMap["element"];
export interface RenderedProjectImage { src: string; width: number; height: number; alt: string; loading: string; srcset: Array<{ src: string; width: number }>; precedingParagraph: string }
export const attribute = (node: Element, name: string) => node.attrs.find((item) => item.name === name)?.value;
export const isElement = (node: Node): node is Element => "tagName" in node;
export const textContent = (node: Node): string => "value" in node && node.nodeName === "#text" ? node.value : "childNodes" in node ? node.childNodes.map(textContent).join("") : "";
export const elements = (node: Node): Element[] => [ ...(isElement(node) ? [node] : []), ...("childNodes" in node ? node.childNodes.flatMap(elements) : []) ];
export const parseHTML = (html: string) => parse(html);
const hasClass = (element: Element, name: string) => (attribute(element, "class") ?? "").split(/\s+/).includes(name);
const pathPattern = /^\/assets\/projects\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(?:png|jpe?g|webp|avif)$/;

export function auditRenderedProjectImages(html: string, images: readonly ProjectImage[], base = "/"): RenderedProjectImage[] {
  const all = elements(parseHTML(html));
  const details = all.filter((element) => attribute(element, "data-project-detail") !== undefined);
  if (details.length !== 1) throw new Error("须有唯一最终项目详情");
  const article = details[0];
  const prose = elements(article).find((element) => hasClass(element, "editorial-prose"));
  if (!prose) throw new Error("项目正文缺失");
  const registered = new Map(images.map((image) => [image.src, image]));
  return all.filter((element) => element.tagName === "img").map((element) => {
    const src = stripBase(attribute(element, "src") ?? "", base) ?? "";
    if (!pathPattern.test(src)) throw new Error(`非法项目图片 src: ${src}`);
    const image = registered.get(src);
    if (!image) throw new Error(`未登记项目图片 src: ${src}`);
    const width = Number(attribute(element, "width")), height = Number(attribute(element, "height"));
    if (width !== image.width || height !== image.height) throw new Error(`项目图片尺寸不符: ${src}`);
    const alt = attribute(element, "alt") ?? "";
    if (alt !== image.alt || !alt.trim()) throw new Error(`项目图片 alt 不准确: ${src}`);
    const loading = attribute(element, "loading") ?? "";
    if (loading !== "lazy") throw new Error(`隔离正文图片须显式 lazy: ${src}`);
    const variants = new Map([image, ...(image.variants ?? [])].map((asset) => [asset.src, asset]));
    const srcset = (attribute(element, "srcset") ?? "").split(",").filter((value) => value.trim()).map((candidate) => {
      const parts = candidate.trim().split(/\s+/), path = stripBase(parts[0], base) ?? "";
      if (!pathPattern.test(path)) throw new Error(`非法项目图片 srcset: ${path}`);
      const asset = variants.get(path);
      if (!asset) throw new Error(`未登记项目图片 srcset: ${path}`);
      if (parts.length !== 2 || !/^\d+w$/.test(parts[1]) || Number(parts[1].slice(0, -1)) !== asset.width) throw new Error(`项目 srcset 尺寸不符: ${path}`);
      return { src: path, width: asset.width };
    });
    let block: Node = element;
    while ("parentNode" in block && block.parentNode && block.parentNode !== prose) block = block.parentNode;
    if (!("parentNode" in block) || block.parentNode !== prose) throw new Error(`项目图片不在正文解释位置: ${src}`);
    const siblings = prose.childNodes.filter(isElement), index = siblings.indexOf(block as Element), previous = siblings[index - 1];
    if (!previous || previous.tagName !== "p" || !textContent(previous).trim() || elements(previous).some((item) => item.tagName === "img")) throw new Error(`项目图片前须有对应解释段落: ${src}`);
    return { src, width, height, alt, loading, srcset, precedingParagraph: textContent(previous).trim() };
  });
}
