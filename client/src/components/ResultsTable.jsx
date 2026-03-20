import React from 'react';

function ResultsTable({ results }) {
  return (
    <div className="results-wrapper">
      <h3>Detected Fraud Rings</h3>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Ring ID</th>
              <th>Pattern</th>
              <th>Risk</th>
            </tr>
          </thead>
          <tbody>
            {results.fraud_rings.map((ring, idx) => (
              <tr key={idx}>
                <td>{ring.ring_id}</td>
                <td style={{ fontSize: '0.8rem', color: '#8b949e' }}>
                  {ring.pattern_type.replace(/_/g, ' ')}
                </td>
                <td>
                  <span className={`risk-badge ${ring.risk_score > 70 ? 'risk-high' : 'risk-low'}`}>
                    {ring.risk_score.toFixed(1)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 style={{ marginTop: '2rem' }}>Suspicious Accounts</h3>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Account</th>
              <th>Score</th>
              <th>Patterns</th>
            </tr>
          </thead>
          <tbody>
            {results.suspicious_accounts.slice(0, 10).map((acc, idx) => (
              <tr key={idx}>
                <td>{acc.account_id}</td>
                <td>{acc.suspicion_score.toFixed(1)}</td>
                <td style={{ fontSize: '0.7rem', color: '#8b949e' }}>
                  {acc.detected_patterns.join(', ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ResultsTable;
