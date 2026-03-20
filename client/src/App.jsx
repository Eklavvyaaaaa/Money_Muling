import React, { useState } from 'react';
import axios from 'axios';
import Upload from './components/Upload';
import GraphView from './components/GraphView';
import ResultsTable from './components/ResultsTable';
import './index.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

function App() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleUpload = async (file) => {
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API_URL}/upload`, formData);
      setResults(response.data);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to process file.';
      const details = err.response?.data?.details;
      setError(details ? `${msg}\n${details.join('\n')}` : msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    window.open(`${API_URL}/download`, '_blank');
  };

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-left">
          <div className="header-logo">🔍</div>
          <h1>Antigravity <span>Financial Forensics Engine</span></h1>
        </div>
        {results && (
          <div className="header-actions">
            <button className="btn btn-outline" onClick={() => setResults(null)}>
              ↩ New Analysis
            </button>
            <button className="btn btn-primary" onClick={handleDownload}>
              ⬇ Download JSON
            </button>
          </div>
        )}
      </header>

      {!results ? (
        <Upload onUpload={handleUpload} loading={loading} error={error} />
      ) : (
        <main className="dashboard">
          <section className="stats-row">
            <div className="stat-card accent">
              <div className="stat-label">Accounts Analyzed</div>
              <div className="stat-value">{results.summary.total_accounts_analyzed}</div>
            </div>
            <div className="stat-card warning">
              <div className="stat-label">Suspicious Flagged</div>
              <div className="stat-value">{results.summary.suspicious_accounts_flagged}</div>
            </div>
            <div className="stat-card danger">
              <div className="stat-label">Fraud Rings</div>
              <div className="stat-value">{results.summary.fraud_rings_detected}</div>
            </div>
            <div className="stat-card success">
              <div className="stat-label">Processing Time</div>
              <div className="stat-value">{results.summary.processing_time_seconds}s</div>
            </div>
          </section>

          <div className="content-grid">
            <div className="graph-card">
              <div className="card-header">
                <h3>🌐 Network Graph</h3>
                <div className="legend">
                  <div className="legend-item">
                    <span className="legend-dot" style={{ background: '#6366f1' }}></span> Normal
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot" style={{ background: '#ef4444' }}></span> Suspicious
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot" style={{ background: '#f59e0b' }}></span> Ring Member
                  </div>
                </div>
              </div>
              <div className="graph-body">
                <GraphView data={results.graph_data} />
              </div>
            </div>
            <div className="table-card">
              <div className="card-header">
                <h3>📊 Analysis Results</h3>
              </div>
              <div className="table-body">
                <ResultsTable results={results} />
              </div>
            </div>
          </div>

          <div className="footer-actions">
            <button className="btn btn-primary" onClick={handleDownload}>
              ⬇ Download Full JSON Report
            </button>
          </div>
        </main>
      )}
    </div>
  );
}

export default App;
