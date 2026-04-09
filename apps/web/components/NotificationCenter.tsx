"use client";

import { useEffect, useMemo, useState } from "react";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  readAt?: string | null;
  createdAt: string;
};

function getSavedOrgSlug() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("orgSlug") ?? "";
}

function getSavedToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("accessToken") ?? "";
}

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

export default function NotificationCenter() {
  const base = useMemo(
    () => process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:4000",
    []
  );

  const [open, setOpen] = useState(false);
  const [orgSlug, setOrgSlug] = useState("");
  const [token, setToken] = useState("");
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setOrgSlug(getSavedOrgSlug());
    setToken(getSavedToken());
  }, []);

  useEffect(() => {
    function onOrgChanged() {
      setOrgSlug(getSavedOrgSlug());
    }

    function onTokenChanged() {
      setToken(getSavedToken());
    }

    window.addEventListener("orgSlugChanged", onOrgChanged as EventListener);
    window.addEventListener("accessTokenChanged", onTokenChanged as EventListener);

    return () => {
      window.removeEventListener("orgSlugChanged", onOrgChanged as EventListener);
      window.removeEventListener("accessTokenChanged", onTokenChanged as EventListener);
    };
  }, []);

  async function loadNotifications() {
    if (!token || !orgSlug) {
      setItems([]);
      setUnreadCount(0);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${base}/notifications`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-org-slug": orgSlug,
        },
        cache: "no-store",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setItems([]);
        setUnreadCount(0);
        return;
      }

      setItems(data?.notifications ?? []);
      setUnreadCount(Number(data?.unreadCount ?? 0));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token || !orgSlug) return;

    loadNotifications();

    const timer = window.setInterval(loadNotifications, 30000);
    return () => window.clearInterval(timer);
  }, [base, token, orgSlug]);

  useEffect(() => {
    if (!token || !orgSlug) return;

    const source = new EventSource(
      `${base}/events/stream?token=${encodeURIComponent(token)}&orgSlug=${encodeURIComponent(orgSlug)}`
    );

    const refresh = () => {
      loadNotifications();
    };

    source.onmessage = refresh;
    source.addEventListener("notification", refresh);
    source.addEventListener("notification.read", refresh);
    source.addEventListener("task.created", refresh);
    source.addEventListener("task.updated", refresh);

    return () => {
      source.close();
    };
  }, [base, token, orgSlug]);

  async function markOneRead(id: string) {
    if (!token) return;

    await fetch(`${base}/notifications/${id}/read`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "x-org-slug": orgSlug,
      },
    });

    loadNotifications();
  }

  async function markAllRead() {
    if (!token) return;

    await fetch(`${base}/notifications/read-all`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "x-org-slug": orgSlug,
      },
    });

    loadNotifications();
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-xs">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[360px] rounded-2xl border bg-white shadow-xl">
          <div className="flex justify-between p-4 border-b">
            <span className="font-semibold">Notifications</span>
            <button onClick={markAllRead} className="text-xs text-blue-600">
              Mark all
            </button>
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {!token ? (
              <div className="p-4 text-sm text-gray-500">Login required</div>
            ) : loading ? (
              <div className="p-4 text-sm text-gray-500">Loading...</div>
            ) : items.length === 0 ? (
              <div className="p-4 text-sm text-gray-500">No notifications</div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => markOneRead(item.id)}
                  className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                    !item.readAt ? "bg-blue-50" : ""
                  }`}
                >
                  <div className="font-medium">{item.title}</div>
                  {item.body && (
                    <div className="text-sm text-gray-600">{item.body}</div>
                  )}
                  <div className="text-xs text-gray-400 mt-1">
                    {formatWhen(item.createdAt)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}