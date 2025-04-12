const express = require('express');
const router = express.Router();
const Stock = require('../models/stock');
const auth = require('../middleware/auth');

router.get('/', auth, (req, res) => {
    Stock.getStock(req.user.branch, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

module.exports = router;