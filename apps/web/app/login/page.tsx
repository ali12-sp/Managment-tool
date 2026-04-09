"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthShell from "@/components/auth/auth-shell";

export default function LoginPage() {
  const router = useRouter();

  const [data, setData] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);

      const res = await fetch("http://localhost:4000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      const result = await res.json().catch(() => null);

      if (!res.ok) {
        alert(result?.error || "Login failed");
        return;
      }

      if (result?.accessToken) {
        localStorage.setItem("accessToken", result.accessToken);
        window.dispatchEvent(new Event("accessTokenChanged"));
      }

      if (data.email) {
        localStorage.setItem("userEmail", data.email);
        localStorage.setItem("userName", data.email.split("@")[0] || "User");
      }

      router.push("/orgs");
    } catch (err) {
      console.error(err);
      alert("Something went wrong during login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Welcome Back!" subtitle="Log in to your account">
      <input
        type="email"
        placeholder="Email"
        className="w-full h-14 mb-4 px-4 rounded-2xl border border-[#dbe4f0] bg-white/70 backdrop-blur focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        value={data.email}
        onChange={(e) => setData({ ...data, email: e.target.value })}
      />

      <input
        type="password"
        placeholder="Password"
        className="w-full h-14 mb-4 px-4 rounded-2xl border border-[#e2e8f0] bg-white/70 backdrop-blur focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        value={data.password}
        onChange={(e) => setData({ ...data, password: e.target.value })}
      />

      <div className="flex justify-between text-sm mb-4">
        <label className="flex gap-2 items-center">
          <input type="checkbox" />
          Remember me
        </label>

        <Link href="/forgot-password" className="text-blue-600">
          Forgot Password?
        </Link>
      </div>

      <button
        onClick={handleLogin}
        disabled={loading}
        className="w-full h-14 rounded-2xl text-white font-semibold bg-[linear-gradient(135deg,#2563eb_0%,#4f46e5_100%)] shadow-[0_12px_40px_rgba(37,99,235,0.45)] hover:scale-[1.02] active:scale-[0.98] transition disabled:opacity-60"
      >
        {loading ? "Logging in..." : "Login"}
      </button>

      <div className="text-center my-4 text-gray-400">or</div>
      <div className="space-y-4"></div>

      <p className="text-center text-sm mt-6">
        Don’t have an account?{" "}
        <Link href="/register" className="text-blue-600">
          Create Account
        </Link>
      </p>
    </AuthShell>
  );
}