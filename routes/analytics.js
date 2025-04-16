const express = require('express');
const pool = require('../config/db');
const authenticate = require('../middleware/auth');
const router = express.Router();

router.get('/', authenticate(['ceo', 'manager', 'sales_agent']), async (req, res) => {
  const { branch } = req.query;
  console.log('Analytics attempt - user:', req.user.username, 'role:', req.user.role, 'branch:', branch || req.user.branch);

  try {
    // Allow CEO to see analytics for all branches
    const isCeo = req.user.role === 'ceo';
    const branchFilter = isCeo ? '' : 'WHERE branch = ?';
    const params = isCeo ? [] : [branch || req.user.branch];

    // Total Sales by Produce
    const [totalSales] = await pool.query(`
      SELECT produce_name, branch, SUM(tonnage) as total_tonnage, SUM(amount_paid) as total_revenue
      FROM sales
      ${branchFilter}
      GROUP BY produce_name, branch
    `, params);

    // Stock Levels (Procurements - Sales)
    const [stockLevels] = await pool.query(`
      SELECT p.produce_name, p.branch,
             (SUM(p.tonnage) - COALESCE(SUM(s.tonnage), 0)) as available_tonnage
      FROM procurements p
      LEFT JOIN sales s ON p.produce_name = s.produce_name AND p.branch = s.branch
      ${branchFilter}
      GROUP BY p.produce_name, p.branch
      HAVING available_tonnage > 0
    `, params);

    // Sales Trend (Last 30 Days)
    const [salesTrend] = await pool.query(`
      SELECT DATE(s.date) as sale_date, SUM(s.tonnage) as total_tonnage, SUM(s.amount_paid) as total_revenue
      FROM sales s
      ${branchFilter}
      WHERE s.date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY DATE(s.date)
      ORDER BY sale_date
    `, params);

    const result = {
      totalSales,
      stockLevels,
      salesTrend
    };

    console.log('Analytics fetched - data:', result);
    res.json(result);
  } catch (err) {
    console.error('Analytics fetch error:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

module.exports = router;
