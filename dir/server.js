const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;

// ----------------------
// DATABASE SETUP
// ----------------------
const dbPath = path.join(__dirname, '../data/database.db');
const db = new Database(dbPath);
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user'
  )
`).run();

// ----------------------
// MIDDLEWARE
// ----------------------
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev_secret_change_me',
  resave: false,
  saveUninitialized: false
}));

// ----------------------
// ROUTES
// ----------------------

// Root (login/register)
app.get('/', (req, res) => {
  if (req.session.userId) return res.redirect('/home');
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Login (AJAX)
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) return res.json({ success: false, message: "User not found" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.json({ success: false, message: "Incorrect password" });

  req.session.userId = user.id;
  req.session.role = user.role;
  res.json({ success: true });
});

// Register
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.send("Username and password required.");
  const hashed = await bcrypt.hash(password, 10);
  try {
    db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(username, hashed);
    res.send("Account created! <a href='/'>Login</a>");
  } catch {
    res.send("Username already exists.");
  }
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

// Blank home page
app.get('/home', (req, res) => {
  if (!req.session.userId) return res.redirect('/');
  res.send(`
    <html>
      <head>
        <title>Home</title>
        <link rel="stylesheet" href="/style.css">
      </head>
      <body style="display:flex;flex-direction:column;justify-content:center;align-items:center;height:100vh;background:#0F172A;color:#E5E7EB;">
        <h1>Welcome! You are logged in.</h1>
        <a href="/logout" style="margin-top:2rem;color:#3B82F6;">Logout</a>
      </body>
    </html>
  `);
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
