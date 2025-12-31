const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;

// Database (persistent file)
const db = new Database('database.db');

// Create users table
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user'
  )
`).run();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev_secret_change_me',
  resave: false,
  saveUninitialized: false
}));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Register
app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  const hashed = await bcrypt.hash(password, 10);

  try {
    db.prepare(
      'INSERT INTO users (username, password) VALUES (?, ?)'
    ).run(username, hashed);

    res.send("Account created! <a href='/'>Login</a>");
  } catch {
    res.send("Username already exists.");
  }
});

// Login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const user = db.prepare(
    'SELECT * FROM users WHERE username = ?'
  ).get(username);

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

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
