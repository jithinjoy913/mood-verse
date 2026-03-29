import { logEvent } from 'firebase/analytics';
import { analytics } from '../lib/firebase';

const EVENT_LOG_KEY = 'moodverse_event_log_v1';

type EventPayload = Record<string, string | number | boolean | null | undefined>;

function appendLocalEvent(name: string, params?: EventPayload) {
  try {
    const currentRaw = window.localStorage.getItem(EVENT_LOG_KEY);
    const current = currentRaw ? (JSON.parse(currentRaw) as Array<Record<string, unknown>>) : [];
    const next = [
      ...current.slice(-199),
      {
        name,
        params: params ?? {},
        at: new Date().toISOString()
      }
    ];
    window.localStorage.setItem(EVENT_LOG_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage failures.
  }
}

export function trackEvent(name: string, params?: EventPayload) {
  appendLocalEvent(name, params);
  try {
    logEvent(analytics, name, params);
  } catch {
    // Analytics can be unavailable in some environments.
  }
}

export function exportLocalAnalyticsLog(): string {
  const currentRaw = window.localStorage.getItem(EVENT_LOG_KEY);
  return currentRaw ?? '[]';
}
