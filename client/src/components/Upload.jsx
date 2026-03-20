import React, { useState, useRef } from 'react';

function Upload({ onUpload, loading, error }) {
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef();

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

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
    <div 
      className={`upload-zone ${dragging ? 'dragging' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current.click()}
    >
      <input 
        type="file" 
        hidden 
        ref={fileInputRef} 
        onChange={handleFileSelect} 
        accept=".csv"
      />
      {loading ? (
        <>
          <div className="spinner"></div>
          <p>Analyzing Financial Networks...</p>
        </>
      ) : (
        <>
          <div className="upload-icon">📂</div>
          <h2>Upload Transaction History</h2>
          <p>Drag & drop your CSV file here or click to browse</p>
          <p className="hint">Strict Format: transaction_id, sender_id, receiver_id, amount, timestamp</p>
          {error && <p className="error-msg">{error}</p>}
        </>
      )}
    </div>
  );
}

export default Upload;
