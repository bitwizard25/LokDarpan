import { useEffect, useRef } from "react";
import { track, type Tracking } from "~/lib/tracker.client";

const sentImpressions = new Set<string>();

export function useImpression(
  ref: React.RefObject<Element | null>,
  tracking?: Tracking,
  videoId?: string
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (
      !tracking ||
      !videoId ||
      typeof window === "undefined" ||
      !("IntersectionObserver" in window)
    ) {
      return;
    }

    const key = `${tracking.requestId}:${videoId}`;
    if (sentImpressions.has(key)) {
      return;
    }

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          if (!timerRef.current && !sentImpressions.has(key)) {
            timerRef.current = setTimeout(() => {
              timerRef.current = null;
              if (!sentImpressions.has(key)) {
                sentImpressions.add(key);
                track({
                  type: "impression",
                  video: videoId,
                  surface: tracking.surface,
                  requestId: tracking.requestId,
                  position: tracking.position,
                  source: tracking.source,
                });
              }
            }, 1000);
          }
        } else {
          if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
          }
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [ref, tracking, videoId]);
}
