const STORAGE_KEY = "chore-quest-state";
const PARENT_SESSION_KEY = "chore-quest-parent-unlocked";
const TEMPLATE_KEY = "chore-quest-templates";
const PARENT_PIN = "4826";
const STATE_VERSION = 3;

const profiles = [
  { id: "miles", name: "Miles", age: 13, role: "Oldest adventurer" },
  { id: "logan", name: "Logan", age: 10, role: "Middle mission runner" },
  { id: "zoe", name: "Zoe", age: 7, role: "Youngest quest star" },
];

const profileMap = Object.fromEntries(profiles.map((profile) => [profile.id, profile]));

const pageConfigs = {
  home: {
    title: "Home",
    slug: "index.html",
    type: "home",
    themes: [
      { id: "storybook", label: "Storybook Meadow" },
      { id: "lantern", label: "Lantern Hall" },
      { id: "starlit", label: "Starlit Quest" },
    ],
  },
  parent: {
    title: "Parent",
    slug: "parent.html",
    type: "parent",
    themes: [
      { id: "command", label: "Command Table" },
      { id: "library", label: "Map Library" },
      { id: "warden", label: "Warden's Desk" },
    ],
  },
  miles: {
    title: "Miles",
    slug: "miles.html",
    type: "kid",
    profileId: "miles",
    themes: [
      { id: "ember", label: "Ember Banner" },
      { id: "forge", label: "Forge Run" },
      { id: "storm", label: "Storm Trail" },
    ],
  },
  logan: {
    title: "Logan",
    slug: "logan.html",
    type: "kid",
    profileId: "logan",
    themes: [
      { id: "grove", label: "Grove Scout" },
      { id: "river", label: "River Camp" },
      { id: "glow", label: "Glow Quest" },
    ],
  },
  zoe: {
    title: "Zoe",
    slug: "zoe.html",
    type: "kid",
    profileId: "zoe",
    themes: [
      { id: "petal", label: "Petal Parade" },
      { id: "cloud", label: "Cloud Castle" },
      { id: "sunbeam", label: "Sunbeam Sprites" },
    ],
  },
};

const baseTasks = [
  {
    id: crypto.randomUUID(),
    title: "Make the bed",
    reward: 4,
    difficulty: "Easy",
    completed: false,
    scope: "shared",
    assigneeId: null,
    completedById: null,
  },
  {
    id: crypto.randomUUID(),
    title: "Wash the dishes",
    reward: 9,
    difficulty: "Medium",
    completed: false,
    scope: "assigned",
    assigneeId: "logan",
    completedById: null,
  },
  {
    id: crypto.randomUUID(),
    title: "Laundry round",
    reward: 14,
    difficulty: "Boss",
    completed: false,
    scope: "assigned",
    assigneeId: "miles",
    completedById: null,
  },
];

const difficultyXp = {
  Easy: 20,
  Medium: 35,
  Boss: 55,
};

const rankTitles = [
  "Rookie Spark",
  "Momentum Maker",
  "Household Ranger",
  "Quest Captain",
  "Legend of the Living Room",
];

const state = loadState();
const templatePrefs = loadTemplatePrefs();
const parentAccess = {
  unlocked: sessionStorage.getItem(PARENT_SESSION_KEY) === "true",
};

document.addEventListener("DOMContentLoaded", () => {
  const pageId = document.body.dataset.page;
  const pageConfig = pageConfigs[pageId];

  if (!pageConfig) {
    return;
  }

  if (pageConfig.type === "parent" && !parentAccess.unlocked) {
    location.href = "index.html?parent=locked";
    return;
  }

  applyTemplate(pageId);
  renderTopBar(pageId);

  if (pageConfig.type === "home") {
    renderHomePage();
    return;
  }

  renderDashboardPage(pageConfig);
});

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    return createFreshState();
  }

  try {
    return migrateState(JSON.parse(saved));
  } catch {
    return createFreshState();
  }
}

function createFreshState() {
  return {
    version: STATE_VERSION,
    profiles,
    tasks: baseTasks,
    history: [],
  };
}

function migrateState(parsed) {
  const rawTasks = Array.isArray(parsed.tasks) && parsed.tasks.length ? parsed.tasks : baseTasks;
  const rawHistory = Array.isArray(parsed.history) ? parsed.history : [];

  return {
    version: STATE_VERSION,
    profiles,
    tasks: rawTasks.map((task) => ({
      id: task.id || crypto.randomUUID(),
      title: task.title || "Untitled quest",
      reward: Number.isFinite(Number(task.reward)) ? Number(task.reward) : 0,
      difficulty: difficultyXp[task.difficulty] ? task.difficulty : "Medium",
      completed: Boolean(task.completed),
      scope: task.scope === "assigned" ? "assigned" : "shared",
      assigneeId: profileMap[task.assigneeId] ? task.assigneeId : null,
      completedById: profileMap[task.completedById] ? task.completedById : null,
    })),
    history: rawHistory.map((entry) => ({
      id: entry.id || crypto.randomUUID(),
      taskId: entry.taskId || null,
      title: entry.title || "Legacy quest",
      reward: Number.isFinite(Number(entry.reward)) ? Number(entry.reward) : 0,
      profileId: profileMap[entry.profileId] ? entry.profileId : null,
      profileName: profileMap[entry.profileId]?.name || entry.profileName || "Family quest",
      timestamp: Number.isFinite(Number(entry.timestamp)) ? Number(entry.timestamp) : Date.now(),
    })),
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadTemplatePrefs() {
  const saved = localStorage.getItem(TEMPLATE_KEY);

  if (!saved) {
    return {};
  }

  try {
    return JSON.parse(saved);
  } catch {
    return {};
  }
}

function saveTemplatePrefs() {
  localStorage.setItem(TEMPLATE_KEY, JSON.stringify(templatePrefs));
}

function getTemplateForPage(pageId) {
  const pageConfig = pageConfigs[pageId];
  const fallback = pageConfig.themes[0].id;
  const saved = templatePrefs[pageId];
  return pageConfig.themes.some((theme) => theme.id === saved) ? saved : fallback;
}

function applyTemplate(pageId) {
  document.body.dataset.template = getTemplateForPage(pageId);
}

function renderTopBar(pageId) {
  const pageConfig = pageConfigs[pageId];
  const topBar = document.getElementById("topbar");

  if (!topBar) {
    return;
  }

  topBar.innerHTML = `
    <div class="topbar-shell">
      <a class="brand-mark" href="index.html">
        <span class="brand-crest">CQ</span>
        <span class="brand-copy">
          <strong>Chore Quest</strong>
          <span>Household boards with fantasy energy</span>
        </span>
      </a>
      <div class="topbar-controls">
        <label class="pretty-select">
          <span class="select-label">Navigate</span>
          <div class="select-shell">
            <select id="page-nav">
              ${Object.entries(pageConfigs)
                .map(([key, config]) => `<option value="${key}" ${key === pageId ? "selected" : ""}>${config.title}</option>`)
                .join("")}
            </select>
            <span class="select-arrow">v</span>
          </div>
        </label>
        <label class="pretty-select">
          <span class="select-label">Template</span>
          <div class="select-shell">
            <select id="template-picker">
              ${pageConfig.themes
                .map((theme) => `<option value="${theme.id}" ${theme.id === getTemplateForPage(pageId) ? "selected" : ""}>${theme.label}</option>`)
                .join("")}
            </select>
            <span class="select-arrow">v</span>
          </div>
        </label>
        ${parentAccess.unlocked ? '<button class="ghost-button compact" id="lock-parent-global" type="button">Lock Parent</button>' : ""}
      </div>
    </div>
  `;

  const nav = document.getElementById("page-nav");
  const templatePicker = document.getElementById("template-picker");
  const lockButton = document.getElementById("lock-parent-global");

  nav.addEventListener("change", () => {
    const target = nav.value;
    if (target === "parent" && !parentAccess.unlocked) {
      openPinModal("Enter the parent PIN to open the Parent dashboard.", () => {
        location.href = pageConfigs.parent.slug;
      });
      nav.value = pageId;
      return;
    }

    location.href = pageConfigs[target].slug;
  });

  templatePicker.addEventListener("change", () => {
    templatePrefs[pageId] = templatePicker.value;
    saveTemplatePrefs();
    applyTemplate(pageId);
  });

  if (lockButton) {
    lockButton.addEventListener("click", () => {
      lockParentAccess();
      if (pageId === "parent") {
        location.href = "index.html";
      }
    });
  }
}

function renderHomePage() {
  const mount = document.getElementById("page-mount");
  const params = new URLSearchParams(location.search);
  const parentLocked = params.get("parent") === "locked";
  const templates = pageConfigs.home.themes;

  mount.innerHTML = `
    <section class="home-shell">
      <aside class="realm-column">
        <p class="eyebrow">Choose Your Realm</p>
        <h1>The family quest board now has five enchanted pages.</h1>
        <p class="hero-text">
          Wander through each realm, peek at the chores waiting there, and unlock the Parent command hall only when it is time to assign new adventures.
        </p>
        ${parentLocked ? '<div class="notice-banner">The Parent page is locked right now. Head back in with the family PIN.</div>' : ""}
        <nav class="realm-list" id="home-page-list"></nav>
        <div class="template-note">
          <strong>Home templates:</strong>
          <span>${templates.map((theme) => theme.label).join(", ")}</span>
        </div>
      </aside>
      <section class="home-preview">
        <div class="preview-stage">
          <div class="preview-topline">
            <span>Realm Preview</span>
            <span>${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date())}</span>
          </div>
          <div id="home-preview-panel"></div>
        </div>
        <div class="home-story-grid">
          <article class="story-card">
            <p class="eyebrow">Quest Flavor</p>
            <h2>Whimsical by design</h2>
            <p>Storybook skies, lantern glows, cozy cards, and playful copy keep Home magical while the family dashboards stay easy to use.</p>
          </article>
          <article class="story-card">
            <p class="eyebrow">Template Magic</p>
            <h2>Each page keeps three looks</h2>
            <p>Pick a favorite mood for Home, Parent, Miles, Logan, and Zoe. Every page remembers its own style.</p>
          </article>
        </div>
      </section>
    </section>
  `;

  renderHomeNav();
  renderHomePreview("home");
}

function renderHomeNav() {
  const list = document.getElementById("home-page-list");
  const items = ["home", "parent", "miles", "logan", "zoe"];

  list.innerHTML = items
    .map((pageId, index) => {
      const config = pageConfigs[pageId];
      const subtitle = pageId === "home"
        ? "Landing realm"
        : pageId === "parent"
          ? "PIN-guarded admin hall"
          : `${profileMap[config.profileId].age} year old dashboard`;

      return `
        <button class="realm-link ${index === 0 ? "active" : ""}" type="button" data-page-target="${pageId}">
          <span class="realm-index">0${index + 1}</span>
          <span class="realm-copy">
            <strong>${config.title}</strong>
            <span>${subtitle}</span>
          </span>
        </button>
      `;
    })
    .join("");

  list.querySelectorAll("[data-page-target]").forEach((button) => {
    button.addEventListener("mouseenter", () => {
      renderHomePreview(button.dataset.pageTarget);
      setActiveRealmButton(button.dataset.pageTarget);
    });

    button.addEventListener("focus", () => {
      renderHomePreview(button.dataset.pageTarget);
      setActiveRealmButton(button.dataset.pageTarget);
    });

    button.addEventListener("click", () => {
      const target = button.dataset.pageTarget;
      if (target === "home") {
        location.href = "index.html";
        return;
      }

      if (target === "parent" && !parentAccess.unlocked) {
        openPinModal("Enter the parent PIN to open the Parent dashboard.", () => {
          location.href = pageConfigs.parent.slug;
        });
        return;
      }

      location.href = pageConfigs[target].slug;
    });
  });
}

function setActiveRealmButton(pageId) {
  document.querySelectorAll(".realm-link").forEach((button) => {
    button.classList.toggle("active", button.dataset.pageTarget === pageId);
  });
}

function renderHomePreview(pageId) {
  const panel = document.getElementById("home-preview-panel");
  if (!panel) {
    return;
  }

  if (pageId === "home") {
    panel.innerHTML = `
      <div class="preview-card preview-home">
        <p class="eyebrow">Storybook Hub</p>
        <h2>A whimsical launchpad for every family quest.</h2>
        <p>Use the left column like a fantasy atlas. Every realm has its own saved visual template and mood.</p>
        <div class="preview-badges">
          <span>5 pages</span>
          <span>3 templates each</span>
          <span>Fantasy home hub</span>
        </div>
      </div>
    `;
    return;
  }

  if (pageId === "parent") {
    const familyMetrics = getProfileMetrics("parent");
    panel.innerHTML = `
      <div class="preview-card">
        <p class="eyebrow">Parent Hall</p>
        <h2>Assign chores, check them off, and manage every board.</h2>
        <div class="preview-stats">
          <article><span>Open quests</span><strong>${familyMetrics.openTasks.length}</strong></article>
          <article><span>Completed</span><strong>${familyMetrics.completedTasks.length}</strong></article>
          <article><span>Potential rewards</span><strong>$${familyMetrics.potential}</strong></article>
        </div>
      </div>
    `;
    return;
  }

  const profileId = pageConfigs[pageId].profileId;
  const profile = profileMap[profileId];
  const metrics = getProfileMetrics(profileId);

  panel.innerHTML = `
    <div class="preview-card">
      <p class="eyebrow">${profile.name}'s Realm</p>
      <h2>${profile.name} sees shared chores plus quests assigned just to them.</h2>
      <div class="preview-stats">
        <article><span>Open quests</span><strong>${metrics.openTasks.length}</strong></article>
        <article><span>Earned</span><strong>$${metrics.earnings}</strong></article>
        <article><span>Level</span><strong>${metrics.level}</strong></article>
      </div>
      <p class="preview-caption">Read-only view with progress, rewards, and recent wins.</p>
    </div>
    <div class="preview-ledger">
      ${(metrics.historyEntries.slice(0, 3).map((entry) => `<div class="preview-ledger-row"><span>${entry.title}</span><strong>+$${entry.reward}</strong></div>`).join("")) || '<p class="preview-caption">No rewards logged yet on this page.</p>'}
    </div>
  `;
}

function renderDashboardPage(pageConfig) {
  const mount = document.getElementById("page-mount");
  const metrics = pageConfig.type === "parent"
    ? getProfileMetrics("parent")
    : getProfileMetrics(pageConfig.profileId);
  const profile = pageConfig.profileId ? profileMap[pageConfig.profileId] : null;
  const rankTitle = rankTitles[Math.min(rankTitles.length - 1, metrics.level - 1)];

  mount.innerHTML = `
    <section class="page-shell-grid">
      <header class="page-hero ${pageConfig.type === "parent" ? "page-hero-parent" : ""}">
        <div class="page-hero-copy">
          <p class="eyebrow">${pageConfig.type === "parent" ? "Parent Hall" : `${profile.name}'s Realm`}</p>
          <h1>${getPageHeroTitle(pageConfig, profile)}</h1>
          <p class="hero-text">${getPageHeroText(pageConfig, profile)}</p>
          <div class="headline-chip-row">
            <span class="headline-chip">${pageConfig.type === "parent" ? "Admin only" : "Read only"}</span>
            <span class="headline-chip">${pageConfig.type === "parent" ? "Shared + assigned chores" : "Shared + personal quests"}</span>
            <span class="headline-chip">${pageConfig.themes.length} templates</span>
          </div>
        </div>
        <div class="snapshot-grid">
          <article class="snapshot-card">
            <span>${pageConfig.type === "parent" ? "Family level" : "Level"}</span>
            <strong>${metrics.level}</strong>
          </article>
          <article class="snapshot-card">
            <span>XP</span>
            <strong>${metrics.currentXp} / 100</strong>
          </article>
          <article class="snapshot-card">
            <span>Earnings</span>
            <strong>$${metrics.earnings}</strong>
          </article>
          <article class="snapshot-card">
            <span>${pageConfig.type === "parent" ? "Completed" : "Combo"}</span>
            <strong>${pageConfig.type === "parent" ? metrics.completedTasks.length : `x${metrics.combo}`}</strong>
          </article>
        </div>
      </header>

      <main class="dashboard-grid">
        <section class="panel panel-board">
          <div class="panel-heading">
            <p class="eyebrow">${pageConfig.type === "parent" ? "Family Board" : "Quest Board"}</p>
            <h2>${pageConfig.type === "parent" ? "Assign, credit, and clear chores" : `${profile.name}'s active quests`}</h2>
          </div>
          <div class="summary-row">
            <article><span>Open</span><strong>${metrics.openTasks.length}</strong></article>
            <article><span>Done</span><strong>${metrics.completedTasks.length}</strong></article>
            <article><span>Potential</span><strong>$${metrics.potential}</strong></article>
          </div>
          <div id="task-region"></div>
        </section>

        <section class="panel panel-side">
          <div class="panel-heading">
            <p class="eyebrow">${pageConfig.type === "parent" ? "Family Pulse" : "Realm Pulse"}</p>
            <h2>${pageConfig.type === "parent" ? "Kid snapshots and reward trail" : `${profile.name}'s snapshots and rewards`}</h2>
          </div>
          <div class="mini-stat-stack">
            <article class="mini-stat">
              <span>Rank title</span>
              <strong>${rankTitle}</strong>
            </article>
            <article class="mini-stat">
              <span>Best next move</span>
              <strong>${getTip(pageConfig, profile, metrics)}</strong>
            </article>
          </div>
          <div class="kid-grid" id="profile-summary-region"></div>
          <div class="ledger-panel">
            <span>${pageConfig.type === "parent" ? "Family ledger" : `${profile.name}'s ledger`}</span>
            <div id="ledger-region"></div>
          </div>
        </section>

        ${pageConfig.type === "parent" ? `
          <section class="panel panel-form">
            <div class="panel-heading">
              <p class="eyebrow">Parent Controls</p>
              <h2>Craft a new quest</h2>
            </div>
            <div class="notice-banner subtle">Only the Parent page can add chores, credit shared tasks, delete tasks, and clear completed quests.</div>
            <form id="task-form" class="task-form">
              <label>
                Quest name
                <input id="task-input" type="text" maxlength="60" placeholder="Sweep the porch" required />
              </label>
              <div class="form-row">
                <label>
                  Reward
                  <input id="reward-input" type="number" min="1" max="999" value="8" required />
                </label>
                <label class="pretty-select">
                  <span class="select-label">Difficulty</span>
                  <div class="select-shell">
                    <select id="difficulty-input">
                      <option value="Easy">Easy</option>
                      <option value="Medium" selected>Medium</option>
                      <option value="Boss">Boss</option>
                    </select>
                    <span class="select-arrow">v</span>
                  </div>
                </label>
              </div>
              <div class="form-row">
                <label class="pretty-select">
                  <span class="select-label">Chore type</span>
                  <div class="select-shell">
                    <select id="scope-input">
                      <option value="shared">Shared family quest</option>
                      <option value="assigned">Assign to one kid</option>
                    </select>
                    <span class="select-arrow">v</span>
                  </div>
                </label>
                <label class="pretty-select" id="assignee-wrap">
                  <span class="select-label">Assign to</span>
                  <div class="select-shell">
                    <select id="assignee-input">
                      ${profiles.map((entry) => `<option value="${entry.id}">${entry.name}</option>`).join("")}
                    </select>
                    <span class="select-arrow">v</span>
                  </div>
                </label>
              </div>
              <div class="action-row">
                <button class="primary-button" type="submit">Add quest</button>
                <button class="ghost-button" id="clear-completed" type="button">Clear completed</button>
              </div>
            </form>
          </section>
        ` : ""}
      </main>
    </section>
    ${renderPinDialog()}
  `;

  renderTaskRegion(pageConfig, metrics);
  renderProfileSummaryRegion(pageConfig);
  renderLedgerRegion(pageConfig, metrics);

  if (pageConfig.type === "parent") {
    bindParentControls();
  }
}

function renderPinDialog() {
  return `
    <dialog class="pin-modal" id="pin-modal">
      <form class="pin-modal-card" id="pin-form" method="dialog">
        <p class="eyebrow">Parent Lock</p>
        <h2>Enter the parent PIN</h2>
        <p class="pin-copy" id="pin-copy">Only the parent can open the command hall.</p>
        <label>
          Parent PIN
          <input id="pin-input" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" placeholder="Enter PIN" required />
        </label>
        <p class="pin-error" id="pin-error" aria-live="polite"></p>
        <div class="pin-actions">
          <button class="ghost-button" id="pin-cancel" type="button">Cancel</button>
          <button class="primary-button" type="submit">Unlock Parent</button>
        </div>
      </form>
    </dialog>
  `;
}

function bindParentControls() {
  const form = document.getElementById("task-form");
  const taskInput = document.getElementById("task-input");
  const rewardInput = document.getElementById("reward-input");
  const difficultyInput = document.getElementById("difficulty-input");
  const scopeInput = document.getElementById("scope-input");
  const assigneeInput = document.getElementById("assignee-input");
  const assigneeWrap = document.getElementById("assignee-wrap");
  const clearButton = document.getElementById("clear-completed");

  const toggleAssignee = () => {
    const isAssigned = scopeInput.value === "assigned";
    assigneeWrap.classList.toggle("is-hidden", !isAssigned);
    assigneeInput.disabled = !isAssigned;
  };

  toggleAssignee();
  scopeInput.addEventListener("change", toggleAssignee);

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const title = taskInput.value.trim();
    const reward = Number(rewardInput.value);
    const difficulty = difficultyInput.value;
    const scope = scopeInput.value;
    const assigneeId = scope === "assigned" ? assigneeInput.value : null;

    if (!title || !Number.isFinite(reward) || reward <= 0) {
      return;
    }

    state.tasks.unshift({
      id: crypto.randomUUID(),
      title,
      reward,
      difficulty,
      completed: false,
      scope,
      assigneeId,
      completedById: null,
    });

    saveState();
    location.reload();
  });

  clearButton.addEventListener("click", () => {
    state.tasks = state.tasks.filter((task) => !task.completed);
    state.history = state.history.filter((entry) => state.tasks.some((task) => task.id === entry.taskId) || entry.taskId === null);
    saveState();
    location.reload();
  });
}

function renderTaskRegion(pageConfig, metrics) {
  const region = document.getElementById("task-region");

  if (!metrics.visibleTasks.length) {
    region.innerHTML = '<div class="empty-state">No chores are showing here yet. A fresh quest will make this realm feel alive.</div>';
    return;
  }

  region.innerHTML = `
    <ul class="task-list">
      ${metrics.visibleTasks.map((task) => renderTaskCard(task, pageConfig.type === "parent")).join("")}
    </ul>
  `;

  if (pageConfig.type !== "parent") {
    return;
  }

  region.querySelectorAll("[data-toggle-task]").forEach((button) => {
    button.addEventListener("click", () => {
      const task = state.tasks.find((entry) => entry.id === button.dataset.toggleTask);
      const creditSelect = region.querySelector(`[data-credit-select="${task.id}"]`);
      completeTask(task.id, creditSelect ? creditSelect.value : null);
      location.reload();
    });
  });

  region.querySelectorAll("[data-delete-task]").forEach((button) => {
    button.addEventListener("click", () => {
      state.tasks = state.tasks.filter((task) => task.id !== button.dataset.deleteTask);
      state.history = state.history.filter((entry) => entry.taskId !== button.dataset.deleteTask);
      saveState();
      location.reload();
    });
  });
}

function renderTaskCard(task, parentMode) {
  const assignedName = task.assigneeId ? profileMap[task.assigneeId]?.name : null;
  const creditedName = task.completedById ? profileMap[task.completedById]?.name : null;
  const creditValue = task.scope === "assigned" && task.assigneeId ? task.assigneeId : task.completedById || profiles[0].id;

  return `
    <li class="task-card ${task.completed ? "completed" : ""}">
      ${parentMode ? `<button class="task-toggle" type="button" data-toggle-task="${task.id}" aria-label="Toggle task complete"></button>` : '<div class="task-toggle ghost"></div>'}
      <div class="task-content">
        <div class="task-topline">
          <h3 class="task-title">${task.title}</h3>
          <span class="task-reward">$${task.reward}</span>
        </div>
        <div class="task-meta">
          <span class="difficulty-pill">${task.difficulty}</span>
          <span class="scope-pill">${task.scope === "shared" ? "Shared quest" : `Assigned to ${assignedName}`}</span>
          <span class="credit-pill">${
            task.completed
              ? `Credited to ${creditedName || "Family"}`
              : task.scope === "assigned"
                ? `Credit locked to ${assignedName}`
                : "Parent chooses credit"
          }</span>
          <span class="xp-pill">+${difficultyXp[task.difficulty]} XP</span>
        </div>
        ${parentMode && task.scope === "shared" && !task.completed ? `
          <label class="pretty-select credit-select-wrap">
            <span class="select-label">Credit this quest to</span>
            <div class="select-shell">
              <select data-credit-select="${task.id}">
                ${profiles.map((profile) => `<option value="${profile.id}" ${profile.id === creditValue ? "selected" : ""}>${profile.name}</option>`).join("")}
              </select>
              <span class="select-arrow">v</span>
            </div>
          </label>
        ` : ""}
      </div>
      ${parentMode ? `<button class="delete-button" type="button" data-delete-task="${task.id}">Remove</button>` : ""}
    </li>
  `;
}

function renderProfileSummaryRegion(pageConfig) {
  const region = document.getElementById("profile-summary-region");

  region.innerHTML = profiles
    .map((profile) => {
      const metrics = getProfileMetrics(profile.id);
      return `
        <article class="mini-stat kid-mini-card ${pageConfig.profileId === profile.id ? "current" : ""}">
          <span>${profile.name}</span>
          <strong>${metrics.openTasks.length} open</strong>
          <span>$${metrics.earnings} earned</span>
        </article>
      `;
    })
    .join("");
}

function renderLedgerRegion(pageConfig, metrics) {
  const region = document.getElementById("ledger-region");
  const entries = metrics.historyEntries.slice(0, 6);

  if (!entries.length) {
    region.innerHTML = '<p class="ledger-empty">Completed chores will stack here like a tiny treasure receipt.</p>';
    return;
  }

  region.innerHTML = entries
    .map((entry) => `
      <div class="ledger-item">
        <span>${entry.profileName}: ${entry.title}</span>
        <strong>+$${entry.reward}</strong>
      </div>
    `)
    .join("");
}

function getVisibleTasks(profileId) {
  if (profileId === "parent") {
    return state.tasks;
  }

  return state.tasks.filter((task) => task.scope === "shared" || task.assigneeId === profileId);
}

function getProfileMetrics(profileId) {
  const visibleTasks = getVisibleTasks(profileId);
  const completedTasks = visibleTasks.filter((task) => task.completed);
  const openTasks = visibleTasks.filter((task) => !task.completed);
  const historyEntries = profileId === "parent"
    ? state.history
    : state.history.filter((entry) => entry.profileId === profileId);
  const creditedCompletedTasks = profileId === "parent"
    ? state.tasks.filter((task) => task.completed)
    : state.tasks.filter((task) => task.completedById === profileId);

  const earnings = historyEntries.reduce((sum, entry) => sum + entry.reward, 0);
  const totalXp = creditedCompletedTasks.reduce((sum, task) => sum + difficultyXp[task.difficulty], 0);
  const level = Math.max(1, Math.floor(totalXp / 100) + 1);
  const currentXp = totalXp % 100;
  const combo = Math.max(1, creditedCompletedTasks.length || 1);
  const potential = openTasks.reduce((sum, task) => sum + task.reward, 0);

  return {
    visibleTasks,
    completedTasks,
    openTasks,
    historyEntries,
    earnings,
    totalXp,
    level,
    currentXp,
    combo,
    potential,
  };
}

function getPageHeroTitle(pageConfig, profile) {
  if (pageConfig.type === "parent") {
    return "The command hall keeps every family quest sorted, assigned, and rewarded.";
  }

  return `${profile.name}'s page keeps chores clear, calm, and easy to scan.`;
}

function getPageHeroText(pageConfig, profile) {
  if (pageConfig.type === "parent") {
    return "The Parent hall is practical but still part of the same fantasy world. Assign shared chores, hand out kid-specific quests, and credit every reward from one place.";
  }

  return `${profile.name} can only see shared quests plus chores assigned directly to them. This page stays read-only while still feeling like part of the larger storybook map.`;
}

function getTip(pageConfig, profile, metrics) {
  if (pageConfig.type === "parent") {
    if (!metrics.openTasks.length) {
      return "The board is clear. Add a fresh shared quest to start the next round.";
    }

    return "Use the pretty dropdowns below to assign one quick win and one bigger mission.";
  }

  if (!metrics.openTasks.length) {
    return `${profile.name}'s board is clear right now.`;
  }

  return `Shared quests are fair game, and ${profile.name}'s personal chores stay neatly grouped here.`;
}

function completeTask(id, creditOverride) {
  const task = state.tasks.find((item) => item.id === id);

  if (!task) {
    return;
  }

  if (task.completed) {
    task.completed = false;
    task.completedById = null;
    state.history = state.history.filter((entry) => entry.taskId !== task.id);
    saveState();
    return;
  }

  const creditedProfileId = task.scope === "assigned" && task.assigneeId ? task.assigneeId : (profileMap[creditOverride] ? creditOverride : profiles[0].id);
  const creditedProfile = profileMap[creditedProfileId];

  task.completed = true;
  task.completedById = creditedProfileId;
  state.history.unshift({
    id: crypto.randomUUID(),
    taskId: task.id,
    title: task.title,
    reward: task.reward,
    profileId: creditedProfileId,
    profileName: creditedProfile.name,
    timestamp: Date.now(),
  });
  state.history = state.history.slice(0, 12);
  saveState();
}

function unlockParentAccess() {
  parentAccess.unlocked = true;
  sessionStorage.setItem(PARENT_SESSION_KEY, "true");
}

function lockParentAccess() {
  parentAccess.unlocked = false;
  sessionStorage.removeItem(PARENT_SESSION_KEY);
}

function openPinModal(message, onSuccess) {
  let dialog = document.getElementById("pin-modal");

  if (!dialog) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = renderPinDialog();
    document.body.append(wrapper.firstElementChild);
    dialog = document.getElementById("pin-modal");
  }

  const form = document.getElementById("pin-form");
  const copy = document.getElementById("pin-copy");
  const input = document.getElementById("pin-input");
  const error = document.getElementById("pin-error");
  const cancel = document.getElementById("pin-cancel");

  copy.textContent = message;
  input.value = "";
  error.textContent = "";

  const close = () => {
    if (dialog.open) {
      dialog.close();
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (input.value === PARENT_PIN) {
      unlockParentAccess();
      cleanup();
      close();
      onSuccess();
      return;
    }

    error.textContent = "That PIN does not match. Try again.";
    input.select();
  };

  const handleCancel = () => {
    cleanup();
    close();
  };

  const cleanup = () => {
    form.removeEventListener("submit", handleSubmit);
    cancel.removeEventListener("click", handleCancel);
    dialog.removeEventListener("cancel", handleCancel);
  };

  form.addEventListener("submit", handleSubmit);
  cancel.addEventListener("click", handleCancel);
  dialog.addEventListener("cancel", handleCancel);
  dialog.showModal();
  input.focus();
}

