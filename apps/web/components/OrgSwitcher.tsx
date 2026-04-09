"use client";

import { useEffect, useState } from "react";

export default function OrgSwitcher() {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:4000";

  const [orgSlug, setOrgSlug] = useState("my-company");
  const [orgs, setOrgs] = useState<Array<{ slug: string; name: string }>>([]);
  const [error, setError] = useState("");

  function applyOrg(next: string) {
    const clean = next.trim();
    if (!clean) return;

    setOrgSlug(clean);
    window.localStorage.setItem("orgSlug", clean);
    window.dispatchEvent(new Event("orgSlugChanged"));
  }

  async function loadOrgs() {
    setError("");

    const token = window.localStorage.getItem("accessToken");
    if (!token) {
      setOrgs([]);
      return;
    }

    const res = await fetch(`${base}/orgs/mine`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(typeof data?.error === "string" ? data.error : "Failed to load workspaces");
      setOrgs([]);
      return;
    }

    const list = (data?.orgs ?? []).map((org: any) => ({
      slug: org.slug,
      name: org.name,
    }));

    setOrgs(list);

    const saved = window.localStorage.getItem("orgSlug");
    const initial = saved && list.some((item) => item.slug === saved) ? saved : list[0]?.slug;
    if (initial) applyOrg(initial);
  }

  useEffect(() => {
    const saved = window.localStorage.getItem("orgSlug");
    if (saved) setOrgSlug(saved);
  }, []);

  useEffect(() => {
    loadOrgs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base]);

  useEffect(() => {
    function onTokenChanged() {
      loadOrgs();
    }

    window.addEventListener("accessTokenChanged", onTokenChanged as EventListener);
    return () => window.removeEventListener("accessTokenChanged", onTokenChanged as EventListener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base]);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
        Active workspace
      </div>

      {orgs.length > 0 ? (
        <select
          className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5"
          value={orgSlug}
          onChange={(event) => applyOrg(event.target.value)}
        >
          {orgs.map((org) => (
            <option key={org.slug} value={org.slug}>
              {org.name} ({org.slug})
            </option>
          ))}
        </select>
      ) : (
        <input
          className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5"
          value={orgSlug}
          onChange={(event) => setOrgSlug(event.target.value)}
          onBlur={(event) => applyOrg(event.target.value)}
          placeholder="org slug e.g. my-company"
        />
      )}

      {error ? <div className="mt-2 text-xs text-red-600">{error}</div> : null}
    </div>
  );
}
