'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { markNotificationReadAction, markAllNotificationsReadAction } from '@/lib/notifications/actions';
import { timeAgo } from '@/lib/admin/formatters';

interface NotificationItem {
  id: string;
  type: string;
  category: string;
  priority: string;
  title: string;
  message: string;
  actionUrl: string | null;
  readAt: string | null;
  createdAt: string;
}

export const AdminNotificationBell: React.FC = () => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchUnread = async () => {
    try {
      const res = await fetch('/api/admin/notifications/unread-count');
      if (!res.ok) return;
      const data = await res.json();
      setUnreadCount(data.unreadCount || 0);
      setNotifications(data.latestItems || []);
    } catch {
      // Graceful fallback
    }
  };

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000); // 15s reactive refresh
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = () => {
    startTransition(async () => {
      try {
        await markAllNotificationsReadAction();
        setUnreadCount(0);
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, readAt: new Date().toISOString() }))
        );
      } catch (err) {
        console.error('Failed to mark all as read:', err);
      }
    });
  };

  const handleItemClick = (item: NotificationItem) => {
    startTransition(async () => {
      try {
        if (!item.readAt) {
          await markNotificationReadAction(item.id);
          setUnreadCount((c) => Math.max(0, c - 1));
          setNotifications((prev) =>
            prev.map((n) => (n.id === item.id ? { ...n, readAt: new Date().toISOString() } : n))
          );
        }
        setIsOpen(false);
        if (item.actionUrl) {
          router.push(item.actionUrl);
        }
      } catch (err) {
        console.error('Failed to mark item read:', err);
      }
    });
  };

  const getCategoryIcon = (category: string, priority: string) => {
    if (priority === 'CRITICAL') return { icon: 'error', color: 'text-red-600 bg-red-100' };
    switch (category) {
      case 'CUSTOMER_ACTIVITY':
        return { icon: 'person', color: 'text-[#e77114] bg-orange-100' };
      case 'PROPOSAL':
        return { icon: 'request_quote', color: 'text-blue-600 bg-blue-100' };
      case 'QUOTE':
        return { icon: 'description', color: 'text-indigo-600 bg-indigo-100' };
      case 'PRICING':
        return { icon: 'price_change', color: 'text-emerald-600 bg-emerald-100' };
      case 'LOGISTICS':
        return { icon: 'local_shipping', color: 'text-cyan-600 bg-cyan-100' };
      case 'SYSTEM':
        return { icon: 'dns', color: 'text-amber-600 bg-amber-100' };
      default:
        return { icon: 'notifications', color: 'text-[#8393b5] bg-gray-100' };
    }
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchUnread();
        }}
        aria-label="Notifications"
        aria-expanded={isOpen}
        className="relative p-2 text-[#4f5e7e] hover:text-[#041632] hover:bg-[#f8f9ff] rounded-lg transition-colors cursor-pointer border border-transparent hover:border-[#c5c6ce] flex items-center justify-center"
      >
        <span className="material-symbols-outlined text-2xl">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-[#e77114] text-white text-[10px] font-bold font-mono-data px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-xs border-2 border-white animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-[#c5c6ce] rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 font-mono-data text-xs">
          {/* Header */}
          <div className="p-3.5 bg-[#041632] text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-headline font-bold text-sm">Notifications</span>
              {unreadCount > 0 && (
                <span className="bg-[#e77114] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={isPending}
                className="text-[10px] text-[#ffdeac] hover:text-white underline cursor-pointer disabled:opacity-50"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* List Body */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-[#e2e4ef]">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-[#75777e] space-y-2">
                <span className="material-symbols-outlined text-3xl text-[#c5c6ce]">notifications_off</span>
                <p className="text-xs font-medium">You&apos;re all caught up.</p>
                <p className="text-[10px] text-[#8393b5]">No unread alerts or customer activities.</p>
              </div>
            ) : (
              notifications.map((item) => {
                const { icon, color } = getCategoryIcon(item.category, item.priority);
                const isUnread = !item.readAt;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className={`p-3.5 hover:bg-[#eff4ff] transition-colors cursor-pointer flex items-start gap-3 text-left ${
                      isUnread ? 'bg-[#f8f9ff]' : 'bg-white opacity-85'
                    }`}
                  >
                    {/* Icon */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                      <span className="material-symbols-outlined text-lg">{icon}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className={`font-semibold text-xs truncate ${isUnread ? 'text-[#041632]' : 'text-[#44474d]'}`}>
                          {item.title}
                        </span>
                        {isUnread && (
                          <span className="w-2 h-2 bg-[#e77114] rounded-full flex-shrink-0" />
                        )}
                      </div>

                      <p className="text-[#4f5e7e] text-[11px] line-clamp-2 leading-relaxed font-body">
                        {item.message}
                      </p>

                      <div className="flex items-center gap-2 mt-1 text-[10px] text-[#75777e]">
                        <span>{timeAgo(new Date(item.createdAt))}</span>
                        {item.priority === 'CRITICAL' && (
                          <span className="bg-red-100 text-red-700 font-bold px-1.5 py-0.2 rounded text-[9px]">
                            CRITICAL
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-[#f8f9ff] border-t border-[#e2e4ef] text-center">
            <Link
              href="/admin/notifications"
              onClick={() => setIsOpen(false)}
              className="text-[#041632] hover:text-[#e77114] font-bold text-[11px] block transition-colors cursor-pointer"
            >
              View Full Notification Center &rarr;
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
