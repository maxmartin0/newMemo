const express = require('express');
const session = require('express-session');
const path = require('path');
const Database = require('better-sqlite3');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 10000;

const BASE_DIR = __dirname;
const PUBLIC_DIR = path.join(BASE_DIR, 'public');
const DATA_DIR = path.join(BASE_DIR, 'data');

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

// Database
const db = new Database(path.join(DATA_DIR, 'database.db'));

db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )
`).run();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  session({
    secret: 'super-secret-key',
    resave: false,
    saveUninitialized: false
  })
);

// Static files
app.use(express.static(PUBLIC_DIR));

/* ---------- AUTH ---------- */

// Login
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  const user = db
    .prepare('SELECT * FROM users WHERE username = ? AND password = ?')
    .get(username, password);

  if (!user) {
    return res.status(401).json({
      error: 'Invalid username or password'
    });
  }

  req.session.userId = user.id;
  res.json({ success: true });
});

// Register
app.post('/register', (req, res) => {
  const { username, password } = req.body;

  try {
    db.prepare(
      'INSERT INTO users (username, password) VALUES (?, ?)'
    ).run(username, password);

    res.json({ success: true });
  } catch {
    res.status(400).json({
      error: 'Username already exists'
    });
  }
});

// Home (protected)
app.get('/home', (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/');
  }
  res.sendFile(path.join(PUBLIC_DIR, 'home.html'));
});

// Logout
app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// Start
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
