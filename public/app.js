// ===== Telegram Web App Integration =====

const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// Получаем ID пользователя из Telegram
const userId = tg.initData ? 
  new URLSearchParams(tg.initData).get('user') 
  ? JSON.parse(decodeURIComponent(new URLSearchParams(tg.initData).get('user'))).id
  : 'anonymous' 
  : 'anonymous';

console.log('User ID:', userId);

// ===== State Management =====

let userData = {
  userId,
  createdAt: new Date().toISOString(),
  categories: {},
};

let timerState = {
  isRunning: false,
  isPaused: false,
  duration: 0,        // в секундах
  remaining: 0,       // в секундах
  totalDuration: 0,   // для прогресс-бара
  activity: '',
  category: '',
  startTime: null,
  pausedTime: 0,
};

// ===== DOM Elements =====

const mainScreen = document.getElementById('mainScreen');
const timerScreen = document.getElementById('timerScreen');
const analyticsScreen = document.getElementById('analyticsScreen');

const activityInput = document.getElementById('activityInput');
const categoryInput = document.getElementById('categoryInput');
const timerButtons = document.querySelectorAll('.btn-timer');
const customInput = document.getElementById('customInput');
const customBtn = document.getElementById('customBtn');
const analyticsBtn = document.getElementById('analyticsBtn');

const timerValue = document.getElementById('timerValue');
const timerActivity = document.getElementById('timerActivity');
const timerCategory = document.getElementById('timerCategory');
const pauseBtn = document.getElementById('pauseBtn');
const resumeBtn = document.getElementById('resumeBtn');
const stopBtn = document.getElementById('stopBtn');
const progressFill = document.getElementById('progressFill');

const analyticsContent = document.getElementById('analyticsContent');
const backBtn = document.getElementById('backBtn');

// ===== Utilities =====

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  const parts = [];
  if (h > 0) parts.push(`${h}ч`);
  if (m > 0) parts.push(`${m}мин`);
  if (s > 0 && h === 0) parts.push(`${s}с`);

  return parts.length > 0 ? parts.join(' ') : '0';
}

// ===== API Calls =====

async function loadUserData() {
  try {
    const response = await fetch(`/api/user/${userId}`);
    userData = await response.json();
    console.log('User data loaded:', userData);
  } catch (err) {
    console.error('Failed to load user data:', err);
  }
}

async function saveUserData() {
  try {
    await fetch(`/api/user/${userId}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
  } catch (err) {
    console.error('Failed to save user data:', err);
  }
}

async function saveSession(category, activity, duration) {
  try {
    const response = await fetch(`/api/user/${userId}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, activity, duration }),
    });
    userData = await response.json();
  } catch (err) {
    console.error('Failed to save session:', err);
  }
}

// ===== Screen Navigation =====

function showScreen(screen) {
  mainScreen.classList.remove('active');
  timerScreen.classList.remove('active');
  analyticsScreen.classList.remove('active');
  screen.classList.add('active');
}

// ===== Timer Logic =====

let timerInterval = null;

async function startTimer(minutes) {
  const activity = activityInput.value.trim();
  const category = categoryInput.value.trim();

  if (!activity || !category) {
    alert('Укажи название занятия и категорию');
    return;
  }

  timerState.duration = minutes * 60;
  timerState.remaining = timerState.duration;
  timerState.totalDuration = timerState.duration;
  timerState.activity = activity;
  timerState.category = category;
  timerState.isRunning = true;
  timerState.isPaused = false;
  timerState.startTime = Date.now();
  timerState.pausedTime = 0;

  timerActivity.textContent = activity;
  timerCategory.textContent = category;

  showScreen(timerScreen);

  // Очищаем старый интервал если был
  if (timerInterval) clearInterval(timerInterval);

  updateTimerDisplay();

  timerInterval = setInterval(() => {
    if (!timerState.isPaused) {
      timerState.remaining = timerState.duration - 
        Math.floor((Date.now() - timerState.startTime - timerState.pausedTime) / 1000);

      if (timerState.remaining <= 0) {
        timerState.remaining = 0;
        clearInterval(timerInterval);
        endTimer();
        return;
      }

      updateTimerDisplay();
    }
  }, 100);
}

function updateTimerDisplay() {
  timerValue.textContent = formatTime(timerState.remaining);

  const progress = ((timerState.totalDuration - timerState.remaining) / timerState.totalDuration) * 100;
  progressFill.style.width = progress + '%';
}

function pauseTimer() {
  timerState.isPaused = true;
  pauseBtn.style.display = 'none';
  resumeBtn.style.display = 'inline-block';
}

function resumeTimer() {
  timerState.isPaused = false;
  timerState.startTime = Date.now() - (timerState.totalDuration - timerState.remaining) * 1000 - timerState.pausedTime;
  pauseBtn.style.display = 'inline-block';
  resumeBtn.style.display = 'none';
}

function stopTimer() {
  clearInterval(timerInterval);
  timerState.isRunning = false;

  // Сохраняем сессию
  saveSession(timerState.category, timerState.activity, timerState.totalDuration);

  // Возвращаемся на главный экран
  activityInput.value = '';
  categoryInput.value = '';
  timerButtons.forEach(btn => btn.classList.remove('selected'));
  customInput.value = '';

  showScreen(mainScreen);
  
  // Уведомление
  tg.showAlert('✅ Сессия сохранена!');
}

async function endTimer() {
  timerValue.textContent = '00:00';
  progressFill.style.width = '100%';
  timerState.isRunning = false;

  // Сохраняем сессию
  await saveSession(timerState.category, timerState.activity, timerState.totalDuration);

  // Очищаем форму
  activityInput.value = '';
  categoryInput.value = '';
  timerButtons.forEach(btn => btn.classList.remove('selected'));
  customInput.value = '';

  showScreen(mainScreen);

  // Уведомление
  tg.showAlert(`✅ Таймер завершён! "${timerState.activity}" в категории "${timerState.category}"`);
  
  // Звук или вибрация
  try {
    tg.HapticFeedback?.impactOccurred('heavy');
  } catch (e) {}
}

// ===== Analytics =====

function renderAnalytics() {
  const { categories } = userData;

  if (!categories || Object.keys(categories).length === 0) {
    analyticsContent.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📊</div>
        <p>Пока нет данных. Запусти первую сессию!</p>
      </div>
    `;
    return;
  }

  let totalSessions = 0;
  let totalSeconds = 0;

  let html = '';
  for (const [category, data] of Object.entries(categories)) {
    const sessions = data.sessions || 0;
    const seconds = data.seconds || 0;

    totalSessions += sessions;
    totalSeconds += seconds;

    html += `
      <div class="category-item">
        <div class="category-name">📁 ${category}</div>
        <div class="category-stat">
          <span>Сессий: ${sessions}</span>
          <span>Время: ${formatDuration(seconds)}</span>
        </div>
      </div>
    `;
  }

  html += `
    <div class="analytics-total">
      <div>
        <div class="total-label">Всего сессий:</div>
        <div class="total-value">${totalSessions}</div>
      </div>
      <div>
        <div class="total-label">Общее время:</div>
        <div class="total-value">${formatDuration(totalSeconds)}</div>
      </div>
    </div>
  `;

  analyticsContent.innerHTML = html;
}

// ===== Event Listeners =====

timerButtons.forEach(btn => {
  btn.addEventListener('click', (e) => {
    timerButtons.forEach(b => b.classList.remove('selected'));
    e.target.classList.add('selected');
    customInput.value = '';
  });
});

customBtn.addEventListener('click', () => {
  const minutes = parseInt(customInput.value);

  if (!minutes || minutes < 1 || minutes > 1440) {
    alert('Введи время от 1 до 1440 минут');
    return;
  }

  timerButtons.forEach(b => b.classList.remove('selected'));
  startTimer(minutes);
});

timerButtons.forEach(btn => {
  btn.addEventListener('click', (e) => {
    const minutes = parseInt(e.target.dataset.minutes);
    startTimer(minutes);
  });
});

analyticsBtn.addEventListener('click', () => {
  renderAnalytics();
  showScreen(analyticsScreen);
});

pauseBtn.addEventListener('click', pauseTimer);
resumeBtn.addEventListener('click', resumeTimer);
stopBtn.addEventListener('click', stopTimer);
backBtn.addEventListener('click', () => showScreen(mainScreen));

// ===== Initialize =====

(async () => {
  await loadUserData();
})();
