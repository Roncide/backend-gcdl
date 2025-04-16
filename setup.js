const db = require('./config/db');
const bcrypt = require('bcryptjs');

async function setup() {
  try {
    const username = 'ceo1';
    const password = await bcrypt.hash('ceo123', 10);
    const role = 'ceo';
    const branch = 'HQ';

    db.query(
      'INSERT IGNORE INTO users (username, password, role, branch) VALUES (?, ?, ?, ?)',
      [username, password, role, branch],
      (err, result) => {
        if (err) throw err;
        console.log('Initial CEO user created');
        db.end();
      }
    );
  } catch (error) {
    console.error('Error setting up:', error);
    db.end();
  }
}

setup();