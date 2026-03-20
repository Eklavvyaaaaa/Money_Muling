import React, { useState, useRef } from 'react';

function Upload({ onUpload, loading, error }) {
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef();

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = () => setDragging(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) {
      onUpload(file);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) onUpload(file);
  };

  return (
    <div className="upload-wrapper">
      <div
        className={`upload-card ${dragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !loading && fileInputRef.current.click()}
      >
        <input type="file" hidden ref={fileInputRef} onChange={handleFileSelect} accept=".csv" />

        {loading ? (
          <div className="spinner-container">
            <div className="spinner"></div>
            <p className="spinner-text">Analyzing financial networks…</p>
            <p className="spinner-text" style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Running cycle detection, smurfing analysis, chain traversal
            </p>
          </div>
        ) : (
          <>
            <div className="upload-icon-wrapper">📂</div>
            <h2>Upload Transaction Data</h2>
            <p className="subtitle">Drag & drop your CSV file here, or click to browse</p>
            <div className="format-hint">
              transaction_id, sender_id, receiver_id, amount, timestamp
            </div>
            {error && <div className="error-msg">{error}</div>}
          </>
        )}
      </div>
    </div>
  );
}

export default Upload;
