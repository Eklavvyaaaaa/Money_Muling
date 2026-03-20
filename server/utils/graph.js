/**
 * Antigravity — Financial Forensics Graph Engine
 * RIFT 2026 Hackathon • Graph Theory Track
 *
 * Data Structures:
 *   - Forward Adjacency List  (sender → [receivers])    — O(1) out-neighbor lookup
 *   - Reverse Adjacency List  (receiver → [senders])    — O(1) in-neighbor lookup
 *   - HashMap for node metadata                         — O(1) score/pattern access
 *
 * Algorithms:
 *   1. Cycle Detection   — DFS with recursion stack, lengths 3-5, O(V·(V+E))
 *   2. Smurfing          — Temporal sliding window (72 h), O(E·log E)
 *   3. Layered Chains    — BFS path traversal, degree-filtered, O(V·(V+E))
 *   4. False-Positive    — Merchant / payroll heuristic filter, O(V)
 */

class FraudGraph {
  constructor() {
    // --- Core data structures ---------------------------------------------------
    this.adjList     = new Map();   // sender   → [ { receiver, amount, timestamp, tx_id } ]
    this.reverseAdj  = new Map();   // receiver → [ { sender,   amount, timestamp, tx_id } ]
    this.nodeMap     = new Map();   // account  → { id, score, patterns: Set, ring_ids: Set,
                                    //              inDegree, outDegree, txCount, txTimestamps[] }
    this.edges       = [];          // raw edge list for serialisation
    this.ringCounter = 0;
  }

  // ---------------------------------------------------------------------------
  // Graph construction — O(1) per transaction
  // ---------------------------------------------------------------------------
  addTransaction(tx) {
    const { transaction_id, sender_id, receiver_id, amount, timestamp } = tx;
    const ts = new Date(timestamp).getTime();

    // Forward edge
    if (!this.adjList.has(sender_id)) this.adjList.set(sender_id, []);
    this.adjList.get(sender_id).push({ target: receiver_id, amount, ts, transaction_id });

    // Reverse edge
    if (!this.reverseAdj.has(receiver_id)) this.reverseAdj.set(receiver_id, []);
    this.reverseAdj.get(receiver_id).push({ source: sender_id, amount, ts, transaction_id });

    // Node metadata
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
  // 1. CYCLE DETECTION — DFS with recursion stack
  //    Time:  O(V · (V + E))   Space: O(V + E)
  // ---------------------------------------------------------------------------
  detectCycles(minLen = 3, maxLen = 5) {
    const rings = [];
    const seenCanonical = new Set();

    for (const startNode of this.nodeMap.keys()) {
      // DFS from startNode looking for cycles back to startNode
      const stack = [{ node: startNode, path: [startNode], depth: 1 }];

      while (stack.length > 0) {
        const { node, path, depth } = stack.pop();
        const neighbors = this.adjList.get(node) || [];

        for (const edge of neighbors) {
          const next = edge.target;

          if (next === startNode && depth >= minLen) {
            // Found a cycle — canonicalise to deduplicate
            const canonical = this._canonicaliseCycle(path);
            if (!seenCanonical.has(canonical)) {
              seenCanonical.add(canonical);
              const ringId = this._nextRingId();
              rings.push({
                ring_id: ringId,
                member_accounts: [...path],
                pattern_type: 'cycle',
                cycle_length: path.length
              });
              // Tag nodes
              for (const m of path) {
                const nd = this.nodeMap.get(m);
                nd.patterns.add(`cycle_length_${path.length}`);
                nd.ring_ids.add(ringId);
                nd.score += 40;
              }
            }
          } else if (depth < maxLen && !path.includes(next)) {
            stack.push({ node: next, path: [...path, next], depth: depth + 1 });
          }
        }
      }
    }
    return rings;
  }

  /** Canonical form: rotate so smallest element is first, then join */
  _canonicaliseCycle(path) {
    const minIdx = path.indexOf(path.slice().sort()[0]);
    const rotated = [...path.slice(minIdx), ...path.slice(0, minIdx)];
    return rotated.join('→');
  }

  // ---------------------------------------------------------------------------
  // 2. SMURFING — Fan-in / Fan-out with 72-hour sliding window
  //    Time:  O(E·log E)  (dominated by timestamp sort)
  //    Space: O(E)
  // ---------------------------------------------------------------------------
  detectSmurfing() {
    const WINDOW_MS = 72 * 60 * 60 * 1000;
    const THRESHOLD = 10;
    const rings = [];

    for (const [nodeId, nodeData] of this.nodeMap) {
      // Skip nodes already identified as likely merchants (false-positive guard)
      if (this._isMerchantLike(nodeId)) continue;

      // ---- Fan-in: many unique senders → this node within 72 h ----
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
            const members = [nodeId, ...uniqueSenders];
            rings.push({
              ring_id: ringId,
              member_accounts: members,
              pattern_type: 'smurfing_fan_in'
            });
            nodeData.patterns.add('fan_in');
            nodeData.ring_ids.add(ringId);
            nodeData.score += 30;
            for (const s of uniqueSenders) {
              const sn = this.nodeMap.get(s);
              if (sn && !this._isMerchantLike(s)) {
                sn.patterns.add('fan_in_source');
                sn.ring_ids.add(ringId);
                sn.score += 15;
              }
            }
            break; // one detection per node
          }
        }
      }

      // ---- Fan-out: this node → many unique receivers within 72 h ----
      const outgoing = this.adjList.get(nodeId) || [];
      if (outgoing.length >= THRESHOLD) {
        // Skip payroll-like accounts before scoring fan-out
        if (this._detectPayrollPattern(nodeId)) continue;

        const sorted = [...outgoing].sort((a, b) => a.ts - b.ts);
        let left = 0;
        for (let right = 0; right < sorted.length; right++) {
          while (sorted[right].ts - sorted[left].ts > WINDOW_MS) left++;
          const windowTx = sorted.slice(left, right + 1);
          const uniqueReceivers = new Set(windowTx.map(e => e.target));
          if (uniqueReceivers.size >= THRESHOLD) {
            const ringId = this._nextRingId();
            const members = [nodeId, ...uniqueReceivers];
            rings.push({
              ring_id: ringId,
              member_accounts: members,
              pattern_type: 'smurfing_fan_out'
            });
            nodeData.patterns.add('fan_out');
            nodeData.ring_ids.add(ringId);
            nodeData.score += 30;
            for (const r of uniqueReceivers) {
              const rn = this.nodeMap.get(r);
              if (rn && !this._isMerchantLike(r) && !this._detectPayrollPattern(r)) {
                rn.patterns.add('fan_out_target');
                rn.ring_ids.add(ringId);
                rn.score += 15;
              }
            }
            break;
          }
        }
      }
    }
    return rings;
  }

  // ---------------------------------------------------------------------------
  // 3. LAYERED SHELL NETWORK DETECTION — BFS chain traversal
  //    Time:  O(V · (V + E))   Space: O(V)
  //    Intermediate nodes: total degree (in + out) ≤ 3
  // ---------------------------------------------------------------------------
  detectLayeredChains() {
    const rings = [];
    const MAX_CHAIN_DEPTH = 8;
    const seenChains = new Set();

    for (const [startNode] of this.nodeMap) {
      // BFS / iterative DFS for chains
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

          // Record chains of ≥ 3 hops (4+ nodes) where intermediates have low activity
          if (newPath.length >= 4) {
            const intermediates = newPath.slice(1, -1);
            const allShell = intermediates.every(m => {
              const d = this.nodeMap.get(m);
              return d.txCount <= 3;
            });

            if (allShell) {
              const key = newPath.join('→');
              if (!seenChains.has(key)) {
                seenChains.add(key);
                const ringId = this._nextRingId();
                rings.push({
                  ring_id: ringId,
                  member_accounts: [...newPath],
                  pattern_type: 'layered_chain'
                });
                for (const m of newPath) {
                  const nd = this.nodeMap.get(m);
                  nd.patterns.add('layered_chain');
                  nd.ring_ids.add(ringId);
                  nd.score += 20;
                }
              }
            }
          }

          // Only continue BFS through low-degree intermediates
          if (nextData.txCount <= 3 && newPath.length < MAX_CHAIN_DEPTH) {
            queue.push({ node: next, path: newPath });
          }
        }
      }
    }
    return rings;
  }

  // ---------------------------------------------------------------------------
  // 4. FALSE-POSITIVE CONTROL
  //    Heuristic: a "merchant" has high fan-in AND high fan-out AND regular txns
  //    Heuristic: a "payroll" account sends same amounts at regular intervals
  // ---------------------------------------------------------------------------
  _isMerchantLike(nodeId) {
    const data = this.nodeMap.get(nodeId);
    if (!data) return false;
    // High-volume bidirectional traffic → likely a merchant or exchange
    if (data.inDegree >= 20 && data.outDegree >= 20) return true;
    // Very high fan-in with very low fan-out → likely a large business receiving payments
    if (data.inDegree >= 50 && data.outDegree <= 2) return true;
    return false;
  }

  _detectPayrollPattern(nodeId) {
    const outgoing = this.adjList.get(nodeId) || [];
    if (outgoing.length < 5) return false;
    // Check if amounts are identical (common in payroll)
    const amounts = outgoing.map(e => e.amount);
    const uniqueAmounts = new Set(amounts);
    if (uniqueAmounts.size <= 2 && outgoing.length >= 10) return true;
    return false;
  }

  // ---------------------------------------------------------------------------
  // 5. HIGH VELOCITY DETECTION
  //    >10 transactions within 24 hours
  // ---------------------------------------------------------------------------
  detectHighVelocity() {
    const WINDOW_24H = 24 * 60 * 60 * 1000;

    for (const [nodeId, data] of this.nodeMap) {
      if (this._isMerchantLike(nodeId)) continue;
      if (this._detectPayrollPattern(nodeId)) continue;

      const timestamps = [...data.txTimestamps].sort((a, b) => a - b);
      let left = 0;
      for (let right = 0; right < timestamps.length; right++) {
        while (timestamps[right] - timestamps[left] > WINDOW_24H) left++;
        if (right - left + 1 > 10) {
          data.patterns.add('high_velocity');
          data.score += 10;
          break;
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 6. SCORING — Normalise to 0–100, apply false-positive suppression
  // ---------------------------------------------------------------------------
  calculateFinalScores() {
    this.detectHighVelocity();

    for (const [nodeId, data] of this.nodeMap) {
      // Suppress false positives
      if (this._isMerchantLike(nodeId) || this._detectPayrollPattern(nodeId)) {
        data.score = 0;
        data.patterns.clear();
        data.ring_ids.clear();
        continue;
      }
      // Cap at 100
      data.score = Math.min(100, data.score);
    }
  }

  // ---------------------------------------------------------------------------
  // 7. OUTPUT — Strict JSON matching RIFT spec
  // ---------------------------------------------------------------------------
  getResults(processingTimeMs) {
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

    // Sort descending by suspicion_score (spec requirement)
    suspicious_accounts.sort((a, b) => b.suspicion_score - a.suspicion_score);

    return {
      suspicious_accounts,
      graph_data: {
        nodes: Array.from(this.nodeMap.values()).map(n => ({
          id: n.id,
          score: n.score,
          ring_id: n.ring_ids.size > 0 ? Array.from(n.ring_ids)[0] : null,
          patterns: Array.from(n.patterns)
        })),
        links: this.edges.map(e => ({
          source: e.sender_id,
          target: e.receiver_id,
          amount: e.amount,
          timestamp: e.timestamp,
          transaction_id: e.transaction_id
        }))
      }
    };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  _nextRingId() {
    this.ringCounter++;
    return `RING_${String(this.ringCounter).padStart(3, '0')}`;
  }
}

module.exports = FraudGraph;
