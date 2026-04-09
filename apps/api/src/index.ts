import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import path from "path";
import cookieParser from "cookie-parser";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import crypto from "crypto";
import rateLimit from "express-rate-limit";



function getCurrentOrgId(req: any) {
  return req.orgId;
}

/**
 * ============================================================
 * ENV LOADING (Windows-safe, ts-node-dev-safe)
 * ============================================================
 * We are running from: opsboard/apps/api
 * So process.cwd() should be .../apps/api
 */
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const app = express();

/**
 * ============================================================
 * Helpers
 * ============================================================
 */
function mustGetEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

/**
 * ============================================================
 * ENV (config)
 * ============================================================
 */
const DATABASE_URL = mustGetEnv("DATABASE_URL");
const ACCESS_SECRET = mustGetEnv("JWT_ACCESS_SECRET");
const REFRESH_SECRET = mustGetEnv("JWT_REFRESH_SECRET");
const ACCESS_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN ?? "15m";
const REFRESH_DAYS = Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS ?? "7");

// Stripe
const STRIPE_SECRET_KEY = mustGetEnv("STRIPE_SECRET_KEY");
const STRIPE_PRICE_PRO = mustGetEnv("STRIPE_PRICE_PRO");
const APP_URL = mustGetEnv("APP_URL");
const STRIPE_WEBHOOK_SECRET = mustGetEnv("STRIPE_WEBHOOK_SECRET");

/**
 * ============================================================
 * Prisma (DB)
 * ============================================================
 */
const adapter = new PrismaPg({ connectionString: DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const orgEventClients = new Map<string, Map<string, express.Response>>();

type LiveNotification = {
  id: string;
  orgId: string;
  type: string;
  title: string;
  body?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  createdAt: string;
};

const orgNotifications = new Map<string, LiveNotification[]>();
const notificationReadState = new Map<string, Set<string>>();

function getNotificationReadKey(userId: string, orgId: string) {
  return `${userId}:${orgId}`;
}

function addOrgEventClient(orgId: string, clientId: string, res: express.Response) {
  const bucket = orgEventClients.get(orgId) ?? new Map<string, express.Response>();
  bucket.set(clientId, res);
  orgEventClients.set(orgId, bucket);
}

function removeOrgEventClient(orgId: string, clientId: string) {
  const bucket = orgEventClients.get(orgId);
  if (!bucket) return;
  bucket.delete(clientId);
  if (bucket.size === 0) {
    orgEventClients.delete(orgId);
  }
}

function broadcastOrgEvent(orgId: string, event: string, payload: unknown) {
  const bucket = orgEventClients.get(orgId);
  if (!bucket || bucket.size === 0) return;

  const message = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;

  for (const res of bucket.values()) {
    res.write(message);
  }
}

function createOrgNotifications(input: {
  orgId: string;
  type: string;
  title: string;
  body?: string | null;
  entityType?: string | null;
  entityId?: string | null;
}) {
  const item: LiveNotification = {
    id: crypto.randomUUID(),
    orgId: input.orgId,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    createdAt: new Date().toISOString(),
  };

  const current = orgNotifications.get(input.orgId) ?? [];
  orgNotifications.set(input.orgId, [item, ...current].slice(0, 200));

  broadcastOrgEvent(input.orgId, "notification", {
    type: input.type,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    at: item.createdAt,
  });
}

async function getSeedNotifications(orgId: string): Promise<LiveNotification[]> {
  const [projects, tasks, comments] = await Promise.all([
    prisma.project.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.task.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      take: 12,
      include: {
        project: {
          select: {
            name: true,
          },
        },
      },
    }),
    prisma.taskComment.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
      include: {
        task: {
          select: {
            title: true,
            orgId: true,
          },
        },
        author: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    }),
  ]);

  const filteredComments = comments.filter((comment) => comment.task.orgId === orgId).slice(0, 12);

  return [
    ...projects.map((project) => ({
      id: `project:${project.id}`,
      orgId,
      type: "PROJECT_CREATED",
      title: `New project: ${project.name}`,
      body: project.description || "A new board is ready for the team.",
      entityType: "project",
      entityId: project.id,
      createdAt: project.createdAt.toISOString(),
    })),
    ...tasks.map((task) => ({
      id: `task:${task.id}`,
      orgId,
      type: "TASK_CREATED",
      title: `Task created: ${task.title}`,
      body: task.project?.name ? `Added to ${task.project.name}` : "A new task was added to the board.",
      entityType: "task",
      entityId: task.id,
      createdAt: task.createdAt.toISOString(),
    })),
    ...filteredComments.map((comment) => ({
      id: `comment:${comment.id}`,
      orgId,
      type: "TASK_COMMENTED",
      title: `New comment on ${comment.task.title}`,
      body: `${comment.author.name || comment.author.email}: ${comment.body.slice(0, 120)}`,
      entityType: "task",
      entityId: comment.taskId,
      createdAt: comment.createdAt.toISOString(),
    })),
  ]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 40);
}

async function listNotificationsForUser(orgId: string, userId: string) {
  const live = orgNotifications.get(orgId) ?? [];
  const seed = live.length === 0 ? await getSeedNotifications(orgId) : [];
  const combined = [...live, ...seed].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );

  const seen = notificationReadState.get(getNotificationReadKey(userId, orgId)) ?? new Set<string>();

  const notifications = combined.slice(0, 40).map((item) => ({
    ...item,
    readAt: seen.has(item.id) ? item.createdAt : null,
  }));

  const unreadCount = notifications.filter((item) => !item.readAt).length;
  return { notifications, unreadCount };
}

/**
 * ============================================================
 * JWT helpers
 * ============================================================
 */
function signAccessToken(userId: string) {
  return jwt.sign({ sub: userId }, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
}

function signRefreshToken(userId: string) {
  return jwt.sign({ sub: userId }, REFRESH_SECRET, { expiresIn: `${REFRESH_DAYS}d` });
}

function verifyRefreshToken(token: string): { sub: string } | null {
  try {
    const payload = jwt.verify(token, REFRESH_SECRET) as any;
    if (!payload?.sub) return null;
    return { sub: String(payload.sub) };
  } catch {
    return null;
  }
}

/**
 * ============================================================
 * Stripe (dynamic import to avoid ts-node-dev ESM issues)
 * ============================================================
 */
let stripeClient: any = null;

async function getStripe() {
  if (stripeClient) return stripeClient;

  const mod = await import("stripe");
  const Stripe = mod.default;

  stripeClient = new Stripe(STRIPE_SECRET_KEY);
  return stripeClient;
}

/**
 * ============================================================
 * Middleware
 * ============================================================
 */
app.use(helmet());
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

// Basic rate limiting (protects your API from abuse)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 300, // per IP per window
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(apiLimiter);

/**
 * ✅ IMPORTANT:
 * Stripe webhook MUST be registered BEFORE express.json()
 * because Stripe needs RAW body to verify signature.
 */
app.post("/webhooks/stripe", express.raw({ type: "application/json" }), async (req: any, res) => {
  try {
    const sig = req.headers["stripe-signature"];
    if (!sig) return res.status(400).send("Missing stripe-signature header");

    const stripe = await getStripe();
    const event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);

    console.log("✅ Stripe webhook received:", event.type);

    /**
     * 1) Checkout completed -> map to orgId and create/update subscription record
     */
    if (event.type === "checkout.session.completed") {
      const rawSession = event.data.object as any;

      // Re-fetch session to get expanded customer/subscription
      const stripeSession = await stripe.checkout.sessions.retrieve(rawSession.id, {
        expand: ["subscription", "customer"],
      });

      // Only handle subscription checkouts
      if (stripeSession.mode !== "subscription") {
        console.log("ℹ️ checkout.session.completed not subscription mode. mode=", stripeSession.mode);
        return res.json({ received: true });
      }

      // Extract orgId from safest places
      const sessionMetaOrgId = stripeSession.metadata?.orgId;
      const clientRefOrgId = stripeSession.client_reference_id;

      const subObj: any =
        stripeSession.subscription && typeof stripeSession.subscription === "object"
          ? stripeSession.subscription
          : null;

      const customerObj: any =
        stripeSession.customer && typeof stripeSession.customer === "object"
          ? stripeSession.customer
          : null;

      const subMetaOrgId = subObj?.metadata?.orgId;
      const custMetaOrgId = customerObj?.metadata?.orgId;

      const orgId = sessionMetaOrgId || clientRefOrgId || subMetaOrgId || custMetaOrgId || null;

      if (!orgId) {
        console.log("⚠️ No orgId found in session (metadata/client_reference_id/sub/customer)");
        return res.json({ received: true });
      }

      // Find plan priceId (best-effort)
      let priceId: string | null = null;
      try {
        const items = await stripe.checkout.sessions.listLineItems(stripeSession.id, { limit: 1 });
        priceId = (items.data?.[0] as any)?.price?.id ?? null;
      } catch {
        priceId = null;
      }

      const customerId =
        typeof stripeSession.customer === "string"
          ? stripeSession.customer
          : (stripeSession.customer?.id as string | undefined) ?? null;

      const subscriptionId =
        typeof stripeSession.subscription === "string"
          ? stripeSession.subscription
          : (stripeSession.subscription?.id as string | undefined) ?? null;

      const status = subObj?.status ?? "active";
      const currentPeriodEnd = subObj?.current_period_end
        ? new Date(subObj.current_period_end * 1000)
        : null;

      const cancelAtPeriodEnd = Boolean(subObj?.cancel_at_period_end ?? false);

      // Save / update Stripe customer for this org
      if (customerId) {
        await prisma.billingCustomer.upsert({
          where: { orgId },
          update: { stripeCustomerId: customerId },
          create: { orgId, stripeCustomerId: customerId },
        });
      }

      // Save subscription row for this org
      await prisma.subscription.upsert({
        where: { orgId },
        update: {
          stripeSubscriptionId: subscriptionId,
          status,
          priceId,
          currentPeriodEnd,
          cancelAtPeriodEnd,
        },
        create: {
          orgId,
          stripeSubscriptionId: subscriptionId,
          status,
          priceId,
          currentPeriodEnd,
          cancelAtPeriodEnd,
        },
      });

      console.log(
        "🎉 Subscription saved for org:",
        orgId,
        "status:",
        status,
        "price:",
        priceId,
        "cancelAtPeriodEnd:",
        cancelAtPeriodEnd
      );

      return res.json({ received: true });
    }

    /**
     * 2) Subscription lifecycle events -> sync DB record by stripeSubscriptionId
     */
    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const sub = event.data.object as any;

      const stripeSubscriptionId = sub.id as string;
      const status = sub.status as string;
      const priceId = sub.items?.data?.[0]?.price?.id ?? null;
      const currentPeriodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null;
      const cancelAtPeriodEnd = Boolean(sub.cancel_at_period_end ?? false);

      const row = await prisma.subscription.findUnique({
        where: { stripeSubscriptionId },
      });

      if (!row) {
        console.log("ℹ️ subscription event but no matching subscription in DB:", stripeSubscriptionId);
        return res.json({ received: true });
      }

      await prisma.subscription.update({
        where: { orgId: row.orgId },
        data: {
          status,
          priceId,
          currentPeriodEnd,
          cancelAtPeriodEnd,
        },
      });

      console.log("✅ Subscription synced:", stripeSubscriptionId, "status:", status);
      return res.json({ received: true });
    }

    // Ignore other events
    return res.json({ received: true });
  } catch (err: any) {
    console.log("❌ Stripe webhook error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

// Normal JSON parsing for all other routes
app.use(express.json());
app.use(cookieParser());

/**
 * ============================================================
 * Auth middleware
 * ============================================================
 */
function requireAuth(req: any, res: any, next: any) {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing token" });
  }

  const token = auth.split(" ")[1];

  try {
    const payload = jwt.verify(token, ACCESS_SECRET) as any;
    req.userId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

type AuthedRequest = express.Request & { userId: string; orgId?: string; role?: string };

async function requireTenant(req: AuthedRequest, res: express.Response, next: express.NextFunction) {
  const orgSlug = req.header("x-org-slug");
  if (!orgSlug) return res.status(400).json({ error: "Missing x-org-slug header" });

  const org = await prisma.organization.findUnique({ where: { slug: orgSlug } });
  if (!org) return res.status(404).json({ error: "Organization not found" });

  const membership = await prisma.membership.findUnique({
    where: { userId_orgId: { userId: req.userId, orgId: org.id } },
  });

  if (!membership) return res.status(403).json({ error: "Not a member of this organization" });

  req.orgId = org.id;
  req.role = membership.role;
  next();
}

async function requireStreamAuth(req: any, res: any, next: any) {
  const token = typeof req.query.token === "string" ? req.query.token : "";
  const orgSlug = typeof req.query.orgSlug === "string" ? req.query.orgSlug : "";

  if (!token || !orgSlug) {
    return res.status(401).json({ error: "Missing stream auth params" });
  }

  try {
    const payload = jwt.verify(token, ACCESS_SECRET) as any;
    const userId = String(payload?.sub ?? "");
    if (!userId) return res.status(401).json({ error: "Invalid token" });

    const org = await prisma.organization.findUnique({ where: { slug: orgSlug } });
    if (!org) return res.status(404).json({ error: "Organization not found" });

    const membership = await prisma.membership.findUnique({
      where: { userId_orgId: { userId, orgId: org.id } },
    });

    if (!membership) return res.status(403).json({ error: "Not a member of this organization" });

    req.userId = userId;
    req.orgId = org.id;
    req.role = membership.role;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

function requireRole(...allowed: Array<"OWNER" | "ADMIN" | "MEMBER">) {
  return (req: any, res: any, next: any) => {
    const role = req.role as "OWNER" | "ADMIN" | "MEMBER" | undefined;
    if (!role) return res.status(403).json({ error: "No role found" });

    if (!allowed.includes(role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    next();
  };
}

/**
 * ============================================================
 * Billing + Plan helpers
 * ============================================================
 */

const FREE_TASK_LIMIT = 5;

function isActiveSub(status?: string | null) {
  return status === "active" || status === "trialing";
}

/**
 * Allow task creation if:
 * - org has an active subscription (PRO) -> unlimited
 * - OR org is FREE but has created less than FREE_TASK_LIMIT tasks
 */
function allowTaskCreationWithFreeLimit() {
  return async (req: any, res: any, next: any) => {
    if (!req.orgId) return res.status(400).json({ error: "Missing org context" });

    const sub = await prisma.subscription.findUnique({ where: { orgId: req.orgId } });
    const isPro = Boolean(sub && isActiveSub(sub.status));

    // If PRO => unlimited
    if (isPro) return next();

    // FREE plan: enforce limit
    const count = await prisma.task.count({ where: { orgId: req.orgId } });

    console.log("🧪 FREE LIMIT CHECK", { orgId: req.orgId, count, limit: FREE_TASK_LIMIT });

    if (count >= FREE_TASK_LIMIT) {
      return res.status(402).json({
        error: "Free plan limit reached",
        details: { limit: FREE_TASK_LIMIT, used: count, upgradeRequired: true },
      });
    }

    return next();
  };
}
/**
 * ============================================================
 * Health (never crash server)
 * ============================================================
 */
app.get("/health", async (_req, res) => {
  try {
    const users = await prisma.user.count();
    res.json({ ok: true, users });
  } catch (e: any) {
    // If migrations weren't applied yet, don't crash dev server.
    res.status(200).json({ ok: false, error: e?.message ?? "health error" });
  }
});

/**
 * ============================================================
 * AUTH routes
 * ============================================================
 */
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).optional(),
});

app.post("/auth/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { email, password, name } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: "Email already in use" });

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { email, name, passwordHash },
    select: { id: true, email: true, name: true, createdAt: true },
  });

  res.status(201).json({ user });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

app.post("/auth/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const accessToken = signAccessToken(user.id);
  const refreshToken = signRefreshToken(user.id);

  const expiresAt = new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: sha256(refreshToken),
      expiresAt,
    },
  });

  res.cookie("refresh_token", refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    expires: expiresAt,
  });

  res.json({
    accessToken,
    user: { id: user.id, email: user.email, name: user.name },
  });
});

app.post("/auth/refresh", async (req, res) => {
  const token = req.cookies?.refresh_token;
  if (!token) return res.status(401).json({ error: "Missing refresh token" });

  const payload = verifyRefreshToken(token);
  if (!payload) return res.status(401).json({ error: "Invalid refresh token" });

  const tokenHash = sha256(token);
  const found = await prisma.refreshToken.findFirst({
    where: { tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
  });

  if (!found) return res.status(401).json({ error: "Refresh token revoked/expired" });

  const accessToken = signAccessToken(payload.sub);
  res.json({ accessToken });
});

app.post("/auth/logout", async (req, res) => {
  const token = req.cookies?.refresh_token;

  if (token) {
    const tokenHash = sha256(token);
    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  res.clearCookie("refresh_token", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
  });

  res.json({ ok: true });
});

/**
 * ============================================================
 * Orgs
 * ============================================================
 */
const createOrgSchema = z.object({
  name: z.string().min(2),
});

app.post("/orgs", requireAuth as any, async (req: any, res) => {
  const parsed = createOrgSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { name } = parsed.data;
  const slug = name.toLowerCase().trim().replace(/\s+/g, "-");

  const org = await prisma.organization.create({
    data: {
      name,
      slug,
      memberships: {
        create: {
          userId: req.userId,
          role: "OWNER",
        },
      },
    },
  });

  res.status(201).json({ org });
});

app.get("/orgs/mine", requireAuth as any, async (req: any, res) => {
  const rows = await prisma.membership.findMany({
    where: { userId: req.userId },
    include: { org: true },
    orderBy: { createdAt: "desc" },
  });

  res.json({
    orgs: rows.map((m) => ({
      orgId: m.orgId,
      slug: m.org.slug,
      name: m.org.name,
      role: m.role,
    })),
  });
});


app.get("/orgs/members", requireAuth as any, requireTenant as any, async (req: any, res) => {
  const memberships = await prisma.membership.findMany({
    where: { orgId: req.orgId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  res.json({
    members: memberships.map((m) => ({
      id: m.user.id,
      email: m.user.email,
      name: m.user.name,
      role: m.role,
    })),
  });
});

app.post("/dev/add-member", requireAuth as any, async (req: any, res) => {
  const bodySchema = z.object({
    orgSlug: z.string().min(1),
    userEmail: z.string().email(),
    role: z.enum(["OWNER", "ADMIN", "MEMBER"]),
  });

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { orgSlug, userEmail, role } = parsed.data;

  const org = await prisma.organization.findUnique({ where: { slug: orgSlug } });
  if (!org) return res.status(404).json({ error: "Org not found" });

  const user = await prisma.user.findUnique({ where: { email: userEmail } });
  if (!user) return res.status(404).json({ error: "User not found" });

  const membership = await prisma.membership.upsert({
    where: { userId_orgId: { userId: user.id, orgId: org.id } },
    update: { role },
    create: { userId: user.id, orgId: org.id, role },
  });

  res.json({ membership });
});

app.get("/me/org", requireAuth as any, requireTenant as any, async (req: any, res) => {
  res.json({ userId: req.userId, orgId: req.orgId, role: req.role });
});

app.get("/events/stream", requireStreamAuth as any, async (req: any, res: express.Response) => {
  const clientId = crypto.randomUUID();

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  addOrgEventClient(req.orgId, clientId, res);

  res.write(`event: connected\ndata: ${JSON.stringify({ ok: true, at: new Date().toISOString() })}\n\n`);

  const heartbeat = setInterval(() => {
    res.write(`event: ping\ndata: ${JSON.stringify({ ok: true, at: new Date().toISOString() })}\n\n`);
  }, 25000);

  req.on("close", () => {
    clearInterval(heartbeat);
    removeOrgEventClient(req.orgId, clientId);
    res.end();
  });
});

app.get("/notifications", requireAuth as any, requireTenant as any, async (req: any, res) => {
  const payload = await listNotificationsForUser(req.orgId, req.userId);
  return res.json(payload);
});

app.post("/notifications/read-all", requireAuth as any, requireTenant as any, async (req: any, res) => {
  const payload = await listNotificationsForUser(req.orgId, req.userId);
  const key = getNotificationReadKey(req.userId, req.orgId);
  const seen = notificationReadState.get(key) ?? new Set<string>();

  for (const notification of payload.notifications) {
    seen.add(notification.id);
  }

  notificationReadState.set(key, seen);

  broadcastOrgEvent(req.orgId, "notification.readAll", {
    userId: req.userId,
    at: new Date().toISOString(),
  });

  return res.json({ ok: true });
});

app.post("/notifications/:id/read", requireAuth as any, requireTenant as any, async (req: any, res) => {
  const payload = await listNotificationsForUser(req.orgId, req.userId);
  const existing = payload.notifications.find((notification) => notification.id === req.params.id);

  if (!existing) {
    return res.status(404).json({ error: "Notification not found" });
  }

  const key = getNotificationReadKey(req.userId, req.orgId);
  const seen = notificationReadState.get(key) ?? new Set<string>();
  seen.add(existing.id);
  notificationReadState.set(key, seen);

  broadcastOrgEvent(req.orgId, "notification.read", {
    userId: req.userId,
    notificationId: existing.id,
    at: new Date().toISOString(),
  });

  return res.json({
    notification: {
      id: existing.id,
      readAt: new Date().toISOString(),
    },
  });
});

/**
 * ============================================================
 * Billing
 * ============================================================
 */
/**
 * ============================================================
 * Billing
 * ============================================================
 */
// Status
app.get(
  "/billing/status",
  requireAuth as any,
  requireTenant as any,
  requireRole("OWNER", "ADMIN"),
  async (req: any, res) => {
    const sub = await prisma.subscription.findUnique({ where: { orgId: req.orgId } });
    const customer = await prisma.billingCustomer.findUnique({ where: { orgId: req.orgId } });

    // No subscription => FREE
    if (!sub) {
      return res.json({
        plan: "FREE",
        status: "none",
        seatsIncluded: 1,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        stripeCustomerId: customer?.stripeCustomerId ?? null,
        stripeSubscriptionId: null,
      });
    }

    // Compute plan properly
    const isPro = sub && (sub.status === "active" || sub.status === "trialing");

    return res.json({
    plan: isPro ? "PRO" : "FREE",
    status: sub?.status ?? "none",
    priceId: sub?.priceId ?? null,
    currentPeriodEnd: sub?.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
    stripeCustomerId: customer?.stripeCustomerId ?? null,
    stripeSubscriptionId: sub?.stripeSubscriptionId ?? null, 
   });
  }
);

// Checkout (subscription)
app.post(
  "/billing/checkout",
  requireAuth as any,
  requireTenant as any,
  requireRole("OWNER", "ADMIN"),
  async (req: any, res) => {
    const stripe = await getStripe();

    const priceId = STRIPE_PRICE_PRO;
    console.log("🔎 Using STRIPE_PRICE_PRO =", STRIPE_PRICE_PRO);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",

      metadata: { orgId: req.orgId },
      client_reference_id: req.orgId,

      subscription_data: {
        metadata: { orgId: req.orgId },
      },

      line_items: [{ price: priceId, quantity: 1 }],

      success_url: `${APP_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/billing/cancel`,
    });

    console.log("✅ Created checkout for org:", req.orgId, req.header("x-org-slug"));
    return res.json({ url: session.url });
  }
);

// Customer Portal (manage billing)
app.post(
  "/billing/portal",
  requireAuth as any,
  requireTenant as any,
  requireRole("OWNER", "ADMIN"),
  async (req: any, res) => {
    const stripe = await getStripe();

    const customer = await prisma.billingCustomer.findUnique({
      where: { orgId: req.orgId },
    });

    if (!customer?.stripeCustomerId) {
      return res.status(400).json({ error: "No Stripe customer found for this org" });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customer.stripeCustomerId,
      return_url: `${APP_URL}/billing`,
    });

    return res.json({ url: session.url });
  }
);

// Cancel subscription (at period end)
app.post(
  "/billing/cancel",
  requireAuth as any,
  requireTenant as any,
  requireRole("OWNER", "ADMIN"),
  async (req: any, res) => {
    const stripe = await getStripe();

    const sub = await prisma.subscription.findUnique({
      where: { orgId: req.orgId },
    });

    if (!sub?.stripeSubscriptionId) {
      return res.status(400).json({ error: "No subscription found for this org" });
    }

    const updated = await stripe.subscriptions.update(sub.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    // Save latest status + end date in DB (no schema change needed)
    const currentPeriodEnd = updated.current_period_end
      ? new Date(updated.current_period_end * 1000)
      : null;

    await prisma.subscription.update({
      where: { orgId: req.orgId },
      data: {
        status: updated.status,
        currentPeriodEnd,
      },
    });

    return res.json({
      ok: true,
      status: updated.status,
      cancelAtPeriodEnd: updated.cancel_at_period_end,
      currentPeriodEnd,
    });
  }
);

// Resume subscription (remove cancel_at_period_end)
app.post(
  "/billing/resume",
  requireAuth as any,
  requireTenant as any,
  requireRole("OWNER", "ADMIN"),
  async (req: any, res) => {
    const stripe = await getStripe();

    const sub = await prisma.subscription.findUnique({
      where: { orgId: req.orgId },
    });

    if (!sub?.stripeSubscriptionId) {
      return res.status(400).json({ error: "No subscription found for this org" });
    }

    const updated = await stripe.subscriptions.update(sub.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

    const currentPeriodEnd = updated.current_period_end
      ? new Date(updated.current_period_end * 1000)
      : null;

    await prisma.subscription.update({
      where: { orgId: req.orgId },
      data: {
        status: updated.status,
        currentPeriodEnd,
        cancelAtPeriodEnd: Boolean(updated.cancel_at_period_end ?? false),
      },
    });

    return res.json({
      ok: true,
      status: updated.status,
      cancelAtPeriodEnd: updated.cancel_at_period_end,
      currentPeriodEnd,
    });
  }
);

/**
 * ============================================================
 * Tasks (paid feature)
 * ============================================================
 */
const createTaskSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  projectId: z.string().uuid(),
  assigneeId: z.string().uuid().optional().nullable(),
  dueDate: z.string().optional().nullable(),
});

const updateTaskSchema = z.object({
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]),
});

const createTaskCommentSchema = z.object({
  body: z.string().min(1).max(1000),
});

const updateTaskDetailsSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional().nullable(),
  assigneeId: z.string().uuid().optional().nullable(),
  dueDate: z.string().optional().nullable(),
});

app.post(
  "/tasks",
  requireAuth as any,
  requireTenant as any,
  requireRole("OWNER", "ADMIN"),
  allowTaskCreationWithFreeLimit(),
  async (req: any, res) => {
    const parsed = createTaskSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const project = await prisma.project.findFirst({
      where: {
        id: parsed.data.projectId,
        orgId: req.orgId,
      },
    });

    if (!project) {
      return res.status(404).json({ error: "Project not found in this organization" });
    }

    if (parsed.data.assigneeId) {
      const membership = await prisma.membership.findUnique({
        where: {
          userId_orgId: {
            userId: parsed.data.assigneeId,
            orgId: req.orgId,
          },
        },
      });

      if (!membership) {
        return res.status(404).json({ error: "Assignee is not a member of this organization" });
      }
    }

    const dueDateValue =
      parsed.data.dueDate && parsed.data.dueDate.trim()
        ? new Date(parsed.data.dueDate)
        : null;

    const task = await prisma.task.create({
      data: {
        orgId: req.orgId,
        projectId: parsed.data.projectId,
        title: parsed.data.title,
        description: parsed.data.description,
        assigneeId: parsed.data.assigneeId || null,
        dueDate: dueDateValue,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        assignee: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    createOrgNotifications({
      orgId: req.orgId,
      type: "TASK_CREATED",
      title: `Task created: ${task.title}`,
      body: task.project?.name ? `Added to ${task.project.name}` : "A new task was added to the board.",
      entityType: "task",
      entityId: task.id,
    });

    broadcastOrgEvent(req.orgId, "task.created", {
      taskId: task.id,
      projectId: task.projectId,
      at: new Date().toISOString(),
    });

    res.status(201).json({ task });
  }
);

app.get(
  "/tasks/:id/comments",
  requireAuth as any,
  requireTenant as any,
  async (req: any, res) => {
    const { id } = req.params;

    const task = await prisma.task.findFirst({
      where: {
        id,
        orgId: req.orgId,
      },
      select: { id: true },
    });

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    const comments = await prisma.taskComment.findMany({
      where: {
        taskId: id,
      },
      orderBy: { createdAt: "asc" },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    return res.json({
      comments: comments.map((comment) => ({
        id: comment.id,
        body: comment.body,
        createdAt: comment.createdAt,
        author: {
          id: comment.author.id,
          email: comment.author.email,
          name: comment.author.name,
        },
      })),
    });
  }
);


app.post(
  "/tasks/:id/comments",
  requireAuth as any,
  requireTenant as any,
  async (req: any, res) => {
    const { id } = req.params;

    const parsed = createTaskCommentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const task = await prisma.task.findFirst({
      where: {
        id,
        orgId: req.orgId,
      },
      select: { id: true },
    });

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    const comment = await prisma.taskComment.create({
      data: {
        taskId: id,
        authorId: req.userId,
        body: parsed.data.body.trim(),
      },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    const taskDetails = await prisma.task.findUnique({
      where: { id },
      select: {
        title: true,
        projectId: true,
      },
    });

    createOrgNotifications({
      orgId: req.orgId,
      type: "TASK_COMMENTED",
      title: `New comment on ${taskDetails?.title ?? "a task"}`,
      body: `${comment.author.name || comment.author.email}: ${comment.body.slice(0, 120)}`,
      entityType: "task",
      entityId: id,
    });

    broadcastOrgEvent(req.orgId, "task.commented", {
      taskId: id,
      projectId: taskDetails?.projectId ?? null,
      at: new Date().toISOString(),
    });

    return res.status(201).json({
      comment: {
        id: comment.id,
        body: comment.body,
        createdAt: comment.createdAt,
        author: {
          id: comment.author.id,
          email: comment.author.email,
          name: comment.author.name,
        },
      },
    });
  }
);

app.get("/tasks", requireAuth as any, requireTenant as any, async (req: any, res) => {
  const projectId = req.query.projectId as string | undefined;

  const tasks = await prisma.task.findMany({
    where: {
      orgId: req.orgId,
      ...(projectId ? { projectId } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      project: {
        select: {
          id: true,
          name: true,
        },
      },
      assignee: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      _count: {
        select: {
          comments: true,
        },
      },
    },
  });

  res.json({
    tasks: tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      projectId: task.projectId,
      dueDate: task.dueDate,
      createdAt: task.createdAt,
      commentsCount: task._count.comments,
      project: task.project,
      assignee: task.assignee
        ? {
            id: task.assignee.id,
            email: task.assignee.email,
            name: task.assignee.name,
          }
        : null,
    })),
  });
});

app.patch(
  "/tasks/:id",
  requireAuth as any,
  requireTenant as any,
  requireRole("OWNER", "ADMIN"),
  async (req: any, res) => {
    const parsed = updateTaskSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { id } = req.params;

    const previousTask = await prisma.task.findFirst({
      where: { id, orgId: req.orgId },
      select: {
        id: true,
        title: true,
        status: true,
        projectId: true,
      },
    });

    if (!previousTask) return res.status(404).json({ error: "Task not found" });

    await prisma.task.updateMany({
      where: { id, orgId: req.orgId },
      data: { status: parsed.data.status },
    });

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        assignee: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    createOrgNotifications({
      orgId: req.orgId,
      type: "TASK_STATUS_CHANGED",
      title: `Task moved to ${parsed.data.status.replaceAll("_", " ")}`,
      body: `${previousTask.title} moved from ${previousTask.status.replaceAll("_", " ")}.`,
      entityType: "task",
      entityId: task?.id ?? id,
    });

    broadcastOrgEvent(req.orgId, "task.updated", {
      taskId: task?.id ?? id,
      projectId: previousTask.projectId ?? null,
      at: new Date().toISOString(),
    });

    res.json({ task });
  }
);

app.patch(
  "/tasks/:id/details",
  requireAuth as any,
  requireTenant as any,
  requireRole("OWNER", "ADMIN"),
  async (req: any, res) => {
    const parsed = updateTaskDetailsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const { id } = req.params;

    const existingTask = await prisma.task.findFirst({
      where: {
        id,
        orgId: req.orgId,
      },
    });

    if (!existingTask) {
      return res.status(404).json({ error: "Task not found" });
    }

    if (parsed.data.assigneeId) {
      const membership = await prisma.membership.findUnique({
        where: {
          userId_orgId: {
            userId: parsed.data.assigneeId,
            orgId: req.orgId,
          },
        },
      });

      if (!membership) {
        return res.status(404).json({ error: "Assignee is not a member of this organization" });
      }
    }

    const dueDateValue =
      parsed.data.dueDate && parsed.data.dueDate.trim()
        ? new Date(parsed.data.dueDate)
        : null;

    const task = await prisma.task.update({
      where: { id },
      data: {
        title: parsed.data.title.trim(),
        description: parsed.data.description?.trim() || null,
        assigneeId: parsed.data.assigneeId || null,
        dueDate: dueDateValue,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        assignee: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    createOrgNotifications({
      orgId: req.orgId,
      type: "TASK_UPDATED",
      title: `Task updated: ${task.title}`,
      body: task.assignee ? `Assigned to ${task.assignee.name || task.assignee.email}` : "Task details were updated.",
      entityType: "task",
      entityId: task.id,
    });

    broadcastOrgEvent(req.orgId, "task.updated", {
      taskId: task.id,
      projectId: task.projectId ?? null,
      at: new Date().toISOString(),
    });

    return res.json({ task });
  }
);

app.delete(
  "/tasks/:id",
  requireAuth as any,
  requireTenant as any,
  requireRole("OWNER", "ADMIN"),
  async (req: any, res) => {
    const { id } = req.params;

    const existingTask = await prisma.task.findFirst({
      where: {
        id,
        orgId: req.orgId,
      },
      select: { id: true, title: true, projectId: true },
    });

    if (!existingTask) {
      return res.status(404).json({ error: "Task not found" });
    }

    await prisma.task.delete({
      where: { id },
    });

    createOrgNotifications({
      orgId: req.orgId,
      type: "TASK_DELETED",
      title: `Task deleted: ${existingTask.title}`,
      body: "A task was removed from the board.",
      entityType: "task",
      entityId: existingTask.id,
    });

    broadcastOrgEvent(req.orgId, "task.deleted", {
      taskId: existingTask.id,
      projectId: existingTask.projectId ?? null,
      at: new Date().toISOString(),
    });

    return res.json({ ok: true });
  }
);

app.get(
  "/dashboard",
  requireAuth as any,
  requireTenant as any,
  async (req: any, res) => {
    const now = new Date();

    const [projectsCount, tasks, overdueCount] = await Promise.all([
      prisma.project.count({
        where: { orgId: req.orgId },
      }),
      prisma.task.findMany({
        where: { orgId: req.orgId },
        select: {
          id: true,
          status: true,
        },
      }),
      prisma.task.count({
        where: {
          orgId: req.orgId,
          dueDate: { lt: now },
          status: { not: "DONE" },
        },
      }),
    ]);

    const totalTasks = tasks.length;
    const todoCount = tasks.filter((t) => t.status === "TODO").length;
    const inProgressCount = tasks.filter((t) => t.status === "IN_PROGRESS").length;
    const doneCount = tasks.filter((t) => t.status === "DONE").length;

    return res.json({
      stats: {
        projectsCount,
        totalTasks,
        todoCount,
        inProgressCount,
        doneCount,
        overdueCount,
      },
    });
  }
);



/**
 * ============================================================
 * Start server
 * ============================================================
 */
const port = process.env.PORT ? Number(process.env.PORT) : 4000;

// Global error handler (must be after routes)
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error("🔥 Unhandled error:", err);
  return res.status(500).json({ error: "Internal server error" });
});



app.get(
  "/projects",
  requireAuth as any,
  requireTenant as any,
  async (req: any, res) => {
  try {
    const orgId = getCurrentOrgId(req);

    if (!orgId) {
      return res.status(400).json({ error: "Organization not found in request context" });
    }

    const projects = await prisma.project.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            tasks: true,
          },
        },
      },
    });

    return res.json({
      projects: projects.map((project) => ({
        id: project.id,
        name: project.name,
        description: project.description,
        createdAt: project.createdAt,
        tasksCount: project._count.tasks,
      })),
    });
  } catch (error) {
    console.error("GET /projects failed", error);
    return res.status(500).json({ error: "Failed to load projects" });
  }
});

console.log("Prisma project model exists:", typeof prisma.project);

app.post(
  "/projects",
  requireAuth as any,
  requireTenant as any,
  requireRole("OWNER", "ADMIN"),
  async (req: any, res) => {
  try {
    const orgId = getCurrentOrgId(req);

    if (!orgId) {
      return res.status(400).json({ error: "Organization not found in request context" });
    }

    const { name, description } = req.body ?? {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Project name is required" });
    }

    const project = await prisma.project.create({
      data: {
        orgId,
        name: name.trim(),
        description: typeof description === "string" ? description.trim() : null,
      },
    });

    createOrgNotifications({
      orgId,
      type: "PROJECT_CREATED",
      title: `New project: ${project.name}`,
      body: project.description || "A new board is ready for the team.",
      entityType: "project",
      entityId: project.id,
    });

    broadcastOrgEvent(orgId, "project.created", {
      projectId: project.id,
      at: new Date().toISOString(),
    });

    return res.status(201).json({
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        createdAt: project.createdAt,
      },
    });
  } catch (error) {
    console.error("POST /projects failed", error);
    return res.status(500).json({ error: "Failed to create project" });
  }
});

app.get(
  "/projects/:projectId",
  requireAuth as any,
  requireTenant as any,
  async (req: any, res) => {
  try {
    const orgId = getCurrentOrgId(req);

    if (!orgId) {
      return res.status(400).json({ error: "Organization not found in request context" });
    }

    const { projectId } = req.params;

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        orgId,
      },
      include: {
        tasks: {
          orderBy: { createdAt: "desc" },
          include: {
            assignee: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    return res.json({
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        createdAt: project.createdAt,
        tasks: project.tasks.map((task) => ({
          id: task.id,
          title: task.title,
          description: task.description,
          status: task.status,
          dueDate: task.dueDate,
          assignee: task.assignee
            ? {
                id: task.assignee.id,
                email: task.assignee.email,
                name: task.assignee.name,
              }
            : null,
        })),
      },
    });
  } catch (error) {
    console.error("GET /projects/:projectId failed", error);
    return res.status(500).json({ error: "Failed to load project" });
  }
});



app.listen(port, () => console.log(`API running on http://localhost:${port}`));