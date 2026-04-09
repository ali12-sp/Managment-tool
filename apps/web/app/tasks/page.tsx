"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";

type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";

type Member = {
  id: string;
  email: string;
  name?: string | null;
  role: "OWNER" | "ADMIN" | "MEMBER";
};

type TaskComment = {
  id: string;
  body: string;
  createdAt: string;
  author: {
    id: string;
    email: string;
    name?: string | null;
  };
};

type Task = {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  projectId?: string | null;
  dueDate?: string | null;
  createdAt?: string;
  commentsCount?: number;
  project?: {
    id: string;
    name: string;
  } | null;
  assignee?: {
    id: string;
    email: string;
    name?: string | null;
  } | null;
};

type Project = {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  tasksCount: number;
};

type BillingStatus = {
  plan: "FREE" | "PRO";
  status: string;
  priceId?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
};

type EditDraft = {
  title: string;
  description: string;
  assigneeId: string;
  dueDate: string;
};

const STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE"];

function statusLabel(status: TaskStatus) {
  if (status === "TODO") return "Todo";
  if (status === "IN_PROGRESS") return "In Progress";
  return "Done";
}

function statusMeta(status: TaskStatus) {
  if (status === "TODO") {
    return {
      badge: "border-slate-200 bg-slate-100 text-slate-700",
      dot: "bg-slate-500",
    };
  }

  if (status === "IN_PROGRESS") {
    return {
      badge: "border-sky-200 bg-sky-50 text-sky-700",
      dot: "bg-sky-500",
    };
  }

  return {
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
  };
}

function formatErrorMessage(payload: any): string {
  return (
    (typeof payload?.error === "string" && payload.error) ||
    payload?.error?.formErrors?.[0] ||
    Object.values(payload?.error?.fieldErrors ?? {}).flat()?.[0] ||
    "Request failed"
  );
}

function getSavedOrgSlug() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("orgSlug") ?? "";
}

function getSavedToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("accessToken") ?? "";
}

function formatDate(value?: string | null) {
  if (!value) return "No due date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No due date";
  return date.toLocaleDateString();
}

function formatDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

function toDateInputValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function isOverdue(value?: string | null, status?: TaskStatus) {
  if (!value || status === "DONE") return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < Date.now();
}

function initials(name?: string | null, fallback?: string | null) {
  const source = name || fallback || "?";
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() ?? "")
    .join("");
}

export default function TasksPage() {
  const router = useRouter();

  const base = useMemo(
    () => process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:4000",
    []
  );

  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [billing, setBilling] = useState<BillingStatus | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");

  const [commentsByTask, setCommentsByTask] = useState<Record<string, TaskComment[]>>({});
  const [commentInput, setCommentInput] = useState("");

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft>({
    title: "",
    description: "",
    assigneeId: "",
    dueDate: "",
  });

  const [search, setSearch] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [dueFilter, setDueFilter] = useState<"all" | "overdue" | "upcoming" | "unassigned">("all");

  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [token, setToken] = useState("");
  const [authResolved, setAuthResolved] = useState(false);
  const [limitInfo, setLimitInfo] = useState<{ limit: number; used: number } | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);

  useEffect(() => {
    const nextToken = getSavedToken();
    const nextOrgSlug = getSavedOrgSlug();

    setToken(nextToken);
    setOrgSlug(nextOrgSlug);
    setAuthResolved(true);

    if (!nextToken) {
      router.push("/login");
      return;
    }

    if (!nextOrgSlug) {
      router.push("/orgs");
    }
  }, [router]);

  useEffect(() => {
    function onOrgChanged() {
      const nextOrg = getSavedOrgSlug();
      setOrgSlug(nextOrg);
      setSelectedProjectId("");
      setSelectedTaskId(null);
      setEditingTaskId(null);

      if (!nextOrg) {
        router.push("/orgs");
      }
    }

    function onTokenChanged() {
      const nextToken = getSavedToken();
      setToken(nextToken);

      if (!nextToken) {
        router.push("/login");
      }
    }

    window.addEventListener("orgSlugChanged", onOrgChanged as EventListener);
    window.addEventListener("accessTokenChanged", onTokenChanged as EventListener);

    return () => {
      window.removeEventListener("orgSlugChanged", onOrgChanged as EventListener);
      window.removeEventListener("accessTokenChanged", onTokenChanged as EventListener);
    };
  }, [router]);

  async function loadBilling(currentToken: string, currentOrg: string) {
    const res = await fetch(`${base}/billing/status`, {
      headers: {
        Authorization: `Bearer ${currentToken}`,
        "x-org-slug": currentOrg,
      },
      cache: "no-store",
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setBilling(null);
      return;
    }

    setBilling({
      plan: data?.plan === "PRO" ? "PRO" : "FREE",
      status: data?.status ?? "none",
      priceId: data?.priceId ?? null,
      currentPeriodEnd: data?.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: Boolean(data?.cancelAtPeriodEnd ?? false),
    });
  }

  async function loadProjects(currentToken: string, currentOrg: string) {
    const res = await fetch(`${base}/projects`, {
      headers: {
        Authorization: `Bearer ${currentToken}`,
        "x-org-slug": currentOrg,
      },
      cache: "no-store",
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(formatErrorMessage(data));
      setProjects([]);
      return;
    }

    const nextProjects = data?.projects ?? [];
    setProjects(nextProjects);

    if (nextProjects.length > 0) {
      setSelectedProjectId((previous) => {
        if (previous && nextProjects.some((project: Project) => project.id === previous)) {
          return previous;
        }
        return nextProjects[0].id;
      });
    } else {
      setSelectedProjectId("");
    }
  }

  async function loadMembers(currentToken: string, currentOrg: string) {
    const res = await fetch(`${base}/orgs/members`, {
      headers: {
        Authorization: `Bearer ${currentToken}`,
        "x-org-slug": currentOrg,
      },
      cache: "no-store",
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(formatErrorMessage(data));
      setMembers([]);
      return;
    }

    setMembers(data?.members ?? []);
  }

  async function loadCommentsForTask(currentToken: string, currentOrg: string, taskId: string) {
    const res = await fetch(`${base}/tasks/${taskId}/comments`, {
      headers: {
        Authorization: `Bearer ${currentToken}`,
        "x-org-slug": currentOrg,
      },
      cache: "no-store",
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setCommentsByTask((previous) => ({ ...previous, [taskId]: [] }));
      return;
    }

    setCommentsByTask((previous) => ({
      ...previous,
      [taskId]: data?.comments ?? [],
    }));
  }

  async function loadTasks(currentToken: string, currentOrg: string, projectId?: string) {
    const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";

    const res = await fetch(`${base}/tasks${query}`, {
      headers: {
        Authorization: `Bearer ${currentToken}`,
        "x-org-slug": currentOrg,
      },
      cache: "no-store",
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(formatErrorMessage(data));
      setTasks([]);
      return;
    }

    const nextTasks = data?.tasks ?? [];
    setTasks(nextTasks);

    setSelectedTaskId((previous) => {
      if (previous && nextTasks.some((task: Task) => task.id === previous)) return previous;
      return nextTasks[0]?.id ?? null;
    });
  }

  useEffect(() => {
    if (!authResolved || !token || !orgSlug) return;

    setError("");
    setInfo("");
    setLimitInfo(null);

    loadBilling(token, orgSlug);
    loadProjects(token, orgSlug);
    loadMembers(token, orgSlug);
  }, [authResolved, token, orgSlug]);

  useEffect(() => {
    if (!authResolved || !token || !orgSlug) return;

    if (!selectedProjectId) {
      setTasks([]);
      setCommentsByTask({});
      setSelectedTaskId(null);
      return;
    }

    loadTasks(token, orgSlug, selectedProjectId);
  }, [authResolved, token, orgSlug, selectedProjectId]);

  useEffect(() => {
    if (!authResolved || !token || !orgSlug || !selectedTaskId) return;
    loadCommentsForTask(token, orgSlug, selectedTaskId);
  }, [authResolved, token, orgSlug, selectedTaskId]);

  useEffect(() => {
    if (!authResolved || !token || !orgSlug) return;

    const source = new EventSource(
      `${base}/events/stream?token=${encodeURIComponent(token)}&orgSlug=${encodeURIComponent(orgSlug)}`
    );

    const refreshBoard = () => {
      if (!selectedProjectId) return;
      loadTasks(token, orgSlug, selectedProjectId);
      loadProjects(token, orgSlug);
      loadBilling(token, orgSlug);
      if (selectedTaskId) {
        loadCommentsForTask(token, orgSlug, selectedTaskId);
      }
    };

    source.onmessage = refreshBoard;
    source.addEventListener("task.created", refreshBoard);
    source.addEventListener("task.updated", refreshBoard);
    source.addEventListener("task.deleted", refreshBoard);
    source.addEventListener("task.commented", refreshBoard);
    source.addEventListener("project.created", () => {
      loadProjects(token, orgSlug);
    });

    return () => {
      source.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, authResolved, token, orgSlug, selectedProjectId, selectedTaskId]);

  async function startCheckout() {
    setError("");
    setInfo("");

    if (!token) return setError("Not logged in. Go to /login.");
    if (!orgSlug) return setError("Missing workspace. Select an org first.");

    const res = await fetch(`${base}/billing/checkout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "x-org-slug": orgSlug,
      },
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) return setError(formatErrorMessage(data));
    if (!data?.url) return setError("Checkout URL missing from server response.");

    window.location.href = data.url;
  }

  async function createProject(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setInfo("");

    if (!token) {
      setError("Not logged in. Go to /login.");
      return;
    }

    if (!orgSlug) {
      setError("Missing workspace. Select an org first.");
      router.push("/orgs");
      return;
    }

    const res = await fetch(`${base}/projects`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "x-org-slug": orgSlug,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: projectName,
        description: projectDescription,
      }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(formatErrorMessage(data));
      return;
    }

    setProjectName("");
    setProjectDescription("");
    setInfo("Project created successfully.");
    await loadProjects(token, orgSlug);
  }

  async function createTask(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setInfo("");
    setLimitInfo(null);

    if (!token) {
      setError("Not logged in. Go to /login.");
      return;
    }

    if (!orgSlug) {
      setError("Missing workspace. Select an org first.");
      router.push("/orgs");
      return;
    }

    if (!selectedProjectId) {
      setError("Please create or select a project first.");
      return;
    }

    const res = await fetch(`${base}/tasks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "x-org-slug": orgSlug,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        description,
        projectId: selectedProjectId,
        assigneeId: assigneeId || null,
        dueDate: dueDate || null,
      }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      if (res.status === 402 && data?.details?.limit != null) {
        setLimitInfo({
          limit: Number(data.details.limit),
          used: Number(data.details.used ?? data.details.limit),
        });
        setError("Free plan limit reached. Upgrade to PRO to create more tasks.");
      } else {
        setError(formatErrorMessage(data));
      }
      return;
    }

    setTitle("");
    setDescription("");
    setAssigneeId("");
    setDueDate("");
    setInfo("Task created successfully.");

    await loadTasks(token, orgSlug, selectedProjectId);
    await loadProjects(token, orgSlug);
    await loadBilling(token, orgSlug);
  }

  function startEditTask(task: Task) {
    setEditingTaskId(task.id);
    setEditDraft({
      title: task.title ?? "",
      description: task.description ?? "",
      assigneeId: task.assignee?.id ?? "",
      dueDate: toDateInputValue(task.dueDate),
    });
  }

  function cancelEditTask() {
    setEditingTaskId(null);
    setEditDraft({
      title: "",
      description: "",
      assigneeId: "",
      dueDate: "",
    });
  }

  async function saveTaskEdits(taskId: string) {
    setError("");
    setInfo("");

    if (!token) {
      setError("Not logged in. Go to /login.");
      return;
    }

    const res = await fetch(`${base}/tasks/${taskId}/details`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "x-org-slug": orgSlug,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: editDraft.title,
        description: editDraft.description || null,
        assigneeId: editDraft.assigneeId || null,
        dueDate: editDraft.dueDate || null,
      }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(formatErrorMessage(data));
      return;
    }

    setInfo("Task updated successfully.");
    cancelEditTask();
    await loadTasks(token, orgSlug, selectedProjectId);
  }

  async function deleteTask(taskId: string) {
    const confirmed = window.confirm("Are you sure you want to delete this task?");
    if (!confirmed) return;

    setError("");
    setInfo("");

    if (!token) {
      setError("Not logged in. Go to /login.");
      return;
    }

    const res = await fetch(`${base}/tasks/${taskId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "x-org-slug": orgSlug,
      },
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(formatErrorMessage(data));
      return;
    }

    setInfo("Task deleted successfully.");

    setCommentsByTask((previous) => {
      const next = { ...previous };
      delete next[taskId];
      return next;
    });

    if (selectedTaskId === taskId) {
      setSelectedTaskId(null);
    }

    if (editingTaskId === taskId) {
      cancelEditTask();
    }

    await loadTasks(token, orgSlug, selectedProjectId);
    await loadProjects(token, orgSlug);
    await loadBilling(token, orgSlug);
  }

  async function createComment(taskId: string) {
    setError("");
    setInfo("");

    const body = commentInput.trim();
    if (!body) return;

    if (!token) {
      setError("Not logged in. Go to /login.");
      return;
    }

    const res = await fetch(`${base}/tasks/${taskId}/comments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "x-org-slug": orgSlug,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ body }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(formatErrorMessage(data));
      return;
    }

    setCommentInput("");
    await loadCommentsForTask(token, orgSlug, taskId);
    await loadTasks(token, orgSlug, selectedProjectId);
    setInfo("Comment added.");
  }

  async function setStatus(taskId: string, status: TaskStatus) {
    setError("");
    setInfo("");

    if (!token) {
      setError("Not logged in. Go to /login.");
      return;
    }

    const res = await fetch(`${base}/tasks/${taskId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "x-org-slug": orgSlug,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(formatErrorMessage(data));
      return;
    }

    setInfo("Task status updated.");
    await loadTasks(token, orgSlug, selectedProjectId);
    await loadProjects(token, orgSlug);
  }

  async function onDropToStatus(status: TaskStatus) {
    if (!draggingTaskId) return;
    await setStatus(draggingTaskId, status);
    setDraggingTaskId(null);
  }

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId]
  );

  const filteredTasks = useMemo(() => {
    const term = search.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesText =
        !term ||
        task.title.toLowerCase().includes(term) ||
        task.description?.toLowerCase().includes(term) ||
        task.assignee?.name?.toLowerCase().includes(term) ||
        task.assignee?.email?.toLowerCase().includes(term);

      const matchesAssignee =
        assigneeFilter === "all"
          ? true
          : assigneeFilter === "unassigned"
            ? !task.assignee
            : task.assignee?.id === assigneeFilter;

      const matchesDue =
        dueFilter === "all"
          ? true
          : dueFilter === "overdue"
            ? isOverdue(task.dueDate, task.status)
            : dueFilter === "upcoming"
              ? Boolean(task.dueDate) && !isOverdue(task.dueDate, task.status) && task.status !== "DONE"
              : !task.assignee;

      return matchesText && matchesAssignee && matchesDue;
    });
  }, [tasks, search, assigneeFilter, dueFilter]);

  const tasksByStatus = useMemo(() => {
    return STATUSES.reduce<Record<TaskStatus, Task[]>>(
      (accumulator, status) => {
        accumulator[status] = filteredTasks.filter((task) => task.status === status);
        return accumulator;
      },
      {
        TODO: [],
        IN_PROGRESS: [],
        DONE: [],
      }
    );
  }, [filteredTasks]);

  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? null;
  const overdueCount = filteredTasks.filter((task) => isOverdue(task.dueDate, task.status)).length;
  const isPro = billing?.plan === "PRO";

  return (
    <>
      <AppHeader />

      <main className="space-y-6 px-4 py-8 md:px-8">
        <div className="mx-auto max-w-[1600px] space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">
                  Project board
                </div>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                  Trello board meets Asana task detail.
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
                  Create group projects, assign tasks, comment inside cards, and watch activity refresh live without changing your existing backend flow.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ["Visible tasks", filteredTasks.length],
                  ["Overdue", overdueCount],
                  ["Members", members.length],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      {label}
                    </div>
                    <div className="mt-2 text-2xl font-black text-slate-950">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {!authResolved ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
              Loading board...
            </div>
          ) : null}

          {authResolved && !token ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Not logged in. Redirecting to /login...
            </div>
          ) : null}

          {authResolved && token && !orgSlug ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              No workspace selected. Redirecting to /orgs...
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {info ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {info}
            </div>
          ) : null}

          {limitInfo ? (
            <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-5">
              <div className="text-lg font-semibold text-slate-900">Free plan limit reached</div>
              <div className="mt-1 text-sm text-slate-600">
                You have used <b>{limitInfo.used}</b> of <b>{limitInfo.limit}</b> tasks.
              </div>
              <button
                type="button"
                onClick={startCheckout}
                className="mt-4 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Upgrade to PRO
              </button>
            </div>
          ) : null}

          <section className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)_360px]">
            <aside className="space-y-6">
              <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Projects</div>
                <select
                  className="mt-4 w-full rounded-2xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5"
                  value={selectedProjectId}
                  onChange={(event) => setSelectedProjectId(event.target.value)}
                  disabled={!token || !orgSlug || projects.length === 0}
                >
                  {projects.length === 0 ? (
                    <option value="">No projects available</option>
                  ) : (
                    projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name} ({project.tasksCount} tasks)
                      </option>
                    ))
                  )}
                </select>

                <div className="mt-4 space-y-3">
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => setSelectedProjectId(project.id)}
                      className={`w-full rounded-[1.5rem] border px-4 py-4 text-left transition ${
                        selectedProjectId === project.id
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-slate-50 text-slate-900 hover:border-slate-300 hover:bg-white"
                      }`}
                    >
                      <div className="text-sm font-semibold">{project.name}</div>
                      <div
                        className={`mt-1 text-sm ${
                          selectedProjectId === project.id ? "text-slate-200" : "text-slate-500"
                        }`}
                      >
                        {project.description || "No description yet."}
                      </div>
                      <div
                        className={`mt-3 text-xs uppercase tracking-[0.18em] ${
                          selectedProjectId === project.id ? "text-slate-300" : "text-slate-400"
                        }`}
                      >
                        {project.tasksCount} tasks
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={createProject} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-lg font-bold text-slate-900">Create project board</div>
                <div className="mt-1 text-sm text-slate-500">Set up another team board in the active workspace.</div>

                <input
                  className="mt-4 w-full rounded-2xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5"
                  placeholder="Project name"
                  value={projectName}
                  onChange={(event) => setProjectName(event.target.value)}
                  disabled={!token || !orgSlug}
                />

                <textarea
                  className="mt-3 min-h-[110px] w-full rounded-2xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5"
                  placeholder="Project description"
                  value={projectDescription}
                  onChange={(event) => setProjectDescription(event.target.value)}
                  disabled={!token || !orgSlug}
                />

                <button
                  type="submit"
                  disabled={!token || !orgSlug || !projectName.trim()}
                  className="mt-4 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  Create Project
                </button>
              </form>
            </aside>

            <section className="space-y-6">
              <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <div className="text-lg font-bold text-slate-900">
                      {selectedProject?.name || "Choose a project"}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      {selectedProject?.description || "Select a project to see its kanban workflow."}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <input
                      className="rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5"
                      placeholder="Search tasks"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                    <select
                      className="rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5"
                      value={assigneeFilter}
                      onChange={(event) => setAssigneeFilter(event.target.value)}
                    >
                      <option value="all">All assignees</option>
                      <option value="unassigned">Unassigned</option>
                      {members.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name || member.email}
                        </option>
                      ))}
                    </select>
                    <select
                      className="rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5"
                      value={dueFilter}
                      onChange={(event) => setDueFilter(event.target.value as typeof dueFilter)}
                    >
                      <option value="all">All dates</option>
                      <option value="overdue">Overdue</option>
                      <option value="upcoming">Upcoming</option>
                      <option value="unassigned">Unassigned tasks</option>
                    </select>
                  </div>
                </div>
              </div>

              <form onSubmit={createTask} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
                  <div className="flex-1">
                    <div className="text-lg font-bold text-slate-900">Quick add task</div>
                    <div className="mt-1 text-sm text-slate-500">
                      Selected project:{" "}
                      <span className="font-semibold text-slate-900">{selectedProject?.name || "None"}</span>
                    </div>
                  </div>

                  {!isPro ? (
                    <button
                      type="button"
                      onClick={startCheckout}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white"
                    >
                      Upgrade for unlimited tasks
                    </button>
                  ) : null}
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  <input
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5"
                    placeholder="Task title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    disabled={!token || !orgSlug || !selectedProjectId}
                  />

                  <select
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5"
                    value={assigneeId}
                    onChange={(event) => setAssigneeId(event.target.value)}
                    disabled={!token || !orgSlug || !selectedProjectId}
                  >
                    <option value="">Unassigned</option>
                    {members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name || member.email} ({member.role})
                      </option>
                    ))}
                  </select>
                </div>

                <textarea
                  className="mt-3 min-h-[110px] w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5"
                  placeholder="Description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  disabled={!token || !orgSlug || !selectedProjectId}
                />

                <div className="mt-3 flex flex-col gap-3 lg:flex-row">
                  <input
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5"
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                    disabled={!token || !orgSlug || !selectedProjectId}
                  />

                  <button
                    type="submit"
                    disabled={!token || !orgSlug || !selectedProjectId || !title.trim()}
                    className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                  >
                    Create Task
                  </button>
                </div>
              </form>

              <div className="overflow-x-auto">
                <div className="flex min-w-[1000px] gap-5">
                  {STATUSES.map((status) => {
                    const meta = statusMeta(status);
                    const columnTasks = tasksByStatus[status];

                    return (
                      <div
                        key={status}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => onDropToStatus(status)}
                        className="w-80 flex-shrink-0 rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="mb-4 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
                            <div className="text-base font-bold text-slate-900">{statusLabel(status)}</div>
                          </div>
                          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${meta.badge}`}>
                            {columnTasks.length}
                          </span>
                        </div>

                        <div className="space-y-3">
                          {columnTasks.length === 0 ? (
                            <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white/70 px-4 py-6 text-center text-sm text-slate-500">
                              Drop a task here
                            </div>
                          ) : (
                            columnTasks.map((task) => {
                              const selected = task.id === selectedTaskId;
                              const overdue = isOverdue(task.dueDate, task.status);

                              return (
                                <button
                                  key={task.id}
                                  type="button"
                                  draggable
                                  onDragStart={() => setDraggingTaskId(task.id)}
                                  onDragEnd={() => setDraggingTaskId(null)}
                                  onClick={() => setSelectedTaskId(task.id)}
                                  className={`block w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                                    selected ? "border-slate-900 ring-2 ring-slate-900/10" : "border-slate-200"
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <div className="text-base font-semibold text-slate-900">{task.title}</div>
                                      <div className="mt-1 line-clamp-3 text-sm text-slate-500">
                                        {task.description || "No description yet."}
                                      </div>
                                    </div>
                                    <div className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                                      {task.commentsCount ?? 0}
                                    </div>
                                  </div>

                                  <div className="mt-4 flex flex-wrap items-center gap-2">
                                    <span
                                      className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${meta.badge}`}
                                    >
                                      {statusLabel(task.status)}
                                    </span>
                                    <span
                                      className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                                        overdue
                                          ? "border-red-200 bg-red-50 text-red-700"
                                          : "border-slate-200 bg-slate-50 text-slate-500"
                                      }`}
                                    >
                                      {formatDate(task.dueDate)}
                                    </span>
                                  </div>

                                  <div className="mt-4 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                                        {initials(task.assignee?.name, task.assignee?.email)}
                                      </div>
                                      <div>
                                        <div className="text-sm font-medium text-slate-900">
                                          {task.assignee?.name || task.assignee?.email || "Unassigned"}
                                        </div>
                                        <div className="text-xs text-slate-400">{task.project?.name || "No project"}</div>
                                      </div>
                                    </div>
                                    <div className="text-xs text-slate-400">{formatDateTime(task.createdAt)}</div>
                                  </div>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            <aside className="space-y-6">
              <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Task detail</div>
                    <div className="mt-1 text-lg font-bold text-slate-900">
                      {selectedTask ? selectedTask.title : "Select a task"}
                    </div>
                  </div>

                  {selectedTask ? (
                    <button
                      type="button"
                      onClick={() => setStatus(selectedTask.id, selectedTask.status === "DONE" ? "TODO" : "DONE")}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 transition hover:border-slate-300 hover:bg-white"
                    >
                      {selectedTask.status === "DONE" ? "Reopen" : "Mark done"}
                    </button>
                  ) : null}
                </div>

                {!selectedTask ? (
                  <div className="mt-6 rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-500">
                    Click any card to open a detail pane with comments, assignee data, and quick edits.
                  </div>
                ) : editingTaskId === selectedTask.id ? (
                  <div className="mt-5 space-y-3">
                    <input
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5"
                      value={editDraft.title}
                      onChange={(event) => setEditDraft((previous) => ({ ...previous, title: event.target.value }))}
                    />
                    <textarea
                      className="min-h-[120px] w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5"
                      value={editDraft.description}
                      onChange={(event) => setEditDraft((previous) => ({ ...previous, description: event.target.value }))}
                    />
                    <select
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5"
                      value={editDraft.assigneeId}
                      onChange={(event) => setEditDraft((previous) => ({ ...previous, assigneeId: event.target.value }))}
                    >
                      <option value="">Unassigned</option>
                      {members.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name || member.email}
                        </option>
                      ))}
                    </select>
                    <input
                      type="date"
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5"
                      value={editDraft.dueDate}
                      onChange={(event) => setEditDraft((previous) => ({ ...previous, dueDate: event.target.value }))}
                    />
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => saveTaskEdits(selectedTask.id)}
                        className="flex-1 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        Save changes
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditTask}
                        className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 space-y-5">
                    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Description</div>
                      <div className="mt-2 text-sm leading-7 text-slate-700">
                        {selectedTask.description || "No description yet."}
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Assignee</div>
                        <div className="mt-2 text-sm font-semibold text-slate-900">
                          {selectedTask.assignee?.name || selectedTask.assignee?.email || "Unassigned"}
                        </div>
                      </div>
                      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Due date</div>
                        <div className="mt-2 text-sm font-semibold text-slate-900">{formatDate(selectedTask.dueDate)}</div>
                      </div>
                      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Project</div>
                        <div className="mt-2 text-sm font-semibold text-slate-900">{selectedTask.project?.name || "No project"}</div>
                      </div>
                      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Created</div>
                        <div className="mt-2 text-sm font-semibold text-slate-900">{formatDateTime(selectedTask.createdAt)}</div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => startEditTask(selectedTask)}
                        className="flex-1 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        Edit task
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteTask(selectedTask.id)}
                        className="rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-lg font-bold text-slate-900">Comments & activity</div>
                <div className="mt-1 text-sm text-slate-500">
                  Keep communication inside the task card for the internship requirement.
                </div>

                {selectedTask ? (
                  <>
                    <div className="mt-4 space-y-3">
                      {(commentsByTask[selectedTask.id] ?? []).length === 0 ? (
                        <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                          No comments yet.
                        </div>
                      ) : (
                        (commentsByTask[selectedTask.id] ?? []).map((comment) => (
                          <div key={comment.id} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                                {initials(comment.author.name, comment.author.email)}
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-slate-900">
                                  {comment.author.name || comment.author.email}
                                </div>
                                <div className="text-xs text-slate-400">{formatDateTime(comment.createdAt)}</div>
                              </div>
                            </div>
                            <div className="mt-3 text-sm leading-7 text-slate-700">{comment.body}</div>
                          </div>
                        ))
                      )}
                    </div>

                    <textarea
                      className="mt-4 min-h-[110px] w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5"
                      placeholder="Write a comment..."
                      value={commentInput}
                      onChange={(event) => setCommentInput(event.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => createComment(selectedTask.id)}
                      className="mt-3 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      Add Comment
                    </button>
                  </>
                ) : (
                  <div className="mt-4 rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                    Select a task to view its discussion thread.
                  </div>
                )}
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-lg font-bold text-slate-900">Team members</div>
                <div className="mt-1 text-sm text-slate-500">Assignee-ready workspace roster.</div>

                <div className="mt-4 space-y-3">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center gap-3 rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                        {initials(member.name, member.email)}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{member.name || member.email}</div>
                        <div className="text-xs uppercase tracking-[0.18em] text-slate-400">{member.role}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </section>
        </div>
      </main>
    </>
  );
}