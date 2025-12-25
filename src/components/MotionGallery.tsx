import type { CSSProperties } from "react";
import { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { initFancyboxGallery } from "~/scripts/gallery";

type Wallpaper = {
  id: string;
  href: string;
  src: string;
  width: number;
  height: number;
  blurDataUrl?: string | null;
};

export function MotionGallery({
  wallpapers,
  galleryId = "photoswipe",
}: {
  wallpapers: Wallpaper[];
  galleryId?: string;
}) {
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    initFancyboxGallery(galleryId, { shuffle: true });
  }, [galleryId]);

return (
    <section className="justified-gallery" id={galleryId}>
        {wallpapers.map((img, index) => {
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
                    initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.98 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, amount: 0.05 }}
                    transition={{ 
                        duration: 0.8, 
                        ease: [0.21, 0.47, 0.32, 0.98],
                        delay: (index % 4) * 0.05 
                    }}
                >
                    <img
                        src={img.src}
                        alt=""
                        width={img.width}
                        height={img.height}
                        loading={index < 6 ? "eager" : "lazy"}
                        decoding="async"
                        fetchPriority={index < 4 ? "high" : "auto"}
                    />
                </motion.a>
            );
        })}
    </section>
);
}
