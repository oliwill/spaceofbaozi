export type SectionKey =
  | "blog"
  | "thoughts"
  | "photos"
  | "drinks"
  | "books"
  | "music"
  | "about"
  | "ai-works";

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
    key: "thoughts",
    number: "02",
    title: "Thoughts",
    zh: "想法",
    desc: "短想法、观察、灵感和未完成念头。",
    href: "/thoughts",
    collection: "thoughts",
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
  {
    key: "ai-works",
    number: "08",
    title: "AI Works",
    zh: "AI 创作",
    desc: "AI 图像、视频、文字实验和生成作品。",
    href: "/ai-works",
    collection: "ai-works",
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
