import Link from "next/link";

const highlights = [
  "Create team workspaces and project boards",
  "Assign tasks with due dates and comments",
  "Track board activity with live notifications",
  "Use a Trello + Asana inspired layout for internship demos",
];

export default function HomePage() {
  return (
    <main className="min-h-screen px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl space-y-10">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl">
          <div className="grid gap-8 px-6 py-10 lg:grid-cols-[1.2fr_0.8fr] lg:px-10 lg:py-14">
            <div className="space-y-6">
              <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                Internship-ready project management tool
              </div>

              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-black tracking-tight text-slate-950 md:text-6xl">
                  TaskFlow brings Trello boards and Asana clarity into one workspace.
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-slate-600">
                  Build collaborative group projects, assign work, comment on tasks, and show live team activity in a polished full-stack app.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/login"
                  className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                >
                  Open workspace
                </Link>
                <Link
                  href="/tasks"
                  className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  View board
                </Link>
              </div>
            </div>

            <div className="grid gap-4 rounded-[1.75rem] bg-slate-950 p-5 text-white">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                <div className="text-xs uppercase tracking-[0.25em] text-slate-300">Included</div>
                <div className="mt-3 text-2xl font-semibold">Core internship features</div>
                <div className="mt-4 space-y-3 text-sm text-slate-200">
                  {highlights.map((item) => (
                    <div key={item} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                  <div className="text-sm text-slate-300">Frontend</div>
                  <div className="mt-2 text-xl font-semibold">Board UI, filters, detail panel</div>
                </div>
                <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                  <div className="text-sm text-slate-300">Backend</div>
                  <div className="mt-2 text-xl font-semibold">Auth, projects, tasks, comments, notifications</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
