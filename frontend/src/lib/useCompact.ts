import { useSyncExternalStore } from "react";

const PHONE = "(max-width: 560px)";

// True on phone-sized screens, so charts can drop their end labels and give the plot more room.
// useSyncExternalStore re-renders the chart whenever the screen crosses that width.
export function useCompact(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(PHONE);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    () => window.matchMedia(PHONE).matches,
  );
}
