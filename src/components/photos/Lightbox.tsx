import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { adjacentIndices } from "@/lib/photos/lightboxPreload";
import "@/components/photos/lightbox.css";

export type LightboxItem = {
  slug: string;
  title: string;
  src: string;
  alt: string;
  description?: string;
};

type Props = {
  items: LightboxItem[];
};

const PRESS_TRANSITION = { type: "spring", duration: 0.4, bounce: 0.2 } as const;

/**
 * 相册灯箱（D-123/D-031）：原生 <dialog> + motion 遮罩。
 * 点击 EntryList 中的 .entry-cover 打开，Esc / 点击遮罩关闭，方向键切换相册内图片。
 * 交互走原生监听器（React 事件委托在 astro-island 根上不可靠），alt 必填（D-031）。
 */
export default function Lightbox({ items }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const [index, setIndex] = useState(-1);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (index < 0) return;
    for (const adjacentIndex of adjacentIndices(index, items.length)) {
      const image = new Image();
      image.src = items[adjacentIndex].src;
    }
  }, [index, items]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (index >= 0) {
      dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [index]);

  const step = (delta: number) => {
    if (items.length === 0) return;
    setIndex((current) => (current + delta + items.length) % items.length);
  };

  // 打开：委托点击 EntryList 的封面缩略图
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const link = target?.closest?.("a.entry-link");
      if (!link) return;
      const match = link.getAttribute("href")?.match(/\/photos\/([^/?#]+)/);
      if (!match) return;
      const found = items.findIndex((item) => item.slug === match[1]);
      if (found < 0) return;
      event.preventDefault();
      setIndex(found);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [items]);

  // 关闭与切换：dialog 交互走原生监听（React 事件委托在 island 根不可靠）
  useEffect(() => {
    const dialog = dialogRef.current;
    const backdrop = backdropRef.current;
    const closeBtn = closeRef.current;
    const prevBtn = prevRef.current;
    const nextBtn = nextRef.current;
    if (!dialog) return;

    const onCancel = (event: Event) => {
      event.preventDefault();
      setIndex(-1);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
    };
    const onBackdrop = () => setIndex(-1);

    dialog.addEventListener("cancel", onCancel);
    dialog.addEventListener("keydown", onKeyDown);
    backdrop?.addEventListener("click", onBackdrop);
    closeBtn?.addEventListener("click", onBackdrop);
    prevBtn?.addEventListener("click", () => step(-1));
    nextBtn?.addEventListener("click", () => step(1));
    return () => {
      dialog.removeEventListener("cancel", onCancel);
      dialog.removeEventListener("keydown", onKeyDown);
      backdrop?.removeEventListener("click", onBackdrop);
      closeBtn?.removeEventListener("click", onBackdrop);
      prevBtn?.removeEventListener("click", () => step(-1));
      nextBtn?.removeEventListener("click", () => step(1));
    };
  }, [items.length]);

  const current = index >= 0 ? items[index] : null;

  return (
    <dialog ref={dialogRef} className="lightbox" aria-label="照片灯箱">
      <motion.div
        ref={backdropRef}
        className="lightbox__backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        aria-hidden="true"
      />
      <div className="lightbox__frame">
        <AnimatePresence mode="wait">
          {current && (
            <motion.figure
              key={current.slug}
              className="lightbox__figure"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.28, ease: [0.6, 0, 0, 0.6] }}
            >
              <img src={current.src} alt={current.alt} />
              <figcaption>
                <strong>{current.title}</strong>
                {current.description && <span>{current.description}</span>}
              </figcaption>
            </motion.figure>
          )}
        </AnimatePresence>
        {items.length > 1 && (
          <>
            <motion.button
              ref={prevRef}
              type="button"
              className="lightbox__nav lightbox__nav--prev"
              aria-label="上一张"
              whileTap={reduced ? undefined : { opacity: 0.6 }}
              transition={reduced ? undefined : PRESS_TRANSITION}
            >
              ←
            </motion.button>
            <motion.button
              ref={nextRef}
              type="button"
              className="lightbox__nav lightbox__nav--next"
              aria-label="下一张"
              whileTap={reduced ? undefined : { opacity: 0.6 }}
              transition={reduced ? undefined : PRESS_TRANSITION}
            >
              →
            </motion.button>
          </>
        )}
        <motion.button
          ref={closeRef}
          type="button"
          className="lightbox__close"
          aria-label="关闭灯箱"
          whileTap={reduced ? undefined : { opacity: 0.6 }}
          transition={reduced ? undefined : PRESS_TRANSITION}
        >
          ✕
        </motion.button>
      </div>
    </dialog>
  );
}
