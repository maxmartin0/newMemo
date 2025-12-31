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
const db = new Database('database.db');

// Create users table if it doesn't exist
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

// Must come BEFORE routes for static assets
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev_secret_change_me',
  resave: false,
  saveUninitialized: false
}));

// ----------------------
// ROUTES
// ----------------------

// Home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Register new user
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

// Login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) return res.send("User not found.");

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.send("Incorrect password.");

  req.session.userId = user.id;
  req.session.role = user.role;

  res.send(`Welcome ${user.username}!`);
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// ----------------------
// START SERVER
// ----------------------
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
