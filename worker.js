const DEFAULT_HOUSEHOLD_ID = "default-household";
const DEFAULT_PARENT_PIN = "4826";
const PROFILES = [
  { id: "miles", name: "Miles" },
  { id: "logan", name: "Logan" },
  { id: "zoe", name: "Zoe" },
];

const PROFILE_MAP = Object.fromEntries(PROFILES.map((profile) => [profile.id, profile]));
const DIFFICULTY_XP = {
  Easy: 20,
  Medium: 35,
  Boss: 55,
};

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS households (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL,
  title TEXT NOT NULL,
  reward REAL NOT NULL,
  difficulty TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  scope TEXT NOT NULL,
  assignee_id TEXT,
  completed_by_id TEXT,
  label TEXT DEFAULT '',
  source TEXT NOT NULL DEFAULT 'parent-dashboard',
  created_by TEXT NOT NULL DEFAULT 'website-parent',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS history (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL,
  task_id TEXT,
  title TEXT NOT NULL,
  reward REAL NOT NULL,
  profile_id TEXT,
  profile_name TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'website-parent',
  created_by TEXT NOT NULL DEFAULT 'website-parent'
);

CREATE INDEX IF NOT EXISTS idx_tasks_household_created_at ON tasks(household_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_household_timestamp ON history(household_id, timestamp DESC);
`;

const SEEDED_TASKS = [
  {
    title: "Make the bed",
    reward: 4,
    difficulty: "Easy",
    scope: "shared",
    assigneeId: null,
  },
  {
    title: "Wash the dishes",
    reward: 9,
    difficulty: "Medium",
    scope: "assigned",
    assigneeId: "logan",
  },
  {
    title: "Laundry round",
    reward: 14,
    difficulty: "Boss",
    scope: "assigned",
    assigneeId: "miles",
  },
];

let databaseReadyPromise;

export default {
  async fetch(request, env) {
    try {
      await ensureDatabase(env);

      const url = new URL(request.url);

      if (request.method === "OPTIONS" && url.pathname.startsWith("/api/")) {
        return new Response(null, {
          status: 204,
          headers: corsHeaders(),
        });
      }

      if (url.pathname.startsWith("/api/")) {
        return await handleApiRequest(request, env, url);
      }

      return env.ASSETS.fetch(request);
    } catch (error) {
      const status = Number(error.status) || 500;
      const message = status === 500 ? "Something went wrong while handling that request." : error.message;
      return jsonResponse({ error: message }, status);
    }
  },
};

async function handleApiRequest(request, env, url) {
  const householdId = getHouseholdId(request);

  if (url.pathname === "/api/state" && request.method === "GET") {
    return jsonResponse(await readState(env, householdId));
  }

  if (url.pathname === "/api/tasks" && request.method === "POST") {
    requireParentAuth(request, env);
    const payload = await readJson(request);
    const rawTasks = Array.isArray(payload.tasks) ? payload.tasks : [payload];
    const createdTasks = await createTasks(env, householdId, rawTasks, "parent-dashboard", "website-parent");
    return jsonResponse({ ok: true, tasks: createdTasks }, 201);
  }

  if (url.pathname === "/api/tasks/clear-completed" && request.method === "POST") {
    requireParentAuth(request, env);
    await clearCompletedTasks(env, householdId);
    return jsonResponse({ ok: true });
  }

  if (url.pathname === "/api/agent/tasks" && request.method === "POST") {
    requireAgentAuth(request, env);
    const payload = await readJson(request);
    const rawTasks = Array.isArray(payload.tasks) ? payload.tasks : [payload];
    const createdTasks = await createTasks(env, householdId, rawTasks, "voice-agent", "voice-agent");
    return jsonResponse({ ok: true, tasks: createdTasks }, 201);
  }

  const taskToggleMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)\/toggle$/);
  if (taskToggleMatch && request.method === "POST") {
    requireParentAuth(request, env);
    const payload = await readJson(request);
    const updatedTask = await toggleTaskCompletion(env, householdId, taskToggleMatch[1], payload.creditOverride || null);
    return jsonResponse({ ok: true, task: updatedTask });
  }

  const taskDeleteMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)$/);
  if (taskDeleteMatch && request.method === "DELETE") {
    requireParentAuth(request, env);
    await deleteTask(env, householdId, taskDeleteMatch[1]);
    return jsonResponse({ ok: true });
  }

  return jsonResponse({ error: "Not found" }, 404);
}

async function ensureDatabase(env) {
  if (!databaseReadyPromise) {
    databaseReadyPromise = initializeDatabase(env);
  }

  return databaseReadyPromise;
}

async function initializeDatabase(env) {
  await env.DB.exec(SCHEMA_SQL);

  const householdId = DEFAULT_HOUSEHOLD_ID;
  const existing = await env.DB.prepare("SELECT COUNT(*) AS count FROM tasks WHERE household_id = ?").bind(householdId).first();

  if (Number(existing?.count || 0) > 0) {
    return;
  }

  const now = Date.now();
  const statements = [
    env.DB.prepare("INSERT OR IGNORE INTO households (id, created_at) VALUES (?, ?)").bind(householdId, now),
    ...SEEDED_TASKS.map((task, index) => {
      const normalized = normalizeTaskInput(task, "seed", "system");
      const createdAt = now + index;

      return env.DB.prepare(`
        INSERT INTO tasks (
          id, household_id, title, reward, difficulty, completed, scope,
          assignee_id, completed_by_id, label, source, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, NULL, ?, ?, ?, ?, ?)
      `).bind(
        crypto.randomUUID(),
        householdId,
        normalized.title,
        normalized.reward,
        normalized.difficulty,
        normalized.scope,
        normalized.assigneeId,
        normalized.label,
        normalized.source,
        normalized.createdBy,
        createdAt,
        createdAt,
      );
    }),
  ];

  await env.DB.batch(statements);
}

function getHouseholdId(request) {
  return request.headers.get("X-Household-Id") || DEFAULT_HOUSEHOLD_ID;
}

function getParentPin(env) {
  return env.PARENT_API_PIN || DEFAULT_PARENT_PIN;
}

function requireParentAuth(request, env) {
  if (request.headers.get("X-Parent-Pin") !== getParentPin(env)) {
    throw httpError(401, "Parent authentication failed.");
  }
}

function requireAgentAuth(request, env) {
  const authHeader = request.headers.get("Authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const headerToken = request.headers.get("X-Agent-Token") || "";
  const expected = env.AGENT_API_TOKEN || "";

  if (!expected || (bearerToken !== expected && headerToken !== expected)) {
    throw httpError(401, "Agent authentication failed.");
  }
}

async function readState(env, householdId) {
  const [taskRows, historyRows] = await Promise.all([
    env.DB.prepare(`
      SELECT id, title, reward, difficulty, completed, scope, assignee_id, completed_by_id, label, source, created_by, created_at
      FROM tasks
      WHERE household_id = ?
      ORDER BY created_at DESC
    `).bind(householdId).all(),
    env.DB.prepare(`
      SELECT id, task_id, title, reward, profile_id, profile_name, timestamp, source, created_by
      FROM history
      WHERE household_id = ?
      ORDER BY timestamp DESC
    `).bind(householdId).all(),
  ]);

  return {
    version: 4,
    profiles: PROFILES,
    tasks: (taskRows.results || []).map((row) => ({
      id: row.id,
      title: row.title,
      reward: Number(row.reward),
      difficulty: row.difficulty,
      completed: Boolean(row.completed),
      scope: row.scope,
      assigneeId: row.assignee_id,
      completedById: row.completed_by_id,
      label: row.label || "",
      source: row.source || "parent-dashboard",
      createdBy: row.created_by || "website-parent",
      createdAt: Number(row.created_at),
    })),
    history: (historyRows.results || []).map((row) => ({
      id: row.id,
      taskId: row.task_id,
      title: row.title,
      reward: Number(row.reward),
      profileId: row.profile_id,
      profileName: row.profile_name,
      timestamp: Number(row.timestamp),
      source: row.source || "website-parent",
      createdBy: row.created_by || "website-parent",
    })),
  };
}

async function createTasks(env, householdId, rawTasks, defaultSource, defaultCreatedBy) {
  if (!rawTasks.length) {
    throw httpError(400, "At least one chore is required.");
  }

  const now = Date.now();
  const statements = [];
  const createdTasks = [];

  for (const [index, rawTask] of rawTasks.entries()) {
    const normalized = normalizeTaskInput(rawTask, defaultSource, defaultCreatedBy);
    const taskId = crypto.randomUUID();
    const createdAt = now + index;

    statements.push(env.DB.prepare(`
      INSERT INTO tasks (
        id, household_id, title, reward, difficulty, completed, scope,
        assignee_id, completed_by_id, label, source, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, NULL, ?, ?, ?, ?, ?)
    `).bind(
      taskId,
      householdId,
      normalized.title,
      normalized.reward,
      normalized.difficulty,
      normalized.scope,
      normalized.assigneeId,
      normalized.label,
      normalized.source,
      normalized.createdBy,
      createdAt,
      createdAt,
    ));

    createdTasks.push({
      id: taskId,
      title: normalized.title,
      reward: normalized.reward,
      difficulty: normalized.difficulty,
      completed: false,
      scope: normalized.scope,
      assigneeId: normalized.assigneeId,
      completedById: null,
      label: normalized.label,
      source: normalized.source,
      createdBy: normalized.createdBy,
      createdAt,
    });
  }

  await env.DB.batch(statements);
  return createdTasks;
}

async function toggleTaskCompletion(env, householdId, taskId, creditOverride) {
  const task = await env.DB.prepare(`
    SELECT id, title, reward, difficulty, completed, scope, assignee_id, completed_by_id, label, source, created_by, created_at
    FROM tasks
    WHERE household_id = ? AND id = ?
  `).bind(householdId, taskId).first();

  if (!task) {
    throw httpError(404, "Task not found.");
  }

  const now = Date.now();

  if (Number(task.completed)) {
    await env.DB.batch([
      env.DB.prepare(`
        UPDATE tasks
        SET completed = 0, completed_by_id = NULL, updated_at = ?
        WHERE household_id = ? AND id = ?
      `).bind(now, householdId, taskId),
      env.DB.prepare("DELETE FROM history WHERE household_id = ? AND task_id = ?").bind(householdId, taskId),
    ]);

    return {
      ...mapTaskRow(task),
      completed: false,
      completedById: null,
    };
  }

  const creditedProfileId = task.scope === "assigned" && task.assignee_id
    ? task.assignee_id
    : PROFILE_MAP[creditOverride]
      ? creditOverride
      : PROFILES[0].id;
  const creditedProfile = PROFILE_MAP[creditedProfileId];
  const historyId = crypto.randomUUID();

  await env.DB.batch([
    env.DB.prepare(`
      UPDATE tasks
      SET completed = 1, completed_by_id = ?, updated_at = ?
      WHERE household_id = ? AND id = ?
    `).bind(creditedProfileId, now, householdId, taskId),
    env.DB.prepare(`
      INSERT INTO history (
        id, household_id, task_id, title, reward, profile_id, profile_name, timestamp, source, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      historyId,
      householdId,
      taskId,
      task.title,
      Number(task.reward),
      creditedProfileId,
      creditedProfile.name,
      now,
      task.source || "website-parent",
      task.created_by || "website-parent",
    ),
  ]);

  return {
    ...mapTaskRow(task),
    completed: true,
    completedById: creditedProfileId,
  };
}

async function deleteTask(env, householdId, taskId) {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM history WHERE household_id = ? AND task_id = ?").bind(householdId, taskId),
    env.DB.prepare("DELETE FROM tasks WHERE household_id = ? AND id = ?").bind(householdId, taskId),
  ]);
}

async function clearCompletedTasks(env, householdId) {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM history WHERE household_id = ?").bind(householdId),
    env.DB.prepare("DELETE FROM tasks WHERE household_id = ? AND completed = 1").bind(householdId),
  ]);
}

function normalizeTaskInput(rawTask, defaultSource, defaultCreatedBy) {
  const title = typeof rawTask.title === "string" ? rawTask.title.trim() : "";
  const numericReward = Number(rawTask.reward);

  if (!title) {
    throw httpError(400, "Each chore needs a title.");
  }

  if (!Number.isFinite(numericReward) || numericReward <= 0) {
    throw httpError(400, `Reward is invalid for "${title}".`);
  }

  const scope = rawTask.scope === "assigned" ? "assigned" : "shared";
  const assigneeId = scope === "assigned"
    ? PROFILE_MAP[rawTask.assigneeId]
      ? rawTask.assigneeId
      : null
    : null;

  if (scope === "assigned" && !assigneeId) {
    throw httpError(400, `Assigned chore "${title}" is missing a valid assignee.`);
  }

  return {
    title: title.slice(0, 60),
    reward: normalizeRewardForAssignee(numericReward, assigneeId),
    difficulty: DIFFICULTY_XP[rawTask.difficulty] ? rawTask.difficulty : inferDifficulty(numericReward),
    scope,
    assigneeId,
    label: typeof rawTask.label === "string" ? rawTask.label.trim().slice(0, 40) : "",
    source: typeof rawTask.source === "string" && rawTask.source.trim() ? rawTask.source.trim().slice(0, 40) : defaultSource,
    createdBy: typeof rawTask.createdBy === "string" && rawTask.createdBy.trim() ? rawTask.createdBy.trim().slice(0, 60) : defaultCreatedBy,
  };
}

function normalizeRewardForAssignee(reward, assigneeId) {
  const numericReward = Number.isFinite(Number(reward)) ? Number(reward) : 0;
  if (assigneeId === "miles") {
    return Math.ceil(numericReward);
  }
  return numericReward;
}

function inferDifficulty(reward) {
  if (reward >= 12) {
    return "Boss";
  }

  if (reward >= 7) {
    return "Medium";
  }

  return "Easy";
}

function mapTaskRow(task) {
  return {
    id: task.id,
    title: task.title,
    reward: Number(task.reward),
    difficulty: task.difficulty,
    completed: Boolean(task.completed),
    scope: task.scope,
    assigneeId: task.assignee_id,
    completedById: task.completed_by_id,
    label: task.label || "",
    source: task.source || "parent-dashboard",
    createdBy: task.created_by || "website-parent",
    createdAt: Number(task.created_at),
  };
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw httpError(400, "Request body must be valid JSON.");
  }
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(),
    },
  });
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Agent-Token, X-Parent-Pin, X-Household-Id",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  };
}

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}
