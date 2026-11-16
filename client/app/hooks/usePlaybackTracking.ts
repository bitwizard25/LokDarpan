import { useEffect, useRef } from "react";
import { track, flush, type Tracking } from "~/lib/tracker.client";
import { createPlaybackMeter, type PlaybackMeter } from "~/lib/playback-meter";

export interface UsePlaybackTrackingOptions {
  video: string;
  durationSeconds: number;
  rec?: Tracking;
}

export function usePlaybackTracking(
  videoEl: HTMLVideoElement | null,
  options: UsePlaybackTrackingOptions
) {
  const { video, durationSeconds, rec } = options;
  const startedRef = useRef(false);
  const meterRef = useRef<PlaybackMeter | null>(null);

  useEffect(() => {
    startedRef.current = false;
    meterRef.current = createPlaybackMeter({ durationSeconds: durationSeconds || 0 });
  }, [video, durationSeconds]);

  useEffect(() => {
    if (!videoEl || typeof window === "undefined") return;

    const surface = rec?.surface || "other";

    const handlePlaying = () => {
      if (!startedRef.current) {
        startedRef.current = true;
        track({
          type: "play_start",
          video,
          surface,
          requestId: rec?.requestId,
          position: rec?.position,
          source: rec?.source,
          positionSeconds: Math.floor(videoEl.currentTime),
        });
      }
    };

    const handleTimeUpdate = () => {
      if (!meterRef.current) return;
      const isVisible = document.visibilityState === "visible";
      const events = meterRef.current.onTime(videoEl.currentTime, isVisible);

      for (const ev of events) {
        if (ev === "heartbeat") {
          const delta = meterRef.current.takeDelta();
          if (delta > 0) {
            track({
              type: "watch_progress",
              video,
              surface,
              requestId: rec?.requestId,
              position: rec?.position,
              source: rec?.source,
              watchSeconds: delta,
              positionSeconds: Math.floor(videoEl.currentTime),
            });
          }
        } else if (ev === "view") {
          track({
            type: "view",
            video,
            surface,
            requestId: rec?.requestId,
            position: rec?.position,
            source: rec?.source,
          });
        }
      }
    };

    const handlePause = () => {
      if (!meterRef.current) return;
      const delta = meterRef.current.takeDelta();
      if (delta > 0) {
        track({
          type: "watch_progress",
          video,
          surface,
          requestId: rec?.requestId,
          position: rec?.position,
          source: rec?.source,
          watchSeconds: delta,
          positionSeconds: Math.floor(videoEl.currentTime),
        });
      }
    };

    const handleEnded = () => {
      track({
        type: "play_end",
        video,
        surface,
        requestId: rec?.requestId,
        position: rec?.position,
        source: rec?.source,
        positionSeconds: Math.floor(videoEl.currentTime),
      });
    };

    videoEl.addEventListener("playing", handlePlaying);
    videoEl.addEventListener("timeupdate", handleTimeUpdate);
    videoEl.addEventListener("pause", handlePause);
    videoEl.addEventListener("ended", handleEnded);

    return () => {
      videoEl.removeEventListener("playing", handlePlaying);
      videoEl.removeEventListener("timeupdate", handleTimeUpdate);
      videoEl.removeEventListener("pause", handlePause);
      videoEl.removeEventListener("ended", handleEnded);

      if (meterRef.current) {
        const delta = meterRef.current.takeDelta();
        if (delta > 0) {
          track({
            type: "watch_progress",
            video,
            surface,
            requestId: rec?.requestId,
            position: rec?.position,
            source: rec?.source,
            watchSeconds: delta,
            positionSeconds: Math.floor(videoEl.currentTime),
          });
        }
      }
      flush(true);
    };
  }, [videoEl, video, rec]);
}
