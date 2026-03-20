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

// Required CSV columns (strict validation)
const REQUIRED_COLUMNS = ['transaction_id', 'sender_id', 'receiver_id', 'amount', 'timestamp'];

/**
 * POST /upload
 * Accepts a CSV file, validates schema, runs fraud detection, returns results.
 */
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const graph = new FraudGraph();
  const startTime = Date.now();
  let headerValidated = false;
  let rowCount = 0;
  let parseErrors = [];

  fs.createReadStream(req.file.path)
    .pipe(csv({ mapHeaders: ({ header }) => header.trim().toLowerCase() }))
    .on('headers', (headers) => {
      const normalised = headers.map(h => h.trim().toLowerCase());
      const missing = REQUIRED_COLUMNS.filter(c => !normalised.includes(c));
      if (missing.length > 0) {
        parseErrors.push(`Missing required columns: ${missing.join(', ')}`);
      }
      headerValidated = true;
    })
    .on('data', (data) => {
      if (parseErrors.length > 0) return; // skip if header invalid

      rowCount++;
      // Validate row data
      const tx_id = (data.transaction_id || '').trim();
      const sender = (data.sender_id || '').trim();
      const receiver = (data.receiver_id || '').trim();
      const amount = parseFloat(data.amount);
      const timestamp = (data.timestamp || '').trim();

      if (!tx_id || !sender || !receiver || isNaN(amount) || !timestamp) {
        parseErrors.push(`Row ${rowCount}: missing or invalid fields`);
        return;
      }

      // Validate timestamp format
      const parsedDate = new Date(timestamp);
      if (isNaN(parsedDate.getTime())) {
        parseErrors.push(`Row ${rowCount}: invalid timestamp "${timestamp}"`);
        return;
      }

      graph.addTransaction({
        transaction_id: tx_id,
        sender_id: sender,
        receiver_id: receiver,
        amount,
        timestamp
      });
    })
    .on('end', () => {
      // Clean up uploaded file
      try { fs.unlinkSync(req.file.path); } catch (e) {}

      if (parseErrors.length > 0) {
        return res.status(400).json({
          error: 'CSV validation failed',
          details: parseErrors.slice(0, 5) // return first 5 errors
        });
      }

      if (rowCount === 0) {
        return res.status(400).json({ error: 'CSV file is empty or contains no valid data.' });
      }

      // ---- Run detection algorithms ----
      const cycleRings = graph.detectCycles();
      const smurfRings = graph.detectSmurfing();
      const chainRings = graph.detectLayeredChains();
      graph.calculateFinalScores();

      const processingTimeMs = Date.now() - startTime;
      const processed = graph.getResults(processingTimeMs);
      const allRings = [...cycleRings, ...smurfRings, ...chainRings];

      // Build fraud_rings with risk_score = max suspicion_score among members
      const fraud_rings = allRings.map(r => ({
        ring_id: r.ring_id,
        member_accounts: r.member_accounts,
        pattern_type: r.pattern_type,
        risk_score: parseFloat(
          Math.max(...r.member_accounts.map(m => {
            const nd = graph.nodeMap.get(m);
            return nd ? nd.score : 0;
          })).toFixed(1)
        ),
        member_count: r.member_accounts.length
      })).filter(r => r.risk_score > 0); // Filter out zero-risk rings

      // Sort rings by risk_score descending
      fraud_rings.sort((a, b) => b.risk_score - a.risk_score);

      analysisResults = {
        suspicious_accounts: processed.suspicious_accounts,
        fraud_rings,
        graph_data: processed.graph_data,
        summary: {
          total_accounts_analyzed: graph.nodeMap.size,
          suspicious_accounts_flagged: processed.suspicious_accounts.length,
          fraud_rings_detected: fraud_rings.length,
          processing_time_seconds: parseFloat((processingTimeMs / 1000).toFixed(1))
        }
      };

      res.json(analysisResults);
    })
    .on('error', (error) => {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
      res.status(500).json({ error: 'Error parsing CSV file.' });
    });
});

/**
 * GET /results — return last analysis
 */
app.get('/results', (req, res) => {
  if (!analysisResults) return res.status(404).json({ error: 'No analysis results. Upload a CSV first.' });
  res.json(analysisResults);
});

/**
 * GET /download — return JSON report as downloadable file
 *   Format matches RIFT spec exactly (no graph_data in download)
 */
app.get('/download', (req, res) => {
  if (!analysisResults) return res.status(404).json({ error: 'No analysis results.' });

  // Strip graph_data for downloadable report (spec only requires the three top-level keys)
  const report = {
    suspicious_accounts: analysisResults.suspicious_accounts,
    fraud_rings: analysisResults.fraud_rings.map(r => ({
      ring_id: r.ring_id,
      member_accounts: r.member_accounts,
      pattern_type: r.pattern_type,
      risk_score: r.risk_score
    })),
    summary: analysisResults.summary
  };

  res.setHeader('Content-Disposition', 'attachment; filename=fraud_analysis.json');
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(report, null, 2));
});

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🔍 Antigravity server running on port ${PORT}`);
});
