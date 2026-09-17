import { describe, expect, it } from "vitest";
import { albumLightboxItems, latestAlbumDate, publishableAlbums, splitAlbums, type PhotoAlbum } from "@/lib/photos/albums";

const albums: PhotoAlbum[] = [
  {
    id: "draft-album",
    data: {
      title: "未批准相册",
      description: "不进入生产",
      date: new Date("2026-09-10"),
      tags: [],
      draft: true,
      approved: false,
      cover: "/photos/draft.webp",
    },
  },
  {
    id: "older-album",
    data: {
      title: "旧相册",
      description: "第二条",
      date: new Date("2026-08-01"),
      tags: ["城市"],
      draft: false,
      approved: true,
      cover: "/photos/older.webp",
    },
  },
  {
    id: "newer-album",
    data: {
      title: "新相册",
      description: "第一条",
      date: new Date("2026-09-01"),
      updated: new Date("2026-09-12"),
      tags: ["旅行"],
      draft: false,
      approved: true,
      cover: "/photos/newer.webp",
      coverAlt: "新相册封面描述",
    },
  },
];

describe("photos album helpers", () => {
  it("keeps only approved public albums sorted newest first", () => {
    expect(publishableAlbums(albums).map((album) => album.id)).toEqual(["newer-album", "older-album"]);
  });

  it("splits the newest album as the editorial feature", () => {
    const { featured, recent } = splitAlbums(albums);
    expect(featured?.id).toBe("newer-album");
    expect(recent.map((album) => album.id)).toEqual(["older-album"]);
  });

  it("builds lightbox items with explicit cover alt text", () => {
    expect(albumLightboxItems(albums)).toEqual([
      {
        slug: "newer-album",
        title: "新相册",
        src: "/photos/newer.webp",
        alt: "新相册封面描述",
        description: "第一条",
      },
      {
        slug: "older-album",
        title: "旧相册",
        src: "/photos/older.webp",
        alt: "旧相册",
        description: "第二条",
      },
    ]);
  });

  it("uses the latest update date when present", () => {
    expect(latestAlbumDate(albums)?.toISOString()).toBe(new Date("2026-09-12").toISOString());
  });
});
