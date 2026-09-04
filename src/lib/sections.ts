export type SectionKey =
  | "blog"
  | "photos"
  | "drinks"
  | "books"
  | "music"
  | "about"
  | "projects";

/** 共享 entrySchema 的集合（projects 使用独立 schema，不在其列） */
export type EntrySchemaCollectionKey =
  | "blog"
  | "photos"
  | "drinks"
  | "books"
  | "music"
  | "about";

export interface SectionMeta {
  key: SectionKey;
  number: string;
  title: string;
  zh: string;
  desc: string;
  href: string;
  collection: SectionKey;
}

export const SECTIONS: SectionMeta[] = [
  {
    key: "blog",
    number: "01",
    title: "Blog",
    zh: "文章",
    desc: "完整文章、教程、经验总结和专题内容。",
    href: "/blog",
    collection: "blog",
  },
  {
    key: "projects",
    number: "02",
    title: "Projects",
    zh: "项目",
    desc: "参与、完成与持续试验的项目。",
    href: "/projects",
    collection: "projects",
  },
  {
    key: "photos",
    number: "03",
    title: "Photos",
    zh: "摄影",
    desc: "摄影、生活记录、主题相册和视觉片段。",
    href: "/photos",
    collection: "photos",
  },
  {
    key: "drinks",
    number: "04",
    title: "Drinks",
    zh: "酒",
    desc: "喝过的酒、酒款、场景和主观评价。",
    href: "/drinks",
    collection: "drinks",
  },
  {
    key: "about",
    number: "05",
    title: "About Me",
    zh: "关于",
    desc: "个人介绍、当前状态、关注主题与联系方式。",
    href: "/about",
    collection: "about",
  },
  {
    key: "books",
    number: "06",
    title: "Books",
    zh: "书",
    desc: "书籍、书摘、推荐和阅读记录。",
    href: "/books",
    collection: "books",
  },
  {
    key: "music",
    number: "07",
    title: "Music",
    zh: "音乐",
    desc: "专辑、歌单、单曲和听感记录。",
    href: "/music",
    collection: "music",
  },
];

export function getSection(key: string): SectionMeta | undefined {
  return SECTIONS.find((s) => s.key === key);
}

export function greetingByHour(hour = new Date().getHours()): string {
  if (hour < 5) return "夜深了";
  if (hour < 11) return "早上好";
  if (hour < 14) return "中午好";
  if (hour < 18) return "下午好";
  if (hour < 22) return "晚上好";
  return "夜深了";
}
