import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { entrySchema } from "@/lib/content/entrySchema";
import { photoAlbumSchema } from "@/lib/photos/schema";
import { projectSchema } from "@/lib/projects/schema";

function makeCollection(name: string) {
  return defineCollection({
    loader: glob({ pattern: "**/*.{md,mdx}", base: `./src/content/${name}` }),
    schema: entrySchema,
  });
}

export const collections = {
  blog: makeCollection("blog"),
  photos: defineCollection({ loader: glob({pattern: "**/*.{md,mdx}", base:"./src/content/photos"}), schema: photoAlbumSchema }),
  drinks: makeCollection("drinks"),
  books: makeCollection("books"),
  music: makeCollection("music"),
  about: makeCollection("about"),
  projects: defineCollection({
    loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/projects" }),
    schema: projectSchema,
  }),
};
