import { motion, useReducedMotion } from "framer-motion";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useState } from "react";

import { initFancyboxGallery } from "~/scripts/gallery";

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

type Wallpaper = {
  id: string;
  href: string;
  src: string;
  width: number;
  height: number;
  blurDataUrl?: string | null;
  size?: number;
};

const PRIORITY_IMAGE_COUNT = 15;

export function MotionGallery({
  wallpapers,
  galleryId = "photoswipe",
}: {
  wallpapers: Wallpaper[];
  galleryId?: string;
}) {
  const shouldReduceMotion = useReducedMotion();
  const [loadedIds, setLoadedIds] = useState<Set<string>>(() => new Set());
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const markLoaded = useCallback((id: string) => {
    setLoadedIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  useEffect(() => {
    initFancyboxGallery(galleryId, { shuffle: true });
  }, [galleryId]);

  return (
    <section className="justified-gallery" id={galleryId}>
      {wallpapers.map((img, index) => {
        const isLoaded = shouldReduceMotion || loadedIds.has(img.id);
        const isPriorityImage = index < PRIORITY_IMAGE_COUNT;
        const style: CSSProperties = {
          // CSS custom properties for flex layout
          ["--width" as string]: img.width,
          ["--height" as string]: img.height,
          // Blur placeholder as background
          ...(img.blurDataUrl && {
            backgroundImage: `url(${img.blurDataUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }),
        };

        return (
          <motion.a
            key={img.id}
            style={style}
            href={img.href}
            target="_blank"
            data-fancybox="gallery"
            initial={
              shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.98 }
            }
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.05 }}
            transition={{
              duration: 0.8,
              ease: [0.21, 0.47, 0.32, 0.98],
              delay: (index % 4) * 0.05,
            }}
            onMouseEnter={() => setHoveredId(img.id)}
            onMouseLeave={() => setHoveredId(null)}
            className="gallery-item"
          >
            <img
              src={img.src}
              alt=""
              width={img.width}
              height={img.height}
              style={
                shouldReduceMotion
                  ? { opacity: 1, filter: "none" }
                  : {
                      opacity: isLoaded ? 1 : 0,
                      filter: isLoaded ? "blur(0px)" : "blur(14px)",
                      transition:
                        "opacity 700ms cubic-bezier(0.21, 0.47, 0.32, 0.98), filter 1200ms cubic-bezier(0.21, 0.47, 0.32, 0.98)",
                    }
              }
              ref={(el) => {
                if (!el) return;
                if (el.complete && el.naturalWidth > 0) {
                  markLoaded(img.id);
                }
              }}
              onLoad={() => markLoaded(img.id)}
              onError={() => markLoaded(img.id)}
              loading={isPriorityImage ? "eager" : "lazy"}
              decoding="async"
              fetchPriority={isPriorityImage ? "high" : "auto"}
            />
            {hoveredId === img.id && (
              <div className="image-info">
                <div className="image-info-dimensions">
                  {img.height}×{img.width}
                </div>
                {img.size && (
                  <div className="image-info-size">
                    {formatFileSize(img.size)}
                  </div>
                )}
              </div>
            )}
          </motion.a>
        );
      })}
    </section>
  );
}
