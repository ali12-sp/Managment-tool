"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";

function extractError(data: any, fallback: string) {
  return (
    (typeof data?.error === "string" && data.error) ||
    data?.error?.formErrors?.[0] ||
    Object.values(data?.error?.fieldErrors ?? {}).flat()?.[0] ||
    fallback
  );
}

export default function OrgsPage() {
  const base = useMemo(
    () => process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:4000",
    []
  );

  const router = useRouter();
  const [orgs, setOrgs] = useState<any[]>([]);
  const [name, setName] = useState("My Internship Team");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadOrgs() {
    const token = window.localStorage.getItem("accessToken");
    if (!token) {
      setError("Not logged in. Redirecting to /login...");
      router.push("/login");
      return;
    }

    try {
      const res = await fetch(`${base}/orgs/mine`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(extractError(data, "Failed to load workspaces"));
        setOrgs([]);
        return;
      }

      setError("");
      setOrgs(data?.orgs ?? []);
    } catch (err) {
      console.error(err);
      setError("Failed to load workspaces");
      setOrgs([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrgs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base]);

  function selectOrg(slug: string) {
    window.localStorage.setItem("orgSlug", slug);
    window.dispatchEvent(new Event("orgSlugChanged"));
    router.push("/tasks");
  }

  async function createOrg(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setInfo("");

    try {
      const token = window.localStorage.getItem("accessToken");
      if (!token) {
        setError("Not logged in. Redirecting to /login...");
        router.push("/login");
        return;
      }

      const res = await fetch(`${base}/orgs`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(extractError(data, "Failed to create workspace"));
        return;
      }

      const slug = data?.org?.slug;
      setInfo("Workspace created successfully.");
      setName("");

      await loadOrgs();

      if (slug) {
        window.localStorage.setItem("orgSlug", slug);
        window.dispatchEvent(new Event("orgSlugChanged"));
        router.push("/tasks");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to create workspace");
    } finally {
      setBusy(false);
    }
  }

  function handleLogout() {
    window.localStorage.removeItem("accessToken");
    window.localStorage.removeItem("orgSlug");
    window.dispatchEvent(new Event("accessTokenChanged"));
    window.dispatchEvent(new Event("orgSlugChanged"));
    router.push("/login");
  }

  return (
    <>
      <AppHeader />

      <main className="min-h-screen px-4 py-8 md:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">
                  Workspaces
                </div>
                <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                  Choose the team space for your project board.
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-slate-500">
                  Each workspace acts like a group project container. Inside it, you can create multiple boards, assign tasks, and collaborate through comments.
                </p>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Logout
              </button>
            </div>

            {error ? (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {info ? (
              <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {info}
              </div>
            ) : null}

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {loading ? (
                <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                  Loading workspaces...
                </div>
              ) : (
                <>
                  {orgs.map((org) => (
                    <button
                      key={org.orgId}
                      type="button"
                      onClick={() => selectOrg(org.slug)}
                      className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5 text-left transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-sm"
                    >
                      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                        {org.role}
                      </div>
                      <div className="mt-3 text-xl font-semibold text-slate-900">
                        {org.name}
                      </div>
                      <div className="mt-2 text-sm text-slate-500">/{org.slug}</div>
                      <div className="mt-5 inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                        Open workspace
                      </div>
                    </button>
                  ))}

                  {orgs.length === 0 ? (
                    <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                      No workspace yet. Create one from the panel on the right.
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="space-y-2">
              <div className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">
                New workspace
              </div>
              <h2 className="text-2xl font-bold text-slate-900">
                Create a group project space
              </h2>
              <p className="text-sm leading-7 text-slate-500">
                This gives you a shared place for project boards, tasks, members, notifications, and billing.
              </p>
            </div>

            <form onSubmit={createOrg} className="mt-6 space-y-4">
              <input
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5"
                placeholder="Workspace name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />

              <button
                type="submit"
                disabled={busy || !name.trim()}
                className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                {busy ? "Creating workspace..." : "Create workspace"}
              </button>
            </form>
          </section>
        </div>
      </main>
    </>
  );
}