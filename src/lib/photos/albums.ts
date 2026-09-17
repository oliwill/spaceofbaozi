import { isPublishable, type GateData } from "@/lib/content/gates";

export interface PhotoAlbumData extends GateData {
  title: string;
  description: string;
  date: Date;
  updated?: Date;
  tags: string[];
  cover?: string;
  coverAlt?: string;
  coverCredit?: string;
}

export interface PhotoAlbum<T extends PhotoAlbumData = PhotoAlbumData> {
  id: string;
  data: T;
}

export interface PhotoLightboxItem {
  slug: string;
  title: string;
  src: string;
  alt: string;
  description?: string;
}

export function publishableAlbums<T extends PhotoAlbum>(albums: T[]): T[] {
  return albums
    .filter((album) => isPublishable(album.data))
    .sort((a, b) => +b.data.date - +a.data.date);
}

export function splitAlbums<T extends PhotoAlbum>(albums: T[]): { featured?: T; recent: T[] } {
  const [featured, ...recent] = publishableAlbums(albums);
  return { featured, recent };
}

export function albumLightboxItems(albums: PhotoAlbum[]): PhotoLightboxItem[] {
  return publishableAlbums(albums)
    .filter((album) => album.data.cover)
    .map((album) => ({
      slug: album.id,
      title: album.data.title,
      src: album.data.cover!,
      alt: album.data.coverAlt ?? album.data.title,
      description: album.data.description || undefined,
    }));
}

export function latestAlbumDate(albums: PhotoAlbum[]): Date | undefined {
  const latest = publishableAlbums(albums)[0];
  return latest?.data.updated ?? latest?.data.date;
}
