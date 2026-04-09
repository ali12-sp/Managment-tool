"use client";

import React from "react";

export default function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-10 bg-[#f6f9ff] relative overflow-hidden">

      {/* BACKGROUND LIGHT */}
      <div className="absolute top-[-150px] left-[-150px] w-[500px] h-[500px] bg-blue-300/30 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-150px] right-[-150px] w-[500px] h-[500px] bg-indigo-300/30 rounded-full blur-[120px]" />

      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-10 relative z-10">

        {/* LEFT SIDE */}
        <div className="bg-white/80 backdrop-blur-xl rounded-[36px] shadow-[0_40px_120px_rgba(31,51,95,0.15)] p-10 border border-white/50">

          <h1 className="text-[38px] font-bold text-[#1f335f] tracking-tight mb-2">
            {title}
          </h1>

          <p className="text-[#6f7d95] mb-8 text-[15px]">
            {subtitle}
          </p>

          <div className="space-y-4">
            {children}
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="hidden lg:flex relative bg-white/70 backdrop-blur-xl rounded-[36px] shadow-[0_40px_120px_rgba(31,51,95,0.15)] p-10 border border-white/50 overflow-hidden">

          {/* glow */}
          <div className="absolute top-[-80px] right-[-80px] w-96 h-96 bg-blue-300/40 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-80px] left-[-80px] w-96 h-96 bg-indigo-300/40 rounded-full blur-[100px]" />

          <div className="relative z-10 w-full flex flex-col justify-between">

            {/* heading */}
            <div>
              <h2 className="text-[30px] font-bold text-[#1f335f] mb-2">
                Build Smarter Workflows
              </h2>
              <p className="text-[#6f7d95] text-[15px]">
                Manage projects, teams, and analytics — all in one platform.
              </p>
            </div>

            {/* FLOATING CARDS */}
            <div className="relative h-[260px] mt-6">

              {/* card 1 */}
              <div className="absolute top-0 left-0 w-48 bg-white rounded-2xl p-4 shadow-xl border border-gray-100">
                <div className="h-2 bg-blue-500 rounded w-1/2 mb-2"></div>
                <div className="h-2 bg-gray-200 rounded w-full mb-1"></div>
                <div className="h-2 bg-gray-200 rounded w-3/4"></div>
              </div>

              {/* card 2 */}
              <div className="absolute top-16 right-0 w-48 bg-white rounded-2xl p-4 shadow-xl border border-gray-100">
                <div className="h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl"></div>
              </div>

              {/* card 3 */}
              <div className="absolute bottom-0 left-12 w-60 bg-white rounded-2xl p-4 shadow-xl border border-gray-100">
                <div className="h-20 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-xl"></div>
              </div>

            </div>

            {/* FEATURES */}
            <div className="space-y-2 text-sm text-[#6f7d95]">
              <p>✔ Real-time analytics dashboard</p>
              <p>✔ Smart task & project tracking</p>
              <p>✔ Seamless team collaboration</p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}