const express = require('express');
const pool = require('../config/db');
const authenticate = require('../middleware/auth');
const router = express.Router();

router.get('/', authenticate(['ceo', 'manager', 'sales_agent']), async (req, res) => {
  try {
    const { branch } = req.query;
    const query = req.user.role === 'ceo' && !branch
      ? `
        SELECT produce_name, branch, SUM(tonnage) as tonnage
        FROM procurements
        GROUP BY produce_name, branch
      `
      : `
        SELECT produce_name, branch, SUM(tonnage) as tonnage
        FROM procurements
        WHERE branch = ?
        GROUP BY produce_name, branch
      `;
    const params = branch && req.user.role === 'ceo' ? [branch] : [req.user.branch];
    const [stock] = await pool.query(query, req.user.role === 'ceo' && !branch ? [] : params);
    console.log('Stock fetched - user:', req.user.username, 'branch:', branch || req.user.branch);
    res.json(stock);
  } catch (err) {
    console.error('Stock fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
