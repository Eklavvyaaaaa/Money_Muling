import React from 'react';

function ResultsTable({ results }) {
  const getRiskBadge = (score) => {
    if (score >= 70) return <span className="badge badge-danger">{score.toFixed(1)}</span>;
    if (score >= 40) return <span className="badge badge-warning">{score.toFixed(1)}</span>;
    return <span className="badge badge-success">{score.toFixed(1)}</span>;
  };

  const getPatternBadge = (type) => {
    const label = type.replace(/_/g, ' ');
    if (type.includes('cycle'))  return <span className="badge badge-danger">{label}</span>;
    if (type.includes('smurf')) return <span className="badge badge-warning">{label}</span>;
    return <span className="badge badge-accent">{label}</span>;
  };

  return (
    <>
      {/* ──── Fraud Rings Table (spec-required columns) ──── */}
      <div className="section-title">Detected Fraud Rings</div>
      <table>
        <thead>
          <tr>
            <th>Ring ID</th>
            <th>Pattern Type</th>
            <th>Members</th>
            <th>Risk</th>
          </tr>
        </thead>
        <tbody>
          {results.fraud_rings.length === 0 ? (
            <tr><td colSpan={4} style={{ textAlign: 'center', color: '#64748b' }}>No rings detected</td></tr>
          ) : (
            results.fraud_rings.slice(0, 25).map((ring, idx) => (
              <tr key={idx}>
                <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem' }}>{ring.ring_id}</td>
                <td>{getPatternBadge(ring.pattern_type)}</td>
                <td>{ring.member_count}</td>
                <td>{getRiskBadge(ring.risk_score)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Member accounts expandable row */}
      {results.fraud_rings.length > 0 && (
        <div style={{ padding: '0.5rem', fontSize: '0.7rem', color: '#64748b', fontFamily: 'JetBrains Mono, monospace' }}>
          {results.fraud_rings.slice(0, 5).map((ring, idx) => (
            <div key={idx} style={{ marginBottom: '0.3rem' }}>
              <span style={{ color: '#94a3b8' }}>{ring.ring_id}:</span>{' '}
              {ring.member_accounts.slice(0, 6).join(', ')}{ring.member_accounts.length > 6 ? '…' : ''}
            </div>
          ))}
        </div>
      )}

      {/* ──── Suspicious Accounts ──── */}
      <div className="section-title" style={{ marginTop: '1rem' }}>Suspicious Accounts</div>
      <table>
        <thead>
          <tr>
            <th>Account ID</th>
            <th>Score</th>
            <th>Patterns</th>
          </tr>
        </thead>
        <tbody>
          {results.suspicious_accounts.length === 0 ? (
            <tr><td colSpan={3} style={{ textAlign: 'center', color: '#64748b' }}>No suspicious accounts</td></tr>
          ) : (
            results.suspicious_accounts.slice(0, 20).map((acc, idx) => (
              <tr key={idx}>
                <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem' }}>{acc.account_id}</td>
                <td>{getRiskBadge(acc.suspicion_score)}</td>
                <td className="members-cell">{acc.detected_patterns.join(', ')}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </>
  );
}

export default ResultsTable;
