import { useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';

const HUB_URL = '/hubs/attendance';

/**
 * Custom hook that connects to the SignalR AttendanceHub.
 * Calls `onAttendanceRegistered` every time a student checks in,
 * so the Admin Dashboard can refresh its data instantly.
 */
export function useAttendanceHub(onAttendanceRegistered: () => void) {
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const callbackRef = useRef(onAttendanceRegistered);

  // Keep the callback ref up to date without restarting the connection
  useEffect(() => {
    callbackRef.current = onAttendanceRegistered;
  }, [onAttendanceRegistered]);

  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, {
        skipNegotiation: false,
        transport: signalR.HttpTransportType.WebSockets |
                   signalR.HttpTransportType.LongPolling
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connectionRef.current = connection;

    // Listen for the event broadcasted by AttendanceService
    connection.on('AttendanceRegistered', () => {
      callbackRef.current();
    });

    // Start the connection
    connection.start().catch((err) => {
      console.warn('[SignalR] Could not connect:', err);
    });

    // Clean up on unmount
    return () => {
      connection.stop().catch(() => {});
    };
  }, []);
}
