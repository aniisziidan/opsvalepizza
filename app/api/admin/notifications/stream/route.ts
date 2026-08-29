import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { subscribeAdminNotifications, AdminRealtimeEvent } from '@/lib/notifications/events';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection packet
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ status: 'connected', time: new Date().toISOString() })}\n\n`)
      );

      // Listener for real-time notifications
      const unsubscribe = subscribeAdminNotifications((evt: AdminRealtimeEvent) => {
        try {
          const payload = `event: notification\ndata: ${JSON.stringify(evt)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {
          // Stream closed
        }
      });

      // 15-second heartbeat to keep connection alive through reverse proxies
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch {
          clearInterval(heartbeatInterval);
        }
      }, 15000);

      // Cleanup when client disconnects
      req.signal.addEventListener('abort', () => {
        unsubscribe();
        clearInterval(heartbeatInterval);
        try {
          controller.close();
        } catch {
          // ignore
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform, must-revalidate',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
