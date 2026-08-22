const express = require('express');
const router = express.Router();
const { runDetection } = require('../services/detectionEngine');

router.get('/', async (req, res) => {
  try {
    const report = await runDetection();
    res.json(report);
  } catch (err) {
    console.error('Detection failed:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;