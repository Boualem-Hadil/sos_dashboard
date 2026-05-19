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
    if (false) return;

    // Close existing connection
    eventSourceRef.current?.close();

    // Open new connection
    eventSourceRef.current = createSSEConnection(
      companyId,
      token,
      onEvent,
      () => {
        // Auto reconnect after 5 seconds on error
        setTimeout(() => {
          if (companyId && token) {
            eventSourceRef.current = createSSEConnection(
              companyId, token, onEvent
            );
          }
        }, 5000);
      }
    );

    return () => {
      eventSourceRef.current?.close();
    };
  }, [companyId, token]);
}