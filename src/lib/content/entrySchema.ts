import { z } from "astro/zod";

// 生产门禁：draft: false && approved: true 才进入列表与详情（D-127、内容批准清单）
const gateFields = {
  draft: z.boolean().default(false),
  approved: z.boolean().default(false),
  updated: z.coerce.date().optional(),
  cover: z.string().optional(),
  coverAlt: z.string().optional(),
  coverCredit: z.string().optional(),
};

export const entrySchema = z.object({
  title: z.string(),
  description: z.string().default(""),
  date: z.coerce.date(),
  tags: z.array(z.string()).default([]),
  status: z.string().optional(),
  link: z.string().url().optional(),
  featured: z.boolean().default(false),
  ...gateFields,
});
