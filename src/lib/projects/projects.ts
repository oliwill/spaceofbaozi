import { isPublishable } from "@/lib/content/gates";
import { projectSchema, type ProjectData, type ProjectImage, type ProjectKind, type ProjectStatus } from "@/lib/projects/schema";

export type { ProjectData, ProjectImage, ProjectKind, ProjectStatus } from "@/lib/projects/schema";

export interface ProjectSource {
  id: string;
  data: ProjectData;
}

export interface PublicProject {
  id: string;
  href: string;
  title: string;
  intro: string;
  role: string;
  kind: ProjectKind;
  date: Date;
  periodLabel?: string;
  status?: ProjectStatus;
  link?: string;
  linkLabel?: string;
  cover?: ProjectImage;
  images: ProjectImage[];
}

function publicImage(image: ProjectImage): ProjectImage {
  return {
    src: image.src,
    width: image.width,
    height: image.height,
    alt: image.alt,
    ...(image.credit !== undefined ? { credit: image.credit } : {}),
    ...(image.variants ? { variants: image.variants.map(({ src, width, height }) => ({ src, width, height })) } : {}),
  };
}

function publicProject(source: ProjectSource): PublicProject {
  const data = projectSchema.parse(source.data);
  if (!data.role || !data.kind) throw new Error(`公开项目 ${source.id} 缺少个人角色或类型`);
  const cover = data.images.find((image) => image.src === data.cover);
  return {
    id: source.id,
    href: `/projects/${source.id}`,
    title: data.title,
    intro: data.intro,
    role: data.role,
    kind: data.kind,
    date: data.date,
    ...(data.periodLabel !== undefined ? { periodLabel: data.periodLabel } : {}),
    ...(data.status !== undefined ? { status: data.status } : {}),
    ...(data.link !== undefined ? { link: data.link, linkLabel: data.linkLabel ?? "访问项目" } : {}),
    ...(cover ? { cover: {
      ...publicImage(cover),
      ...(data.coverAlt !== undefined ? { alt: data.coverAlt } : {}),
      ...(data.coverCredit !== undefined ? { credit: data.coverCredit } : {}),
    } } : {}),
    images: data.images.map(publicImage),
  };
}

export function selectPublicProjects<T extends ProjectSource>(entries: readonly T[]): Array<{ entry: T; project: PublicProject }> {
  return entries.filter(({ data }) => isPublishable(data))
    .map((entry) => ({ entry, project: publicProject(entry) }))
    .sort((a, b) => b.project.date.getTime() - a.project.date.getTime()
      || (a.project.id < b.project.id ? -1 : a.project.id > b.project.id ? 1 : 0));
}
