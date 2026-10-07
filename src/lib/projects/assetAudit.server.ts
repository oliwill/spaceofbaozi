import { lstat, readdir } from "node:fs/promises";
import { extname, join } from "node:path";
import sharp from "sharp";
import { projectImageSchema } from "@/lib/projects/schema";
import type { PublicProject, ProjectImage } from "@/lib/projects/projects";

type AssetDimensions = Pick<ProjectImage, "width" | "height">;

export async function auditPublicProjectAssets(projects: readonly PublicProject[], publicDir: string): Promise<void> {
  const allowed = new Map<string, AssetDimensions>();
  for (const project of projects) {
    for (const image of project.images) {
      const result = projectImageSchema.safeParse(image);
      if (!result.success) {
        const invalidPath = result.error.issues.some((issue) => issue.path.at(-1) === "src");
        throw new Error(`${invalidPath ? "非法项目资源路径" : "项目资源登记无效"}: ${image.src} (${result.error.message})`);
      }
      for (const asset of [result.data, ...(result.data.variants ?? [])]) {
        const previous = allowed.get(asset.src);
        if (previous && (previous.width !== asset.width || previous.height !== asset.height)) {
          throw new Error(`项目图片尺寸声明冲突: ${asset.src}`);
        }
        allowed.set(asset.src, { width: asset.width, height: asset.height });
      }
    }
  }

  const seen = new Set<string>();
  const inspect = async (path: string, src: string) => {
    try {
      const stat = await lstat(path);
      if (stat.isSymbolicLink()) throw new Error(`项目资源禁止符号链接: ${src}`);
      return stat;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw error;
    }
  };
  const walk = async (directory: string, url: string): Promise<void> => {
    for (const name of await readdir(directory)) {
      const path = join(directory, name);
      const src = `${url}/${name}`;
      const stat = await inspect(path, src);
      if (!stat) throw new Error(`项目资源读取时缺失: ${src}`);
      if (stat.isDirectory()) {
        await walk(path, src);
        continue;
      }
      const dimensions = allowed.get(src);
      if (!dimensions) throw new Error(`未登记的公开项目资源: ${src}`);
      if (!stat.isFile()) throw new Error(`项目资源必须是普通图片文件: ${src}`);
      const metadata = await sharp(path).metadata();
      const extension = extname(src).slice(1);
      const expectedFormat = ({ png: "png", jpg: "jpeg", jpeg: "jpeg", webp: "webp", avif: "heif" } as Record<string, string>)[extension];
      if (metadata.format !== expectedFormat || (extension === "avif" && metadata.compression !== "av1")) {
        throw new Error(`项目图片格式不符: ${src}`);
      }
      if (metadata.width !== dimensions.width || metadata.height !== dimensions.height) {
        throw new Error(`项目图片尺寸不符: ${src}`);
      }
      seen.add(src);
    }
  };

  for (const src of ["", "/assets", "/assets/projects"]) {
    const stat = await inspect(join(publicDir, src), src || publicDir);
    if (!stat) break;
    if (!stat.isDirectory()) throw new Error(`项目资源目录无效: ${src || publicDir}`);
    if (src === "/assets/projects") await walk(join(publicDir, src), src);
  }
  for (const src of allowed.keys()) {
    if (!seen.has(src)) throw new Error(`公开项目资源缺失: ${src}`);
  }
}
