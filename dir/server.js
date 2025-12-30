const session = require('express-session');

// Add session middleware
app.use(session({
  secret: 'secret_key_change_this', // change this in production
  resave: false,
  saveUninitialized: false
}));

// Login route
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, user) => {
    if (err) return res.send("An error occurred.");
    if (!user) return res.send("User not found.");

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.send("Incorrect password.");

    // Save user session
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role;

    res.send(`Welcome, ${user.username}! You are now logged in.`);
  });
});
