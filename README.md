# Antigravity: Financial Forensics Engine

> **RIFT 2026 Hackathon** — Graph Theory / Financial Crime Detection Track

A full-stack web application that detects money muling networks by modelling financial transactions as a directed graph and applying cycle detection, smurfing analysis, and layered chain traversal.

🔗 **Live Demo**: *[Your Vercel URL]*
📂 **Repository**: [github.com/Eklavvyaaaaa/Money_Muling](https://github.com/Eklavvyaaaaa/Money_Muling)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js, react-force-graph-2d, Axios, Custom CSS |
| Backend | Node.js, Express.js, csv-parser, Multer |
| Algorithms | DFS Cycle Detection, Sliding-Window Smurfing, BFS Chain Traversal |
| Deployment | Vercel (Frontend), Render (Backend) |

---

## System Architecture

```text
┌───────────────────────────────────────────────────┐
│                   React Client                    │
│  ┌─────────┐  ┌───────────┐  ┌───────────────┐   │
│  │ Upload  │  │ ForceGraph│  │ Results Table │   │
│  │Component│  │    2D     │  │    + Stats    │   │
│  └────┬────┘  └─────┬─────┘  └───────┬───────┘   │
│       │             │                │            │
│       └─────────────┴────────────────┘            │
│                     │  Axios                      │
└─────────────────────┼─────────────────────────────┘
                      │  HTTP
┌─────────────────────┼─────────────────────────────┐
│              Express.js Server                    │
│  ┌──────────────────┴───────────────────────┐     │
│  │           CSV Parser + Validator         │     │
│  └──────────────────┬───────────────────────┘     │
│  ┌──────────────────┴───────────────────────┐     │
│  │         FraudGraph Engine (graph.js)      │     │
│  │  ┌────────────┐ ┌─────────┐ ┌─────────┐  │     │
│  │  │   Cycle    │ │Smurfing │ │ Chain   │  │     │
│  │  │ Detection  │ │ Fan-in/ │ │Traversal│  │     │
│  │  │  (DFS)     │ │ Fan-out │ │  (BFS)  │  │     │
│  │  └────────────┘ └─────────┘ └─────────┘  │     │
│  │  ┌────────────────────────────────────┐   │     │
│  │  │   False-Positive Filter            │   │     │
│  │  │   (Merchant / Payroll Heuristics)  │   │     │
│  │  └────────────────────────────────────┘   │     │
│  └───────────────────────────────────────────┘     │
└────────────────────────────────────────────────────┘
```

---

## Algorithm Approach & Complexity Analysis

### 1. Cycle Detection (Circular Fund Routing)

**Objective**: Detect closed loops of length 3–5 (e.g., A → B → C → A).

**Algorithm**: Modified DFS with iterative stack. For each node, we attempt to find a path that returns to the start node within the length constraint. Cycles are canonicalised (rotated to start from the lexicographically smallest member) to eliminate duplicates.

| Metric | Complexity |
|--------|-----------|
| Time   | O(V · (V + E)), bounded by max cycle length |
| Space  | O(V + E) for adjacency list + O(V) recursion stack |

**Data Structures**: Forward Adjacency List (HashMap), HashSet for visited/canonical dedup.

### 2. Smurfing Detection (Fan-in / Fan-out)

**Objective**: Detect structuring — many small deposits to one account (fan-in) or dispersal from one account (fan-out), within a 72-hour temporal window.

**Algorithm**: For each node, sort incoming/outgoing edges by timestamp. Use a **sliding window** (two-pointer technique) to count unique counterparties within any 72-hour window. Flag if ≥ 10 unique counterparties found.

| Metric | Complexity |
|--------|-----------|
| Time   | O(E · log E) for sorting, O(E) for sliding window |
| Space  | O(E) for edge storage |

**Data Structures**: Reverse Adjacency List (for fan-in lookup), Sliding Window with HashSet.

### 3. Layered Shell Network Detection

**Objective**: Find chains of ≥ 3 hops where intermediate accounts have very low transaction counts (≤ 3), indicating "pass-through" shell accounts.

**Algorithm**: BFS from each node, only extending through intermediate nodes that meet the low-activity criteria. Chains are recorded and deduplicated.

| Metric | Complexity |
|--------|-----------|
| Time   | O(V · (V + E)), pruned by degree filter |
| Space  | O(V) for BFS queue + O(V²) worst-case for path storage |

**Data Structures**: Queue (BFS), HashSet for visited/dedup.

### 4. False-Positive Control

**Heuristics to avoid flagging legitimate accounts**:
- **Merchant Detection**: Accounts with both high in-degree (≥ 20) AND high out-degree (≥ 20) are likely exchanges/merchants. Also accounts with very high fan-in (≥ 50) but low fan-out (≤ 2) are businesses receiving payments.
- **Payroll Detection**: Accounts sending identical amounts to many recipients follow payroll patterns, not fraud.

| Metric | Complexity |
|--------|-----------|
| Time   | O(V) single pass over all nodes |
| Space  | O(1) per node check |

---

## Suspicion Score Methodology

Each account receives a cumulative score based on detected patterns:

| Pattern | Points | Rationale |
|---------|--------|-----------|
| Part of cycle (3–5) | +40 | Strongest indicator of circular laundering |
| Fan-in or Fan-out | +30 | Structuring / smurfing is a federal offence |
| Layered chain member | +20 | Pass-through behavior indicates layering |
| High velocity (>10 txns in 24h) | +10 | Rapid movement indicates urgency to move funds |

**Normalisation**: Scores are capped at 100. Accounts identified as merchants/payroll by heuristics have their scores reset to 0 and are excluded from suspicion lists.

**Sort Order**: Descending by `suspicion_score` as required by spec.

---

## Installation & Setup

### Prerequisites
- Node.js ≥ 18
- npm ≥ 9

### Backend
```bash
cd server
npm install
npm start
# Server runs on http://localhost:5001
```

### Frontend
```bash
cd client
npm install
npm run dev
# App runs on http://localhost:5173
```

### Environment Variables (Optional)
Create a `.env` in `/client`:
```dotenv
VITE_API_URL=https://your-render-backend.onrender.com
```

---

## Usage Instructions

1. Open the web application in your browser.
2. **Upload** a CSV file using drag-and-drop or the file picker.
3. The engine processes the data and displays:
   - **Summary statistics** (accounts analysed, flagged, rings, processing time)
   - **Interactive force-directed graph** with color-coded nodes
   - **Fraud ring table** and **suspicious accounts table**
4. **Download** the JSON report using the button in the header.

---

## Deployment

### Frontend → Vercel
```bash
cd client
npm run build
# Deploy the `dist/` folder to Vercel
# Set VITE_API_URL environment variable in Vercel dashboard
```

### Backend → Render
1. Create a new **Web Service** on Render.
2. Set root directory to `server`.
3. Build command: `npm install`
4. Start command: `node index.js`
5. Set `PORT` environment variable if needed.

---

## Known Limitations

1. **Cycle detection scalability**: DFS-based cycle enumeration has exponential worst-case for dense graphs. Bounded to length 5 to keep practical.
2. **False-positive heuristics**: Merchant/payroll detection uses simple degree-based rules. Real-world systems would use labeled training data.
3. **No persistence**: Results are stored in memory. Restarting the server clears previous analyses.
4. **Single-threaded**: Node.js is single-threaded; very large datasets (>50K transactions) may benefit from worker threads.
5. **Temporal analysis**: The 72-hour smurfing window is a fixed heuristic. Adaptive windowing would improve detection rates.

---

## Team Members

- **Eklavya** — Full-stack development, graph algorithm design, UI/UX

---

*Built for RIFT 2026 Hackathon — Graph Theory Track*
