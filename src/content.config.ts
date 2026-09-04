import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// 生产门禁：draft: false && approved: true 才进入列表与详情（D-127、内容批准清单）
const gateFields = {
  draft: z.boolean().default(false),
  approved: z.boolean().default(false),
  updated: z.coerce.date().optional(),
  cover: z.string().optional(),
  coverAlt: z.string().optional(),
  coverCredit: z.string().optional(),
};

const entrySchema = z.object({
  title: z.string(),
  description: z.string().default(""),
  date: z.coerce.date(),
  tags: z.array(z.string()).default([]),
  status: z.string().optional(),
  link: z.string().url().optional(),
  featured: z.boolean().default(false),
  ...gateFields,
});

const projectSchema = z.object({
  title: z.string(),
  intro: z.string(),
  date: z.coerce.date(),
  link: z.string().url().optional(),
  ...gateFields,
});

function makeCollection(name: string) {
  return defineCollection({
    loader: glob({ pattern: "**/*.{md,mdx}", base: `./src/content/${name}` }),
    schema: entrySchema,
  });
}

export const collections = {
  blog: makeCollection("blog"),
  photos: makeCollection("photos"),
  drinks: makeCollection("drinks"),
  books: makeCollection("books"),
  music: makeCollection("music"),
  about: makeCollection("about"),
  projects: defineCollection({
    loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/projects" }),
    schema: projectSchema,
  }),
};
