// Using direct REST calls instead of the @google/generative-ai SDK —
// the SDK was misrouting newer model names (404s) even though the models
// are confirmed available via the API's own /models listing endpoint.

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = 'gemini-3.5-flash-lite';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// The BOUNDED menu of actions the agent is allowed to choose from.
// This must exactly match the enum in RecoveryAction.js — the agent cannot invent new actions.
const ALLOWED_ACTIONS = ['retry_payment', 'send_reminder', 'offer_incentive', 'escalate_human', 'no_action'];

function buildPrompt(item) {
  return `You are a revenue recovery agent for an Indian payments company. You will be given ONE at-risk revenue item and must decide the single best recovery action AND draft the message if applicable.

ITEM DETAILS:
- Type: ${item.type}
- Amount: ₹${(item.amount / 100).toFixed(2)}
- Recovery bucket (pre-classified): ${item.recoveryBucket}
- Reason (if payment failure): ${item.errorReason || 'N/A'}
- Method used: ${item.method || 'N/A'}
- Is subscription: ${item.isSubscription || false}
- Priority score: ${item.priorityScore}
- Created: ${item.createdAt}

ALLOWED ACTIONS (you MUST pick exactly one of these, nothing else):
- "retry_payment": attempt the payment again (only sensible for failed payments with transient/recoverable reasons)
- "send_reminder": send a message nudging the customer to complete payment (good for abandoned checkouts or when retry alone won't help)
- "offer_incentive": send a reminder WITH a small incentive (only for higher-value items where it's worth the cost)
- "escalate_human": flag for manual human review (use when the failure reason is unclear, high-risk, or doesn't fit clean automation)
- "no_action": do nothing (use if amount is too small to justify any action, or recovery is unlikely)

MESSAGE DRAFTING RULES (only when actionType is "send_reminder" or "offer_incentive" — otherwise messageDraft is empty string, channel "none"):
- For consumer items: short, natural Hinglish WhatsApp copy (<40 words, channel: "whatsapp").
- For B2B invoice items: professional English email (<60 words, channel: "email").

Respond with ONLY valid JSON, no markdown, in exactly this shape:
{"actionType": "one_of_the_allowed_actions", "reasoning": "one or two sentence explanation", "messageDraft": "message text or empty", "channel": "whatsapp|email|none"}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGemini(prompt) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const errMsg = data.error?.message || `HTTP ${response.status}`;
    const err = new Error(errMsg);
    err.status = response.status;
    throw err;
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('No text in Gemini response: ' + JSON.stringify(data).slice(0, 200));
  }

  return text.trim();
}

async function decideAction(item, retryCount = 0) {
  const MAX_RETRIES = 2;

  try {
    const prompt = buildPrompt(item);
    const rawText = await callGemini(prompt);
    const cleanText = rawText.replace(/```json|```/g, '').trim();
    const decision = JSON.parse(cleanText);

    if (!ALLOWED_ACTIONS.includes(decision.actionType)) {
      console.warn(`Gemini returned invalid action "${decision.actionType}", defaulting to escalate_human`);
      return {
        actionType: 'escalate_human',
        reasoning: `Agent returned an invalid action type — auto-escalated for safety. Raw response: ${decision.actionType}`,
        messageDraft: '',
        channel: 'none',
      };
    }

    const hasMessage = decision.actionType === 'send_reminder' || decision.actionType === 'offer_incentive';

    return {
      actionType: decision.actionType,
      reasoning: decision.reasoning || 'No reasoning provided by agent.',
      messageDraft: hasMessage ? (decision.messageDraft || '') : '',
      channel: hasMessage ? (decision.channel || 'whatsapp') : 'none',
    };
  } catch (err) {
    const isRateLimit = err.status === 429;

    if (isRateLimit && retryCount < MAX_RETRIES) {
      const waitMs = 3000 * (retryCount + 1);
      console.warn(`Rate limited, retrying in ${waitMs / 1000}s... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      await sleep(waitMs);
      return decideAction(item, retryCount + 1);
    }

    console.error('Agent decision failed:', err.message);
    return {
      actionType: 'escalate_human',
      reasoning: `Agent call failed (${err.message.slice(0, 150)}) — auto-escalated for safety.`,
      messageDraft: '',
      channel: 'none',
    };
  }
}

function buildBatchPrompt(items) {
  const itemBlocks = items.map((item, i) => {
    if (item.type === 'overdue_invoice') {
      return `
ITEM ${i + 1} (B2B OVERDUE INVOICE):
- Client: ${item.customerId} (${item.clientTier} tier)
- Invoice: ${item.invoiceNumber}
- Amount: ₹${(item.amount / 100).toFixed(2)}
- Days overdue: ${item.daysOverdue}
- Aging bucket: ${item.agingBucket}
- Pre-classified escalation stage: ${item.recoveryBucket}
- Priority score: ${item.priorityScore}
IMPORTANT: This is a B2B receivable, NOT a payment failure. "retry_payment" is NOT a valid choice for this item — there is no payment attempt to retry, only an unpaid invoice to chase.`;
    }

    return `
ITEM ${i + 1}:
- Type: ${item.type}
- Amount: ₹${(item.amount / 100).toFixed(2)}
- Recovery bucket (pre-classified): ${item.recoveryBucket}
- Reason (if payment failure): ${item.errorReason || 'N/A'}
- Method used: ${item.method || 'N/A'}
- Is subscription: ${item.isSubscription || false}
- Priority score: ${item.priorityScore}`;
  }).join('\n');

  return `You are a revenue recovery agent for an Indian payments company. You will be given MULTIPLE at-risk revenue items — these may be consumer payment failures, abandoned checkouts, OR overdue B2B invoices. For EACH item, decide the single best recovery action AND, if the action involves contacting someone, draft the actual message.

${itemBlocks}

ALLOWED ACTIONS (you MUST pick exactly one per item, nothing else):
- "retry_payment": attempt the payment again (ONLY for failed consumer payments with transient/recoverable reasons — NEVER for overdue invoices)
- "send_reminder": nudge the customer/client to complete payment. For invoices in "gentle_nudge" stage, this is a polite payment chaser.
- "offer_incentive": reminder WITH a small incentive. For invoices, this can mean an early-payment discount offer instead of a monetary incentive.
- "escalate_human": flag for manual human review. For invoices in "finance_head_escalation" or "formal_notice" stages, this is usually correct — B2B collections at that stage need human judgment, not automation.
- "no_action": do nothing (amount too small, or recovery unlikely)

RULES:
- Never choose "retry_payment" for "invalid_otp" or for any "overdue_invoice" type item
- For invoices in the "formal_notice" aging bucket (30+ days overdue), strongly prefer "escalate_human" — sending automated formal notices to B2B clients without human review is risky
- For invoices in "gentle_nudge" bucket, "send_reminder" is usually right unless the amount is very high, in which case consider "escalate_human" for a more personal touch
- Prefer "escalate_human" over guessing when the reason is unclear
- Be conservative: financial actions should be explainable and safe

MESSAGE DRAFTING RULES (only when actionType is "send_reminder" or "offer_incentive" — otherwise leave messageDraft as an empty string and channel as "none"):
- For consumer items (failed_payment, abandoned_checkout): write a short, warm WhatsApp-style message in natural Hinglish (mix of Hindi and English, like how Indian businesses actually message customers — e.g. "Hi! Aapka payment complete nahi hua tha..."). Keep it under 40 words. Set channel to "whatsapp".
- For overdue_invoice items: write a short, professional B2B email body (formal English, mention invoice number and amount, polite but clear about the due date). Keep it under 60 words. Set channel to "email".
- Never invent discount percentages or specific numbers not implied by the item data — keep incentive language generic (e.g. "a small discount") unless the amount clearly supports a specific figure.

Respond with ONLY a valid JSON array, no markdown, no explanation outside the JSON, with exactly ${items.length} objects in the SAME ORDER as the items above, in exactly this shape:
[{"index": 1, "actionType": "...", "reasoning": "one sentence", "messageDraft": "...", "channel": "whatsapp|email|none"}, ...]`;
}

async function decideBatch(items, retryCount = 0) {
  const MAX_RETRIES = 2;

  try {
    const prompt = buildBatchPrompt(items);
    const rawText = await callGemini(prompt);
    const cleanText = rawText.replace(/```json|```/g, '').trim();
    const decisions = JSON.parse(cleanText);

    if (!Array.isArray(decisions)) {
      throw new Error('Batch response was not an array');
    }

    // Map back to items in order, validating each independently
    return items.map((item, i) => {
      const decision = decisions.find((d) => d.index === i + 1) || decisions[i];

      if (!decision || !ALLOWED_ACTIONS.includes(decision.actionType)) {
        return {
          actionType: 'escalate_human',
          reasoning: 'Agent returned an invalid or missing decision for this item — auto-escalated for safety.',
          messageDraft: '',
          channel: 'none',
        };
      }

      const hasMessage = decision.actionType === 'send_reminder' || decision.actionType === 'offer_incentive';

      return {
        actionType: decision.actionType,
        reasoning: decision.reasoning || 'No reasoning provided by agent.',
        messageDraft: hasMessage ? (decision.messageDraft || '') : '',
        channel: hasMessage ? (decision.channel || 'whatsapp') : 'none',
      };
    });
  } catch (err) {
    const isRateLimit = err.status === 429;

    if (isRateLimit && retryCount < MAX_RETRIES) {
      const waitMs = 5000 * (retryCount + 1);
      console.warn(`Batch rate limited, retrying in ${waitMs / 1000}s...`);
      await sleep(waitMs);
      return decideBatch(items, retryCount + 1);
    }

    console.error('Batch decision failed:', err.message);
    // Fail safe: escalate the ENTIRE batch rather than guess
    return items.map(() => ({
      actionType: 'escalate_human',
      reasoning: `Batch agent call failed (${err.message.slice(0, 120)}) — auto-escalated for safety.`,
      messageDraft: '',
      channel: 'none',
    }));
  }
}

// ---- LIVE SCENARIO SIMULATOR (EPHEMERAL) ----
function buildSimulatorPrompt(scenarioText) {
  return `You are RecoverAI, an autonomous revenue recovery agent for an Indian payments platform.
You are given a raw natural language scenario describing a payment failure, checkout drop-off, or overdue invoice.

SCENARIO:
"${scenarioText}"

TASK:
1. Parse and extract key entities (type: failed_payment | abandoned_checkout | overdue_invoice | failed_subscription, amount in INR, method, failure reason, client/customer context).
2. Check stopping rules: Is amount < ₹100? Is it un-retryable (like invalid OTP)?
3. Decide the single best recovery action from the bounded menu:
   - "retry_payment" (only for recoverable consumer payment failures, NEVER for invoices or invalid OTP)
   - "send_reminder" (polite nudge for abandoned checkouts or early-stage overdue invoices)
   - "offer_incentive" (for higher-value carts or early-payment invoice discounts)
   - "escalate_human" (for high-risk, formal notice invoices, large disputed amounts, or unclear reasons)
   - "no_action" (if amount < ₹100 or recovery impossible)
4. Provide concise explainability reasoning.
5. If action is "send_reminder" or "offer_incentive":
   - For consumer items: draft a warm, natural Hinglish WhatsApp message (<40 words, channel: "whatsapp").
   - For B2B invoices: draft a formal English email body (<60 words, channel: "email").
   Otherwise: messageDraft: "", channel: "none".
6. Estimate expected recovery chance (e.g. 75%).

Respond with ONLY valid JSON, no markdown codeblocks, in exactly this shape:
{
  "parsed": {
    "type": "failed_payment",
    "amountRupees": 45000,
    "method": "Netbanking",
    "detectedIssue": "Bank timeout during 2 AM off-peak transaction"
  },
  "guardrailStatus": "Passed stopping rules",
  "actionType": "retry_payment",
  "reasoning": "Transient gateway timeout is safe to retry automatically.",
  "messageDraft": "",
  "channel": "none",
  "recoveryChance": "70%"
}`;
}

async function simulateScenario(scenarioText) {
  try {
    const prompt = buildSimulatorPrompt(scenarioText);
    const rawText = await callGemini(prompt);
    const cleanText = rawText.replace(/```json|```/g, '').trim();
    const result = JSON.parse(cleanText);

    if (!ALLOWED_ACTIONS.includes(result.actionType)) {
      result.actionType = 'escalate_human';
      result.reasoning = 'Agent returned unknown action — defaulted to human escalation.';
    }

    return result;
  } catch (err) {
    console.error('Simulator failed:', err);
    return {
      parsed: { type: 'unknown', amountRupees: 0, method: 'N/A', detectedIssue: 'Parsing failed' },
      guardrailStatus: 'Error during analysis',
      actionType: 'escalate_human',
      reasoning: `AI simulation failed (${err.message.slice(0, 100)}) — routed to manual review.`,
      messageDraft: '',
      channel: 'none',
      recoveryChance: '0%',
    };
  }
}

module.exports = { decideAction, decideBatch, simulateScenario, ALLOWED_ACTIONS };