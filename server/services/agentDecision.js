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
  return `You are a revenue recovery agent for an Indian payments company. You will be given ONE at-risk revenue item and must decide the single best recovery action.

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

RULES:
- Never choose "retry_payment" for "invalid_otp" reason (can't silently retry, needs fresh user input — use "send_reminder" instead)
- Never choose "retry_payment" more than once conceptually — assume the system already enforces retry limits separately, just pick the best NEXT action
- Prefer "escalate_human" over guessing when the reason is unclear or unusual
- Be conservative: financial actions should be explainable and safe, not aggressive

Respond with ONLY valid JSON, no markdown, no explanation outside the JSON, in exactly this shape:
{"actionType": "one_of_the_allowed_actions", "reasoning": "one or two sentence explanation"}`;
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

    // Strip markdown code fences if Gemini wraps the JSON in them despite instructions
    const cleanText = rawText.replace(/```json|```/g, '').trim();

    const decision = JSON.parse(cleanText);

    // VALIDATION: never trust the LLM output blindly — enforce the bounded action list ourselves
    if (!ALLOWED_ACTIONS.includes(decision.actionType)) {
      console.warn(`Gemini returned invalid action "${decision.actionType}", defaulting to escalate_human`);
      return {
        actionType: 'escalate_human',
        reasoning: `Agent returned an invalid action type — auto-escalated for safety. Raw response: ${decision.actionType}`,
      };
    }

    return {
      actionType: decision.actionType,
      reasoning: decision.reasoning || 'No reasoning provided by agent.',
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
    };
  }
}

module.exports = { decideAction, ALLOWED_ACTIONS };