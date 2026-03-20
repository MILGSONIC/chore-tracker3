const STORAGE_KEY = "chore-quest-state";
const PARENT_SESSION_KEY = "chore-quest-parent-unlocked";
const TEMPLATE_KEY = "chore-quest-templates";
const WIDGET_STYLE_KEY = "chore-quest-widget-styles";
const PARENT_PIN = "4826";
const STATE_VERSION = 4;

const profiles = [
  { id: "miles", name: "Miles", age: 13, role: "Oldest adventurer" },
  { id: "logan", name: "Logan", age: 10, role: "Middle mission runner" },
  { id: "zoe", name: "Zoe", age: 7, role: "Youngest quest star" },
];

const profileMap = Object.fromEntries(profiles.map((profile) => [profile.id, profile]));

const widgetStyleOptions = [
  { id: "gilded", label: "Gilded Cards" },
  { id: "moss", label: "Mossy Ledger" },
  { id: "twilight", label: "Twilight Glass" },
];

const widgetDescriptionPools = {
  money: [
    ({ owner }) => `${owner} treasure pouch keeps getting heavier.`,
    ({ owner }) => `${owner} coins are stacking like quest loot.`,
    ({ owner }) => `${owner} reward total is turning chores into treasure.`,
  ],
  xp: [
    ({ owner }) => `${owner} experience bar keeps inching toward the next title.`,
    ({ owner }) => `${owner} XP is proof that the quest board is moving.`,
    ({ owner }) => `${owner} levels are built one finished chore at a time.`,
  ],
  level: [
    ({ owner }) => `${owner} rank is climbing with every cleared mission.`,
    ({ owner }) => `${owner} level shows how much momentum is built already.`,
    ({ owner }) => `${owner} title path is looking stronger every round.`,
  ],
  combo: [
    ({ owner }) => `${owner} streak grows when chores land back-to-back.`,
    ({ owner }) => `${owner} combo count rewards steady follow-through.`,
    ({ owner }) => `${owner} has momentum when the board keeps moving.`,
  ],
  completed: [
    ({ owner }) => `${owner} already turned these quests into finished wins.`,
    ({ owner }) => `${owner} cleared chores are adding up nicely.`,
    ({ owner }) => `${owner} completed board is starting to look heroic.`,
  ],
  open: [
    ({ owner }) => `${owner} still has these quests waiting in the wings.`,
    ({ owner }) => `${owner} open chores are the next easy path to progress.`,
    ({ owner }) => `${owner} board still has a few adventures left to clear.`,
  ],
  potential: [
    ({ owner }) => `${owner} could earn this much if the rest of the board gets cleared.`,
    ({ owner }) => `${owner} still has this much reward value sitting on the board.`,
    ({ owner }) => `${owner} potential payout is hiding in the unfinished quests.`,
  ],
  rank: [
    ({ owner }) => `${owner} current title reflects the pace of recent wins.`,
    ({ owner }) => `${owner} rank name is the storybook version of progress.`,
    ({ owner }) => `${owner} title shifts as the board gets cleared.`,
  ],
};

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
const widgetStylePrefs = loadWidgetStylePrefs();
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
  applyWidgetStyle(pageId);
  requestAnimationFrame(() => {
    document.body.dataset.motion = "ready";
  });
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
      reward: normalizeRewardForAssignee(Number.isFinite(Number(task.reward)) ? Number(task.reward) : 0, task.scope === "assigned" ? task.assigneeId : null),
      difficulty: difficultyXp[task.difficulty] ? task.difficulty : "Medium",
      completed: Boolean(task.completed),
      scope: task.scope === "assigned" ? "assigned" : "shared",
      assigneeId: profileMap[task.assigneeId] ? task.assigneeId : null,
      completedById: profileMap[task.completedById] ? task.completedById : null,
      label: typeof task.label === "string" ? task.label : "",
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

function loadWidgetStylePrefs() {
  const saved = localStorage.getItem(WIDGET_STYLE_KEY);

  if (!saved) {
    return {};
  }

  try {
    return JSON.parse(saved);
  } catch {
    return {};
  }
}

function saveWidgetStylePrefs() {
  localStorage.setItem(WIDGET_STYLE_KEY, JSON.stringify(widgetStylePrefs));
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

function getWidgetStyleForPage(pageId) {
  const saved = widgetStylePrefs[pageId];
  return widgetStyleOptions.some((option) => option.id === saved) ? saved : widgetStyleOptions[0].id;
}

function applyWidgetStyle(pageId) {
  document.body.dataset.widgetStyle = getWidgetStyleForPage(pageId);
}

function renderTopBar(pageId) {
  const pageConfig = pageConfigs[pageId];
  const topBar = document.getElementById("topbar");

  if (!topBar) {
    return;
  }

  topBar.innerHTML = `
    <div class="topbar-shell reveal rise-1">
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
        ${parentAccess.unlocked ? `
          <label class="pretty-select">
            <span class="select-label">Widget style</span>
            <div class="select-shell">
              <select id="widget-style-picker">
                ${widgetStyleOptions
                  .map((option) => `<option value="${option.id}" ${option.id === getWidgetStyleForPage(pageId) ? "selected" : ""}>${option.label}</option>`)
                  .join("")}
              </select>
              <span class="select-arrow">v</span>
            </div>
          </label>
          <button class="ghost-button compact" id="lock-parent-global" type="button">Lock Parent</button>
        ` : ""}
      </div>
    </div>
  `;

  const nav = document.getElementById("page-nav");
  const templatePicker = document.getElementById("template-picker");
  const widgetStylePicker = document.getElementById("widget-style-picker");
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

  if (widgetStylePicker) {
    widgetStylePicker.addEventListener("change", () => {
      widgetStylePrefs[pageId] = widgetStylePicker.value;
      saveWidgetStylePrefs();
      applyWidgetStyle(pageId);
    });
  }

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
      <aside class="realm-column reveal rise-1">
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
      <section class="home-preview reveal rise-2">
        <div class="preview-stage">
          <div class="preview-topline">
            <span>Realm Preview</span>
            <span>${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date())}</span>
          </div>
          <div id="home-preview-panel"></div>
        </div>
        <div class="home-story-grid">
          <article class="story-card reveal rise-3">
            <p class="eyebrow">Quest Flavor</p>
            <h2>Whimsy, with room to breathe</h2>
            <p>Storybook mood stays, but the boards read faster.</p>
          </article>
          <article class="story-card reveal rise-4">
            <p class="eyebrow">Template Magic</p>
            <h2>Each page keeps three looks</h2>
            <p>Each realm remembers its own style and card skin.</p>
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
        <button class="realm-link reveal rise-${Math.min(index + 1, 5)} ${index === 0 ? "active" : ""}" type="button" data-page-target="${pageId}">
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
    const familyMetrics = getProfileMetrics("parent");
    panel.innerHTML = `
      <div class="preview-card preview-home widget-surface">
        <p class="eyebrow">Storybook Hub</p>
        <h2>A whimsical launchpad for every family quest.</h2>
        <div class="preview-badges">
          <span>5 pages</span>
          <span>3 templates each</span>
          <span>Fantasy home hub</span>
        </div>
        <div class="preview-stats">
          ${renderMetricWidget("Family Treasure", formatCurrency(familyMetrics.earnings), "money", "Family", familyMetrics.earnings)}
          ${renderMetricWidget("Open Adventures", familyMetrics.openTasks.length, "open", "Family", familyMetrics.openTasks.length)}
        </div>
      </div>
    `;
    return;
  }

  if (pageId === "parent") {
    const familyMetrics = getProfileMetrics("parent");
    panel.innerHTML = `
      <div class="preview-card widget-surface reveal rise-3">
        <p class="eyebrow">Parent Hall</p>
        <h2>Manage chores, rewards, and every board.</h2>
        <div class="preview-stats">
          ${renderMetricWidget("Open quests", familyMetrics.openTasks.length, "open", "Family", familyMetrics.openTasks.length)}
          ${renderMetricWidget("Completed", familyMetrics.completedTasks.length, "completed", "Family", familyMetrics.completedTasks.length)}
          ${renderMetricWidget("Potential rewards", formatCurrency(familyMetrics.potential), "potential", "Family", familyMetrics.potential)}
        </div>
      </div>
    `;
    return;
  }

  const profileId = pageConfigs[pageId].profileId;
  const profile = profileMap[profileId];
  const metrics = getProfileMetrics(profileId);

  panel.innerHTML = `
    <div class="preview-card widget-surface reveal rise-3">
      <p class="eyebrow">${profile.name}'s Realm</p>
      <h2>${profile.name}'s shared and assigned quests.</h2>
      <div class="preview-stats">
        ${renderMetricWidget("Open quests", metrics.openTasks.length, "open", profile.name, metrics.openTasks.length)}
        ${renderMetricWidget("Earned", formatCurrency(metrics.earnings), "money", profile.name, metrics.earnings)}
        ${renderMetricWidget("Level", metrics.level, "level", profile.name, metrics.level)}
      </div>
    </div>
    <div class="preview-ledger widget-surface reveal rise-4">
      ${(metrics.historyEntries.slice(0, 3).map((entry) => `<div class="preview-ledger-row"><span>${entry.title}</span><strong>${formatCurrency(entry.reward)}</strong></div>`).join("")) || '<p class="preview-caption">No rewards logged yet on this page.</p>'}
    </div>
  `;
}

function renderMetricWidget(label, value, metricType, owner, numericValue, className = "", showDescription = false) {
  return `
    <article class="widget-card metric-${metricType} ${className}">
      <span class="widget-label">${label}</span>
      <strong class="widget-value">${value}</strong>
      ${showDescription ? `<p class="widget-description">${getMetricDescription(metricType, { owner, value: numericValue })}</p>` : ""}
    </article>
  `;
}

function renderInfoWidget(label, text, className = "", showDescription = false) {
  return `
    <article class="widget-card metric-info ${className}">
      <span class="widget-label">${label}</span>
      <strong class="widget-value">${text}</strong>
      ${showDescription ? '<p class="widget-description">A quick hint for the next move.</p>' : ""}
    </article>
  `;
}

function getMetricDescription(metricType, context) {
  const pool = widgetDescriptionPools[metricType] || widgetDescriptionPools.open;
  return pool[Math.floor(Math.random() * pool.length)](context);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(Number(value)) ? Number(value) : 0);
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
      <header class="page-hero widget-surface reveal rise-1 ${pageConfig.type === "parent" ? "page-hero-parent" : ""}">
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
          ${renderMetricWidget(pageConfig.type === "parent" ? "Family level" : "Level", metrics.level, "level", pageConfig.type === "parent" ? "Family" : profile.name, metrics.level, "snapshot-card")}
          ${renderMetricWidget("XP", `${metrics.currentXp} / 100`, "xp", pageConfig.type === "parent" ? "Family" : profile.name, metrics.currentXp, "snapshot-card")}
          ${renderMetricWidget("Earnings", formatCurrency(metrics.earnings), "money", pageConfig.type === "parent" ? "Family" : profile.name, metrics.earnings, "snapshot-card")}
          ${renderMetricWidget(pageConfig.type === "parent" ? "Completed" : "Combo", pageConfig.type === "parent" ? metrics.completedTasks.length : `x${metrics.combo}`, pageConfig.type === "parent" ? "completed" : "combo", pageConfig.type === "parent" ? "Family" : profile.name, pageConfig.type === "parent" ? metrics.completedTasks.length : metrics.combo, "snapshot-card")}
        </div>
      </header>

      <main class="dashboard-grid">
        <section class="panel panel-board widget-surface reveal rise-2">
          <div class="panel-heading">
            <p class="eyebrow">${pageConfig.type === "parent" ? "Family Board" : "Quest Board"}</p>
            <h2>${pageConfig.type === "parent" ? "Assign, credit, and clear chores" : `${profile.name}'s active quests`}</h2>
          </div>
          <div class="summary-row">
            ${renderMetricWidget("Open", metrics.openTasks.length, "open", pageConfig.type === "parent" ? "Family" : profile.name, metrics.openTasks.length)}
            ${renderMetricWidget("Done", metrics.completedTasks.length, "completed", pageConfig.type === "parent" ? "Family" : profile.name, metrics.completedTasks.length)}
            ${renderMetricWidget("Potential", formatCurrency(metrics.potential), "potential", pageConfig.type === "parent" ? "Family" : profile.name, metrics.potential)}
          </div>
          <div id="task-region"></div>
        </section>

        <section class="panel panel-side widget-surface reveal rise-3">
          <div class="panel-heading">
            <p class="eyebrow">${pageConfig.type === "parent" ? "Family Pulse" : "Realm Pulse"}</p>
            <h2>${pageConfig.type === "parent" ? "Kid snapshots and reward trail" : `${profile.name}'s snapshots and rewards`}</h2>
          </div>
          <div class="mini-stat-stack">
            ${renderMetricWidget("Rank title", rankTitle, "rank", pageConfig.type === "parent" ? "Family" : profile.name, metrics.level, "mini-stat")}
            ${renderInfoWidget("Best next move", getTip(pageConfig, profile, metrics), "mini-stat")}
          </div>
          <div class="kid-grid" id="profile-summary-region"></div>
          <div class="ledger-panel">
            <span>${pageConfig.type === "parent" ? "Family ledger" : `${profile.name}'s ledger`}</span>
            <div id="ledger-region"></div>
          </div>
        </section>

        ${pageConfig.type === "parent" ? renderParentPanels() : ""}
      </main>
    </section>
    ${renderPinDialog()}
  `;

  renderTaskRegion(pageConfig, metrics);
  renderProfileSummaryRegion(pageConfig);
  renderLedgerRegion(pageConfig, metrics);

  if (pageConfig.type === "parent") {
    bindParentControls();
    bindImportControls();
  }
}

function renderParentPanels() {
  return `
    <section class="panel panel-form widget-surface reveal rise-4">
      <div class="panel-heading">
        <p class="eyebrow">Parent Controls</p>
        <h2>Craft a new quest</h2>
      </div>
      <div class="notice-banner subtle">Parent controls live here.</div>
      <form id="task-form" class="task-form">
        <label>
          Quest name
          <input id="task-input" type="text" maxlength="60" placeholder="Sweep the porch" required />
        </label>
        <div class="form-row">
          <label>
            Reward
            <input id="reward-input" type="number" min="1" max="999" step="0.01" value="8" required />
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
    <section class="panel panel-import widget-surface reveal rise-5">
      <div class="panel-heading">
        <p class="eyebrow">Chore Import</p>
        <h2>Drop in a list and get smart suggestions</h2>
      </div>
      <div class="notice-banner subtle">Paste or upload chores to build suggestions before creating them.</div>
      <div class="task-form">
        <label>
          Paste chore list
          <textarea id="import-text" class="import-textarea" placeholder="Laundry round | laundry | 14&#10;Vacuum bedroom, bedroom, 6&#10;Trash bins | outside | 8"></textarea>
        </label>
        <label>
          Upload document
          <input id="import-file" type="file" />
        </label>
        <div class="action-row">
          <button class="primary-button" id="parse-import" type="button">Build suggestions</button>
          <button class="ghost-button" id="clear-import" type="button">Clear import</button>
        </div>
      </div>
      <div id="import-preview" class="import-preview"></div>
    </section>
  `;
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

    state.tasks.unshift(createTaskRecord({
      title,
      reward,
      difficulty,
      scope,
      assigneeId,
      label: "",
    }));

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

function bindImportControls() {
  const textInput = document.getElementById("import-text");
  const fileInput = document.getElementById("import-file");
  const parseButton = document.getElementById("parse-import");
  const clearButton = document.getElementById("clear-import");
  const preview = document.getElementById("import-preview");

  let importSuggestions = [];

  const renderPreview = () => {
    if (!importSuggestions.length) {
      preview.innerHTML = '<div class="empty-state">No import suggestions yet. Paste chores or upload a document to build a review list.</div>';
      return;
    }

    preview.innerHTML = `
      <div class="import-list">
        ${importSuggestions.map((item, index) => `
          <article class="import-card widget-surface">
            <div>
              <strong>${item.title}</strong>
              <p class="widget-description">Label: ${item.label || "none"} | Reward: ${formatCurrency(item.reward)} | Source: ${item.source}</p>
            </div>
            <label class="pretty-select import-assignee">
              <span class="select-label">Suggested assignment</span>
              <div class="select-shell">
                <select data-import-index="${index}">
                  <option value="shared" ${item.scope === "shared" ? "selected" : ""}>Shared</option>
                  ${profiles.map((profile) => `<option value="${profile.id}" ${item.assigneeId === profile.id ? "selected" : ""}>${profile.name}</option>`).join("")}
                </select>
                <span class="select-arrow">v</span>
              </div>
            </label>
          </article>
        `).join("")}
      </div>
      <div class="action-row">
        <button class="primary-button" id="confirm-import" type="button">Create suggested chores</button>
      </div>
    `;

    preview.querySelectorAll("[data-import-index]").forEach((select) => {
      select.addEventListener("change", () => {
        const item = importSuggestions[Number(select.dataset.importIndex)];
        item.scope = select.value === "shared" ? "shared" : "assigned";
        item.assigneeId = select.value === "shared" ? null : select.value;
        item.reward = normalizeRewardForAssignee(item.originalReward, item.scope === "assigned" ? item.assigneeId : null);
        renderPreview();
      });
    });

    document.getElementById("confirm-import").addEventListener("click", () => {
      importSuggestions.forEach((item) => {
        state.tasks.unshift(createTaskRecord(item));
      });
      saveState();
      location.reload();
    });
  };

  const buildSuggestions = async () => {
    const chunks = [];

    if (textInput.value.trim()) {
      chunks.push(textInput.value.trim());
    }

    if (fileInput.files && fileInput.files.length) {
      for (const file of Array.from(fileInput.files)) {
        try {
          chunks.push(await file.text());
        } catch {
          chunks.push("");
        }
      }
    }

    importSuggestions = parseImportedChores(chunks.join("\n"));

    if (!importSuggestions.length && chunks.length) {
      preview.innerHTML = '<div class="empty-state">Nothing readable was found in that import. Try one chore per line with an optional label and reward.</div>';
      return;
    }

    renderPreview();
  };

  parseButton.addEventListener("click", () => {
    buildSuggestions();
  });

  clearButton.addEventListener("click", () => {
    textInput.value = "";
    fileInput.value = "";
    importSuggestions = [];
    renderPreview();
  });

  renderPreview();
}

function parseImportedChores(sourceText) {
  return sourceText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => parseChoreLine(line))
    .filter(Boolean);
}

function parseChoreLine(line) {
  const lowered = line.toLowerCase();
  const rewardMatch = line.match(/\$?\d+(?:\.\d+)?/);
  const originalReward = rewardMatch ? Number(rewardMatch[0].replace("$", "")) : 5;
  const parts = line.includes("|")
    ? line.split("|").map((part) => part.trim()).filter(Boolean)
    : line.split(",").map((part) => part.trim()).filter(Boolean);

  const explicitProfile = profiles.find((profile) => lowered.includes(profile.name.toLowerCase()));
  const detectedLabel = detectLabel(line, parts);
  const title = deriveTitle(line, parts, explicitProfile?.name, rewardMatch?.[0], detectedLabel);
  const suggestion = suggestAssignment(detectedLabel, originalReward, explicitProfile?.id, lowered);
  const scope = suggestion === "shared" ? "shared" : "assigned";
  const assigneeId = scope === "assigned" ? suggestion : null;

  if (!title) {
    return null;
  }

  return {
    id: crypto.randomUUID(),
    source: line,
    title,
    difficulty: inferDifficulty(originalReward),
    label: detectedLabel,
    originalReward,
    reward: normalizeRewardForAssignee(originalReward, assigneeId),
    scope,
    assigneeId,
  };
}

function detectLabel(line, parts) {
  const lowered = line.toLowerCase();
  const knownLabels = [
    "laundry",
    "kitchen",
    "bedroom",
    "bathroom",
    "outside",
    "yard",
    "dishes",
    "trash",
    "pets",
    "toys",
    "sweep",
    "vacuum",
    "shared",
    "family",
  ];

  const direct = knownLabels.find((label) => lowered.includes(label));
  if (direct) {
    return direct;
  }

  if (parts.length >= 2 && !/\d/.test(parts[1])) {
    return parts[1].toLowerCase();
  }

  return "";
}

function deriveTitle(line, parts, explicitName, rewardToken, label) {
  const cleaned = (parts[0] || line)
    .replace(explicitName || "", "")
    .replace(rewardToken || "", "")
    .replace(label || "", "")
    .replace(/\$+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (cleaned) {
    return cleaned;
  }

  return line.replace(rewardToken || "", "").trim();
}

function suggestAssignment(label, reward, explicitProfileId, lowered) {
  if (explicitProfileId) {
    return explicitProfileId;
  }

  if (label === "shared" || label === "family" || lowered.includes("everyone")) {
    return "shared";
  }

  if (["laundry", "yard", "outside", "trash"].includes(label) || reward >= 10) {
    return "miles";
  }

  if (["kitchen", "dishes", "bathroom", "vacuum"].includes(label) || reward >= 6) {
    return "logan";
  }

  if (["bedroom", "toys", "pets", "sweep"].includes(label) || reward <= 5) {
    return "zoe";
  }

  return "shared";
}

function inferDifficulty(reward) {
  if (reward >= 12) {
    return "Boss";
  }

  if (reward >= 6) {
    return "Medium";
  }

  return "Easy";
}

function createTaskRecord(taskLike) {
  const scope = taskLike.scope === "assigned" ? "assigned" : "shared";
  const assigneeId = scope === "assigned" ? taskLike.assigneeId : null;
  const reward = normalizeRewardForAssignee(taskLike.reward, assigneeId);

  return {
    id: taskLike.id || crypto.randomUUID(),
    title: taskLike.title,
    reward,
    difficulty: difficultyXp[taskLike.difficulty] ? taskLike.difficulty : inferDifficulty(reward),
    completed: false,
    scope,
    assigneeId,
    completedById: null,
    label: taskLike.label || "",
  };
}

function normalizeRewardForAssignee(reward, assigneeId) {
  const numericReward = Number.isFinite(Number(reward)) ? Number(reward) : 0;
  if (assigneeId === "miles") {
    return Math.ceil(numericReward);
  }
  return numericReward;
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
  const metaLabel = task.label ? `<span class="label-pill">${task.label}</span>` : "";

  return `
    <li class="task-card reveal rise-2 ${task.completed ? "completed" : ""}">
      ${parentMode ? `<button class="task-toggle" type="button" data-toggle-task="${task.id}" aria-label="Toggle task complete"></button>` : '<div class="task-toggle ghost"></div>'}
      <div class="task-content">
        <div class="task-topline">
          <h3 class="task-title">${task.title}</h3>
          <span class="task-reward">${formatCurrency(task.reward)}</span>
        </div>
        <div class="task-meta">
          <span class="difficulty-pill">${task.difficulty}</span>
          ${metaLabel}
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
        <article class="mini-stat widget-card metric-money kid-mini-card reveal rise-3 ${pageConfig.profileId === profile.id ? "current" : ""}">
          <span class="widget-label">${profile.name}</span>
          <strong class="widget-value">${metrics.openTasks.length} open</strong>
          <span>${formatCurrency(metrics.earnings)} earned</span>
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
        <strong>+${formatCurrency(entry.reward)}</strong>
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
    return "Assign chores, credit rewards, and keep the quest board moving.";
  }

  return `${profile.name}'s board stays read-only and easy to scan.`;
}

function getTip(pageConfig, profile, metrics) {
  if (pageConfig.type === "parent") {
    if (!metrics.openTasks.length) {
      return "Add a fresh quest to start the next round.";
    }

    return "Assign one quick win and one bigger mission.";
  }

  if (!metrics.openTasks.length) {
    return `${profile.name}'s board is clear right now.`;
  }

  return `Shared quests stay mixed with ${profile.name}'s own chores here.`;
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



