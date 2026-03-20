import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = (() => {
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
    if (import.meta.env.MODE === 'development') return 'http://localhost:5001';
    return '';
})();

function ExplanationPanel({ nodeId, onClose }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!nodeId) return;
        setLoading(true);
        axios.get(`${API_URL}/account/${nodeId}/explanation`)
            .then(res => setData(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [nodeId]);

    if (!nodeId) return null;

    return (
        <div className="explanation-panel" style={{
            position: 'absolute', right: '20px', top: '80px', width: '320px',
            background: '#1e293b', border: '1px solid #334155', borderRadius: '8px',
            padding: '1.2rem', color: '#f8fafc', zIndex: 100, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Account Forensics</h3>
                <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#cbd5e1', cursor: 'pointer', borderRadius: '4px', padding: '2px 8px' }}>✖</button>
            </div>

            {loading ? (
                <div style={{ color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center', padding: '1rem' }}>Loading explanation...</div>
            ) : data ? (
                <>
                    <div style={{ marginBottom: '1rem', paddingBottom: '0.8rem', borderBottom: '1px solid #334155' }}>
                        <span style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase' }}>ACCOUNT ID</span>
                        <div style={{ fontFamily: 'monospace', fontSize: '0.9rem', color: '#e2e8f0', marginTop: '4px' }}>{data.account_id}</div>
                    </div>

                    <div style={{ marginBottom: '1.2rem', display: 'flex', gap: '1.5rem', paddingBottom: '0.8rem', borderBottom: '1px solid #334155' }}>
                        <div>
                            <span style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase' }}>Risk Score</span>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: data.risk_score > 60 ? '#ef4444' : data.risk_score >= 30 ? '#f59e0b' : '#3b82f6', marginTop: '4px' }}>
                                {data.risk_score}<span style={{ fontSize: '0.9rem', color: '#64748b' }}>/100</span>
                            </div>
                        </div>
                        {data.distanceFromRiskSource !== null && data.distanceFromRiskSource > 0 && (
                            <div>
                                <span style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase' }}>Proximity Risk</span>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f59e0b', marginTop: '4px' }}>
                                    {data.distanceFromRiskSource} <span style={{ fontSize: '0.9rem', color: '#64748b' }}>hops</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div>
                        <span style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.6rem', display: 'block' }}>Risk Factors & Explanations</span>
                        <ul style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.85rem', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            {data.explanations.map((exp, i) => (
                                <li key={i}>{exp}</li>
                            ))}
                        </ul>
                    </div>
                </>
            ) : (
                <div style={{ color: '#ef4444', fontSize: '0.9rem', padding: '1rem', textAlign: 'center' }}>Failed to load data.</div>
            )}
        </div>
    );
}

export default ExplanationPanel;
