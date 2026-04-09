"use client";

import { useState } from "react";
import Link from "next/link";
import AuthShell from "../components/auth/auth-shell";


export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");

  const handleReset = async () => {
    alert("Reset link sent (connect backend later)");
  };

  return (
    <AuthShell
      title="Reset Password"
      subtitle="Enter your email to receive a reset link"
    >
      <input
        type="email"
        placeholder="Email Address"
        className="w-full h-14 mb-4 px-4 rounded-2xl border border-[#dbe4f0] bg-white/70 backdrop-blur focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        onChange={(e) => setEmail(e.target.value)}
      />

      <button
        onClick={handleReset}
        className="w-full h-14 rounded-2xl text-white font-semibold bg-[linear-gradient(135deg,#2563eb_0%,#4f46e5_100%)] shadow-[0_12px_40px_rgba(37,99,235,0.45)] hover:scale-[1.02] active:scale-[0.98] transition"
      >
        Send Reset Link
      </button>

      <p className="text-center text-sm mt-6">
        <Link href="/login" className="text-blue-600">
          Back to Login
        </Link>
      </p>
    </AuthShell>
  );
}