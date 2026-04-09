"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import NotificationCenter from "./NotificationCenter";

type Org = {
  orgId: string;
  slug: string;
  name: string;
  role: string;
};

export default function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();

  const base = useMemo(
    () => process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:4000",
    []
  );

  const [orgs, setOrgs] = useState<Org[]>([]);
  const [orgSlug, setOrgSlug] = useState("");
  const [userName, setUserName] = useState("Ali Raza");
  const [userEmail, setUserEmail] = useState("yourmail@email.com");
  const [loadingOrgs, setLoadingOrgs] = useState(false);

  useEffect(() => {
    const savedOrg = window.localStorage.getItem("orgSlug") ?? "";
    setOrgSlug(savedOrg);

    const savedName = window.localStorage.getItem("userName");
    const savedEmail = window.localStorage.getItem("userEmail");

    if (savedName) setUserName(savedName);
    if (savedEmail) setUserEmail(savedEmail);
  }, []);

  useEffect(() => {
    async function loadOrgs() {
      const token = window.localStorage.getItem("accessToken");
      if (!token) return;

      try {
        setLoadingOrgs(true);

        const res = await fetch(`${base}/orgs/mine`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        const data = await res.json().catch(() => null);
        if (!res.ok) return;

        setOrgs(Array.isArray(data?.orgs) ? data.orgs : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingOrgs(false);
      }
    }

    loadOrgs();
  }, [base, pathname]);

  function handleOrgChange(nextSlug: string) {
    setOrgSlug(nextSlug);
    window.localStorage.setItem("orgSlug", nextSlug);
    window.dispatchEvent(new Event("orgSlugChanged"));

    if (pathname !== "/tasks") {
      router.push("/tasks");
    }
  }

  async function handleLogout() {
    try {
      await fetch(`${base}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error(err);
    } finally {
      window.localStorage.removeItem("accessToken");
      window.localStorage.removeItem("orgSlug");
      window.localStorage.removeItem("userName");
      window.localStorage.removeItem("userEmail");
      window.dispatchEvent(new Event("accessTokenChanged"));
      window.dispatchEvent(new Event("orgSlugChanged"));
      router.push("/login");
    }
  }

  const selectedOrg = orgs.find((org) => org.slug === orgSlug);

  return (
    <header className="h-[84px] bg-[#fbfbfb] border-b border-[#ececec] px-6 flex items-center justify-between gap-4">
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-[320px] h-[52px] rounded-2xl bg-[#f4f4f4] border border-[#ececec] flex items-center px-4 text-[#8b8b8b]">
          <span className="mr-3 text-lg">⌕</span>
          <input
            type="text"
            placeholder="Search task"
            className="bg-transparent outline-none w-full text-[14px] placeholder:text-[#9a9a9a]"
          />
          <span className="ml-3 text-[12px] px-2 py-1 rounded-lg bg-white border border-[#e7e7e7] text-[#666]">
            ⌘ F
          </span>
        </div>

        <div className="hidden lg:flex items-center gap-3">
          <div className="min-w-[240px] h-[52px] rounded-2xl bg-white border border-[#ececec] px-4 flex items-center gap-3">
            <span className="text-[12px] uppercase tracking-[0.18em] text-[#8b8b8b]">
              Org
            </span>

            <select
              value={orgSlug}
              onChange={(e) => handleOrgChange(e.target.value)}
              className="bg-transparent outline-none text-[14px] text-[#1c1c1c] w-full"
            >
              {!orgSlug && <option value="">Select workspace</option>}
              {orgs.map((org) => (
                <option key={org.orgId} value={org.slug}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => router.push("/orgs")}
            className="h-[52px] rounded-2xl border border-[#ececec] bg-white px-4 text-[14px] font-medium text-[#1c1c1c] hover:bg-[#f8f8f8] transition"
          >
            Manage orgs
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden xl:flex items-center rounded-2xl border border-[#ececec] bg-white px-4 py-2 text-[13px] text-[#666]">
          {loadingOrgs
            ? "Loading workspaces..."
            : selectedOrg
              ? `${selectedOrg.name} · ${selectedOrg.role}`
              : "No workspace selected"}
        </div>

        <div className="w-11 h-11 rounded-full bg-white border border-[#ececec] flex items-center justify-center shadow-sm">
          ✉
        </div>

        <div className="w-11 h-11 rounded-full bg-white border border-[#ececec] flex items-center justify-center shadow-sm">
          <NotificationCenter />
        </div>

        <div className="flex items-center gap-3 bg-[#f7f7f7] border border-[#ececec] rounded-2xl px-3 py-2 min-w-[220px]">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#f4d2b7] to-[#c88b61] flex items-center justify-center text-white font-semibold text-lg shadow-sm">
            {(userName?.trim()?.[0] || userEmail?.trim()?.[0] || "A").toUpperCase()}
          </div>

          <div className="leading-tight min-w-0">
            <div className="text-[16px] font-semibold text-[#1c1c1c] truncate">
              {userName}
            </div>
            <div className="text-[13px] text-[#8b8b8b] truncate">
              {userEmail}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="h-[52px] rounded-2xl border border-[#ececec] bg-white px-4 text-[14px] font-medium text-[#1c1c1c] hover:bg-[#f8f8f8] transition"
        >
          Logout
        </button>
      </div>
    </header>
  );
}