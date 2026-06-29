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
const goalForm = document.getElementById('goalForm');
const goalName = document.getElementById('goalName');
const goalHours = document.getElementById('goalHours');
const goalDate = document.getElementById('goalDate');

const STORAGE_KEY = 'teamG-goals';

const sampleGoals = [
  {
    id: crypto.randomUUID(),
    title: '120時間の学習',
    target: 120,
    progress: 38,
    deadline: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    state: 'active',
  },
  {
    id: crypto.randomUUID(),
    title: '次の機能の設計',
    target: 30,
    progress: 0,
    deadline: new Date(Date.now() + 17 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    state: 'active',
  },
];

let goals = [];
let currentGoal = null;

function saveGoals() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
}

function loadGoals() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      goals = JSON.parse(saved);
      return;
    } catch (error) {
      console.error('保存された目標の読み込みに失敗しました', error);
    }
  }
  goals = sampleGoals;
  saveGoals();
}

function getNextGoal() {
  return goals
    .filter((goal) => goal.state !== 'completed')
    .sort((a, b) => {
      const dateA = new Date(a.deadline);
      const dateB = new Date(b.deadline);
      return dateA - dateB || a.target - b.target;
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

function getStatus(goal) {
  if (goal.state === 'paused') return { label: '一時停止', color: 'danger' };
  if (goal.progress >= goal.target) return { label: '完了', color: 'success' };
  return { label: '計測中', color: 'info' };
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
    addProgressBtn.disabled = true;
    completeGoalBtn.disabled = true;
    pauseGoalBtn.disabled = true;
    return;
  }

  const progress = Math.min(currentGoal.progress, currentGoal.target);
  const ratio = currentGoal.target > 0 ? Math.round((progress / currentGoal.target) * 100) : 0;
  const status = getStatus(currentGoal);

  goalTitle.textContent = currentGoal.title;
  goalTarget.textContent = `${currentGoal.target}時間`;
  goalProgress.textContent = `${progress}時間`;
  goalRate.textContent = `${ratio}%`;
  goalDeadline.textContent = formatDate(currentGoal.deadline);
  goalState.textContent = status.label;
  goalState.className = `goal-badge ${status.color}`;
  addProgressBtn.disabled = currentGoal.state === 'paused';
  completeGoalBtn.disabled = currentGoal.state === 'paused' || ratio >= 100;
  pauseGoalBtn.disabled = ratio >= 100;
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
    item.innerHTML = `
      <h4>${goal.title}</h4>
      <p>期限: ${formatDate(goal.deadline)} / 進捗: ${goal.progress} / 目標: ${goal.target}時間</p>
    `;
    upcomingGoals.appendChild(item);
  });
}

function refresh() {
  renderCurrentGoal();
  renderUpcomingGoals();
  saveGoals();
}

addProgressBtn.addEventListener('click', () => {
  if (!currentGoal) return;
  currentGoal.progress += 1;
  if (currentGoal.progress >= currentGoal.target) {
    currentGoal.progress = currentGoal.target;
    currentGoal.state = 'completed';
  }
  refresh();
});

completeGoalBtn.addEventListener('click', () => {
  if (!currentGoal) return;
  currentGoal.progress = currentGoal.target;
  currentGoal.state = 'completed';
  refresh();
});

pauseGoalBtn.addEventListener('click', () => {
  if (!currentGoal) return;
  currentGoal.state = currentGoal.state === 'paused' ? 'active' : 'paused';
  refresh();
});

goalForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const title = goalName.value.trim();
  const target = Number(goalHours.value);
  const deadline = goalDate.value;

  if (!title || target <= 0 || !deadline) {
    return;
  }

  const newGoal = {
    id: crypto.randomUUID(),
    title,
    target,
    progress: 0,
    deadline,
    state: 'active',
  };

  goals.push(newGoal);
  goalName.value = '';
  goalHours.value = '120';
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
