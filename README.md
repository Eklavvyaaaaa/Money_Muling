# Antigravity: Financial Forensics Engine (DSA Suite)

> **Course Project**: Data Structures & Algorithms
> **Focus**: Graph Theory, Disjoint Sets, and Spanning Trees

Antigravity is a financial forensics platform that models transactions as a directed graph. It applies classic Data Structures and Algorithms (DSA) to identify money muling networks and organized crime clusters.

---

## 🧠 Algorithmic Implementation

### 1. Strongly Connected Components (Tarjan's Algorithm)
- **Problem**: Identifying "Circular Fund Routing" where money returns to the source through any number of hops.
- **Implementation**: Classic $O(V + E)$ single-pass DFS with low-link values and a recursion stack.
- **Academic Value**: Demonstrates mastery of DFS-based graph traversal and cycle decomposition.

### 2. Organized Clusters (Union-Find / DSU)
- **Problem**: Grouping individual fraud rings and suspicious accounts into larger organized crime cells.
- **Implementation**: Disjoint Set Union (DSU) with **Path Compression** and **Union by Rank**.
- **Complexity**: $O(E \alpha(V))$, where $\alpha$ is the nearly-constant Inverse Ackermann function.
- **Academic Value**: Demonstrates use of optimized aggregate data structures for set partitioning.

### 3. Transaction Backbone (Kruskal's Algorithm)
- **Problem**: Identifying the most significant flow of funds across the entire network (Maximum Spanning Forest).
- **Implementation**: $O(E \log E)$ greedy algorithm. We sort all transactions by amount and unify components until a spanning structure is formed.
- **Academic Value**: Demonstrates understanding of greedy strategy and spanning tree properties in weighted graphs.

### 4. Layered Shell Networks (BFS)
- **Problem**: Finding multi-hop paths through low-activity "shell" accounts.
- **Implementation**: Breadth-First Search (BFS) with pruning based on node degree and transaction count.
- **Complexity**: $O(V \cdot (V + E))$.

---

## 🛠️ Data Structures Used

| Structure | Purpose |
|-----------|---------|
| **Adjacency List** | Primary graph representation for $O(1)$ neighbor lookup. |
| **Reverse Adjacency List** | Optimization for "Fan-in" (Smurfing) detection. |
| **HashSet / Map** | Constant-time visited-tracking and metadata storage. |
| **Priority Queue / Sorting** | Essential for Kruskal's edge selection. |
| **Recusion Stack** | Utilized for Tarjan's discovery process. |

---

## 🚀 Getting Started

### 1. Environment Setup
- **Node.js**: ≥ 18.0.0
- **npm**: ≥ 9.0.0

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/Eklavvyaaaaa/Money_Muling.git
cd Money_Muling

# Setup Backend
cd server && npm install
node index.js # Runs on http://localhost:5001

# Setup Frontend
# Open a new terminal
cd client && npm install
npm run dev # Runs on http://localhost:5173
```

---

## 📊 Sample Data
Use the provided `sample_transactions.csv` in the root directory to test:
- `acc_001` → `acc_002` → `acc_001`: **SCC Cycle**
- High volume transfers: **Kruskal's Backbone**
- Multiple small transfers: **Smurfing / Sliding Window**

---

*Academic project developed by Eklavya for DSA Coursework.*
