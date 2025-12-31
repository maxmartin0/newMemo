const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const sqlite3 = require('better-sqlite3');
const path = require('path');

const app = express();
const dbPath = path.join(__dirname, 'data', 'database.db');
const db = new sqlite3(dbPath);

// Create tables if not exist
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )
`).run();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: 'secret', resave: false, saveUninitialized: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Middleware for auth
function auth(req, res, next) {
  if (!req.session.userId) return res.redirect('/');
  next();
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?')
                 .get(username, password);
  if (user) {
    req.session.userId = user.id;
    res.redirect('/home');
  } else {
    res.redirect('/?loginError=1');
  }
});

app.post('/register', (req, res) => {
  const { username, password } = req.body;
  try {
    db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(username, password);
    res.redirect('/');
  } catch (err) {
    res.redirect('/?registerError=1');
  }
});

// Home / Notes Dashboard
app.get('/home', auth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API for notes
app.get('/notes', auth, (req, res) => {
  const notes = db.prepare('SELECT * FROM notes WHERE user_id = ? ORDER BY created_at DESC')
                  .all(req.session.userId);
  res.json(notes);
});

app.post('/notes', auth, (req, res) => {
  const { title, content } = req.body;
  db.prepare('INSERT INTO notes (user_id, title, content) VALUES (?, ?, ?)')
    .run(req.session.userId, title || 'Untitled', content || '');
  res.redirect('/home');
});

app.get('/notes/:id', auth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'note.html'));
});

app.post('/notes/:id/delete', auth, (req, res) => {
  db.prepare('DELETE FROM notes WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.session.userId);
  res.redirect('/home');
});

app.post('/notes/:id', auth, (req, res) => {
  const { title, content } = req.body;
  db.prepare('UPDATE notes SET title = ?, content = ? WHERE id = ? AND user_id = ?')
    .run(title, content, req.params.id, req.session.userId);
  res.redirect('/home');
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
