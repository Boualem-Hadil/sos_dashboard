import { useEffect, useRef } from 'react';
import { createSSEConnection } from '@/lib/api';

export function useSSE(
  companyId: string | null,
  token: string | null,
  onEvent: (type: string, data: unknown) => void
) {
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!companyId || !token) return;

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Open new connection
    const eventSource = createSSEConnection(
      companyId,
      token,
      onEvent,
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