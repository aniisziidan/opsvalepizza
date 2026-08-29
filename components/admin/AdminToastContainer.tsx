'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AdminRealtimeEvent } from '@/lib/notifications/events';

interface ActiveToast extends AdminRealtimeEvent {
  dismissTimerId?: NodeJS.Timeout;
}

export const AdminToastContainer: React.FC = () => {
  const router = useRouter();
  const [toasts, setToasts] = useState<ActiveToast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => {
      const target = prev.find((t) => t.id === id);
      if (target?.dismissTimerId) {
        clearTimeout(target.dismissTimerId);
      }
      return prev.filter((t) => t.id !== id);
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let isUnmounted = false;

    const connectSSE = () => {
      if (isUnmounted) return;

      try {
        eventSource = new EventSource('/api/admin/notifications/stream');

        eventSource.addEventListener('notification', (e: MessageEvent) => {
          try {
            const data: AdminRealtimeEvent = JSON.parse(e.data);

            const timerId = setTimeout(() => {
              dismissToast(data.id);
            }, 7000);

            const newToast: ActiveToast = {
              ...data,
              dismissTimerId: timerId,
            };

            setToasts((prev) => [newToast, ...prev.slice(0, 4)]); // max 5 concurrent toasts
          } catch {
            // parsing error ignored
          }
        });

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          if (!isUnmounted) {
            reconnectTimeout = setTimeout(connectSSE, 5000); // retry after 5s
          }
        };
      } catch {
        if (!isUnmounted) {
          reconnectTimeout = setTimeout(connectSSE, 5000);
        }
      }
    };

    connectSSE();

    return () => {
      isUnmounted = true;
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [dismissToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none font-mono-data text-xs">
      {toasts.map((toast) => {
        const isAccept = toast.type === 'PROPOSAL_ACCEPTED';
        const isModify = toast.type === 'PROPOSAL_MODIFIED';
        const isDecline = toast.type === 'PROPOSAL_DECLINED';
        const isLead = toast.type === 'NEW_LEAD';

        const borderColor = isAccept
          ? 'border-emerald-500 bg-white shadow-emerald-900/10'
          : isModify
          ? 'border-amber-500 bg-white shadow-amber-900/10'
          : isDecline
          ? 'border-red-500 bg-white shadow-red-900/10'
          : isLead
          ? 'border-[#041632] bg-white shadow-blue-900/10'
          : 'border-[#e77114] bg-white shadow-orange-900/10';

        const icon = isAccept
          ? 'check_circle'
          : isModify
          ? 'edit_note'
          : isDecline
          ? 'cancel'
          : isLead
          ? 'group_add'
          : 'notifications_active';

        const iconColor = isAccept
          ? 'text-emerald-600'
          : isModify
          ? 'text-amber-600'
          : isDecline
          ? 'text-red-600'
          : 'text-[#e77114]';

        return (
          <div
            key={toast.id}
            onClick={() => {
              if (toast.href) {
                router.push(toast.href);
                dismissToast(toast.id);
              }
            }}
            className={`pointer-events-auto border-l-4 rounded-lg shadow-xl p-3.5 border transition-all duration-200 animate-in slide-in-from-right-4 fade-in cursor-pointer hover:bg-[#eff4ff] ${borderColor}`}
            role="alert"
          >
            <div className="flex items-start justify-between gap-2.5">
              <div className="flex items-start gap-2.5 min-w-0">
                <span className={`material-symbols-outlined text-xl flex-shrink-0 mt-0.5 ${iconColor}`}>
                  {icon}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-[#041632] text-xs truncate">{toast.title}</span>
                  </div>
                  <p className="font-body text-xs text-[#44474d] mt-0.5 line-clamp-2 leading-relaxed">
                    {toast.message}
                  </p>
                  {toast.leadCode && (
                    <span className="inline-block mt-1 text-[10px] text-[#75777e] font-semibold">
                      Ref: {toast.leadCode}
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  dismissToast(toast.id);
                }}
                className="text-[#75777e] hover:text-[#041632] p-1 rounded cursor-pointer transition-colors"
                aria-label="Dismiss notification"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
