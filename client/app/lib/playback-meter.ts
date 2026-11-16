export type PlaybackMeterEvent = 'heartbeat' | 'view';

export interface PlaybackMeter {
  onTime(currentTime: number, visible: boolean): PlaybackMeterEvent[];
  takeDelta(): number;
}

export interface PlaybackMeterOptions {
  durationSeconds: number;
}

export function createPlaybackMeter({ durationSeconds }: PlaybackMeterOptions): PlaybackMeter {
  let lastTime: number | null = null;
  let accumulatedDelta = 0;
  let heartbeatAccumulator = 0;
  let totalWatchedSeconds = 0;
  let viewEmitted = false;

  const viewThreshold = Math.min(30, (durationSeconds > 0 ? durationSeconds : 60) * 0.5);

  return {
    onTime(currentTime: number, visible: boolean): PlaybackMeterEvent[] {
      const events: PlaybackMeterEvent[] = [];

      if (lastTime !== null && visible) {
        const delta = currentTime - lastTime;
        if (delta > 0 && delta <= 2) {
          accumulatedDelta += delta;
          heartbeatAccumulator += delta;
          totalWatchedSeconds += delta;

          if (heartbeatAccumulator >= 10) {
            heartbeatAccumulator -= 10;
            events.push('heartbeat');
          }

          if (!viewEmitted && totalWatchedSeconds >= viewThreshold) {
            viewEmitted = true;
            events.push('view');
          }
        }
      }

      lastTime = currentTime;
      return events;
    },

    takeDelta(): number {
      const delta = accumulatedDelta;
      accumulatedDelta = 0;
      return Math.min(15, Math.max(0, Math.round(delta * 10) / 10));
    },
  };
}
