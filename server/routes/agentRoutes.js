const express = require('express');
const router = express.Router();
const { runDetection } = require('../services/detectionEngine');
const { processBatch } = require('../services/actionExecutor');

// Runs the full pipeline: detect at-risk items -> agent decides -> execute -> log
router.post('/run', async (req, res) => {
  try {
    const { limit } = req.body; // optional: process only top N items (useful for testing / rate limits)

    const detectionReport = await runDetection();
    const itemsToProcess = limit ? detectionReport.items.slice(0, limit) : detectionReport.items;

    const batchResult = await processBatch(itemsToProcess);

    res.json({
      detectionSummary: {
        totalAtRisk: detectionReport.totalAtRisk,
        totalItemsFlagged: detectionReport.totalItemsFlagged,
      },
      batchResult,
    });
  } catch (err) {
    console.error('Agent run failed:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;