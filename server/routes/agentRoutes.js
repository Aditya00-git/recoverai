const express = require('express');
const router = express.Router();
const { runDetection } = require('../services/detectionEngine');
const { processBatch } = require('../services/actionExecutor');
const { simulateScenario } = require('../services/agentDecision');
const RecoveryAction = require('../models/RecoveryAction');
const AuditLog = require('../models/AuditLog');
const Transaction = require('../models/Transaction');
const Invoice = require('../models/Invoice');
const Checkout = require('../models/Checkout');

// Runs the full pipeline on real DB items
router.post('/run', async (req, res) => {
  try {
    const { limit } = req.body;

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

// LIVE SIMULATOR: Ephemeral single-scenario analysis (does not alter DB metrics)
router.post('/simulate', async (req, res) => {
  try {
    const { scenario } = req.body;
    if (!scenario || !scenario.trim()) {
      return res.status(400).json({ error: 'Scenario text is required' });
    }

    const result = await simulateScenario(scenario);
    res.json(result);
  } catch (err) {
    console.error('Simulation route error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ESCALATION CENTER: Fetch all pending items needing human judgment
router.get('/escalations', async (req, res) => {
  try {
    const pendingActions = await RecoveryAction.find({
      actionType: 'escalate_human',
      outcome: 'pending',
    }).sort({ executedAt: -1 }).lean();

    const enriched = await Promise.all(
      pendingActions.map(async (action) => {
        let details = null;
        if (action.targetType === 'transaction' || action.targetType === 'subscription') {
          details = await Transaction.findById(action.targetId).lean();
        } else if (action.targetType === 'invoice') {
          details = await Invoice.findById(action.targetId).lean();
        } else if (action.targetType === 'checkout') {
          details = await Checkout.findById(action.targetId).lean();
        }
        return {
          ...action,
          targetDetails: details || { amount: 0, customerId: 'Unknown' },
        };
      })
    );

    res.json(enriched);
  } catch (err) {
    console.error('Failed to fetch escalations:', err);
    res.status(500).json({ error: err.message });
  }
});

// ESCALATION CENTER: Human operator resolves an escalated item
router.post('/escalations/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution, customNotes } = req.body;

    const action = await RecoveryAction.findById(id);
    if (!action) {
      return res.status(404).json({ error: 'Recovery action not found' });
    }

    let amount = 0;
    if (action.targetType === 'transaction' || action.targetType === 'subscription') {
      const tx = await Transaction.findById(action.targetId);
      amount = tx?.amount || 0;
      if (resolution !== 'write_off') await Transaction.findByIdAndUpdate(action.targetId, { status: 'captured' });
    } else if (action.targetType === 'invoice') {
      const inv = await Invoice.findById(action.targetId);
      amount = inv?.amount || 0;
      if (resolution !== 'write_off') await Invoice.findByIdAndUpdate(action.targetId, { status: 'paid' });
    } else if (action.targetType === 'checkout') {
      const ck = await Checkout.findById(action.targetId);
      amount = ck?.cartValue || 0;
      if (resolution !== 'write_off') await Checkout.findByIdAndUpdate(action.targetId, { status: 'completed' });
    }

    let newOutcome = 'success';
    let amountRecovered = amount;

    if (resolution === 'write_off') {
      newOutcome = 'failed';
      amountRecovered = 0;
    } else if (resolution === 'approve_incentive') {
      amountRecovered = Math.round(amount * 0.95);
      newOutcome = 'success';
    } else if (resolution === 'force_retry') {
      amountRecovered = amount;
      newOutcome = 'success';
    }

    action.outcome = newOutcome;
    action.amountRecovered = amountRecovered;
    action.reasoning = `${action.reasoning} | [HUMAN RESOLVED]: ${resolution.replace('_', ' ')}${customNotes ? ` (${customNotes})` : ''}`;
    await action.save();

    await AuditLog.create({
      recoveryActionId: action._id,
      event: 'human_resolution_applied',
      details: {
        resolution,
        resolvedBy: 'finance_operator_demo',
        amountRecovered,
        notes: customNotes || 'Manual human operator override',
      },
    });

    res.json({ success: true, action });
  } catch (err) {
    console.error('Failed to resolve escalation:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;