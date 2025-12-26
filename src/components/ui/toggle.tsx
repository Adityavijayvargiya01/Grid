import * as TogglePrimitive from "@radix-ui/react-toggle";
import type * as React from "react";

function Toggle({
  className,
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root>) {
  return (
    <TogglePrimitive.Root data-slot="toggle" className={className} {...props} />
  );
}

export { Toggle };
