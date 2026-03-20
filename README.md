# Antigravity: Financial Forensics Engine

Detect money muling networks using advanced graph algorithms and interactive visualizations.

## Project Overview
Antigravity is a full-stack financial forensics tool designed to identify suspicious patterns in transaction data. By treating accounts as nodes and transactions as edges, the engine detects complex fraud structures like circular fund routing, smurfing (fan-in/out), and layered chains.

## Tech Stack
- **Frontend**: React.js, `react-force-graph`, Axios, Custom CSS.
- **Backend**: Node.js, Express, `csv-parser`, `multer`.
- **Algorithms**: DFS-based cycle detection, Heuristic-based smurfing detection, Path-traversal chain detection.

## Detection Algorithms
1. **Cycle Detection (Circular Funds)**: Uses DFS with a recursion stack to find closed loops of 3-5 accounts where funds return to the origin.
2. **Fan-in / Fan-out (Smurfing)**: Detects accounts receiving from or sending to ≥10 distinct entities within a 72-hour window.
3. **Layered Chain Detection**: Identifies sequential transfers across ≥3 nodes where intermediate accounts have low overall activity (≤3 transactions), indicating "pass-through" behavior.

## Setup Instructions

### Backend
1. Navigate to `/server`.
2. Install dependencies: `npm install`.
3. Start the server: `npm start` (runs on port 5000).

### Frontend
1. Navigate to `/client`.
2. Install dependencies: `npm install`.
3. Start the dev server: `npm run dev` (runs on port 5173).

## Usage
1. Upload a CSV file with the following columns: `transaction_id`, `sender_id`, `receiver_id`, `amount`, `timestamp`.
2. View the interactive graph to see relationships between accounts.
3. Analyze the Fraud Rings table to identify specific clusters.
4. Download the full JSON report for further audit.

## Known Limitations
- Current cycle detection is optimized for lengths up to 5.
- Visualization performance may degrade beyond 10,000 nodes (edges are handled better).
