# 🛡️ RecoverAI — Autonomous AI Revenue Recovery Agent

> **Find revenue that’s slipping away and win it back.**  
> An autonomous, bounded, and explainable AI agent that detects revenue at risk, determines the right intervention, and executes a compliant recovery workflow across payment degradation, checkout drop-offs, recurring subscriptions, and overdue B2B receivables.

---

## 📌 Table of Contents
- [The Problem & Why Now](#-the-problem--why-now)
- [Key Features Built & Verified](#-key-features-built--verified)
- [Architecture & Pipeline Flow](#-architecture--pipeline-flow)
- [Tech Stack](#-tech-stack)
- [Financial Ledger Dashboard](#-financial-ledger-dashboard)
- [Safety, Compliance & Stopping Rules](#-safety-compliance--stopping-rules)
- [Getting Started & Local Setup](#-getting-started--local-setup)
- [Live Demo Walkthrough](#-live-demo-walkthrough)
- [Future Roadmap (Real-World SaaS Expansion)](#-future-roadmap-real-world-saas-expansion)

---

## 💡 The Problem & Why Now

Revenue loss rarely happens in one clean step. A payment degrades due to transient gateway latency, a cart gets abandoned after an OTP timeout, a subscription mandate fails because of balance mismatch on the 28th, or an enterprise invoice ages past Net 30.

Historically, recovery has been either **dumb & aggressive** (spamming retry attempts that trigger card locks and customer churn) or **completely manual** (finance teams manually chasing overdue invoices).

**RecoverAI closes the loop**: from autonomous multi-vector detection and root-cause diagnosis to bounded intervention, Hinglish customer messaging, human-in-the-loop escalation, and an immutable financial audit trail.

---

## 🌟 Key Features Built & Verified

### 1. 🔍 Multi-Vector Revenue Leakage Detection
* **Consumer Payment Degradation**: Detects failures with deep gateway error taxonomy (`bank_timeout`, `card_declined`, `insufficient_funds`, `invalid_otp`, `payment_cancelled`).
* **Checkout Drop-off Recovery**: Flags abandoned carts with $\ge 30\text{ min}$ inactivity.
* **Recurring Subscriptions & Mandates**: Differentiates recurring payments from one-time purchases and sequences smart retry windows (e.g. *1st of Month Salary Credit sync*, *T+24h Off-peak window*).
* **B2B Receivables Chaser**: Ingests Net 30 invoices and organizes them into aging ladders (`1–15 days gentle nudge`, `16–30 days finance escalation`, `30+ days formal notice`) with enterprise tier grace windows.
* **Dynamic Priority Scoring**: Scores every at-risk rupee using an amount-weighted, recency-decay formula.

### 2. 🤖 Bounded Agent Decision Engine (Gemini 3.5 Flash-Lite)
* Strictly bounded action menu:
  * `retry_payment` — Safe, automated silent retry for transient errors.
  * `send_reminder` — Warm, contextual nudge.
  * `offer_incentive` — Margin-conscious early-payment discount or checkout coupon.
  * `escalate_human` — Routes high-risk, large disputed, or formal notice cases to human operators.
  * `no_action` — Discards sub-threshold items to avoid customer friction.
* **Full Explainability**: Generates concise natural language reasoning for every decision.

### 3. 💬 Context-Aware Hinglish & English Message Generator
* **B2C Consumer Nudges**: Natural **Hinglish** WhatsApp copy ($<40$ words) formatted with authentic Indian conversational cues (*"Hi! Aapka payment complete nahi hua tha..."*).
* **B2B Receivables Emails**: Formal, professional **English** email drafts ($<60$ words) referencing invoice numbers and payment terms.
* **Interactive Previews**: Beautiful dark-mode WhatsApp green bubble and B2B letterhead modal visualizers.

### 4. 🛡️ Human-in-the-Loop Escalation Center
* Dedicated queue for edge cases flagged by the AI.
* Finance operators can resolve escalations with **1 click**:
  * 🟢 **Approve 5% Discount**: Recovers 95% of invoice value and confirms settlement.
  * 🟡 **Authorize Retry**: Overrides system boundaries with manual supervisor authorization.
  * 🔴 **Write Off**: Marks uncollectible debt as closed.
* All manual actions instantly log into the permanent audit trail.

### 5. 🧪 Live "Test a Scenario" Sandbox
* Ephemeral playground designed for live evaluations and demo pitches.
* Type freeform English or click preset scenarios (*e.g., "₹45,000 corporate purchase failed due to bank timeout at 2 AM"*).
* Gemini parses the entities, diagnoses the root cause, checks guardrails, selects the bounded action, and drafts the message live on screen—without polluting production database metrics.

---

## 🏗️ Architecture & Pipeline Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. DATA LAYER (MongoDB / Mongoose)                                     │
│    Transactions · Abandoned Checkouts · B2B Invoices · Razorpay Orders │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 2. DETECTION & SCORING ENGINE (detectionEngine.js)                     │
│    • Error Code Taxonomy Mapping  • Urgency & Recency Decay Formula    │
│    • Aging Ladders (1-15d / 16-30d / 30d+)  • Mandate Retry Scheduling │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 3. HARD STOPPING RULES BARRIER (stoppingRules.js)                      │
│    • Max 3 Retries  • 6hr Cooldown  • ₹100 Min Floor  • Unretryable Lock│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ (Pre-filtered items)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 4. AGENT DECISION & MESSAGE ENGINE (agentDecision.js)                  │
│    • Batched Gemini 3.5 Flash-Lite REST Pipeline                       │
│    • Bounded 5-Action Selection & Natural Language Reasoning           │
│    • Hinglish WhatsApp / English Email Generator                       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
         ┌──────────────────────────┴──────────────────────────┐
         ▼                                                     ▼
┌──────────────────────────────────┐        ┌──────────────────────────────────┐
│ 5. AUTOMATED EXECUTION           │        │ 6. HUMAN ESCALATION QUEUE        │
│    • Probabilistic outcome       │        │    • High-value & formal cases   │
│    • Amount recovered tally      │        │    • 1-Click human authorization │
└────────────────┬─────────────────┘        └─────────────────┬────────────────┘
                 │                                            │
                 └────────────────────┬───────────────────────┘
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 7. FINANCIAL LEDGER DASHBOARD (React 19 + Tailwind v4 + Chart.js)      │
│    • Animated Count-up KPIs (At Risk, Recovered, Rate %, Pending)      │
│    • Interactive Action Breakdown & Recovery Funnel Visualizers        │
│    • Live Audit Trail Table with "View Message →" Modal                │
│    • Ephemeral Live Scenario Sandbox                                   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 💻 Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend** | Node.js, Express 5, MongoDB, Mongoose, Google Gemini REST API (`gemini-3.5-flash-lite`), Razorpay Node SDK, dotenv |
| **Frontend** | React 19, Vite, Tailwind CSS v4, Framer Motion, Chart.js / react-chartjs-2, Axios |
| **Theme & UI** | "Financial Ledger" Dark Aesthetic (Palette: Ink `#0B0D12`, Paper `#EDE9E0`, Gold `#D4A24C`, Mint `#3FBF8F`, Rust `#E1654B`; Fonts: Fraunces Serif, IBM Plex Mono, Inter) |

---

## 🔒 Safety, Compliance & Stopping Rules

RecoverAI is built around hardcoded safety boundaries enforced in code *before* calling the LLM:

1. **Max Retry Limit**: Never retry any transaction more than 3 times to protect cardholder limits and prevent gateway bans.
2. **Cooldown Intervals**: Strict 6-hour minimum wait between recovery touches on the same target.
3. **Minimum Viable Floor**: Ignores amounts $< ₹100$ to prevent customer annoyance on trivial sums.
4. **Hard Error Protection**: Strictly forbids `retry_payment` on `invalid_otp` or B2B invoices.
5. **Fail-Safe Fallback**: If an API call fails or the LLM outputs an unexpected token, the system auto-escalates to human review rather than guessing.

---

## 🚀 Getting Started & Local Setup


### 1. Clone the Repository
```bash
git clone https://github.com/Aditya00-git/recoverai.git
cd recoverai
```

### 2. Backend Setup
```bash
cd server
npm install
```


Seed the database with realistic synthetic data:
```bash
npm run seed
```

Start the backend server:
```bash
npm run dev
```

### 3. Frontend Setup
In a new terminal:
```bash
cd client
npm install
npm run dev
```

Open your browser at `http://localhost:5173`.

---

## 🎬 Live Demo Walkthrough

1. **Run Batch Recovery**: Click **"Run Agent"** in the top right. Watch the animated headline metrics tally total revenue recovered, update recovery rates, and populate the recovery funnel.
2. **Inspect Explainability**: Scroll through the **Audit Trail** to see why the agent picked specific actions, along with mandate retry schedules (`🔄 T+24h / 1st of Month`).
3. **Preview Messages**: Click **"View Message →"** on any row to see the generated Hinglish WhatsApp copy or formal B2B email draft.
4. **Resolve Human Escalations**: If high-value items appear in the **Human Escalation Queue**, click **"Approve 5% Discount"** or **"Authorize Retry"** to resolve them live.
5. **Test the Live Sandbox**: Scroll to the **Live Scenario Sandbox**, click a preset chip (e.g. *₹45,000 corporate purchase failed due to bank timeout*), and watch the agent diagnose and draft the recovery response in real-time.

---

## 🗺️ Future Roadmap (Real-World SaaS Expansion)

To scale RecoverAI into an enterprise-grade standalone revenue cloud:

```
┌─────────────────────────┬─────────────────────────┬─────────────────────────┐
│ 1. Universal Connectors │ 2. Bank Uptime Radar    │ 3. 2-Way AI Negotiator  │
│ Shopify, WooCommerce,   │ Live NPCI / Bank switch │ Interactive WhatsApp &  │
│ Stripe, Cashfree, PayU, │ health telemetry with   │ AI voice agent to split │
│ Zoho Books, Tally Prime │ auto-switch routing.    │ payments into PTP plans.│
├─────────────────────────┼─────────────────────────┼─────────────────────────┤
│ 4. Smart Alternate Rails│ 5. Propensity Engine    │ 6. TRAI Compliance      │
│ Instant EMI / PayLater  │ ML model predicting who │ DND curfew (9 PM–9 AM)  │
│ (Simpl, LazyPay) &      │ needs a discount vs who │ queueing & RBI mandate  │
│ 1-click UPI deep links. │ converts with a nudge.  │ notification rules.     │
└─────────────────────────┴─────────────────────────┴─────────────────────────┘
```

* **Performance-Based Business Model**: Charge a 3%–7% success fee on found revenue, providing pure upside and zero financial risk to merchants.

---

## 👨‍💻 Team & Credits
Built by **Aditya**   
*RecoverAI — Autonomous AI Revenue Recovery.*

