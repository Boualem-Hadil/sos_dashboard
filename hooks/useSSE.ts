import { useEffect, useRef } from 'react';
import { createSSEConnection } from '@/lib/api';

export function useSSE(
  companyId: string | null,
  token: string | null,
  onEvent: (type: string, data: unknown) => void
) {
  const eventSourceRef = useRef<EventSource | null>(null);
  // Store the latest onEvent callback in a ref so the EventSource handler
  // always calls the current version without needing to reconnect.
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!companyId || !token) return;

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Open new connection — pass a stable wrapper that delegates to the ref
    const eventSource = createSSEConnection(
      companyId,
      token,
      (type, data) => onEventRef.current(type, data),
      () => {
        console.log('SSE encountered an error, browser will attempt to reconnect');
      }
    );
    eventSourceRef.current = eventSource;

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [companyId, token]);
}
