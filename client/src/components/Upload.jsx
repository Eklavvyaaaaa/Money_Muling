import React, { useState, useRef } from 'react';

function Upload({ onUpload, loading, error }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const onDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);
  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (loading) return;
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) onUpload(file);
  };

  const onFileSelect = (e) => {
    if (loading) return;
    const file = e.target.files[0];
    if (file) onUpload(file);
  };

  const onKeyDown = (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && !loading) {
      e.preventDefault();
      inputRef.current.click();
    }
  };

  return (
    <div className="upload-page">
      <div className="upload-hero">
        <h2>
          Detect <span className="gradient-text">Money Muling</span> Networks
        </h2>
        <p>
          Upload your transaction data and our graph algorithms will identify
          circular fund routing, smurfing patterns, and layered shell networks
          in seconds.
        </p>
      </div>

      <div
        className={`upload-card ${dragging ? 'dragging' : ''}`}
        role="button"
        tabIndex={0}
        aria-label="Upload CSV file"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !loading && inputRef.current.click()}
        onKeyDown={onKeyDown}
      >
        <input type="file" ref={inputRef}
          onChange={onFileSelect}
          accept=".csv"
          style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}
        />

        {loading ? (
          <div className="spinner-wrap">
            <div className="spinner"></div>
            <p className="msg">Analyzing financial networks…</p>
            <p className="sub-msg">Running DFS cycle detection → smurfing analysis → chain traversal</p>
          </div>
        ) : (
          <>
            <div className="upload-icon">📂</div>
            <h3>Upload Transaction Data</h3>
            <p className="sub">Drag & drop your CSV file here, or click to browse</p>
            <div className="format-box">
              <code>transaction_id, sender_id, receiver_id, amount, timestamp</code>
            </div>
            {error && <div className="error-banner">{error}</div>}
          </>
        )}
      </div>

      <div className="features-row">
        <div className="feature-card">
          <div className="fc-icon">🔄</div>
          <h4>Cycle Detection</h4>
          <p>Find circular fund routing where money flows A → B → C → A to obscure its origin.</p>
        </div>
        <div className="feature-card">
          <div className="fc-icon">🕸️</div>
          <h4>Smurfing Analysis</h4>
          <p>Detect many-to-one and one-to-many patterns used to avoid reporting thresholds.</p>
        </div>
        <div className="feature-card">
          <div className="fc-icon">🔗</div>
          <h4>Chain Traversal</h4>
          <p>Identify layered shell networks where money passes through low-activity intermediaries.</p>
        </div>
      </div>
    </div>
  );
}

export default Upload;
