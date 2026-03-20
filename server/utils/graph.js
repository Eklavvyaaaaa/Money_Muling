const { v4: uuidv4 } = require('uuid');

class FraudGraph {
  constructor() {
    this.nodes = new Map(); // account_id -> { id, transactions: [], inDegree: 0, outDegree: 0, score: 0, patterns: new Set(), ring_id: null }
    this.edges = []; // { transaction_id, sender_id, receiver_id, amount, timestamp }
  }

  addTransaction(tx) {
    const { sender_id, receiver_id } = tx;
    this.edges.push(tx);

    if (!this.nodes.has(sender_id)) {
      this.nodes.set(sender_id, { id: sender_id, transactions: [], inDegree: 0, outDegree: 0, score: 0, patterns: new Set(), ring_id: null });
    }
    if (!this.nodes.has(receiver_id)) {
      this.nodes.set(receiver_id, { id: receiver_id, transactions: [], inDegree: 0, outDegree: 0, score: 0, patterns: new Set(), ring_id: null });
    }

    this.nodes.get(sender_id).transactions.push(tx);
    this.nodes.get(sender_id).outDegree++;
    this.nodes.get(receiver_id).inDegree++;
  }

  detectCycles(minLen = 3, maxLen = 5) {
    const visited = new Set();
    const rings = [];

    const findCycles = (u, startNode, path, depth) => {
      if (depth > maxLen) return;
      
      const nodeData = this.nodes.get(u);
      for (const tx of nodeData.transactions) {
        const v = tx.receiver_id;
        if (v === startNode && depth >= minLen - 1) {
          rings.push([...path, v]);
          return;
        }
        if (!path.includes(v)) {
          findCycles(v, startNode, [...path, v], depth + 1);
        }
      }
    };

    for (const [nodeId] of this.nodes) {
      findCycles(nodeId, nodeId, [nodeId], 1);
    }

    // Deduplicate and ID rings
    const uniqueRings = [];
    const seenRings = new Set();

    rings.forEach(ring => {
      const sortedRing = [...ring].sort().join(',');
      if (!seenRings.has(sortedRing)) {
        seenRings.add(sortedRing);
        const ringId = `RING_${String(uniqueRings.length + 1).padStart(3, '0')}`;
        uniqueRings.push({ id: ringId, members: ring, type: 'cycle' });
        ring.forEach(m => {
          const n = this.nodes.get(m);
          n.patterns.add(`cycle_length_${ring.length}`);
          n.ring_id = ringId;
          n.score += 40;
        });
      }
    });

    return uniqueRings;
  }

  detectSmurfing() {
    const WINDOW_72H = 72 * 60 * 60 * 1000;
    const rings = [];

    for (const [nodeId, nodeData] of this.nodes) {
      // Fan-in: Multiple senders to one receiver
      const incoming = this.edges.filter(e => e.receiver_id === nodeId);
      if (incoming.length >= 10) {
        incoming.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        for (let i = 0; i < incoming.length - 9; i++) {
          const timeDiff = new Date(incoming[i+9].timestamp) - new Date(incoming[i].timestamp);
          if (timeDiff <= WINDOW_72H) {
            nodeData.patterns.add('fan-in');
            nodeData.score += 30;
            const ringId = `RING_${String(rings.length + 100).padStart(3, '0')}`;
            rings.push({
              id: ringId,
              members: [nodeId, ...incoming.slice(i, i+10).map(e => e.sender_id)],
              type: 'smurfing_fan_in'
            });
            break;
          }
        }
      }

      // Fan-out: One sender to multiple receivers
      const outgoing = nodeData.transactions;
      if (outgoing.length >= 10) {
        outgoing.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        for (let i = 0; i < outgoing.length - 9; i++) {
          const timeDiff = new Date(outgoing[i+9].timestamp) - new Date(outgoing[i].timestamp);
          if (timeDiff <= WINDOW_72H) {
            nodeData.patterns.add('fan-out');
            nodeData.score += 30;
            const ringId = `RING_${String(rings.length + 100).padStart(3, '0')}`;
            rings.push({
              id: ringId,
              members: [nodeId, ...outgoing.slice(i, i+10).map(e => e.receiver_id)],
              type: 'smurfing_fan_out'
            });
            break;
          }
        }
      }
    }
    return rings;
  }

  detectLayeredChains() {
    const rings = [];
    const visited = new Set();

    const findChain = (u, path) => {
      const nodeData = this.nodes.get(u);
      // Intermediate nodes must have <= 3 transactions
      if (path.length > 1 && (nodeData.inDegree + nodeData.outDegree) > 3) return;

      if (path.length >= 3) {
        rings.push({
           id: `RING_CHAIN_${rings.length}`,
           members: [...path],
           type: 'layered_chain'
        });
        path.forEach(m => {
          const n = this.nodes.get(m);
          n.patterns.add('layered_chain');
          n.score += 20;
        });
      }

      for (const tx of nodeData.transactions) {
        const v = tx.receiver_id;
        if (!path.includes(v)) {
          findChain(v, [...path, v]);
        }
      }
    };

    for (const [nodeId] of this.nodes) {
      findChain(nodeId, [nodeId]);
    }
    return rings;
  }

  calculateFinalScores() {
    for (const [nodeId, nodeData] of this.nodes) {
      // High velocity: > 5 transactions in 24h (simplified)
      if (nodeData.transactions.length > 5) {
        nodeData.patterns.add('high_velocity');
        nodeData.score += 10;
      }
      // Normalize to 0-100
      nodeData.score = Math.min(100, nodeData.score);
    }
  }

  getResults() {
    const suspicious_accounts = [];
    for (const [id, data] of this.nodes) {
      if (data.score > 0) {
        suspicious_accounts.push({
          account_id: id,
          suspicion_score: data.score,
          detected_patterns: Array.from(data.patterns),
          ring_id: data.ring_id
        });
      }
    }

    return {
      suspicious_accounts: suspicious_accounts.sort((a,b) => b.suspicion_score - a.suspicion_score),
      graph_data: {
        nodes: Array.from(this.nodes.values()).map(n => ({
          id: n.id,
          score: n.score,
          ring_id: n.ring_id
        })),
        links: this.edges.map(e => ({
          source: e.sender_id,
          target: e.receiver_id,
          amount: e.amount,
          timestamp: e.timestamp
        }))
      }
    };
  }
}

module.exports = FraudGraph;
