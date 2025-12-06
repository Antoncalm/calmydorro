const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data', 'users');

// Создаём папку data/users если её нет
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

app.use(bodyParser.json());
app.use(express.static('public'));

// ===== API endpoints =====

// Получить данные пользователя
app.get('/api/user/:userId', (req, res) => {
  const { userId } = req.params;
  const filePath = path.join(DATA_DIR, `${userId}.json`);

  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      res.json(JSON.parse(data));
    } else {
      // Новый пользователь
      const newData = {
        userId,
        createdAt: new Date().toISOString(),
        categories: {},
      };
      fs.writeFileSync(filePath, JSON.stringify(newData, null, 2));
      res.json(newData);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load user data' });
  }
});

// Сохранить данные пользователя
app.post('/api/user/:userId/save', (req, res) => {
  const { userId } = req.params;
  const userData = req.body;
  const filePath = path.join(DATA_DIR, `${userId}.json`);

  try {
    fs.writeFileSync(filePath, JSON.stringify(userData, null, 2));
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save user data' });
  }
});

// Добавить новую сессию
app.post('/api/user/:userId/session', (req, res) => {
  const { userId } = req.params;
  const { category, activity, duration } = req.body;
  const filePath = path.join(DATA_DIR, `${userId}.json`);

  try {
    let data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    if (!data.categories) {
      data.categories = {};
    }
    if (!data.categories[category]) {
      data.categories[category] = {
        sessions: 0,
        seconds: 0,
        lastUpdated: new Date().toISOString(),
      };
    }

    data.categories[category].sessions += 1;
    data.categories[category].seconds += duration;
    data.categories[category].lastUpdated = new Date().toISOString();

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save session' });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 Pomodoro Web App запущен на http://localhost:${PORT}`);
  console.log(`📱 Используй этот URL в Telegram Web App\n`);
});
