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

app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded.');

  const results = [];
  const graph = new FraudGraph();
  const startTime = Date.now();

  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => {
      // Basic validation
      if (data.transaction_id && data.sender_id && data.receiver_id && data.amount && data.timestamp) {
        graph.addTransaction({
          transaction_id: data.transaction_id,
          sender_id: data.sender_id,
          receiver_id: data.receiver_id,
          amount: parseFloat(data.amount),
          timestamp: data.timestamp
        });
      }
    })
    .on('end', () => {
      // Run detection algorithms
      const cycles = graph.detectCycles();
      const smurfing = graph.detectSmurfing();
      const chains = graph.detectLayeredChains();
      graph.calculateFinalScores();

      const processed = graph.getResults();
      const rings = [...cycles, ...smurfing, ...chains];
      
      analysisResults = {
        suspicious_accounts: processed.suspicious_accounts,
        fraud_rings: rings.map(r => ({
          ring_id: r.id,
          member_accounts: r.members,
          pattern_type: r.type,
          risk_score: Math.max(...r.members.map(m => graph.nodes.get(m).score))
        })),
        graph_data: processed.graph_data,
        summary: {
          total_accounts_analyzed: graph.nodes.size,
          suspicious_accounts_flagged: processed.suspicious_accounts.length,
          fraud_rings_detected: rings.length,
          processing_time_seconds: (Date.now() - startTime) / 1000
        }
      };

      fs.unlinkSync(req.file.path); // clean up
      res.json(analysisResults);
    })
    .on('error', (error) => {
      res.status(500).send('Error parsing CSV');
    });
});

app.get('/results', (req, res) => {
  if (!analysisResults) return res.status(404).send('No results found.');
  res.json(analysisResults);
});

app.get('/download', (req, res) => {
  if (!analysisResults) return res.status(404).send('No results found.');
  res.setHeader('Content-disposition', 'attachment; filename=fraud_analysis.json');
  res.setHeader('Content-type', 'application/json');
  res.send(JSON.stringify(analysisResults, null, 2));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
