const express = require('express');
const pool = require('../config/db');
const authenticate = require('../middleware/auth');
const router = express.Router();

// Get procurements
router.get('/', authenticate(['ceo', 'manager', 'sales_agent']), async (req, res) => {
  try {
    const { branch } = req.query;
    const query = req.user.role === 'ceo' && !branch
      ? 'SELECT * FROM procurements ORDER BY date DESC'
      : 'SELECT * FROM procurements WHERE branch = ? ORDER BY date DESC';
    const params = branch && req.user.role === 'ceo' ? [branch] : [req.user.branch];
    const [procurements] = await pool.query(query, req.user.role === 'ceo' && !branch ? [] : params);
    console.log('Procurements fetched - user:', req.user.username, 'branch:', branch || req.user.branch);
    res.json(procurements);
  } catch (err) {
    console.error('Procurements fetch error:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to fetch procurements' });
  }
});

// Add procurement (stock)
router.post('/', authenticate(['ceo', 'manager']), async (req, res) => {
  const {
    produce_name,
    type,
    date,
    tonnage,
    cost,
    dealer_name,
    contact,
    selling_price,
    branch
  } = req.body;

  console.log('Procurement attempt - user:', req.user.username, 'data:', req.body);

  try {
    // Validate input
    if (!produce_name || !produce_name.trim()) {
      return res.status(400).json({ error: 'Produce name is required' });
    }
    if (!tonnage || isNaN(tonnage) || tonnage <= 0) {
      return res.status(400).json({ error: 'Valid tonnage is required' });
    }
    if (!cost || isNaN(cost) || cost < 0) {
      return res.status(400).json({ error: 'Valid cost is required' });
    }
    if (!branch || !branch.trim()) {
      return res.status(400).json({ error: 'Branch is required' });
    }
    if (req.user.role !== 'ceo' && branch !== req.user.branch) {
      return res.status(403).json({ error: 'Unauthorized to add stock for this branch' });
    }

    // Format date
    const formattedDate = date
      ? new Date(date).toISOString().slice(0, 19).replace('T', ' ')
      : new Date().toISOString().slice(0, 19).replace('T', ' ');

    // Insert procurement
    const [result] = await pool.query(
      'INSERT INTO procurements (produce_name, type, date, tonnage, cost, dealer_name, contact, selling_price, branch) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        produce_name.trim(),
        type || null,
        formattedDate,
        parseFloat(tonnage),
        parseFloat(cost),
        dealer_name ? dealer_name.trim() : null,
        contact ? contact.trim() : null,
        selling_price ? parseFloat(selling_price) : null,
        branch.trim()
      ]
    );

    console.log('Procurement added - id:', result.insertId, 'produce:', produce_name, 'branch:', branch);
    res.status(201).json({ message: 'Stock added successfully', id: result.insertId });
  } catch (err) {
    console.error('Procurement add error:', err.message, err.stack);
    if (err.code === 'ER_NO_SUCH_TABLE') {
      return res.status(500).json({ error: 'Procurements table does not exist' });
    }
    if (err.code === 'ER_BAD_FIELD_ERROR') {
      return res.status(500).json({ error: 'Invalid database schema' });
    }
    if (err.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD') {
      return res.status(400).json({ error: 'Invalid date format' });
    }
    res.status(500).json({ error: 'Failed to add stock' });
  }
});

module.exports = router;
