/**
 * Antigravity — Financial Forensics Graph Engine (DSA Edition)
 * Course Project: Data Structures & Algorithms
 * 
 * CORE DATA STRUCTURES:
 *   1. Forward Adjacency List (Map): O(1) out-neighbor lookup.
 *   2. Reverse Adjacency List (Map): O(1) in-neighbor lookup.
 *   3. Metadata Map: Stores scores, patterns, and node degrees.
 *
 * ADVANCED DSA ALGORITHMS:
 *   1. Tarjan's Algorithm (SCC): Finds all circular fund cycles in O(V + E).
 *   2. Union-Find (DSU): Identifies disconnected fraud clusters in O(E α(V)).
 *   3. Kruskal's Algorithm (MST): Finds the "Transaction Backbone" in O(E log E).
 *   4. BFS Chain Traversal: Identifies layered shell networks in O(V · (V + E)).
 *   5. Sliding Window: Detects temporal smurfing patterns in O(E log E).
 */

class FraudGraph {
  constructor() {
    this.adjList = new Map();     // sender   → [ { target, amount, ts, tx_id } ]
    this.reverseAdj = new Map();  // receiver → [ { source, amount, ts, tx_id } ]
    this.nodeMap = new Map();     // account  → { id, score, patterns: Set, ring_ids: Set, ... }
    this.edges = [];              // raw edge list
    this.ringCounter = 0;
  }

  addTransaction(tx) {
    const { transaction_id, sender_id, receiver_id, amount, timestamp } = tx;
    const ts = new Date(timestamp).getTime();

    if (!this.adjList.has(sender_id)) this.adjList.set(sender_id, []);
    this.adjList.get(sender_id).push({ target: receiver_id, amount, ts, transaction_id });

    if (!this.reverseAdj.has(receiver_id)) this.reverseAdj.set(receiver_id, []);
    this.reverseAdj.get(receiver_id).push({ source: sender_id, amount, ts, transaction_id });

    for (const id of [sender_id, receiver_id]) {
      if (!this.nodeMap.has(id)) {
        this.nodeMap.set(id, {
          id, score: 0, patterns: new Set(), ring_ids: new Set(),
          inDegree: 0, outDegree: 0, txCount: 0, txTimestamps: []
        });
      }
    }
    const sn = this.nodeMap.get(sender_id);
    const rn = this.nodeMap.get(receiver_id);
    sn.outDegree++; sn.txCount++; sn.txTimestamps.push(ts);
    rn.inDegree++;  rn.txCount++; rn.txTimestamps.push(ts);

    this.edges.push({ sender_id, receiver_id, amount, timestamp, transaction_id });
  }

  // ---------------------------------------------------------------------------
  // 1. TARJAN'S ALGORITHM (Strongly Connected Components)
  //    Time: O(V + E) | Space: O(V)
  // ---------------------------------------------------------------------------
  detectSCCs() {
    const ids = new Map(); // node -> discovery time
    const low = new Map(); // node -> low-link value
    const onStack = new Set();
    const stack = [];
    const sccs = [];
    let time = 0;

    const findSccs = (at) => {
      ids.set(at, time);
      low.set(at, time);
      time++;
      stack.push(at);
      onStack.add(at);

      const neighbors = this.adjList.get(at) || [];
      for (const edge of neighbors) {
        const to = edge.target;
        if (!ids.has(to)) {
          findSccs(to);
          low.set(at, Math.min(low.get(at), low.get(to)));
        } else if (onStack.has(to)) {
          low.set(at, Math.min(low.get(at), ids.get(to)));
        }
      }

      if (ids.get(at) === low.get(at)) {
        const scc = [];
        while (stack.length > 0) {
          const node = stack.pop();
          onStack.delete(node);
          low.set(node, ids.get(at));
          scc.push(node);
          if (node === at) break;
        }
        if (scc.length > 1) {
          const ringId = this._nextRingId();
          sccs.push({
            ring_id: ringId,
            member_accounts: scc,
            pattern_type: 'scc_cycle',
            size: scc.length
          });
          for (const nodeId of scc) {
            const nd = this.nodeMap.get(nodeId);
            nd.patterns.add('circular_flow_scc');
            nd.ring_ids.add(ringId);
            nd.score += 50;
          }
        }
      }
    };

    for (const node of this.nodeMap.keys()) {
      if (!ids.has(node)) findSccs(node);
    }
    return sccs;
  }

  // ---------------------------------------------------------------------------
  // 2. UNION-FIND (Disjoint Set Union)
  //    Time: O(E α(V)) | Space: O(V)
  // ---------------------------------------------------------------------------
  detectClusters() {
    const parent = new Map();
    const rank = new Map();

    const find = (i) => {
      if (parent.get(i) === i) return i;
      const root = find(parent.get(i));
      parent.set(i, root); // Path compression
      return root;
    };

    const union = (i, j) => {
      const rootI = find(i);
      const rootJ = find(j);
      if (rootI !== rootJ) {
        if (rank.get(rootI) < rank.get(rootJ)) {
          parent.set(rootI, rootJ);
        } else if (rank.get(rootI) > rank.get(rootJ)) {
          parent.set(rootJ, rootI);
        } else {
          parent.set(rootI, rootJ);
          rank.set(rootJ, rank.get(rootJ) + 1);
        }
        return true;
      }
      return false;
    };

    // Initialize
    for (const node of this.nodeMap.keys()) {
      parent.set(node, node);
      rank.set(node, 0);
    }

    // Only cluster suspicious transactions or nodes with patterns
    for (const edge of this.edges) {
      const sn = this.nodeMap.get(edge.sender_id);
      const rn = this.nodeMap.get(edge.receiver_id);
      if (sn.score > 0 || rn.score > 0) {
        union(edge.sender_id, edge.receiver_id);
      }
    }

    const clusters = new Map();
    for (const node of this.nodeMap.keys()) {
      const root = find(node);
      const nd = this.nodeMap.get(node);
      if (nd.score > 0) {
        if (!clusters.has(root)) clusters.set(root, []);
        clusters.get(root).push(node);
      }
    }

    return Array.from(clusters.values()).filter(c => c.length > 1).map((members, idx) => ({
      cluster_id: `CLUSTER_${String(idx + 1).padStart(3, '0')}`,
      members,
      size: members.length
    }));
  }

  // ---------------------------------------------------------------------------
  // 3. KRUSKAL'S ALGORITHM (Maximum Spanning Forest)
  //    Time: O(E log E) | Space: O(V + E)
  // ---------------------------------------------------------------------------
  computeMST() {
    // We compute a MAXIMUM Spanning Forest to show the most significant backbone
    const sortedEdges = [...this.edges].sort((a, b) => b.amount - a.amount);
    
    const parent = new Map();
    const find = (i) => {
      if (parent.get(i) === i) return i;
      const root = find(parent.get(i));
      parent.set(i, root);
      return root;
    };

    const union = (i, j) => {
      const rootI = find(i);
      const rootJ = find(j);
      if (rootI !== rootJ) {
        parent.set(rootI, rootJ);
        return true;
      }
      return false;
    };

    for (const node of this.nodeMap.keys()) parent.set(node, node);

    const mstTxIds = new Set();
    for (const edge of sortedEdges) {
      if (union(edge.sender_id, edge.receiver_id)) {
        mstTxIds.add(edge.transaction_id);
      }
    }
    return mstTxIds;
  }

  // ---------------------------------------------------------------------------
  // EXISTING DOMAIN ALGORITHMS (Keep for complete project)
  // ---------------------------------------------------------------------------
  
  detectSmurfing() {
    const WINDOW_MS = 72 * 60 * 60 * 1000;
    const THRESHOLD = 10;
    const rings = [];

    for (const [nodeId, nodeData] of this.nodeMap) {
      if (this._isMerchantLike(nodeId)) continue;

      // Fan-in
      const incoming = this.reverseAdj.get(nodeId) || [];
      if (incoming.length >= THRESHOLD) {
        const sorted = [...incoming].sort((a, b) => a.ts - b.ts);
        let left = 0;
        for (let right = 0; right < sorted.length; right++) {
          while (sorted[right].ts - sorted[left].ts > WINDOW_MS) left++;
          const windowTx = sorted.slice(left, right + 1);
          const uniqueSenders = new Set(windowTx.map(e => e.source));
          if (uniqueSenders.size >= THRESHOLD) {
            const ringId = this._nextRingId();
            rings.push({ ring_id: ringId, member_accounts: [nodeId, ...uniqueSenders], pattern_type: 'smurfing_fan_in' });
            nodeData.patterns.add('fan_in');
            nodeData.ring_ids.add(ringId);
            nodeData.score += 30;
            for (const s of uniqueSenders) {
              const sn = this.nodeMap.get(s);
              if (sn && !this._isMerchantLike(s)) { sn.patterns.add('fan_in_source'); sn.ring_ids.add(ringId); sn.score += 15; }
            }
            break;
          }
        }
      }

      // Fan-out
      const outgoing = this.adjList.get(nodeId) || [];
      if (outgoing.length >= THRESHOLD) {
        if (this._detectPayrollPattern(nodeId)) continue;
        const sorted = [...outgoing].sort((a, b) => a.ts - b.ts);
        let left = 0;
        for (let right = 0; right < sorted.length; right++) {
          while (sorted[right].ts - sorted[left].ts > WINDOW_MS) left++;
          const windowTx = sorted.slice(left, right + 1);
          const uniqueReceivers = new Set(windowTx.map(e => e.target));
          if (uniqueReceivers.size >= THRESHOLD) {
            const ringId = this._nextRingId();
            rings.push({ ring_id: ringId, member_accounts: [nodeId, ...uniqueReceivers], pattern_type: 'smurfing_fan_out' });
            nodeData.patterns.add('fan_out');
            nodeData.ring_ids.add(ringId);
            nodeData.score += 30;
            for (const r of uniqueReceivers) {
              const rn = this.nodeMap.get(r);
              if (rn && !this._isMerchantLike(r) && !this._detectPayrollPattern(r)) { rn.patterns.add('fan_out_target'); rn.ring_ids.add(ringId); rn.score += 15; }
            }
            break;
          }
        }
      }
    }
    return rings;
  }

  detectLayeredChains() {
    const rings = [];
    const MAX_CHAIN_DEPTH = 8;
    const seenChains = new Set();
    for (const [startNode] of this.nodeMap) {
      const queue = [{ node: startNode, path: [startNode] }];
      while (queue.length > 0) {
        const { node, path } = queue.shift();
        if (path.length > MAX_CHAIN_DEPTH) continue;
        const neighbors = this.adjList.get(node) || [];
        for (const edge of neighbors) {
          const next = edge.target;
          if (path.includes(next)) continue;
          const nextData = this.nodeMap.get(next);
          const newPath = [...path, next];
          if (newPath.length >= 4) {
            const intermediates = newPath.slice(1, -1);
            if (intermediates.every(m => this.nodeMap.get(m).txCount <= 3)) {
              const key = newPath.join('→');
              if (!seenChains.has(key)) {
                seenChains.add(key);
                const ringId = this._nextRingId();
                rings.push({ ring_id: ringId, member_accounts: [...newPath], pattern_type: 'layered_chain' });
                for (const m of newPath) { const nd = this.nodeMap.get(m); nd.patterns.add('layered_chain'); nd.ring_ids.add(ringId); nd.score += 20; }
              }
            }
          }
          if (nextData.txCount <= 3 && newPath.length < MAX_CHAIN_DEPTH) queue.push({ node: next, path: newPath });
        }
      }
    }
    return rings;
  }

  _isMerchantLike(nodeId) {
    const d = this.nodeMap.get(nodeId);
    return d && ((d.inDegree >= 20 && d.outDegree >= 20) || (d.inDegree >= 50 && d.outDegree <= 2));
  }

  _detectPayrollPattern(nodeId) {
    const o = this.adjList.get(nodeId) || [];
    if (o.length < 5) return false;
    const uniqueAmounts = new Set(o.map(e => e.amount));
    return uniqueAmounts.size <= 2 && o.length >= 10;
  }

  calculateFinalScores() {
    for (const [nodeId, data] of this.nodeMap) {
      if (this._isMerchantLike(nodeId) || this._detectPayrollPattern(nodeId)) {
        data.score = 0; data.patterns.clear(); data.ring_ids.clear();
      }
      data.score = Math.min(100, data.score);
    }
  }

  getResults(processingTimeMs, extra) {
    const mstTxIds = extra.mstTxIds || new Set();
    const suspicious_accounts = [];
    for (const [id, data] of this.nodeMap) {
      if (data.score > 0) {
        suspicious_accounts.push({
          account_id: id,
          suspicion_score: parseFloat(data.score.toFixed(1)),
          detected_patterns: Array.from(data.patterns),
          ring_id: data.ring_ids.size > 0 ? Array.from(data.ring_ids)[0] : null
        });
      }
    }
    suspicious_accounts.sort((a, b) => b.suspicion_score - a.suspicion_score);

    return {
      suspicious_accounts,
      ...extra,
      graph_data: {
        nodes: Array.from(this.nodeMap.values()).map(n => ({
          id: n.id, score: n.score,
          ring_id: n.ring_ids.size > 0 ? Array.from(n.ring_ids)[0] : null,
          patterns: Array.from(n.patterns)
        })),
        links: this.edges.map(e => ({
          source: e.sender_id, target: e.receiver_id,
          amount: e.amount, timestamp: e.timestamp, transaction_id: e.transaction_id,
          isMST: mstTxIds.has(e.transaction_id)
        }))
      }
    };
  }

  _nextRingId() {
    this.ringCounter++;
    return `RING_${String(this.ringCounter).padStart(3, '0')}`;
  }
}

module.exports = FraudGraph;
