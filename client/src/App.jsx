import React, { useState } from 'react';
import axios from 'axios';
import Upload from './components/Upload';
import GraphView from './components/GraphView';
import ResultsTable from './components/ResultsTable';
import PatternInsights from './components/PatternInsights';
import RingDetail from './components/RingDetail';
import './index.css';

const API_URL = (() => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (import.meta.env.MODE === 'development') return 'http://localhost:5001';
  return '';
})();

function App() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showMST, setShowMST] = useState(false);

  const handleUpload = async (file) => {
    if (!API_URL) { setError('VITE_API_URL not set.'); return; }
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axios.post(`${API_URL}/upload`, formData);
      setResults(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to process file.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => window.open(`${API_URL}/download`, '_blank');
  const handleReset = () => { setResults(null); setError(null); setShowMST(false); };

  return (
    <div className="app">
      <nav className="navbar">
        <div className="nav-brand">
          <div className="nav-logo">🔍</div>
          <div className="nav-title">Antigravity <span>DSA Forensics</span></div>
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
              <div className="stat-label">Fraud Rings (SCC)</div>
              <div className="stat-value">{results.summary.fraud_rings_detected}</div>
            </div>
            <div className="stat-card type-success">
              <div className="stat-label">Organized Clusters</div>
              <div className="stat-value">{results.summary.organized_clusters}</div>
            </div>
          </section>

          <PatternInsights results={results} />

          <section className="main-grid">
            <div className="card">
              <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <h3>🌐 Transaction Network</h3>
                  <button 
                    className={`btn ${showMST ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setShowMST(!showMST)}
                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem' }}
                  >
                    {showMST ? 'Showing MST Backbone' : 'Show MST Backbone'}
                  </button>
                </div>
                <div className="legend">
                  <div className="legend-item"><span className="legend-dot" style={{ background: '#6366f1' }}></span> Normal</div>
                  <div className="legend-item"><span className="legend-dot" style={{ background: '#ef4444' }}></span> Suspicious</div>
                  <div className="legend-item"><span className="legend-dot" style={{ background: '#f59e0b' }}></span> SCC Member</div>
                </div>
              </div>
              <div className="graph-body">
                <GraphView data={results.graph_data} showMST={showMST} />
              </div>
            </div>
            <div className="card sidebar-panel">
              <div className="card-header">
                <h3>📊 Suspicious Accounts</h3>
                <span className="badge badge-danger">{results.suspicious_accounts.length} flagged</span>
              </div>
              <div className="panel-body">
                <ResultsTable accounts={results.suspicious_accounts} />
                
                {results.fraud_clusters && results.fraud_clusters.length > 0 && (
                  <div className="clusters-section" style={{ padding: '1rem' }}>
                    <h4 style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.8rem' }}>
                      🧩 Organized Clusters (Union-Find)
                    </h4>
                    {results.fraud_clusters.slice(0, 5).map(c => (
                      <div key={c.cluster_id} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '0.6rem', marginBottom: '0.5rem' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#818cf8', marginBottom: '0.3rem' }}>{c.cluster_id}</div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{c.size} related suspicious accounts</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          <RingDetail rings={results.fraud_rings} />

          <div style={{ textAlign: 'center', padding: '1rem 0 2rem' }}>
            <button className="btn btn-primary" onClick={handleDownload}>⬇ Download Full JSON Report</button>
          </div>
        </main>
      )}
    </div>
  );
}

export default App;
