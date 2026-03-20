import React, { useState } from 'react';
import axios from 'axios';
import Upload from './components/Upload';
import GraphView from './components/GraphView';
import ResultsTable from './components/ResultsTable';
import './index.css';

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
      const response = await axios.post('http://localhost:5000/upload', formData);
      setResults(response.data);
    } catch (err) {
      setError('Failed to process file. Ensure format is correct.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    window.open('http://localhost:5000/download', '_blank');
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1>Antigravity: <span>Financial Forensics Engine</span></h1>
        {results && (
          <button className="download-btn" onClick={handleDownload}>
            Download JSON Report
          </button>
        )}
      </header>

      {!results ? (
        <Upload onUpload={handleUpload} loading={loading} error={error} />
      ) : (
        <main className="dashboard">
          <section className="stats-row">
            <div className="stat-card">
              <h3>Total Accounts</h3>
              <p>{results.summary.total_accounts_analyzed}</p>
            </div>
            <div className="stat-card highlighted">
              <h3>Suspicious</h3>
              <p>{results.summary.suspicious_accounts_flagged}</p>
            </div>
            <div className="stat-card risk">
              <h3>Fraud Rings</h3>
              <p>{results.summary.fraud_rings_detected}</p>
            </div>
            <div className="stat-card">
              <h3>Time</h3>
              <p>{results.summary.processing_time_seconds}s</p>
            </div>
          </section>

          <div className="content-grid">
            <div className="graph-container">
              <GraphView data={results.graph_data} />
            </div>
            <div className="table-container">
              <ResultsTable results={results} />
            </div>
          </div>
          
          <button className="reset-btn" onClick={() => setResults(null)}>
            Upload New File
          </button>
        </main>
      )}
    </div>
  );
}

export default App;
