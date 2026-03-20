import React, { useState } from 'react';
import axios from 'axios';
import Upload from './components/Upload';
import GraphView from './components/GraphView';
import ResultsTable from './components/ResultsTable';
import PatternInsights from './components/PatternInsights';
import RingDetail from './components/RingDetail';
import './index.css';

// Development uses localhost fallback; production requires VITE_API_URL to be set.
const API_URL = (() => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (import.meta.env.MODE === 'development') return 'http://localhost:5001';
  console.error('FATAL: VITE_API_URL is not set in production. API calls will fail.');
  return '';
})();

function App() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleUpload = async (file) => {
    if (!API_URL) {
      setError('Application misconfigured: VITE_API_URL is not set.');
      return;
    }
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axios.post(`${API_URL}/upload`, formData);
      setResults(res.data);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to process file.';
      const det = err.response?.data?.details;
      setError(det ? `${msg}\n${det.join('\n')}` : msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => window.open(`${API_URL}/download`, '_blank');
  const handleReset = () => { setResults(null); setError(null); };

  return (
    <div className="app">
      <nav className="navbar">
        <div className="nav-brand">
          <div className="nav-logo">🔍</div>
          <div className="nav-title">Antigravity <span>Financial Forensics</span></div>
        </div>
        {results && (
          <div className="nav-actions">
            <button className="btn btn-ghost" onClick={handleReset}>↩ New Analysis</button>
            <button className="btn btn-primary" onClick={handleDownload}>⬇ Export JSON</button>
          </div>
        )}
      </nav>

      {!results ? (
        <Upload onUpload={handleUpload} loading={loading} error={error} />
      ) : (
        <main className="dashboard">
          <section className="stats-grid">
            <div className="stat-card type-accent">
              <div className="stat-label">Accounts Analyzed</div>
              <div className="stat-value">{results.summary.total_accounts_analyzed}</div>
            </div>
            <div className="stat-card type-warning">
              <div className="stat-label">Suspicious Flagged</div>
              <div className="stat-value">{results.summary.suspicious_accounts_flagged}</div>
            </div>
            <div className="stat-card type-danger">
              <div className="stat-label">Fraud Rings</div>
              <div className="stat-value">{results.summary.fraud_rings_detected}</div>
            </div>
            <div className="stat-card type-success">
              <div className="stat-label">Processing Time</div>
              <div className="stat-value">{results.summary.processing_time_seconds}s</div>
            </div>
          </section>

          <PatternInsights results={results} />

          <section className="main-grid">
            <div className="card">
              <div className="card-header">
                <h3>🌐 Transaction Network</h3>
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
            <div className="card sidebar-panel">
              <div className="card-header">
                <h3>📊 Suspicious Accounts</h3>
                <span className="badge badge-danger">{results.suspicious_accounts.length} flagged</span>
              </div>
              <div className="panel-body">
                <ResultsTable accounts={results.suspicious_accounts} />
              </div>
            </div>
          </section>

          <RingDetail rings={results.fraud_rings} />

          <div style={{ textAlign: 'center', padding: '1rem 0 2rem' }}>
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
