"use client";

import { useEffect, useMemo, useState } from "react";
import AppHeader from "../components/AppHeader";

type BillingStatus = {
  plan: "FREE" | "PRO" | string;
  status: string;
  priceId?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
};

function statusLabel(status?: string) {
  switch (status) {
    case "active":
      return "Active";
    case "trialing":
      return "Trial";
    case "past_due":
      return "Past due (payment issue)";
    case "unpaid":
      return "Unpaid";
    case "canceled":
      return "Canceled";
    case "none":
      return "None";
    default:
      return status ?? "None";
  }
}

function formatDate(d?: string | null) {
  if (!d) return null;
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toLocaleString();
}

function getSavedOrgSlug() {
  return window.localStorage.getItem("orgSlug") ?? "my-company";
}

export default function BillingPage() {
  const base = useMemo(
    () => process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
    []
  );

  const [orgSlug, setOrgSlug] = useState("my-company");
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setOrgSlug(getSavedOrgSlug());
  }, []);

  useEffect(() => {
    function onOrgChanged() {
      setOrgSlug(getSavedOrgSlug());
    }

    window.addEventListener("orgSlugChanged", onOrgChanged as any);

    return () => {
      window.removeEventListener("orgSlugChanged", onOrgChanged as any);
    };
  }, []);

  async function apiFetch(path: string, opts?: RequestInit) {
    const token = window.localStorage.getItem("accessToken");
    if (!token) throw new Error("Not logged in. Go to /login");

    const slug = window.localStorage.getItem("orgSlug") || orgSlug;

    const res = await fetch(`${base}${path}`, {
      ...opts,
      headers: {
        ...(opts?.headers ?? {}),
        Authorization: `Bearer ${token}`,
        "x-org-slug": slug,
      },
      cache: "no-store",
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg =
        typeof (json as any)?.error === "string"
          ? (json as any).error
          : (json as any)?.error?.formErrors?.[0] ??
            Object.values((json as any)?.error?.fieldErrors ?? {}).flat()?.[0] ??
            "Request failed";
      throw new Error(msg);
    }

    return json;
  }

  async function loadStatus() {
    setError("");
    try {
      const json = await apiFetch("/billing/status");
      setBilling(json);
    } catch (e: any) {
      setBilling(null);
      setError(e?.message ?? "Failed to load billing");
    }
  }

  useEffect(() => {
    loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, orgSlug]);

  const isPro = billing?.plan === "PRO";
  const canceling = Boolean(billing?.cancelAtPeriodEnd);
  const periodEndText = formatDate(billing?.currentPeriodEnd ?? null);

  async function handleUpgrade() {
    setBusy(true);
    setError("");
    try {
      const json = await apiFetch("/billing/checkout", { method: "POST" });
      if (!json?.url) throw new Error("No checkout URL returned");
      window.location.href = json.url;
    } catch (e: any) {
      setError(e?.message ?? "Upgrade failed");
    } finally {
      setBusy(false);
    }
  }

  async function handlePortal() {
    setBusy(true);
    setError("");
    try {
      const json = await apiFetch("/billing/portal", { method: "POST" });
      if (!json?.url) throw new Error("No portal URL returned");
      window.location.href = json.url;
    } catch (e: any) {
      setError(e?.message ?? "Failed to open portal");
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    if (!confirm("Cancel at period end? You will keep PRO until your period ends.")) return;

    setBusy(true);
    setError("");
    try {
      await apiFetch("/billing/cancel", { method: "POST" });
      alert("✅ Subscription will be canceled at period end.");
      await loadStatus();
    } catch (e: any) {
      setError(e?.message ?? "Cancel failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleResume() {
    setBusy(true);
    setError("");
    try {
      await apiFetch("/billing/resume", { method: "POST" });
      alert("✅ Subscription resumed.");
      await loadStatus();
    } catch (e: any) {
      setError(e?.message ?? "Resume failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <AppHeader />

      <main className="min-h-screen bg-slate-50 px-4 py-8 md:px-8">
        <div className="mx-auto max-w-5xl space-y-8">
          <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 p-8 text-white shadow-sm">
            <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
            <p className="mt-2 text-sm text-slate-200">
              Manage subscription for <span className="font-semibold text-white">{orgSlug}</span>
            </p>
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
              ❌ {error}
            </div>
          ) : null}

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-slate-900">Current Plan</div>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  isPro
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-slate-100 text-slate-700"
                }`}
              >
                {billing?.plan ?? "FREE"}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Status</div>
                <div className="mt-2 text-base font-semibold text-slate-900">
                  {statusLabel(billing?.status)}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm text-slate-500">
                  {canceling ? "Ends on" : "Renews on"}
                </div>
                <div className="mt-2 text-base font-semibold text-slate-900">
                  {periodEndText ?? "-"}
                </div>
              </div>
            </div>

            {billing?.priceId ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Price ID</div>
                <div className="mt-2 break-all text-sm font-medium text-slate-900">
                  {billing.priceId}
                </div>
              </div>
            ) : null}

            {canceling ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                Subscription is set to cancel at period end.
              </div>
            ) : null}

            <div className="flex gap-3 flex-wrap pt-2">
              {!isPro ? (
                <button
                  disabled={busy}
                  onClick={handleUpgrade}
                  className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-900 disabled:opacity-60"
                >
                  Upgrade to Pro
                </button>
              ) : null}

              {isPro && !canceling ? (
                <button
                  disabled={busy}
                  onClick={handleCancel}
                  className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                >
                  Cancel Subscription
                </button>
              ) : null}

              {isPro && canceling ? (
                <button
                  disabled={busy}
                  onClick={handleResume}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  Resume Subscription
                </button>
              ) : null}

              {billing?.stripeCustomerId ? (
                <button
                  disabled={busy}
                  onClick={handlePortal}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  Manage Billing
                </button>
              ) : null}

              <button
                disabled={busy}
                onClick={loadStatus}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}