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

function makeCollection(name: string) {
  return defineCollection({
    loader: glob({ pattern: "**/*.{md,mdx}", base: `./src/content/${name}` }),
    schema: entrySchema,
  });
}

export const collections = {
  blog: makeCollection("blog"),
  thoughts: makeCollection("thoughts"),
  photos: makeCollection("photos"),
  drinks: makeCollection("drinks"),
  books: makeCollection("books"),
  music: makeCollection("music"),
  about: makeCollection("about"),
  "ai-works": makeCollection("ai-works"),
};
