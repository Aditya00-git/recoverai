const RecoveryAction = require('../models/RecoveryAction');
const AuditLog = require('../models/AuditLog');
const { runDetection } = require('./detectionEngine');

async function getDashboardSummary() {
  // Re-run detection to get the current total at-risk figure (live, not stale)
  const detectionReport = await runDetection();

  // Pull all recovery actions taken so far
  const allActions = await RecoveryAction.find({}).sort({ executedAt: -1 }).lean();

  const totalRecovered = allActions.reduce((sum, a) => sum + (a.amountRecovered || 0), 0);
  const successCount = allActions.filter((a) => a.outcome === 'success').length;
  const failedCount = allActions.filter((a) => a.outcome === 'failed').length;
  const pendingCount = allActions.filter((a) => a.outcome === 'pending').length;
  const stoppedCount = allActions.filter((a) => a.outcome === 'stopped_by_rule').length;

  const recoveryRate = allActions.length > 0
    ? parseFloat(((successCount / allActions.length) * 100).toFixed(1))
    : 0;

  // Breakdown by action type — how many times each action was chosen, and how often it succeeded
  const actionTypeBreakdown = {};
  for (const action of allActions) {
    if (!actionTypeBreakdown[action.actionType]) {
      actionTypeBreakdown[action.actionType] = { total: 0, success: 0, recovered: 0 };
    }
    actionTypeBreakdown[action.actionType].total += 1;
    if (action.outcome === 'success') {
      actionTypeBreakdown[action.actionType].success += 1;
      actionTypeBreakdown[action.actionType].recovered += action.amountRecovered || 0;
    }
  }

  // Funnel stages: detected -> action taken -> recovered
  const funnel = {
    detected: detectionReport.totalItemsFlagged,
    actionTaken: allActions.length,
    recovered: successCount,
  };

  // Recent audit trail — last 30 events, most recent first, for the dashboard table
  const recentAuditLogs = await AuditLog.find({})
    .sort({ timestamp: -1 })
    .limit(30)
    .lean();

  return {
    headline: {
      totalAtRisk: detectionReport.totalAtRisk,
      totalRecovered,
      recoveryRate,
      itemsProcessed: allActions.length,
      itemsFlagged: detectionReport.totalItemsFlagged,
      pendingEscalated: pendingCount,
    },
    outcomeBreakdown: {
      success: successCount,
      failed: failedCount,
      pending: pendingCount,
      stoppedByRule: stoppedCount,
    },
    actionTypeBreakdown,
    funnel,
    recentAuditLogs,
    recentActions: allActions.slice(0, 30), // most recent 30 for the audit table
  };
}

module.exports = { getDashboardSummary };