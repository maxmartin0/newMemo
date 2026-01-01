const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 10000;

/* ---------- DATABASE ---------- */
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

const db = new Database(path.join(dataDir, 'database.db'));

db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )
`).run();

/* ---------- MIDDLEWARE ---------- */
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  session({
    secret: 'memo-secret',
    resave: false,
    saveUninitialized: false
  })
);

app.use(express.static(path.join(__dirname, 'public')));

/* ---------- ROUTES ---------- */

// LOGIN PAGE
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// LOGIN
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  const user = db
    .prepare('SELECT * FROM users WHERE username = ? AND password = ?')
    .get(username, password);

  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  req.session.user = user.username;
  res.json({ success: true });
});

// REGISTER
app.post('/register', (req, res) => {
  const { username, password } = req.body;

  try {
    db.prepare(
      'INSERT INTO users (username, password) VALUES (?, ?)'
    ).run(username, password);

    res.json({ success: true });
  } catch {
    res.status(400).json({ error: 'Username already exists' });
  }
});

// HOME (PROTECTED)
app.get('/home', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/');
  }

  let html = fs.readFileSync(
    path.join(__dirname, 'public', 'home.html'),
    'utf8'
  );

  html = html.replace('>>username<<', req.session.user);
  res.send(html);
});

// LOGOUT
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

/* ---------- START SERVER ---------- */
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
