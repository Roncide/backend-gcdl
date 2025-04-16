// const express = require('express');
// const router = express.Router();
// const Sale = require('../models/sale');
// const Stock = require('../models/stock');
// const auth = require('../middleware/auth');
// const restrictTo = require('../middleware/restrictTo');
// const db = require('../config/db');

// router.post('/', auth, async (req, res) => {
//   try {
//     const requiredFields = ['produce_name', 'tonnage', 'amount_paid', 'buyer_name', 'sales_agent', 'date', 'buyer_contact'];
//     for (const field of requiredFields) {
//       if (!req.body[field]) {
//         return res.status(400).json({ error: `Missing required field: ${field}` });
//       }
//     }
//     const saleData = { ...req.body, branch: req.user.branch };

//     db.beginTransaction((err) => {
//       if (err) throw err;
//       Sale.create(saleData, (err, result) => {
//         if (err) {
//           return db.rollback(() => res.status(500).json({ error: err.message }));
//         }
//         Stock.updateStockFromSale(saleData, (err, stockResult) => {
//           if (err || stockResult.affectedRows === 0) {
//             return db.rollback(() => res.status(400).json({ error: 'Insufficient stock' }));
//           }
//           db.commit((err) => {
//             if (err) {
//               return db.rollback(() => res.status(500).json({ error: err.message }));
//             }
//             res.status(201).json({ message: 'Sale recorded and stock updated successfully' });
//           });
//         });
//       });
//     });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// router.get('/', auth, (req, res) => {
//   const branch = req.user.role === 'ceo' ? '%' : req.user.branch;
//   Sale.getAll(branch, (err, results) => {
//     if (err) return res.status(500).json({ error: err.message });
//     res.json(results);
//   });
// });

// module.exports = router;

const express = require('express');
const pool = require('../config/db');
const authenticate = require('../middleware/auth');
const router = express.Router();

// Get sales
router.get('/', authenticate(['ceo', 'manager', 'sales_agent']), async (req, res) => {
  try {
    const { branch } = req.query;
    const query = req.user.role === 'ceo' && !branch
      ? 'SELECT * FROM sales ORDER BY date DESC'
      : 'SELECT * FROM sales WHERE branch = ? ORDER BY date DESC';
    const params = branch && req.user.role === 'ceo' ? [branch] : [req.user.branch];
    const [sales] = await pool.query(query, req.user.role === 'ceo' && !branch ? [] : params);
    console.log('Sales fetched - user:', req.user.username, 'branch:', branch || req.user.branch);
    res.json(sales);
  } catch (err) {
    console.error('Sales fetch error:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to fetch sales' });
  }
});

// Add sale
router.post('/', authenticate(['sales_agent']), async (req, res) => {
  const {
    produce_name,
    tonnage,
    amount_paid,
    buyer_name,
    buyer_contact,
    date,
    sales_agent,
    branch
  } = req.body;

  console.log('Sales attempt - user:', req.user.username, 'role:', req.user.role, 'data:', req.body);

  try {
    // Validate input
    if (!produce_name || !produce_name.trim()) {
      return res.status(400).json({ error: 'Produce name is required' });
    }
    if (!tonnage || isNaN(tonnage) || tonnage <= 0) {
      return res.status(400).json({ error: 'Valid tonnage is required' });
    }
    if (!amount_paid || isNaN(amount_paid) || amount_paid < 0) {
      return res.status(400).json({ error: 'Valid amount paid is required' });
    }
    if (!branch || !branch.trim()) {
      return res.status(400).json({ error: 'Branch is required' });
    }
    if (branch !== req.user.branch) {
      console.log(`Unauthorized branch - user: ${req.user.username}, requested: ${branch}, allowed: ${req.user.branch}`);
      return res.status(403).json({ error: 'Unauthorized to add sale for this branch' });
    }
    if (sales_agent !== req.user.username) {
      console.log(`Unauthorized sales agent - user: ${req.user.username}, requested: ${sales_agent}`);
      return res.status(403).json({ error: 'Unauthorized sales agent' });
    }

    // Format date
    const formattedDate = date && !isNaN(new Date(date))
      ? new Date(date).toISOString().slice(0, 19).replace('T', ' ')
      : new Date().toISOString().slice(0, 19).replace('T', ' ');

    // Insert sale
    const [result] = await pool.query(
      'INSERT INTO sales (produce_name, tonnage, amount_paid, buyer_name, buyer_contact, date, sales_agent, branch) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        produce_name.trim(),
        parseFloat(tonnage),
        parseFloat(amount_paid),
        buyer_name ? buyer_name.trim() : null,
        buyer_contact ? buyer_contact.trim() : null,
        formattedDate,
        sales_agent,
        branch.trim()
      ]
    );

    console.log('Sale added - id:', result.insertId, 'produce:', produce_name, 'branch:', branch, 'user:', req.user.username);
    res.status(201).json({ message: 'Sale added successfully', id: result.insertId });
  } catch (err) {
    console.error('Sales add error:', {
      message: err.message,
      code: err.code,
      stack: err.stack
    });
    if (err.code === 'ER_NO_SUCH_TABLE') {
      return res.status(500).json({ error: 'Sales table does not exist' });
    }
    if (err.code === 'ER_BAD_FIELD_ERROR') {
      return res.status(500).json({ error: 'Invalid database schema' });
    }
    if (err.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD') {
      return res.status(400).json({ error: 'Invalid date format' });
    }
    res.status(500).json({ error: 'Failed to add sale' });
  }
});

module.exports = router;
