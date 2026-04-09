export default function DashboardPage() {
  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="text-[52px] leading-none font-semibold text-[#171717] tracking-tight">
            Dashboard
          </h1>
          <p className="mt-3 text-[18px] text-[#8d8d8d]">
            Plan, prioritize, and accomplish your tasks with ease.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button className="h-[56px] px-7 rounded-full bg-[#1a7a4f] text-white font-medium shadow-[0_12px_30px_rgba(26,122,79,0.25)] hover:bg-[#156440] transition">
            + Add Project
          </button>
          <button className="h-[56px] px-7 rounded-full border border-[#1a7a4f] text-[#1a1a1a] bg-white hover:bg-[#f8f8f8] transition">
            Import Data
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        <StatCard title="Total Projects" value="24" note="Increased from last month" featured />
        <StatCard title="Ended Projects" value="10" note="Increased from last month" />
        <StatCard title="Running Projects" value="12" note="Increased from last month" />
        <StatCard title="Pending Project" value="2" note="On Discuss" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.45fr_0.9fr_0.9fr] gap-4">
        <section className="rounded-[24px] bg-white border border-[#ececec] p-5 shadow-sm">
          <div className="text-[30px] font-semibold text-[#1c1c1c] mb-4">
            Project Analytics
          </div>

          <div className="h-[260px] flex items-end justify-between gap-3 px-2">
            {[
              { h: "45%", active: false, label: "S" },
              { h: "60%", active: true, label: "M" },
              { h: "52%", active: true, label: "T" },
              { h: "72%", active: true, label: "W" },
              { h: "68%", active: false, label: "T" },
              { h: "44%", active: false, label: "F" },
              { h: "58%", active: false, label: "S" },
            ].map((bar, i) => (
              <div key={i} className="flex flex-col items-center gap-3 flex-1">
                <div
                  className={`w-full max-w-[54px] rounded-full ${
                    bar.active
                      ? i === 3
                        ? "bg-[#145b39]"
                        : i === 2
                        ? "bg-[#67be92]"
                        : "bg-[#1f8b59]"
                      : "bg-[repeating-linear-gradient(135deg,#b7b7b7_0,#b7b7b7_4px,#f5f5f5_4px,#f5f5f5_8px)]"
                  }`}
                  style={{ height: bar.h }}
                />
                <span className="text-[16px] text-[#989898]">{bar.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[24px] bg-white border border-[#ececec] p-5 shadow-sm">
          <div className="text-[30px] font-semibold text-[#1c1c1c] mb-4">
            Reminders
          </div>
          <h3 className="text-[38px] leading-none font-semibold text-[#173b2a] mb-3">
            Meeting with Arc
            <br />
            Company
          </h3>
          <p className="text-[18px] text-[#8b8b8b] mb-8">
            Time : 02.00 pm - 04.00 pm
          </p>
          <button className="w-full h-[58px] rounded-full bg-[#1a7a4f] text-white text-lg font-medium shadow-[0_12px_30px_rgba(26,122,79,0.25)]">
            ☕ Start Meeting
          </button>
        </section>

        <section className="rounded-[24px] bg-white border border-[#ececec] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div className="text-[30px] font-semibold text-[#1c1c1c]">
              Project
            </div>
            <button className="px-4 py-2 rounded-full border border-[#1a7a4f] text-sm">
              + New
            </button>
          </div>

          <div className="space-y-4">
            {[
              "Develop API Endpoints",
              "Onboarding Flow",
              "Build Dashboard",
              "Optimize Page Load",
              "Cross-Browser Testing",
            ].map((item, idx) => (
              <div key={item} className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#f4f7fb] flex items-center justify-center text-[#1a7a4f] font-bold">
                  {idx + 1}
                </div>
                <div>
                  <div className="text-[18px] font-medium text-[#1f1f1f]">{item}</div>
                  <div className="text-[14px] text-[#979797]">
                    Due date: Nov {26 + idx}, 2024
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.25fr_1fr_0.8fr] gap-4">
        <section className="rounded-[24px] bg-white border border-[#ececec] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div className="text-[30px] font-semibold text-[#1c1c1c]">
              Team Collaboration
            </div>
            <button className="px-4 py-2 rounded-full border border-[#1a7a4f] text-sm">
              + Add Member
            </button>
          </div>

          <div className="space-y-4">
            {[
              ["Alexandra Deff", "Working on Github Project Repository", "Completed"],
              ["Edwin Adenike", "Working on Integrate User Authentication System", "InProgress"],
              ["Isaac Oluwatemilorun", "Working on Develop Search and Filter Functionality", "Pending"],
              ["David Oshodi", "Working on Responsive Layout for Homepage", "In Progress"],
            ].map(([name, task, status], idx) => (
              <div key={name} className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#f2d2bb] to-[#b7794c] flex items-center justify-center text-white font-semibold">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <div className="text-[18px] font-medium text-[#1d1d1d]">{name}</div>
                  <div className="text-[14px] text-[#8f8f8f]">{task}</div>
                </div>
                <div className="text-[12px] px-3 py-1.5 rounded-full bg-[#f5f5f5] text-[#8a8a8a]">
                  {status}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[24px] bg-white border border-[#ececec] p-5 shadow-sm">
          <div className="text-[30px] font-semibold text-[#1c1c1c] mb-6">
            Project Progress
          </div>

          <div className="flex items-center justify-center py-4">
            <div className="relative w-[230px] h-[130px]">
              <div className="absolute inset-0 rounded-t-full border-[24px] border-b-0 border-[#dfe9e3]" />
              <div
                className="absolute inset-0 rounded-t-full border-[24px] border-b-0 border-[#1f8b59] [clip-path:inset(0_32%_0_0)]"
              />
              <div className="absolute inset-0 flex items-end justify-center pb-2">
                <div className="text-center">
                  <div className="text-[54px] font-semibold text-[#111] leading-none">41%</div>
                  <div className="text-[16px] text-[#8b8b8b]">Project Ended</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-center gap-5 text-[14px] text-[#8b8b8b]">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#1f8b59]" />
              Completed
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#145b39]" />
              In Progress
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[repeating-linear-gradient(135deg,#b7b7b7_0,#b7b7b7_4px,#fff_4px,#fff_8px)] border border-[#ddd]" />
              Pending
            </div>
          </div>
        </section>

        <section className="rounded-[24px] overflow-hidden bg-[radial-gradient(circle_at_top_left,#145c39,#06120c_65%)] text-white p-5 shadow-[0_16px_35px_rgba(10,30,18,0.35)]">
          <div className="text-[30px] font-semibold mb-8">Time Tracker</div>
          <div className="text-[64px] leading-none font-semibold tracking-tight mb-10">
            01:24:08
          </div>

          <div className="flex items-center gap-4">
            <button className="w-14 h-14 rounded-full bg-white text-[#145c39] text-xl shadow">
              ⏸
            </button>
            <button className="w-14 h-14 rounded-full bg-[#ef4444] text-white text-xl shadow">
              ■
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  note,
  featured = false,
}: {
  title: string;
  value: string;
  note: string;
  featured?: boolean;
}) {
  return (
    <div
      className={`rounded-[24px] border p-5 shadow-sm ${
        featured
          ? "bg-[radial-gradient(circle_at_top_left,#238a59,#0d4f31_70%)] text-white border-transparent"
          : "bg-white border-[#ececec] text-[#1b1b1b]"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="text-[22px] font-medium">{title}</div>
        <div
          className={`w-11 h-11 rounded-full flex items-center justify-center border ${
            featured ? "border-white/40 text-white" : "border-[#d8d8d8] text-[#222]"
          }`}
        >
          ↗
        </div>
      </div>

      <div className="mt-8 text-[64px] leading-none font-semibold">{value}</div>

      <div className={`mt-4 text-[14px] ${featured ? "text-white/80" : "text-[#8f8f8f]"}`}>
        {note}
      </div>
    </div>
  );
}