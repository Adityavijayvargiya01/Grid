import { Fancybox } from "@fancyapps/ui/dist/fancybox/"

function shuffleInPlace<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = items[i]
    items[i] = items[j] as T
    items[j] = tmp as T
  }
  return items
}

export function initFancyboxGallery(
  galleryId = "photoswipe",
  options?: { shuffle?: boolean }
) {
  const gallery = document.getElementById(galleryId)
  if (gallery) {
    const links = Array.from(
      gallery.querySelectorAll<HTMLAnchorElement>("a[data-fancybox]")
    )

    const shouldShuffle = options?.shuffle ?? true
    if (shouldShuffle) {
      shuffleInPlace(links)
      for (const link of links) gallery.appendChild(link)
    }
  }

  Fancybox.bind("[data-fancybox]", {
    theme: "auto",
    mainStyle: {
      "--f-button-width": "44px",
      "--f-button-height": "44px",
      "--f-button-border-radius": "50%",
      "--f-toolbar-padding": "16px",
    },
    Carousel: {
      Arrows: false,
      Toolbar: {
        display: {
          left: [],
          middle: [],
          right: ["close"],
        },
      },
      transition: "slide",
    },
  })
}
