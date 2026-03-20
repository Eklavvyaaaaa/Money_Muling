import React, { useState } from 'react';

/**
 * RingDetail — Expandable rows showing each detected fraud ring,
 * its members, flow path, and a human-readable description.
 */
function RingDetail({ rings }) {
  const [expandedRing, setExpandedRing] = useState(null);

  if (!rings || rings.length === 0) return null;

  const toggle = (id) => setExpandedRing(expandedRing === id ? null : id);

  const getPatternLabel = (type) => {
    if (type === 'cycle') return { text: 'Cycle', cls: 'badge-danger' };
    if (type.includes('fan_in')) return { text: 'Fan-In', cls: 'badge-warning' };
    if (type.includes('fan_out')) return { text: 'Fan-Out', cls: 'badge-warning' };
    if (type === 'layered_chain') return { text: 'Chain', cls: 'badge-cyan' };
    return { text: type, cls: 'badge-accent' };
  };

  const getDescription = (ring) => {
    const members = ring.member_accounts;
    if (ring.pattern_type === 'cycle') {
      return `Circular fund routing detected: money flows through ${members.length} accounts in a closed loop (${members[0]} → … → ${members[members.length - 1]} → ${members[0]}), making it difficult to trace the original source. This is a primary indicator of money laundering.`;
    }
    if (ring.pattern_type.includes('fan_in')) {
      return `Aggregation pattern: ${members.length - 1} accounts sent funds to ${members[0]} within a 72-hour window. This "many-to-one" pattern is consistent with smurfing, where small amounts from multiple mules are consolidated into a single account.`;
    }
    if (ring.pattern_type.includes('fan_out')) {
      return `Dispersal pattern: ${members[0]} distributed funds to ${members.length - 1} different accounts within 72 hours. This "one-to-many" pattern is used to quickly spread illicit funds across multiple accounts to avoid detection thresholds.`;
    }
    if (ring.pattern_type === 'layered_chain') {
      return `Layered transfer chain: funds moved through ${members.length} accounts sequentially (${members[0]} → … → ${members[members.length - 1]}). The intermediate accounts have very low transaction counts (≤3), suggesting they exist solely as pass-through "shell" entities to add obfuscation layers.`;
    }
    return `Suspicious pattern detected involving ${members.length} accounts.`;
  };

  return (
    <section className="rings-detail">
      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        🎯 Fraud Ring Details
        <span className="badge badge-danger">{rings.length} rings</span>
      </h3>

      {rings.slice(0, 20).map((ring) => {
        const label = getPatternLabel(ring.pattern_type);
        const isOpen = expandedRing === ring.ring_id;

        return (
          <div className="ring-row" key={ring.ring_id}>
            <div className="ring-header" onClick={() => toggle(ring.ring_id)}>
              <div className="ring-info">
                <span className="ring-label">{ring.ring_id}</span>
                <span className={`badge ${label.cls}`}>{label.text}</span>
              </div>
              <div className="ring-meta">
                <span>{ring.member_count || ring.member_accounts.length} members</span>
                <span>Risk: <strong style={{ color: ring.risk_score >= 70 ? '#ef4444' : '#f59e0b' }}>{ring.risk_score.toFixed(1)}</strong></span>
                <span style={{ color: '#64748b' }}>{isOpen ? '▲' : '▼'}</span>
              </div>
            </div>

            {isOpen && (
              <div className="ring-body">
                {/* Flow visualization */}
                <div className="flow-visual">
                  {ring.member_accounts.map((m, i) => (
                    <span key={i}>
                      <span style={{ color: '#f1f5f9' }}>{m}</span>
                      {i < ring.member_accounts.length - 1 && (
                        <span style={{ color: '#6366f1', margin: '0 6px' }}>→</span>
                      )}
                    </span>
                  ))}
                  {ring.pattern_type === 'cycle' && (
                    <span>
                      <span style={{ color: '#6366f1', margin: '0 6px' }}>→</span>
                      <span style={{ color: '#ef4444' }}>{ring.member_accounts[0]}</span>
                      <span style={{ color: '#64748b', marginLeft: '6px' }}>(loop)</span>
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="ring-desc">{getDescription(ring)}</p>
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

export default RingDetail;
