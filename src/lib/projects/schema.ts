import { z } from "astro/zod";
import { isPublishable } from "@/lib/content/gates";

const nonEmptyText = z.string().refine((value) => value.trim().length > 0, "文本不能为空");
const projectKindSchema = z.enum(["work", "personal"]);
const projectStatusSchema = z.enum(["ongoing", "completed"]);
const assetPath = z.string().regex(/^\/assets\/projects\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(?:png|jpe?g|webp|avif)$/);
const dimensions = {
  src: assetPath,
  width: z.number().int().positive(),
  height: z.number().int().positive(),
};

export const projectImageSchema = z.object({
  ...dimensions,
  alt: nonEmptyText,
  credit: z.string().optional(),
  variants: z.array(z.object(dimensions)).optional(),
}).refine(
  (image) => image.variants?.every((variant) => variant.width * image.height === image.width * variant.height) ?? true,
  "项目图片变体须保留原比例",
);

export const projectSchema = z.object({
  title: nonEmptyText,
  intro: nonEmptyText,
  date: z.coerce.date(),
  link: z.string().url().refine((value) => /^https?:\/\//i.test(value), "项目链接只接受 http/https URL").optional(),
  draft: z.boolean().default(false),
  approved: z.boolean().default(false),
  updated: z.coerce.date().optional(),
  cover: z.string().optional(),
  coverAlt: nonEmptyText.optional(),
  coverCredit: z.string().optional(),
  role: nonEmptyText.optional(),
  kind: projectKindSchema.optional(),
  periodLabel: nonEmptyText.optional(),
  status: projectStatusSchema.optional(),
  linkLabel: z.enum(["访问项目", "查看代码"]).optional(),
  images: z.array(projectImageSchema).default([]),
}).superRefine((data, context) => {
  if (!isPublishable(data)) return;
  if (!data.role) context.addIssue({ code: z.ZodIssueCode.custom, path: ["role"], message: "公开项目必须填写个人角色" });
  if (!data.kind) context.addIssue({ code: z.ZodIssueCode.custom, path: ["kind"], message: "公开项目必须填写工作或个人类型" });
  if (data.cover !== undefined && !data.images.some((image) => image.src === data.cover)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["cover"], message: "公开项目封面必须引用 images 中的图片" });
  }
});

export type ProjectImage = z.infer<typeof projectImageSchema>;
export type ProjectKind = z.infer<typeof projectKindSchema>;
export type ProjectStatus = z.infer<typeof projectStatusSchema>;
export type ProjectData = z.infer<typeof projectSchema>;
