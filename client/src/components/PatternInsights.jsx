import React from 'react';

function PatternInsights({ results }) {
  const { fraud_rings, suspicious_accounts, fraud_clusters, summary } = results;

  const sccRings = fraud_rings.filter(r => r.pattern_type === 'scc_cycle');
  const smurfRings = fraud_rings.filter(r => 
    r.pattern_type.includes('smurfing') || r.pattern_type.includes('smurf')
  );
  const chainRings = fraud_rings.filter(r => r.pattern_type === 'layered_chain');

  const patterns = [];

  if (sccRings.length > 0) {
    patterns.push({
      key: 'scc',
      icon: '🛡️',
      iconClass: 'cycle',
      title: "Tarjan's SCC (Found Loops)",
      count: sccRings.length,
      desc: `Detected circular subgraphs in $O(V+E)$ time. These represent accounts where money eventually returns to the sender, regardless of the number of hops.`,
      flow: "A → B → ... → Z → A",
    });
  }

  if (fraud_clusters && fraud_clusters.length > 0) {
    patterns.push({
      key: 'union-find',
      icon: '🧩',
      iconClass: 'velocity',
      title: "Union-Find Clusters",
      count: fraud_clusters.length,
      desc: `Grouped related suspicious accounts into $O(E \\alpha(V))$ components. These represent entire organized fraud networks rather than individual rings.`,
      flow: "Cluster 001: {AccA, AccB, AccC}",
    });
  }

  if (smurfRings.length > 0) {
    patterns.push({
      key: 'smurf',
      icon: '🕸️',
      iconClass: 'smurf',
      title: 'Sliding Window Smurfing',
      count: smurfRings.length,
      desc: `Identifies temporal aggregation (Fan-in) and dispersal (Fan-out) patterns within a 72-hour sliding window.`,
      flow: "Many Senders ⇉ Single Hub",
    });
  }

  if (chainRings.length > 0) {
    patterns.push({
      key: 'chain',
      icon: '🔗',
      iconClass: 'chain',
      title: 'BFS Layered Chains',
      count: chainRings.length,
      desc: `Traced funds through low-activity shell accounts using BFS traversal to uncover layering behavior.`,
      flow: "Sender → Shell → Shell → Receiver",
    });
  }

  if (patterns.length === 0) return null;

  return (
    <section className="patterns-section">
      <h3>🧠 Algorithmic Insights (DSA Analysis)</h3>
      <div className="patterns-grid">
        {patterns.map(p => (
          <div className="pattern-card" key={p.key}>
            <div className="pc-header">
              <div className={`pc-icon ${p.iconClass}`}>{p.icon}</div>
              <div>
                <div className="pc-title">{p.title}</div>
                <div className="pc-count">{p.count} finding{p.count !== 1 ? 's' : ''}</div>
              </div>
            </div>
            <p className="pc-desc">{p.desc}</p>
            <div className="pc-flow">
              {p.flow}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default PatternInsights;
