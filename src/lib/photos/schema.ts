import { z } from "astro/zod";
const gate = { draft: z.boolean().default(true), approved: z.boolean().default(false) };
const assetPath = z.string().regex(/^\/assets\/photos\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(?:avif|webp|png|jpe?g)$/);
const dimensions = { src: assetPath, width: z.number().int().positive(), height: z.number().int().positive() };
const coverPosition = z.object({ x: z.number().finite().min(0).max(100), y: z.number().finite().min(0).max(100) });
const imageFields = { ...dimensions, alt: z.string().trim().min(1), credit: z.string().optional(), variants: z.array(z.object(dimensions)).optional() };
const consistentRatio = (image: {width:number; height:number; variants?:{width:number;height:number}[]}) => image.variants?.every(v=>Math.abs(v.width / v.height - image.width / image.height) < 0.005) ?? true;
export const photoImageSchema = z.object(imageFields).refine(consistentRatio, "图片变体须保留原比例");
export const photoRecordSchema = z.object({...imageFields,...gate,id:z.string().regex(/^[a-z0-9][a-z0-9-]*$/),caption:z.string().optional()}).refine(consistentRatio,"图片变体须保留原比例");
export const photoAlbumSchema = z.object({
  title:z.string().trim().min(1), description:z.string().default(""), date:z.coerce.date().optional(), updated:z.coerce.date().optional(), tags:z.array(z.string()).default([]),
  ...gate, periodLabel:z.string().optional(), order:z.number().int().default(0), coverPhotoId:z.string().optional(), coverPosition:coverPosition.optional(),
  coverImage:z.object({...imageFields,...gate}).refine(consistentRatio,"封面变体须保留原比例").optional(),
  cover:z.string().optional(),coverAlt:z.string().optional(),coverCredit:z.string().optional(),
  photos:z.array(photoRecordSchema).default([]),
}).refine(data=>new Set(data.photos.map(photo=>photo.id)).size===data.photos.length,"册内照片 ID 必须唯一");
export type PhotoImage = z.infer<typeof photoImageSchema>;
export type PhotoRecord = z.infer<typeof photoRecordSchema>;
export type PhotoAlbumData = z.infer<typeof photoAlbumSchema>;
