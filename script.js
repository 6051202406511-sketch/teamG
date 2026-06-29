const goalTitle = document.getElementById('goalTitle');
const goalTarget = document.getElementById('goalTarget');
const goalProgress = document.getElementById('goalProgress');
const goalRate = document.getElementById('goalRate');
const goalDeadline = document.getElementById('goalDeadline');
const goalState = document.getElementById('goalState');
const upcomingGoals = document.getElementById('upcomingGoals');
const upcomingCount = document.getElementById('upcomingCount');
const addProgressBtn = document.getElementById('addProgressBtn');
const completeGoalBtn = document.getElementById('completeGoalBtn');
const pauseGoalBtn = document.getElementById('pauseGoalBtn');
const startMeasureBtn = document.getElementById('startMeasureBtn');
const goalProgressBar = document.getElementById('goalProgressBar');
const goalProgressBarLabel = document.getElementById('goalProgressBarLabel');
const measurementStatusText = document.getElementById('measurementStatusText');
const goalElapsedText = document.getElementById('goalElapsedText');
const goalForm = document.getElementById('goalForm');
const goalName = document.getElementById('goalName');
const goalAmount = document.getElementById('goalAmount');
const goalUnit = document.getElementById('goalUnit');
const goalDate = document.getElementById('goalDate');

const STORAGE_KEY = 'teamG-goals';

const sampleGoals = [
  {
    id: crypto.randomUUID(),
    title: '120時間の学習',
    target: 432000,
    progress: 136800,
    targetUnit: 'hours',
    deadline: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    state: 'active',
  },
  {
    id: crypto.randomUUID(),
    title: '次の機能の設計',
    target: 1800,
    progress: 0,
    targetUnit: 'seconds',
    deadline: new Date(Date.now() + 17 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    state: 'active',
  },
];

let goals = [];
let currentGoal = null;
let timerInterval = null;

function saveGoals() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
}

function loadGoals() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      goals = JSON.parse(saved).map((goal) => {
        const unit = goal.targetUnit || 'hours';
        const targetSeconds = Number(goal.targetSeconds ?? (
          unit === 'minutes' ? Number(goal.target || 0) * 60 : unit === 'seconds' ? Number(goal.target || 0) : Number(goal.target || 0) * 3600
        ));
        const progressSeconds = Number(goal.progressSeconds ?? (
          unit === 'minutes' ? Number(goal.progress || 0) * 60 : unit === 'seconds' ? Number(goal.progress || 0) : Number(goal.progress || 0) * 3600
        ));

        return {
          ...goal,
          progress: progressSeconds,
          target: targetSeconds,
          progressSeconds,
          targetSeconds,
          targetUnit: unit,
          state: goal.state || 'active',
          isRunning: Boolean(goal.isRunning),
          startedAt: goal.startedAt || null,
        };
      });
      return;
    } catch (error) {
      console.error('保存された目標の読み込みに失敗しました', error);
    }
  }
  goals = sampleGoals.map((goal) => ({
    ...goal,
    targetSeconds: Number(goal.targetSeconds ?? goal.target),
    progressSeconds: Number(goal.progressSeconds ?? goal.progress),
    target: Number(goal.targetSeconds ?? goal.target),
    progress: Number(goal.progressSeconds ?? goal.progress),
    targetUnit: goal.targetUnit || 'hours',
    isRunning: false,
    startedAt: null,
  }));
  saveGoals();
}

function getNextGoal() {
  return goals
    .filter((goal) => goal.state !== 'completed')
    .sort((a, b) => {
      const dateA = new Date(a.deadline);
      const dateB = new Date(b.deadline);
      return dateA - dateB || getTargetSeconds(a) - getTargetSeconds(b);
    })[0] || null;
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  return date.toLocaleDateString('ja-JP', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });
}

function getTargetSeconds(goal) {
  if (!goal) return 0;
  return Number(goal.targetSeconds ?? goal.target ?? 0);
}

function getProgressSeconds(goal) {
  if (!goal) return 0;
  return Number(goal.progressSeconds ?? goal.progress ?? 0);
}

function formatDuration(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
}

function formatUnitValue(value, unit) {
  const safeValue = Math.max(0, Math.floor(value));
  if (unit === 'minutes') {
    return `${safeValue}分`;
  }
  if (unit === 'seconds') {
    return `${safeValue}秒`;
  }
  return `${safeValue}時間`;
}

function getElapsedSeconds(goal) {
  if (!goal || !goal.isRunning || !goal.startedAt) return 0;
  return Math.floor((Date.now() - goal.startedAt) / 1000);
}

function getDisplayProgressSeconds(goal) {
  if (!goal) return 0;
  return Math.min(getProgressSeconds(goal) + getElapsedSeconds(goal), getTargetSeconds(goal));
}

function commitElapsed(goal) {
  if (!goal || !goal.isRunning || !goal.startedAt) return;
  const elapsed = getElapsedSeconds(goal);
  goal.progress = Number(getProgressSeconds(goal) + elapsed);
  goal.progressSeconds = Number(getProgressSeconds(goal) + elapsed);
  goal.startedAt = Date.now();
}

function getStatus(goal) {
  if (!goal) return { label: '完了', color: 'success' };
  if (goal.state === 'completed') return { label: '完了', color: 'success' };
  if (goal.isRunning) return { label: '計測中', color: 'info' };
  if (goal.state === 'paused') return { label: '一時停止', color: 'danger' };
  return { label: '待機中', color: 'info' };
}

function renderCurrentGoal() {
  currentGoal = getNextGoal();

  if (!currentGoal) {
    goalTitle.textContent = 'すべての目標を達成しました！';
    goalTarget.textContent = '-';
    goalProgress.textContent = '-';
    goalRate.textContent = '-';
    goalDeadline.textContent = '-';
    goalState.textContent = '完了';
    goalState.className = 'goal-badge success';
    goalProgressBar.style.width = '100%';
    goalProgressBarLabel.textContent = '100%';
    measurementStatusText.textContent = '完了';
    goalElapsedText.textContent = '0.00時間 / 0時間';
    addProgressBtn.disabled = true;
    completeGoalBtn.disabled = true;
    pauseGoalBtn.disabled = true;
    startMeasureBtn.disabled = true;
    return;
  }

  const progress = Math.min(getDisplayProgressSeconds(currentGoal), getTargetSeconds(currentGoal));
  const ratio = getTargetSeconds(currentGoal) > 0 ? Math.round((progress / getTargetSeconds(currentGoal)) * 100) : 0;
  const status = getStatus(currentGoal);
  const safeProgress = Number(progress.toFixed(0));
  const targetSeconds = getTargetSeconds(currentGoal);
  const targetUnit = currentGoal.targetUnit || 'hours';

  goalTitle.textContent = currentGoal.title;
  goalTarget.textContent = formatUnitValue(Math.max(1, Math.round(targetSeconds / (targetUnit === 'minutes' ? 60 : targetUnit === 'seconds' ? 1 : 3600))), targetUnit);
  goalProgress.textContent = formatDuration(safeProgress);
  goalRate.textContent = `${ratio}%`;
  goalDeadline.textContent = formatDate(currentGoal.deadline);
  goalState.textContent = status.label;
  goalState.className = `goal-badge ${status.color}`;
  goalProgressBar.style.width = `${Math.min(ratio, 100)}%`;
  goalProgressBarLabel.textContent = `${ratio}%`;
  measurementStatusText.textContent = currentGoal.isRunning ? '計測中' : currentGoal.state === 'paused' ? '一時停止' : '待機中';
  goalElapsedText.textContent = `${formatDuration(safeProgress)} / ${formatDuration(targetSeconds)}`;
  addProgressBtn.disabled = false;
  addProgressBtn.textContent = targetUnit === 'minutes' ? '+1分' : targetUnit === 'seconds' ? '+1秒' : '+1時間';
  completeGoalBtn.disabled = ratio >= 100;
  pauseGoalBtn.disabled = !currentGoal.isRunning || ratio >= 100;
  startMeasureBtn.disabled = !currentGoal || currentGoal.state === 'completed' || currentGoal.isRunning;
  startMeasureBtn.textContent = currentGoal.state === 'paused' ? '再開する' : '計測開始';
}

function renderUpcomingGoals() {
  const upcoming = goals
    .filter((goal) => goal.id !== (currentGoal && currentGoal.id) && goal.state !== 'completed')
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

  upcomingGoals.innerHTML = '';
  upcomingCount.textContent = upcoming.length;

  if (upcoming.length === 0) {
    upcomingGoals.innerHTML = '<li class="goal-item"><p>次の目標はありません。新しい目標を追加してください。</p></li>';
    return;
  }

  upcoming.forEach((goal) => {
    const item = document.createElement('li');
    item.className = 'goal-item';
    const unit = goal.targetUnit || 'hours';
    const targetValue = Math.max(1, Math.round(getTargetSeconds(goal) / (unit === 'minutes' ? 60 : unit === 'seconds' ? 1 : 3600)));
    const progressValue = Math.max(0, Math.round(getProgressSeconds(goal) / (unit === 'minutes' ? 60 : unit === 'seconds' ? 1 : 3600)));
    item.innerHTML = `
      <h4>${goal.title}</h4>
      <p>期限: ${formatDate(goal.deadline)} / 進捗: ${formatUnitValue(progressValue, unit)} / 目標: ${formatUnitValue(targetValue, unit)}</p>
    `;
    upcomingGoals.appendChild(item);
  });
}

function refresh({ persist = true } = {}) {
  renderCurrentGoal();
  renderUpcomingGoals();
  if (persist) {
    saveGoals();
  }
}

function startTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
  }

  timerInterval = window.setInterval(() => {
    if (goals.some((goal) => goal.isRunning)) {
      refresh({ persist: false });
    }
  }, 1000);
}

addProgressBtn.addEventListener('click', () => {
  if (!currentGoal) return;
  commitElapsed(currentGoal);
  const unit = currentGoal.targetUnit || 'hours';
  const incrementSeconds = unit === 'minutes' ? 60 : unit === 'seconds' ? 1 : 3600;
  currentGoal.progress = Number(getProgressSeconds(currentGoal) + incrementSeconds);
  currentGoal.progressSeconds = Number(getProgressSeconds(currentGoal) + incrementSeconds);
  if (getProgressSeconds(currentGoal) >= getTargetSeconds(currentGoal)) {
    currentGoal.progress = Number(getTargetSeconds(currentGoal));
    currentGoal.progressSeconds = Number(getTargetSeconds(currentGoal));
    currentGoal.state = 'completed';
    currentGoal.isRunning = false;
    currentGoal.startedAt = null;
  }
  refresh();
});

completeGoalBtn.addEventListener('click', () => {
  if (!currentGoal) return;
  commitElapsed(currentGoal);
  currentGoal.progress = Number(getTargetSeconds(currentGoal));
  currentGoal.progressSeconds = Number(getTargetSeconds(currentGoal));
  currentGoal.state = 'completed';
  currentGoal.isRunning = false;
  currentGoal.startedAt = null;
  refresh();
});

startMeasureBtn.addEventListener('click', () => {
  if (!currentGoal) return;
  commitElapsed(currentGoal);
  currentGoal.isRunning = true;
  currentGoal.state = 'active';
  currentGoal.startedAt = Date.now();
  refresh();
});

pauseGoalBtn.addEventListener('click', () => {
  if (!currentGoal || !currentGoal.isRunning) return;
  commitElapsed(currentGoal);
  currentGoal.isRunning = false;
  currentGoal.state = 'paused';
  currentGoal.startedAt = null;
  refresh();
});

goalForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const title = goalName.value.trim();
  const amount = Number(goalAmount.value);
  const unit = goalUnit.value;
  const deadline = goalDate.value;

  if (!title || amount <= 0 || !deadline) {
    return;
  }

  const targetSeconds = unit === 'minutes' ? amount * 60 : unit === 'seconds' ? amount : amount * 3600;

  const newGoal = {
    id: crypto.randomUUID(),
    title,
    target: targetSeconds,
    progress: 0,
    targetSeconds,
    progressSeconds: 0,
    targetUnit: unit,
    deadline,
    state: 'active',
    isRunning: false,
    startedAt: null,
  };

  goals.push(newGoal);
  goalName.value = '';
  goalAmount.value = '120';
  goalUnit.value = 'hours';
  goalDate.value = '';
  refresh();
});

function initializeDateInput() {
  const today = new Date();
  today.setDate(today.getDate() + 7);
  goalDate.value = today.toISOString().slice(0, 10);
}

loadGoals();
initializeDateInput();
refresh();
startTimer();
