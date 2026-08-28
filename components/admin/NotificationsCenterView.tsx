'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { markNotificationReadAction, markAllNotificationsReadAction } from '@/lib/notifications/actions';
import { timeAgo, formatDateTime } from '@/lib/admin/formatters';

interface NotificationRecord {
  id: string;
  type: string;
  category: string;
  priority: string;
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  actionUrl: string | null;
  metadata: any;
  readAt: string | null;
  createdAt: string;
}

interface NotificationsCenterViewProps {
  notifications: NotificationRecord[];
  totalCount: number;
  unreadCount: number;
  currentPage: number;
  totalPages: number;
  selectedFilter: string;
}

export const NotificationsCenterView: React.FC<NotificationsCenterViewProps> = ({
  notifications,
  totalCount,
  unreadCount,
  currentPage,
  totalPages,
  selectedFilter,
}) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeItems, setActiveItems] = useState(notifications);

  const filterTabs = [
    { id: 'ALL', label: 'All Alerts', icon: 'notifications' },
    { id: 'UNREAD', label: `Unread (${unreadCount})`, icon: 'mark_email_unread' },
    { id: 'CUSTOMER_ACTIVITY', label: 'Customer Activity', icon: 'person' },
    { id: 'PROPOSAL', label: 'Proposals', icon: 'request_quote' },
    { id: 'QUOTE', label: 'Quotes', icon: 'description' },
    { id: 'PRICING', label: 'Pricing & Imports', icon: 'price_change' },
    { id: 'LOGISTICS', label: 'Logistics', icon: 'local_shipping' },
    { id: 'SYSTEM', label: 'System & Health', icon: 'dns' },
    { id: 'CRITICAL', label: 'Critical Only', icon: 'error' },
  ];

  const handleFilterChange = (filterId: string) => {
    const params = new URLSearchParams();
    if (filterId !== 'ALL') {
      params.set('filter', filterId);
    }
    params.set('page', '1');
    router.push(`/admin/notifications?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set('page', newPage.toString());
    router.push(`/admin/notifications?${params.toString()}`);
  };

  const handleMarkAllRead = () => {
    startTransition(async () => {
      try {
        await markAllNotificationsReadAction();
        router.refresh();
      } catch (err: any) {
        alert(err.message || 'Failed to mark all as read');
      }
    });
  };

  const handleMarkRead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    startTransition(async () => {
      try {
        await markNotificationReadAction(id);
        setActiveItems((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, readAt: new Date().toISOString() } : item
          )
        );
        router.refresh();
      } catch (err: any) {
        alert(err.message || 'Failed to mark read');
      }
    });
  };

  const getCategoryBadge = (category: string, priority: string) => {
    if (priority === 'CRITICAL') {
      return (
        <span className="bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded text-[10px] font-bold">
          CRITICAL
        </span>
      );
    }
    if (priority === 'HIGH') {
      return (
        <span className="bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-bold">
          HIGH
        </span>
      );
    }
    switch (category) {
      case 'CUSTOMER_ACTIVITY':
        return (
          <span className="bg-orange-100 text-[#e77114] border border-orange-200 px-2 py-0.5 rounded text-[10px] font-bold">
            CUSTOMER
          </span>
        );
      case 'PROPOSAL':
        return (
          <span className="bg-blue-100 text-blue-700 border border-blue-200 px-2 py-0.5 rounded text-[10px] font-bold">
            PROPOSAL
          </span>
        );
      case 'PRICING':
        return (
          <span className="bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold">
            PRICING
          </span>
        );
      case 'SYSTEM':
        return (
          <span className="bg-gray-100 text-gray-700 border border-gray-200 px-2 py-0.5 rounded text-[10px] font-bold">
            SYSTEM
          </span>
        );
      default:
        return (
          <span className="bg-[#f8f9ff] text-[#4f5e7e] border border-[#c5c6ce] px-2 py-0.5 rounded text-[10px] font-bold">
            {category}
          </span>
        );
    }
  };

  return (
    <div className="p-6 sm:p-10 max-w-7xl mx-auto w-full space-y-6">
      {/* Top Header & Quick Stats */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-[#c5c6ce] rounded-xl p-6 shadow-2xs">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="bg-[#041632] text-white font-mono-data text-xs px-2.5 py-1 rounded font-bold flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-[#ffdeac]">notifications</span>
              OpsVale Central Event Hub
            </span>
            {unreadCount > 0 && (
              <span className="bg-[#e77114] text-white font-mono-data text-xs px-2.5 py-0.5 rounded-full font-bold">
                {unreadCount} Unread
              </span>
            )}
          </div>
          <h1 className="font-headline text-2xl sm:text-3xl font-bold text-[#041632]">
            Notification &amp; Activity Center
          </h1>
          <p className="font-body text-xs text-[#44474d] mt-0.5">
            Real-time event stream of customer replies, proposal lifecycle changes, and operational system alerts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/settings"
            className="px-3.5 py-2 border border-[#c5c6ce] hover:bg-[#eff4ff] text-[#041632] rounded-lg font-mono-data text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-base text-[#4f5e7e]">tune</span>
            Preferences
          </Link>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={isPending}
              className="bg-[#041632] hover:bg-[#1b2b48] text-white px-4 py-2 rounded-lg font-mono-data text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base text-[#ffdeac]">done_all</span>
              Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 font-mono-data text-xs border-b border-[#c5c6ce] pb-3">
        {filterTabs.map((tab) => {
          const isActive = selectedFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleFilterChange(tab.id)}
              className={`px-3.5 py-2 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                isActive
                  ? 'bg-[#041632] text-white shadow-xs'
                  : 'bg-white border border-[#c5c6ce] text-[#4f5e7e] hover:text-[#041632] hover:bg-[#eff4ff]'
              }`}
            >
              <span className={`material-symbols-outlined text-base ${isActive ? 'text-[#ffdeac]' : 'text-[#8393b5]'}`}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Notifications List */}
      <div className="bg-white border border-[#c5c6ce] rounded-xl overflow-hidden shadow-2xs">
        {activeItems.length === 0 ? (
          <div className="p-16 text-center text-[#75777e] space-y-3 font-mono-data">
            <span className="material-symbols-outlined text-5xl text-[#c5c6ce]">notifications_off</span>
            <h3 className="text-base font-bold text-[#041632]">No notifications found</h3>
            <p className="text-xs text-[#75777e] max-w-sm mx-auto">
              There are no notifications matching the selected filter criteria. All operational events and customer activities will stream here automatically.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#e2e4ef] font-mono-data text-xs">
            {activeItems.map((item) => {
              const isUnread = !item.readAt;

              return (
                <div
                  key={item.id}
                  className={`p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors ${
                    isUnread ? 'bg-[#f8f9ff]' : 'bg-white hover:bg-[#fbfcfe]'
                  }`}
                >
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    {/* Unread indicator */}
                    <div className="pt-1 flex-shrink-0">
                      {isUnread ? (
                        <span
                          className="w-2.5 h-2.5 bg-[#e77114] rounded-full block shadow-xs"
                          title="Unread alert"
                        />
                      ) : (
                        <span className="w-2.5 h-2.5 bg-[#e2e4ef] rounded-full block" />
                      )}
                    </div>

                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {getCategoryBadge(item.category, item.priority)}
                        <h4 className={`text-sm font-bold truncate ${isUnread ? 'text-[#041632]' : 'text-[#44474d]'}`}>
                          {item.title}
                        </h4>
                        <span className="text-[#8393b5] text-[11px]">
                          • {timeAgo(new Date(item.createdAt))}
                        </span>
                      </div>

                      <p className="text-[#44474d] text-xs font-body leading-relaxed max-w-4xl">
                        {item.message}
                      </p>

                      <div className="text-[10px] text-[#75777e] pt-1">
                        <span>Logged: {formatDateTime(new Date(item.createdAt))}</span>
                        {item.entityId && (
                          <span className="ml-2 font-mono-data text-[#8393b5]">
                            [Entity: {item.entityType || 'REF'} #{item.entityId}]
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                    {isUnread && (
                      <button
                        onClick={(e) => handleMarkRead(item.id, e)}
                        disabled={isPending}
                        className="px-2.5 py-1.5 border border-[#c5c6ce] hover:bg-white text-[#041632] rounded-md text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50"
                        title="Mark as read"
                      >
                        Mark Read
                      </button>
                    )}

                    {item.actionUrl && (
                      <Link
                        href={item.actionUrl}
                        className="bg-[#041632] hover:bg-[#1b2b48] text-white px-3.5 py-1.5 rounded-md text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <span>Open Details</span>
                        <span className="material-symbols-outlined text-xs">arrow_forward</span>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between font-mono-data text-xs pt-2">
          <span className="text-[#75777e]">
            Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({totalCount} total alerts)
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1 || isPending}
              className="px-3 py-1.5 border border-[#c5c6ce] rounded-lg hover:bg-white disabled:opacity-40 cursor-pointer"
            >
              &larr; Previous
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || isPending}
              className="px-3 py-1.5 border border-[#c5c6ce] rounded-lg hover:bg-white disabled:opacity-40 cursor-pointer"
            >
              Next &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
