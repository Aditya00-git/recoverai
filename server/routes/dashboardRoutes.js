const express = require('express');
const router = express.Router();
const { getDashboardSummary } = require('../services/dashboardService');

router.get('/summary', async (req, res) => {
  try {
    const summary = await getDashboardSummary();
    res.json(summary);
  } catch (err) {
    console.error('Dashboard summary failed:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;