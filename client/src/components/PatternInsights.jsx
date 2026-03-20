import React from 'react';

/**
 * PatternInsights — Explains HOW money muling is happening based on detected patterns.
 * All data is dynamically derived from results, nothing hardcoded.
 */
function PatternInsights({ results }) {
  const { fraud_rings, suspicious_accounts } = results;

  // Count patterns dynamically from actual results
  const cycleRings = fraud_rings.filter(r => r.pattern_type === 'cycle');
  const smurfRings = fraud_rings.filter(r =>
    r.pattern_type.includes('smurfing') || r.pattern_type.includes('smurf')
  );
  const chainRings = fraud_rings.filter(r => r.pattern_type === 'layered_chain');
  const velocityAccounts = suspicious_accounts.filter(a =>
    a.detected_patterns.includes('high_velocity')
  );

  // Only show patterns that were actually detected
  const patterns = [];

  if (cycleRings.length > 0) {
    // Build a description from actual data
    const example = cycleRings[0];
    const members = example.member_accounts;
    patterns.push({
      key: 'cycle',
      icon: '🔄',
      iconClass: 'cycle',
      title: 'Circular Fund Routing',
      count: cycleRings.length,
      desc: `Money flows in a closed loop through ${members.length} accounts, returning to the origin to obscure the source. This is a classic money laundering technique.`,
      flow: members.join(' → ') + ' → ' + members[0] + ' (loop)',
    });
  }

  if (smurfRings.length > 0) {
    const fanInRings = smurfRings.filter(r => r.pattern_type.includes('fan_in'));
    const fanOutRings = smurfRings.filter(r => r.pattern_type.includes('fan_out'));
    const example = smurfRings[0];
    const hub = example.member_accounts[0];
    const spokes = example.member_accounts.slice(1, 5);

    let desc = '';
    if (fanInRings.length > 0 && fanOutRings.length > 0) {
      desc = `Detected both aggregation (${fanInRings.length} fan-in) and dispersal (${fanOutRings.length} fan-out) patterns. Small deposits from many accounts are funneled into a hub, then quickly dispersed to avoid reporting thresholds.`;
    } else if (fanInRings.length > 0) {
      desc = `${fanInRings.length} aggregation pattern(s) detected: multiple accounts send small amounts to a single hub account within 72 hours, a technique called "structuring" or "smurfing".`;
    } else {
      desc = `${fanOutRings.length} dispersal pattern(s): one account rapidly disperses funds to ${example.member_accounts.length - 1}+ recipients within 72 hours.`;
    }

    patterns.push({
      key: 'smurf',
      icon: '🕸️',
      iconClass: 'smurf',
      title: 'Smurfing / Structuring',
      count: smurfRings.length,
      desc,
      flow: fanInRings.length > 0
        ? `${spokes.join(', ')}… → ${hub} (aggregation hub)`
        : `${hub} → ${spokes.join(', ')}… (dispersal)`,
    });
  }

  if (chainRings.length > 0) {
    const example = chainRings[0];
    const members = example.member_accounts;
    patterns.push({
      key: 'chain',
      icon: '🔗',
      iconClass: 'chain',
      title: 'Layered Shell Networks',
      count: chainRings.length,
      desc: `Funds pass through ${members.length - 2} intermediate "shell" accounts with very low activity (≤3 transactions each). These intermediaries exist only to add layers between the source and destination.`,
      flow: members.join(' → '),
    });
  }

  if (velocityAccounts.length > 0) {
    patterns.push({
      key: 'velocity',
      icon: '⚡',
      iconClass: 'velocity',
      title: 'High Velocity Movement',
      count: velocityAccounts.length,
      desc: `${velocityAccounts.length} account(s) executed over 10 transactions within a 24-hour window, indicating urgency to move funds quickly before detection.`,
      flow: velocityAccounts.slice(0, 4).map(a => a.account_id).join(', ') + (velocityAccounts.length > 4 ? '…' : ''),
    });
  }

  if (patterns.length === 0) return null;

  return (
    <section className="patterns-section">
      <h3>🧠 How Money Is Being Muled</h3>
      <div className="patterns-grid">
        {patterns.map(p => (
          <div className="pattern-card" key={p.key}>
            <div className="pc-header">
              <div className={`pc-icon ${p.iconClass}`}>{p.icon}</div>
              <div>
                <div className="pc-title">{p.title}</div>
                <div className="pc-count">{p.count} pattern{p.count !== 1 ? 's' : ''} detected</div>
              </div>
            </div>
            <p className="pc-desc">{p.desc}</p>
            <div className="pc-flow">
              {p.flow.split(' → ').map((segment, i, arr) => (
                <span key={i}>
                  {segment}{i < arr.length - 1 && <span className="flow-arrow">→</span>}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default PatternInsights;
