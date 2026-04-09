"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Success() {
  const router = useRouter();
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:4000";
  const [msg, setMsg] = useState("Activating your subscription...");

  useEffect(() => {
    let tries = 0;
    const maxTries = 12; // ~24 seconds

    const check = async () => {
      tries++;

      const token = window.localStorage.getItem("accessToken");
      const orgSlug = window.localStorage.getItem("orgSlug") || "my-company";

      if (!token) {
        setMsg("Not logged in. Go to /login");
        return;
      }

      try {
        const res = await fetch(`${base}/billing/status`, {
          headers: { Authorization: `Bearer ${token}`, "x-org-slug": orgSlug },
          cache: "no-store",
        });

        const data = await res.json();

        if (data.plan === "PRO") {
          setMsg("✅ Subscription activated! Redirecting...");
          router.replace("/tasks");
          return;
        }

        if (tries >= maxTries) {
          setMsg("Still activating... please refresh in a moment.");
          return;
        }

        setTimeout(check, 2000);
      } catch {
        if (tries >= maxTries) {
          setMsg("Activation check failed. Please refresh.");
          return;
        }
        setTimeout(check, 2000);
      }
    };

    check();
  }, [base, router]);

  return (
    <main className="p-10">
      <h1 className="text-3xl font-bold">Payment success ✅</h1>
      <p className="mt-2">{msg}</p>
    </main>
  );
}