const express = require('express');
const router = express.Router();
const CreditSale = require('../models/creditSale');
const Stock = require('../models/stock');
const auth = require('../middleware/auth');

router.post('/', auth, async (req, res) => {
    try {
        const requiredFields = ['produce_name', 'tonnage', 'amount_due', 'buyer_name', 'national_id', 'location', 'due_date', 'sales_agent', 'date', 'buyer_contact'];
        for (const field of requiredFields) {
            if (!req.body[field]) {
                return res.status(400).json({ error: `Missing required field: ${field}` });
            }
        }

        if (isNaN(req.body.tonnage) || isNaN(req.body.amount_due)) {
            return res.status(400).json({ error: 'Tonnage and amount_due must be numbers' });
        }

        if (!/^\d{10}$/.test(req.body.buyer_contact)) {
            return res.status(400).json({ error: 'Buyer contact must be a 10-digit phone number' });
        }

        const creditSaleData = { ...req.body, branch: req.user.branch };

        db.beginTransaction((err) => {
            if (err) throw err;

            Stock.getStock(creditSaleData.branch, (err, stockResults) => {
                if (err) {
                    return db.rollback(() => res.status(500).json({ error: err.message }));
                }

                const stockItem = stockResults.find(item => item.produce_name === creditSaleData.produce_name);
                if (!stockItem || stockItem.tonnage < creditSaleData.tonnage) {
                    return db.rollback(() => res.status(400).json({ error: 'Insufficient stock' }));
                }

                CreditSale.create(creditSaleData, (err, result) => {
                    if (err) {
                        return db.rollback(() => res.status(500).json({ error: err.message }));
                    }

                    Stock.updateStockFromSale(creditSaleData, (err, stockResult) => {
                        if (err || stockResult.affectedRows === 0) {
                            return db.rollback(() => res.status(500).json({ error: 'Failed to update stock' }));
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
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/', auth, (req, res) => {
    CreditSale.getAll(req.user.branch, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

router.get('/overdue', auth, (req, res) => {
    const currentDate = new Date().toISOString().split('T')[0];
    CreditSale.getOverdue(req.user.branch, currentDate, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

module.exports = router;