const STORAGE_KEY = "chore-quest-state";
const baseTasks = [
  { id: crypto.randomUUID(), title: "Make the bed", reward: 4, difficulty: "Easy", completed: false },
  { id: crypto.randomUUID(), title: "Wash the dishes", reward: 9, difficulty: "Medium", completed: false },
  { id: crypto.randomUUID(), title: "Laundry round", reward: 14, difficulty: "Boss", completed: false },
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

const els = {
  form: document.getElementById("task-form"),
  taskInput: document.getElementById("task-input"),
  rewardInput: document.getElementById("reward-input"),
  difficultyInput: document.getElementById("difficulty-input"),
  taskList: document.getElementById("task-list"),
  openCount: document.getElementById("open-count"),
  completedCount: document.getElementById("completed-count"),
  potentialValue: document.getElementById("potential-value"),
  earningsValue: document.getElementById("earnings-value"),
  xpValue: document.getElementById("xp-value"),
  levelValue: document.getElementById("level-value"),
  comboValue: document.getElementById("combo-value"),
  progressFill: document.getElementById("progress-fill"),
  progressPercent: document.getElementById("progress-percent"),
  rankTitle: document.getElementById("rank-title"),
  nextTip: document.getElementById("next-tip"),
  ledgerList: document.getElementById("ledger-list"),
  statusNote: document.getElementById("status-note"),
  taskTemplate: document.getElementById("task-template"),
  focusForm: document.getElementById("focus-form"),
  clearCompleted: document.getElementById("clear-completed"),
  todayLabel: document.getElementById("today-label"),
};

els.todayLabel.textContent = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
}).format(new Date());

els.form.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = els.taskInput.value.trim();
  const reward = Number(els.rewardInput.value);
  const difficulty = els.difficultyInput.value;

  if (!title || !Number.isFinite(reward) || reward <= 0) {
    return;
  }

  state.tasks.unshift({
    id: crypto.randomUUID(),
    title,
    reward,
    difficulty,
    completed: false,
  });

  saveState();
  render();
  els.form.reset();
  els.rewardInput.value = "8";
  els.difficultyInput.value = "Medium";
  els.taskInput.focus();
});

els.focusForm.addEventListener("click", () => {
  els.taskInput.focus();
  els.taskInput.scrollIntoView({ behavior: "smooth", block: "center" });
});

els.clearCompleted.addEventListener("click", () => {
  state.tasks = state.tasks.filter((task) => !task.completed);
  saveState();
  render();
});

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    return {
      tasks: baseTasks,
      history: [],
    };
  }

  try {
    const parsed = JSON.parse(saved);
    return {
      tasks: Array.isArray(parsed.tasks) && parsed.tasks.length ? parsed.tasks : baseTasks,
      history: Array.isArray(parsed.history) ? parsed.history : [],
    };
  } catch {
    return {
      tasks: baseTasks,
      history: [],
    };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function toggleTask(id) {
  const task = state.tasks.find((item) => item.id === id);

  if (!task) {
    return;
  }

  task.completed = !task.completed;

  if (task.completed) {
    state.history.unshift({
      id: crypto.randomUUID(),
      taskId: task.id,
      title: task.title,
      reward: task.reward,
      timestamp: Date.now(),
    });
    state.history = state.history.slice(0, 6);
  } else {
    const historyIndex = state.history.findIndex((entry) => entry.taskId === task.id);
    if (historyIndex >= 0) {
      state.history.splice(historyIndex, 1);
    }
  }

  saveState();
  render();
}

function deleteTask(id) {
  state.tasks = state.tasks.filter((task) => task.id !== id);
  state.history = state.history.filter((entry) => entry.taskId !== id);
  saveState();
  render();
}

function getMetrics() {
  const completedTasks = state.tasks.filter((task) => task.completed);
  const openTasks = state.tasks.filter((task) => !task.completed);
  const earnings = completedTasks.reduce((sum, task) => sum + task.reward, 0);
  const totalXp = completedTasks.reduce((sum, task) => sum + difficultyXp[task.difficulty], 0);
  const level = Math.max(1, Math.floor(totalXp / 100) + 1);
  const currentXp = totalXp % 100;
  const combo = Math.max(1, completedTasks.length);
  const potential = openTasks.reduce((sum, task) => sum + task.reward, 0);

  return {
    completedTasks,
    openTasks,
    earnings,
    totalXp,
    level,
    currentXp,
    combo,
    potential,
  };
}

function getStatusMessage(metrics) {
  if (metrics.completedTasks.length === 0) {
    return "Start with one small win. Momentum stacks fast.";
  }

  if (metrics.openTasks.length === 0) {
    return "Board cleared. Cash collected. You fully completed the day.";
  }

  if (metrics.combo >= 3) {
    return "Combo is live. Keep it rolling with one more quest.";
  }

  return "Steady progress beats waiting for motivation.";
}

function getTip(metrics) {
  if (metrics.openTasks.length === 0) {
    return "Add a fresh quest and keep your streak alive.";
  }

  const easiestOpenTask = [...metrics.openTasks].sort((a, b) => a.reward - b.reward)[0];
  return `Try "${easiestOpenTask.title}" next for a quick $${easiestOpenTask.reward}.`;
}

function renderLedger(history) {
  els.ledgerList.innerHTML = "";

  if (!history.length) {
    const empty = document.createElement("p");
    empty.className = "ledger-empty";
    empty.textContent = "Completed chores will stack here like a tiny victory receipt.";
    els.ledgerList.append(empty);
    return;
  }

  history.forEach((entry) => {
    const row = document.createElement("div");
    row.className = "ledger-item";

    const label = document.createElement("span");
    label.textContent = entry.title;

    const amount = document.createElement("strong");
    amount.textContent = `+$${entry.reward}`;

    row.append(label, amount);
    els.ledgerList.append(row);
  });
}

function renderTasks() {
  els.taskList.innerHTML = "";

  if (!state.tasks.length) {
    const empty = document.createElement("li");
    empty.className = "empty-state";
    empty.textContent = "Your board is clear. Add a new quest to keep the day moving.";
    els.taskList.append(empty);
    return;
  }

  state.tasks.forEach((task) => {
    const fragment = els.taskTemplate.content.cloneNode(true);
    const item = fragment.querySelector(".task-card");
    const toggleButton = fragment.querySelector(".task-toggle");
    const title = fragment.querySelector(".task-title");
    const reward = fragment.querySelector(".task-reward");
    const difficulty = fragment.querySelector(".difficulty-pill");
    const xp = fragment.querySelector(".xp-pill");
    const deleteButton = fragment.querySelector(".delete-button");

    title.textContent = task.title;
    reward.textContent = `$${task.reward}`;
    difficulty.textContent = task.difficulty;
    xp.textContent = `+${difficultyXp[task.difficulty]} XP`;

    if (task.completed) {
      item.classList.add("completed");
    }

    toggleButton.addEventListener("click", () => toggleTask(task.id));
    deleteButton.addEventListener("click", () => deleteTask(task.id));

    els.taskList.append(fragment);
  });
}

function render() {
  const metrics = getMetrics();
  const progressPercent = Math.round(metrics.currentXp);
  const rankIndex = Math.min(rankTitles.length - 1, metrics.level - 1);

  renderTasks();
  renderLedger(state.history);

  els.openCount.textContent = String(metrics.openTasks.length);
  els.completedCount.textContent = String(metrics.completedTasks.length);
  els.potentialValue.textContent = `$${metrics.potential}`;
  els.earningsValue.textContent = `$${metrics.earnings}`;
  els.xpValue.textContent = `${metrics.currentXp} / 100`;
  els.levelValue.textContent = String(metrics.level);
  els.comboValue.textContent = `x${metrics.combo}`;
  els.progressFill.style.width = `${progressPercent}%`;
  els.progressPercent.textContent = `${progressPercent}%`;
  els.rankTitle.textContent = rankTitles[rankIndex];
  els.nextTip.textContent = getTip(metrics);
  els.statusNote.textContent = getStatusMessage(metrics);
}

render();
