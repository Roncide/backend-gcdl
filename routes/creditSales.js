const express = require('express');
const router = express.Router();
const CreditSale = require('../models/creditSale');
const Stock = require('../models/stock');
const auth = require('../middleware/auth');
const db = require('../config/db');

router.post('/', auth, async (req, res) => {
  try {
    const requiredFields = ['produce_name', 'tonnage', 'amount_due', 'buyer_name', 'national_id', 'location', 'due_date', 'sales_agent', 'date', 'buyer_contact'];
    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({ error: `Missing required field: ${field}` });
      }
    }
    const creditSaleData = { ...req.body, branch: req.user.branch };

    db.beginTransaction((err) => {
      if (err) throw err;
      CreditSale.create(creditSaleData, (err, result) => {
        if (err) {
          return db.rollback(() => res.status(500).json({ error: err.message }));
        }
        Stock.updateStockFromSale(creditSaleData, (err, stockResult) => {
          if (err || stockResult.affectedRows === 0) {
            return db.rollback(() => res.status(400).json({ error: 'Insufficient stock' }));
          }
          db.commit((err) => {
            if (err) {
              return db.rollback(() => res.status(500).json({ error: err.message }));
            }
            res.status(201).json({ message: 'Credit sale recorded and stock updated successfully' });
          });
        });
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/', auth, (req, res) => {
  const branch = req.user.role === 'ceo' ? '%' : req.user.branch;
  CreditSale.getAll(branch, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

router.get('/overdue', auth, (req, res) => {
  const branch = req.user.role === 'ceo' ? '%' : req.user.branch;
  CreditSale.getOverdue(branch, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

module.exports = router;
