"use client";

import Sidebar from "../components/layout/Sidebar";
import AppHeader from "../components/layout/AppHeader";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#e9eaec] p-6">
      <div className="max-w-[1440px] mx-auto h-[calc(100vh-48px)] bg-[#f7f7f7] rounded-[32px] p-4 shadow-[0_30px_80px_rgba(0,0,0,0.08)]">
        <div className="h-full bg-[#f3f3f3] rounded-[28px] p-4 flex gap-4 overflow-hidden">
          <div className="h-full">
            <Sidebar />
          </div>

          <div className="flex-1 min-w-0 h-full flex flex-col bg-[#fcfcfc] rounded-[24px] border border-[#ececec] overflow-hidden">
            <AppHeader />
            <main className="flex-1 overflow-y-auto p-4 md:p-5 lg:p-6 bg-[#f7f7f7]">
              {children}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}