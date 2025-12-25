import * as React from "react"

import { Slider } from "~/components/ui/slider"

type ImageScaleSliderProps = {
  targetId?: string
  /** Default row/image height in px (controls perceived scale). */
  defaultPx?: number
  minPx?: number
  maxPx?: number
  stepPx?: number
}

export function ImageScaleSlider({
  targetId = "photoswipe",
  defaultPx = 300,
  minPx = 200,
  maxPx = 520,
  stepPx = 10,
}: ImageScaleSliderProps) {
  const [px, setPx] = React.useState(defaultPx)

  React.useEffect(() => {
    const el = document.getElementById(targetId)
    if (!el) return

    el.style.setProperty("--gallery-min-height", `${px}px`)
  }, [px, targetId])

  return (
    <div>
      <Slider
        aria-label="Image scale"
        min={minPx}
        max={maxPx}
        step={stepPx}
        value={[px]}
        onValueChange={(v) => setPx(v[0] ?? defaultPx)}
      />
    </div>
  )
}
