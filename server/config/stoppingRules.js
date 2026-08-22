// These are HARD LIMITS enforced in code, not suggestions to the LLM.
// The agent's decision is checked against these BEFORE and AFTER — it cannot override them.
// This is what makes the system "bounded and gated" as required by the brief.

module.exports = {
  MAX_RETRY_ATTEMPTS: 3,           // never retry a failed payment more than 3 times
  COOLDOWN_HOURS_BETWEEN_ATTEMPTS: 6, // wait at least 6h between recovery attempts on same target
  MAX_CONTACT_ATTEMPTS: 3,          // never message the same customer more than 3 times for one issue
  MIN_AMOUNT_FOR_ACTION: 10000,     // paise (₹100) — skip tiny amounts, not worth the friction/cost
};