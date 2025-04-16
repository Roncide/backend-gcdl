const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const authenticate = require('../middleware/auth');
const router = express.Router();

// Login route (open)
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  console.log('Login attempt - username:', username);
  try {
    const [users] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    if (users.length === 0) {
      console.log('User not found:', username);
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('Password mismatch for:', username);
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, branch: user.branch },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    console.log('Login successful:', username);
    res.json({
      token,
      user: { id: user.id, username: user.username, role: user.role, branch: user.branch }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Register route (secured for ceo, manager)
router.post('/register', authenticate(['ceo', 'manager']), async (req, res) => {
  const { username, password, role, branch } = req.body;
  console.log('Register attempt - username:', username, 'role:', role);
  try {
    // Validate input
    if (!username || !password || !role || !branch) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (!['sales_agent', 'manager', 'ceo'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if user exists
    const [existing] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    if (existing.length > 0) {
      console.log('User already exists:', username);
      return res.status(400).json({ error: 'Username already taken' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    await pool.query(
      'INSERT INTO users (username, password, role, branch) VALUES (?, ?, ?, ?)',
      [username, hashedPassword, role, branch]
    );

    console.log('User registered:', username);
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
