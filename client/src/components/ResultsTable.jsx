import React, { useState } from 'react';

/**
 * ResultsTable — Shows suspicious accounts with pagination.
 * Sorted by suspicion score (descending) as received from the API.
 */
const PAGE_SIZE = 15;

function ResultsTable({ accounts }) {
  const [page, setPage] = useState(0);

  const getRiskBadge = (score) => {
    if (score >= 70) return <span className="badge badge-danger">{score.toFixed(1)}</span>;
    if (score >= 40) return <span className="badge badge-warning">{score.toFixed(1)}</span>;
    return <span className="badge badge-success">{score.toFixed(1)}</span>;
  };

  const getPatternLabel = (pattern) => {
    if (pattern.includes('cycle'))     return 'badge-danger';
    if (pattern.includes('fan'))       return 'badge-warning';
    if (pattern.includes('chain'))     return 'badge-cyan';
    if (pattern.includes('velocity'))  return 'badge-accent';
    return 'badge-accent';
  };

  if (!accounts || accounts.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
        No suspicious accounts detected.
      </div>
    );
  }

  const totalPages = Math.ceil(accounts.length / PAGE_SIZE);
  const start = page * PAGE_SIZE;
  const pageAccounts = accounts.slice(start, start + PAGE_SIZE);

  return (
    <div>
      <div style={{ padding: '0.6rem 1.2rem', fontSize: '0.72rem', color: '#64748b' }}>
        Showing {start + 1}–{Math.min(start + PAGE_SIZE, accounts.length)} of {accounts.length} accounts
      </div>
      <table>
        <thead>
          <tr>
            <th>Account</th>
            <th>Score</th>
            <th>Patterns</th>
          </tr>
        </thead>
        <tbody>
          {pageAccounts.map((acc, idx) => (
            <tr key={start + idx}>
              <td className="mono">{acc.account_id}</td>
              <td>{getRiskBadge(acc.suspicion_score)}</td>
              <td>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                  {acc.detected_patterns.map((p, i) => (
                    <span key={i} className={`badge ${getPatternLabel(p)}`}>
                      {p.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', padding: '0.8rem' }}>
          <button
            className="btn btn-ghost"
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            style={{ padding: '0.3rem 0.8rem', fontSize: '0.75rem' }}
          >
            ← Prev
          </button>
          <span style={{ fontSize: '0.75rem', color: '#64748b', alignSelf: 'center' }}>
            {page + 1} / {totalPages}
          </span>
          <button
            className="btn btn-ghost"
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            style={{ padding: '0.3rem 0.8rem', fontSize: '0.75rem' }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

export default ResultsTable;
