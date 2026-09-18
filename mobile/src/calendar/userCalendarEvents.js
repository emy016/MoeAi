/** Persistent user-owned calendar events. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { CalendarKind, sameDay } from './calendarModel';
import { AsyncStorage, readStoredValue, storageKey } from '../storage/persistedStorage';

const STORAGE_KEY = storageKey('user-calendar-events-v1');

function hydrate(raw) {
  try {
    const parsed = JSON.parse(raw || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((object) => {
      if (!object || typeof object !== 'object') return [];
      const start = new Date(object.start);
      const end = new Date(object.end);
      if (!object?.id || !object?.title || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
      return [{ ...object, start, end, rangeMarkerTimes: object.rangeMarkerTimes ? { start: new Date(object.rangeMarkerTimes.start), end: new Date(object.rangeMarkerTimes.end) } : undefined }];
    });
  } catch (_) {
    return [];
  }
}

function persist(events) {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(events)).catch(() => {});
}

function persistAfterInteraction(events) {
  setTimeout(() => persist(events), 0);
}

export function makeUserCalendarEvent({ title, start, end }) {
  const begins = new Date(start);
  const finishes = new Date(end);
  const multiDay = !sameDay(begins, finishes);
  return {
    id: `user-event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind: CalendarKind.EVENT,
    userCreated: true,
    title: title.trim(),
    description: 'Lorem Ipsum',
    start: begins,
    end: finishes,
    lineOnly: multiDay,
    rangeMarkers: multiDay ? { start: CalendarKind.EVENT, end: CalendarKind.EVENT } : undefined,
    rangeMarkerTimes: multiDay ? { start: begins, end: finishes } : undefined,
  };
}

export function useUserCalendarEvents() {
  const [events, setEvents] = useState([]);
  const eventsRef = useRef([]);
  const pendingRef = useRef([]);

  useEffect(() => {
    let active = true;
    readStoredValue(STORAGE_KEY).then((raw) => {
      if (!active) return;
      const stored = hydrate(raw);
      setEvents((current) => {
        const merged = [...stored, ...current].filter((event, index, all) => all.findIndex((entry) => entry.id === event.id) === index);
        eventsRef.current = merged;
        if (pendingRef.current.length) persistAfterInteraction(merged);
        return merged;
      });
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  const addEvent = useCallback((draft) => {
    const event = makeUserCalendarEvent(draft);
    pendingRef.current.push(event.id);
    const next = [...eventsRef.current, event];
    eventsRef.current = next;
    setEvents(next);
    persistAfterInteraction(next);
    return event;
  }, []);

  const removeEvent = useCallback((id) => {
    const next = eventsRef.current.filter((event) => event.id !== id);
    eventsRef.current = next;
    setEvents(next);
    persistAfterInteraction(next);
  }, []);

  return { events, addEvent, removeEvent };
}
