const express = require('express');
const router = express.Router();
const Sale = require('../models/sale');
const Stock = require('../models/stock');
const auth = require('../middleware/auth');

router.post('/', auth, async (req, res) => {
    try {
        // Basic validation
        const requiredFields = ['produce_name', 'tonnage', 'amount_paid', 'buyer_name', 'sales_agent', 'date', 'buyer_contact'];
        for (const field of requiredFields) {
            if (!req.body[field]) {
                return res.status(400).json({ error: `Missing required field: ${field}` });
            }
        }

        // Validate numeric fields
        if (isNaN(req.body.tonnage) || isNaN(req.body.amount_paid)) {
            return res.status(400).json({ error: 'Tonnage and amount_paid must be numbers' });
        }

        if (!/^\d{10}$/.test(req.body.buyer_contact)) {
            return res.status(400).json({ error: 'Buyer contact must be a 10-digit phone number' });
        }

        const saleData = { ...req.body, branch: req.user.branch };

        // Start transaction
        db.beginTransaction((err) => {
            if (err) throw err;

            // Check stock availability
            Stock.getStock(saleData.branch, (err, stockResults) => {
                if (err) {
                    return db.rollback(() => res.status(500).json({ error: err.message }));
                }

                const stockItem = stockResults.find(item => item.produce_name === saleData.produce_name);
                if (!stockItem || stockItem.tonnage < saleData.tonnage) {
                    return db.rollback(() => res.status(400).json({ error: 'Insufficient stock' }));
                }

                Sale.create(saleData, (err, result) => {
                    if (err) {
                        return db.rollback(() => res.status(500).json({ error: err.message }));
                    }

                    Stock.updateStockFromSale(saleData, (err, stockResult) => {
                        if (err || stockResult.affectedRows === 0) {
                            return db.rollback(() => res.status(500).json({ error: 'Failed to update stock' }));
                        }

                        db.commit((err) => {
                            if (err) {
                                return db.rollback(() => res.status(500).json({ error: err.message }));
                            }
                            res.status(201).json({ message: 'Sale recorded and stock updated successfully' });
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
    Sale.getAll(req.user.branch, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

module.exports = router;