"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Tasks", href: "/tasks" },
  { label: "Calendar", href: "/calendar" },
  { label: "Analytics", href: "/analytics" },
  { label: "Team", href: "/team" },
];

const generalItems = [
  { label: "Settings", href: "/settings" },
  { label: "Help", href: "/help" },
  { label: "Logout", href: "/login" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[250px] h-full bg-[#fbfbfb] border-r border-[#ececec] p-5 flex flex-col">
      <div>
        <div className="flex items-center gap-3 px-3 py-2 mb-8">
          <div className="w-10 h-10 rounded-full border-2 border-[#1e7a53] flex items-center justify-center text-[#1e7a53] font-bold">
            ◎
          </div>
          <span className="text-[28px] font-semibold text-[#1e1e1e] tracking-tight">
            Donezo
          </span>
        </div>

        <div className="px-3 mb-4 text-[11px] font-medium text-[#8a8a8a] uppercase tracking-[0.12em]">
          Menu
        </div>

        <nav className="space-y-1 mb-8">
          {navItems.map((item) => {
            const active =
              pathname === item.href ||
              (item.href === "/dashboard" && pathname === "/orgs");

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-[16px] transition ${
                  active
                    ? "bg-[#eef8f2] text-[#16643f] font-semibold shadow-sm"
                    : "text-[#7e7e7e] hover:bg-[#f3f5f7] hover:text-[#1f1f1f]"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-current opacity-70" />
                <span>{item.label}</span>
                {item.label === "Tasks" && (
                  <span className="ml-auto text-[10px] px-2 py-1 rounded-full bg-[#16643f] text-white">
                    12+
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 mb-4 text-[11px] font-medium text-[#8a8a8a] uppercase tracking-[0.12em]">
          General
        </div>

        <nav className="space-y-1">
          {generalItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-[16px] text-[#7e7e7e] hover:bg-[#f3f5f7] hover:text-[#1f1f1f] transition"
            >
              <span className="w-2 h-2 rounded-full bg-current opacity-70" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>

      <div className="mt-auto pt-6">
        <div className="rounded-[24px] overflow-hidden bg-[radial-gradient(circle_at_top_left,#114a31,#07140d_65%)] p-5 text-white shadow-[0_18px_45px_rgba(10,30,18,0.35)]">
          <div className="text-[24px] leading-none mb-3 opacity-90">◌</div>
          <h3 className="text-[24px] font-semibold leading-tight mb-2">
            Download our
            <br />
            Mobile App
          </h3>
          <p className="text-[13px] text-white/75 mb-5">
            Get easy access in another way
          </p>
          <button className="w-full rounded-full bg-[#1f8b59] hover:bg-[#187249] transition text-white py-3 text-sm font-medium">
            Download
          </button>
        </div>
      </div>
    </aside>
  );
}