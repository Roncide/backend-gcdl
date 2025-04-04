const express = require('express');
const router = express.Router();
const Procurement = require('../models/procurement');
const auth = require('../middleware/auth');

router.post('/', auth, (req, res) => {
    const procurementData = { ...req.body, branch: req.user.branch };
    Procurement.create(procurementData, (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: 'Procurement recorded successfully' });
    });
});

router.get('/', auth, (req, res) => {
    Procurement.getAll(req.user.branch, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

module.exports = router;