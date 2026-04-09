"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthShell from "@/components/auth/auth-shell";




export default function RegisterPage() {
  const router = useRouter();

  const [data, setData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleRegister = async () => {
    if (data.password !== data.confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    try {
      const res = await fetch("http://localhost:4000/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
        }),
      });

      if (res.ok) {
        router.push("/orgs");
      } else {
        alert("Signup failed");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AuthShell
      title="Create Your Account"
      subtitle="Get started with your free account"
    >
      <input
        type="text"
        placeholder="Full Name"
        className="w-full h-14 mb-4 px-4 rounded-2xl border border-[#dbe4f0] bg-white/70 backdrop-blur focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        onChange={(e) =>
          setData({ ...data, name: e.target.value })
        }
      />

      <input
        type="email"
        placeholder="Email"
        className="w-full h-14 mb-4 px-4 rounded-2xl border border-[#dbe4f0] bg-white/70 backdrop-blur focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        onChange={(e) =>
          setData({ ...data, email: e.target.value })
        }
      />

      <input
        type="password"
        placeholder="Password"
        className="w-full h-14 mb-4 px-4 rounded-2xl border border-[#dbe4f0] bg-white/70 backdrop-blur focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        onChange={(e) =>
          setData({ ...data, password: e.target.value })
        }
      />

      <input
        type="password"
        placeholder="Confirm Password"
        className="w-full h-14 mb-4 px-4 rounded-2xl border border-[#dbe4f0] bg-white/70 backdrop-blur focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        onChange={(e) =>
          setData({
            ...data,
            confirmPassword: e.target.value,
          })
        }
      />

      <button
        onClick={handleRegister}
        className="w-full h-14 rounded-2xl text-white font-semibold bg-[linear-gradient(135deg,#1677ff_0%,#0057ff_100%)]"
      >
        Sign Up
      </button>

      <p className="text-xs text-gray-400 mt-3">
        By signing up, you agree to Terms & Privacy Policy
      </p>

      <p className="text-center text-sm mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-blue-600">
          Log In
        </Link>
      </p>
    </AuthShell>
  );
}