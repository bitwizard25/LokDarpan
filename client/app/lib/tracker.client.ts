export type TrackingSurface = 'home' | 'related' | 'search' | 'channel' | 'shorts' | 'other';

export type Tracking = {
  requestId: string;
  position: number;
  surface: TrackingSurface;
  source?: string;
};

export interface TrackEventInput {
  type: 'impression' | 'click' | 'play_start' | 'watch_progress' | 'play_end' | 'view';
  video: string;
  surface?: TrackingSurface;
  requestId?: string;
  position?: number;
  source?: string;
  watchSeconds?: number;
  positionSeconds?: number;
}

interface QueuedEvent {
  eventId: string;
  type: string;
  video: string;
  surface?: TrackingSurface;
  requestId?: string;
  position?: number;
  source?: string;
  watchSeconds?: number;
  positionSeconds?: number;
  clientTs: string;
}

let memorySessionId: string | null = null;
const queue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

export function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  if (memorySessionId) return memorySessionId;
  try {
    const existing = window.localStorage.getItem('ld_sid');
    if (existing) {
      memorySessionId = existing;
      return existing;
    }
    const newId = crypto.randomUUID();
    window.localStorage.setItem('ld_sid', newId);
    memorySessionId = newId;
    return newId;
  } catch {
    if (!memorySessionId) {
      memorySessionId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : Math.random().toString(36).substring(2);
    }
    return memorySessionId;
  }
}

export function flush(useBeacon = false): void {
  if (typeof window === 'undefined' || queue.length === 0) return;
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  const batch = queue.splice(0, 50);
  const sessionId = getSessionId();
  const payload = JSON.stringify({ sessionId, events: batch });

  if (useBeacon && typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    try {
      const blob = new Blob([payload], { type: 'application/json' });
      const sent = navigator.sendBeacon('/api/events', blob);
      if (sent) return;
    } catch {
      // Fall through to fetch
    }
  }

  fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => {
    // Non-blocking tracking failure
  });
}

export function track(input: TrackEventInput): void {
  if (typeof window === 'undefined') return;

  const event: QueuedEvent = {
    eventId: crypto.randomUUID(),
    type: input.type,
    video: input.video,
    surface: input.surface || 'other',
    clientTs: new Date().toISOString(),
  };

  if (input.requestId) event.requestId = input.requestId;
  if (typeof input.position === 'number') event.position = input.position;
  if (input.source) event.source = input.source;
  if (typeof input.watchSeconds === 'number') event.watchSeconds = input.watchSeconds;
  if (typeof input.positionSeconds === 'number') event.positionSeconds = input.positionSeconds;

  queue.push(event);

  if (queue.length >= 20) {
    flush();
  } else if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flush();
    }, 5000);
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => flush(true));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flush(true);
    }
  });
}
