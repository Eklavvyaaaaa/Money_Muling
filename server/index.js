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
      try { fs.unlinkSync(req.file.path); } catch (e) {}
      if (parseErrors.length > 0) return res.status(400).json({ error: 'CSV error', details: parseErrors.slice(0, 5) });
      if (rowCount === 0) return res.status(400).json({ error: 'CSV empty.' });

      // Run DSA Suite
      const sccRings = graph.detectSCCs();
      const smurfRings = graph.detectSmurfing();
      const chainRings = graph.detectLayeredChains();
      graph.calculateFinalScores();
      
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
      });

      res.json(analysisResults);
    });
});

app.get('/download', (req, res) => {
  if (!analysisResults) return res.status(404).json({ error: 'No results.' });
  const report = { ...analysisResults };
  delete report.graph_data;
  res.send(JSON.stringify(report, null, 2));
});

const PORT = 5001;
app.listen(PORT, () => console.log(`🔍 Antigravity DSA Server: http://localhost:${PORT}`));
