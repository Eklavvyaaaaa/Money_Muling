import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { generateReport } from './ReportGenerator'; // We will create this utility

function DeepDivePanel({ nodeId, onClose, onStatusUpdate, API_URL }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);

    // Form states
    const [status, setStatus] = useState('Unreviewed');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!nodeId) return;
        setLoading(true);
        setErrorMsg(null);

        axios.get(`${API_URL}/account/${encodeURIComponent(nodeId)}/deepdive`)
            .then(res => {
                setData(res.data);
                setStatus(res.data.analyst_status || 'Unreviewed');
                setNotes(res.data.notes || '');
            })
            .catch(err => {
                console.error(err);
                if (err.response) {
                    const d = err.response.data;
                    const detail = typeof d === 'string' ? d : (d?.error || JSON.stringify(d));
                    setErrorMsg(`Server ${err.response.status}: ${detail}`);
                } else {
                    setErrorMsg(`Network Error: ${err.message}`);
                }
            })
            .finally(() => setLoading(false));
    }, [nodeId, API_URL]);

    const handleSaveStatus = async () => {
        setSaving(true);
        try {
            const res = await axios.post(`${API_URL}/account/${encodeURIComponent(nodeId)}/status`, { status, notes });
            if (res.data.success) {
                // Trigger graph refresh in App.jsx
                if (onStatusUpdate && res.data.updatedGraphData) {
                    onStatusUpdate(res.data.updatedGraphData);
                }
            }
        } catch (e) {
            console.error("Failed to update status", e);
        } finally {
            setSaving(false);
        }
    };

    const handleDownloadReport = () => {
        if (data) generateReport(data);
    };

    if (!nodeId) return null;

    return (
        <div className="deep-dive-panel" style={{
            position: 'absolute', right: '20px', top: '80px', width: '400px', maxHeight: '80vh',
            background: '#0f172a', border: '1px solid #334155', borderRadius: '12px',
            color: '#f8fafc', zIndex: 100, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            display: 'flex', flexDirection: 'column'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: '1px solid #1e293b', background: '#1e293b', borderRadius: '12px 12px 0 0' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Deep Dive Forensics</h3>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={handleDownloadReport} title="Download Report" style={{ background: '#3b82f6', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '4px', padding: '4px 8px', fontSize: '0.8rem' }}>📄 Report</button>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#cbd5e1', cursor: 'pointer', borderRadius: '4px', padding: '4px 8px' }}>✖</button>
                </div>
            </div>

            <div style={{ overflowY: 'auto', padding: '1rem', flex: 1 }}>
                {loading ? (
                    <div style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>Loading forensic data...</div>
                ) : data ? (
                    <>
                        <div style={{ marginBottom: '1rem' }}>
                            <span style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase' }}>ACCOUNT ID</span>
                            <div style={{ fontFamily: 'monospace', fontSize: '1.1rem', color: '#e2e8f0', marginTop: '4px' }}>{data.account_id}</div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.2rem', paddingBottom: '1rem', borderBottom: '1px solid #1e293b' }}>
                            <div>
                                <span style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase' }}>Risk Score</span>
                                <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: data.risk_score > 60 ? '#ef4444' : data.risk_score >= 30 ? '#f59e0b' : '#3b82f6' }}>
                                    {data.risk_score}<span style={{ fontSize: '0.9rem', color: '#64748b' }}>/100</span>
                                </div>
                            </div>
                            {data.distanceFromRiskSource !== null && data.distanceFromRiskSource > 0 && (
                                <div>
                                    <span style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase' }}>Proximity Hops</span>
                                    <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#f59e0b' }}>
                                        {data.distanceFromRiskSource}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Analyst Actions Block */}
                        <div style={{ background: '#1e293b', padding: '1rem', borderRadius: '8px', marginBottom: '1.2rem' }}>
                            <h4 style={{ margin: '0 0 0.8rem 0', fontSize: '0.85rem', color: '#e2e8f0', textTransform: 'uppercase' }}>Analyst Actions</h4>
                            <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: '100%', padding: '0.5rem', marginBottom: '0.8rem', background: '#0f172a', color: '#fff', border: '1px solid #475569', borderRadius: '4px' }}>
                                <option value="Unreviewed">Unreviewed</option>
                                <option value="Under Review">Under Review</option>
                                <option value="Cleared">Cleared</option>
                                <option value="Escalated">Escalated</option>
                                <option value="Confirmed Fraud">Confirmed Fraud</option>
                            </select>
                            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add investigator notes here..." style={{ width: '100%', padding: '0.5rem', background: '#0f172a', color: '#fff', border: '1px solid #475569', borderRadius: '4px', minHeight: '60px', marginBottom: '0.8rem', boxSizing: 'border-box' }} />
                            <button onClick={handleSaveStatus} disabled={saving} style={{ width: '100%', padding: '0.5rem', background: saving ? '#475569' : '#10b981', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
                                {saving ? 'Saving...' : 'Save & Update Analytics'}
                            </button>
                        </div>

                        <div style={{ marginBottom: '1.2rem' }}>
                            <span style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.6rem', display: 'block' }}>Algorithmic Flags</span>
                            <ul style={{ paddingLeft: '1.2rem', margin: 0, fontSize: '0.85rem', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                {data.explanations.map((exp, i) => <li key={i}>{exp}</li>)}
                            </ul>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.2rem', paddingBottom: '1rem', borderBottom: '1px solid #1e293b' }}>
                            <div style={{ background: '#1e293b', padding: '0.8rem', borderRadius: '8px', textAlign: 'center' }}>
                                <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Total Inflow</div>
                                <div style={{ fontSize: '1.1rem', color: '#10b981', fontWeight: 600 }}>${data.stats.total_inflow.toFixed(2)}</div>
                            </div>
                            <div style={{ background: '#1e293b', padding: '0.8rem', borderRadius: '8px', textAlign: 'center' }}>
                                <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Total Outflow</div>
                                <div style={{ fontSize: '1.1rem', color: '#ef4444', fontWeight: 600 }}>${data.stats.total_outflow.toFixed(2)}</div>
                            </div>
                        </div>

                        <div style={{ marginBottom: '1.2rem' }}>
                            <span style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.6rem', display: 'block' }}>Top Counterparties</span>
                            <div style={{ background: '#1e293b', borderRadius: '8px', overflow: 'hidden' }}>
                                {data.counterparties.slice(0, 5).map(cp => (
                                    <div key={cp.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0.8rem', borderBottom: '1px solid #334155', fontSize: '0.85rem' }}>
                                        <span style={{ fontFamily: 'monospace', color: '#a5b4fc' }}>{cp.id}</span>
                                        <span style={{ color: '#94a3b8' }}>{cp.count} TX(s)</span>
                                    </div>
                                ))}
                                {data.counterparties.length === 0 && <div style={{ padding: '0.8rem', color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center' }}>No counterparties</div>}
                            </div>
                        </div>

                    </>
                ) : (
                    <div style={{ color: '#ef4444', fontSize: '0.8rem', textAlign: 'center', padding: '1rem' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Failed to load data.</div>
                        {errorMsg && <div>{errorMsg}</div>}
                    </div>
                )}
            </div>
        </div>
    );
}

export default DeepDivePanel;
