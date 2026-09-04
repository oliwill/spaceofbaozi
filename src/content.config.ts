import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const entrySchema = z.object({
  title: z.string(),
  description: z.string().default(""),
  date: z.coerce.date(),
  tags: z.array(z.string()).default([]),
  cover: z.string().optional(),
  draft: z.boolean().default(false),
  status: z.string().optional(),
  link: z.string().url().optional(),
  featured: z.boolean().default(false),
});

const projectSchema = z.object({
  title: z.string(),
  intro: z.string(),
  date: z.coerce.date(),
  link: z.string().url().optional(),
  draft: z.boolean().default(false),
  approved: z.boolean().default(false),
  cover: z.string().optional(),
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
