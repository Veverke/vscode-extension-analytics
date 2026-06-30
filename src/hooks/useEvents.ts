import { useState, useEffect } from 'react';
import type { EventAnnotation } from '../types/schema';
import { loadData } from '../utils/dataLoader';

export interface UseEventsResult {
  events: EventAnnotation[];
  loading: boolean;
  error: string | null;
}

export function useEvents(): UseEventsResult {
  const [events, setEvents] = useState<EventAnnotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadData<EventAnnotation[]>('./data/events.json', {
      tolerate404: true,
    })
      .then((data) => {
        if (cancelled) return;
        setEvents(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : 'Failed to load events';
        setError(message);
        setEvents([]);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { events, loading, error };
}