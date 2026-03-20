const express = require('express');
const cors = require('cors');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const FraudGraph = require('./utils/graph');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());

let analysisResults = null;
let currentGraph = null;
const globalStatuses = new Map(); // Store analyst metadata across graph lifecycle

const REQUIRED_COLUMNS = ['transaction_id', 'sender_id', 'receiver_id', 'amount', 'timestamp'];

app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

  const graph = new FraudGraph();
  const startTime = Date.now();
  let rowCount = 0;
  let parseErrors = [];

  fs.createReadStream(req.file.path)
    .pipe(csv({ mapHeaders: ({ header }) => header.trim().toLowerCase() }))
    .on('data', (data) => {
      rowCount++;
      const tx_id = (data.transaction_id || '').trim();
      const sender = (data.sender_id || '').trim();
      const receiver = (data.receiver_id || '').trim();
      const amount = parseFloat(data.amount);
      const timestamp = (data.timestamp || '').trim();

      if (!tx_id || !sender || !receiver || isNaN(amount) || !timestamp) {
        parseErrors.push(`Row ${rowCount}: missing fields`);
        return;
      }
      graph.addTransaction({ transaction_id: tx_id, sender_id: sender, receiver_id: receiver, amount, timestamp });
    })
    .on('end', () => {
      try { fs.unlinkSync(req.file.path); } catch (e) { }
      if (parseErrors.length > 0) return res.status(400).json({ error: 'CSV error', details: parseErrors.slice(0, 5) });
      if (rowCount === 0) return res.status(400).json({ error: 'CSV empty.' });

      // Run DSA Suite
      const sccRings = graph.detectSCCs();
      const smurfRings = graph.detectSmurfing();
      const chainRings = graph.detectLayeredChains();
      graph.calculateFinalScores(globalStatuses);

      const clusters = graph.detectClusters();
      const mstTxIds = graph.computeMST();

      const processingTimeMs = Date.now() - startTime;
      const allRings = [...sccRings, ...smurfRings, ...chainRings];
      const fraud_rings = allRings.map(r => ({
        ...r,
        risk_score: parseFloat(Math.max(...r.member_accounts.map(m => graph.nodeMap.get(m).score)).toFixed(1))
      })).filter(r => r.risk_score > 0);
      fraud_rings.sort((a, b) => b.risk_score - a.risk_score);

      analysisResults = graph.getResults(processingTimeMs, {
        fraud_rings,
        fraud_clusters: clusters,
        mstTxIds, // Pass the Set directly to tag links
        mst_skeleton_count: mstTxIds.size,
        summary: {
          total_accounts_analyzed: graph.nodeMap.size,
          suspicious_accounts_flagged: graph.nodeMap.size - Array.from(graph.nodeMap.values()).filter(n => n.score === 0).length,
          fraud_rings_detected: fraud_rings.length,
          organized_clusters: clusters.length,
          processing_time_seconds: parseFloat((processingTimeMs / 1000).toFixed(1))
        }
      }, globalStatuses);

      currentGraph = graph;

      res.json(analysisResults);
    });
});

app.post('/account/:id/status', (req, res) => {
  const accountId = req.params.id;
  const { status, notes } = req.body;
  if (!status) return res.status(400).json({ error: 'Status is required' });

  globalStatuses.set(accountId, { status, notes: notes || '' });

  if (currentGraph && analysisResults) {
    currentGraph.calculateFinalScores(globalStatuses);

    // Regenerate nodes array inside analysisResults gracefully
    analysisResults.graph_data.nodes = Array.from(currentGraph.nodeMap.values()).map(n => ({
      id: n.id, score: n.score,
      ring_id: n.ring_ids.size > 0 ? Array.from(n.ring_ids)[0] : null,
      patterns: Array.from(n.patterns),
      distanceFromRiskSource: n.distanceFromRiskSource,
      associationRisk: n.associationRisk,
      explanations: n.explanations,
      analyst_status: (globalStatuses.get(n.id) || {}).status || 'Unreviewed'
    }));

    // Regenerate suspicious tagged list
    const suspicious = [];
    for (const [vid, data] of currentGraph.nodeMap) {
      if (data.score > 0 || (globalStatuses.get(vid) && globalStatuses.get(vid).status === 'Confirmed Fraud')) {
        suspicious.push({
          account_id: vid,
          suspicion_score: parseFloat(data.score.toFixed(1)),
          detected_patterns: Array.from(data.patterns),
          ring_id: data.ring_ids.size > 0 ? Array.from(data.ring_ids)[0] : null,
          analyst_status: (globalStatuses.get(vid) || {}).status || 'Unreviewed'
        });
      }
    }
    suspicious.sort((a, b) => b.suspicion_score - a.suspicion_score);
    analysisResults.suspicious_accounts = suspicious;
    analysisResults.summary.suspicious_accounts_flagged = suspicious.length;
  }

  const updatedGraphData = analysisResults ? analysisResults.graph_data : null;
  res.json({ success: true, accountId, status, notes, updatedGraphData });
});

app.get('/account/:id/deepdive', (req, res) => {
  if (!currentGraph) return res.status(404).json({ error: 'No graph available.' });
  const id = req.params.id;
  const node = currentGraph.nodeMap.get(id);
  if (!node) return res.status(404).json({ error: 'Account not found.' });

  const analystInfo = globalStatuses.get(id) || { status: 'Unreviewed', notes: '' };
  const incoming = currentGraph.reverseAdj.get(id) || [];
  const outgoing = currentGraph.adjList.get(id) || [];

  let totalInflow = 0; let totalOutflow = 0;
  const txHistory = [];
  const counterparties = new Map();
  const peakHours = new Array(24).fill(0);

  incoming.forEach(e => {
    totalInflow += e.amount;
    txHistory.push({ type: 'IN', counterparty: e.source, amount: e.amount, timestamp: e.ts, transaction_id: e.transaction_id });
    counterparties.set(e.source, (counterparties.get(e.source) || 0) + 1);
    peakHours[new Date(e.ts).getHours()]++;
  });

  outgoing.forEach(e => {
    totalOutflow += e.amount;
    txHistory.push({ type: 'OUT', counterparty: e.target, amount: e.amount, timestamp: e.ts, transaction_id: e.transaction_id });
    counterparties.set(e.target, (counterparties.get(e.target) || 0) + 1);
    peakHours[new Date(e.ts).getHours()]++;
  });

  txHistory.sort((a, b) => b.timestamp - a.timestamp);
  const counterpartyList = Array.from(counterparties.entries())
    .map(([cid, count]) => ({ id: cid, count })).sort((a, b) => b.count - a.count);

  res.json({
    account_id: node.id,
    risk_score: parseFloat(node.score.toFixed(1)),
    distanceFromRiskSource: node.distanceFromRiskSource,
    explanations: node.explanations || [],
    analyst_status: analystInfo.status,
    notes: analystInfo.notes,
    stats: {
      total_inflow: totalInflow,
      total_outflow: totalOutflow,
      transaction_count: incoming.length + outgoing.length
    },
    peak_hours: peakHours,
    counterparties: counterpartyList,
    history: txHistory
  });
});

app.get('/timeline', (req, res) => {
  if (!currentGraph) return res.status(404).json({ error: 'No graph available.' });
  const timestamps = Array.from(new Set(currentGraph.edges.map(e => new Date(e.timestamp).getTime()))).sort((a, b) => a - b);
  res.json({ timestamps });
});

app.get('/replay', (req, res) => {
  if (!currentGraph) return res.status(404).json({ error: 'No graph available.' });
  const time = req.query.time;
  if (!time) return res.status(400).json({ error: 'Time parameter required' });
  const state = currentGraph.getGraphStateAtTime(time);
  res.json(state);
});

app.get('/account/:id/explanation', (req, res) => {
  if (!currentGraph) return res.status(404).json({ error: 'No graph available.' });
  const node = currentGraph.nodeMap.get(req.params.id);
  if (!node) return res.status(404).json({ error: 'Account not found.' });
  res.json({
    account_id: node.id,
    risk_score: parseFloat(node.score.toFixed()),
    distanceFromRiskSource: node.distanceFromRiskSource,
    explanations: node.explanations || []
  });
});

app.get('/download', (req, res) => {
  if (!analysisResults) return res.status(404).json({ error: 'No results.' });
  const report = { ...analysisResults };
  delete report.graph_data;
  res.send(JSON.stringify(report, null, 2));
});

const PORT = 5001;
app.get('/ping', (req, res) => res.json({ status: 'ok', version: 'v2-deepdive', routes: app._router.stack.filter(r => r.route).map(r => `${Object.keys(r.route.methods)[0].toUpperCase()} ${r.route.path}`) }));
app.listen(PORT, () => console.log(`🔍 Antigravity DSA Server v2: http://localhost:${PORT}`));
