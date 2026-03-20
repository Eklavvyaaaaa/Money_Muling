import React from 'react';

function GraphFilterBar({ filterStatus, setFilterStatus }) {
    return (
        <div style={{ display: 'flex', gap: '1rem', padding: '0.8rem 1.2rem', background: '#1e293b', borderRadius: '8px', position: 'absolute', top: '10px', left: '10px', zIndex: 10, alignItems: 'center', border: '1px solid #334155', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)' }}>
            <span style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600, textTransform: 'uppercase' }}>Filter Network:</span>
            <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{ padding: '0.4rem 0.8rem', background: '#0f172a', color: '#e2e8f0', border: '1px solid #475569', borderRadius: '4px', cursor: 'pointer', outline: 'none' }}
            >
                <option value="All">All Accounts</option>
                <option value="Confirmed Fraud">🔥 Confirmed Fraud</option>
                <option value="Escalated">⚠️ Escalated</option>
                <option value="Under Review">👀 Under Review</option>
                <option value="Cleared">✅ Cleared</option>
                <option value="Unreviewed">Unreviewed</option>
                <option value="High Risk Only">High Risk Only (&gt;50)</option>
            </select>
        </div>
    );
}

export default GraphFilterBar;
