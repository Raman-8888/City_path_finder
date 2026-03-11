# Data Structures and Algorithm

# Inter-City Pathfinder
### 3D Graph Algorithm Visualizer

---

**Submitted to:**  Mr. Sudeep Chowhan

**Submitted by:**  Priyanshu Singh (12309720)
                   Srijan Ghosh (12314625)

---

## Index

| S.No | Topics |
|------|--------|
| 1 | Problem Statement |
| 2 | Problem-Solving Technique |
| 3 | Requirements |
| 4 | Code |
| 5 | Real Time Example |

---

## 1. Problem Statement

The study of graph-based pathfinding algorithms is a cornerstone of computer science, yet the abstract nature of these algorithms makes them difficult to grasp through static textbook examples alone. Traditional teaching methods present several critical gaps that this project aims to resolve:

- **Lack of Visual Context:** Algorithms like Dijkstra's and A* operate on graphs that are described purely with numbers and notation. Without a spatial, visual representation, students struggle to intuitively understand *why* one algorithm outperforms another.

- **Inability to Observe Step-by-Step Execution:** Textbooks show only the final result of a search. There is no mechanism to observe how the algorithm expands node by node, which is the most critical insight for understanding algorithmic behaviour and trade-offs.

- **No Interactive Comparison:** Understanding the difference between Dijkstra, A*, BFS, and DFS requires running them side by side under identical conditions. Static notes cannot provide this dynamic, real-time comparison.

- **Disconnect Between Theory and Application:** Graph algorithms form the backbone of GPS navigation, game AI, and network routing. Learners lack a tool that bridges the gap between abstract graph theory and these real-world use cases.

This project addresses these gaps by providing a **3D interactive browser-based map** that simulates a network of cities connected by weighted roads, allowing users to visually execute and compare four major pathfinding algorithms in real time.

---

## 2. Problem-Solving Technique

To solve the challenge of making graph algorithms visual and interactive, this system employs a **3D Graph Simulation with Step-by-Step Animation Replay** approach. The solution architecture is built upon the following pillars:

### The Graph Lifecycle

The core logic is designed around the complete lifecycle of a graph problem:

- **Build:** Constructing the graph with 80 nodes (cities) and weighted edges (roads) using an Adjacency List.
- **Search:** Running the selected algorithm to explore paths from start to destination.
- **Animate:** Replaying the algorithm's traversal visually, edge by edge, with color-coded highlights.
- **Display:** Rendering the optimal path as a glowing green 3D tube with performance statistics.

### Advanced Logic & Rendering

- **Adjacency List (JavaScript Map):** The graph is stored as `Map<nodeId, [{to, weight}]>`, enabling O(1) neighbour lookups. Each road's weight is computed as road length plus a random traffic factor, simulating real-world conditions.

- **Priority Queue Simulation:** Dijkstra's and A* use an array sorted by cost/f-score to always process the cheapest candidate next — simulating a min-heap for optimal traversal order.

- **Admissible Heuristic (A\*):** The Euclidean 3D distance between two city positions serves as the A* heuristic. Since the actual road distance can never be less than the straight-line distance, the heuristic never overestimates, guaranteeing optimal results.

- **Computation-Rendering Decoupling:** All algorithms run **instantly** in JavaScript. The exploration animation is a **visual replay** of the recorded edge trace using `setInterval`, ensuring the UI never freezes (critical in single-threaded JS environments).

- **3D Rendering via Three.js:** The scene uses `WebGLRenderer`, `PerspectiveCamera`, and `OrbitControls`. Roads are `TubeGeometry` wrapped around `CatmullRomCurve3` splines for a realistic, curved appearance. City labels are `SpriteMaterial` billboard textures that scale dynamically with zoom level.

---

## 3. Requirements

To ensure the Inter-City Pathfinder runs efficiently, the following technical environment is required:

### Software Requirements

- **Core Language:** JavaScript (ES Modules / ES2022) — the engine for all graph logic, algorithms, and 3D interaction.
- **3D Library:** [Three.js](https://threejs.org/) (r160+) — provides WebGL-based 3D scene rendering, geometry, materials, and controls.
- **Development Server:** `npx serve` via Node.js — required because ES Modules are blocked by browsers under the `file://` protocol; runs at `http://localhost:5500`.
- **Package Manager:** npm (Node.js) — used solely to launch the local dev server via `npm run dev`.
- **Browser:** Any modern browser with WebGL support (Chrome, Firefox, Edge, Safari).

**Key Modules Used:**

| Module | Purpose |
|--------|---------|
| `THREE.Scene` | The 3D world container |
| `THREE.PerspectiveCamera` | The viewpoint and field of view |
| `THREE.WebGLRenderer` | GPU-accelerated canvas rendering |
| `OrbitControls` | Mouse drag / zoom / pan interaction |
| `THREE.TubeGeometry` + `CatmullRomCurve3` | Curved 3D road meshes |
| `THREE.CanvasTexture` | City name and weight label sprites |

### Hardware Requirements

The system is designed to be lightweight and accessible:

- **Processor:** Any modern dual-core CPU capable of running a WebGL context.
- **RAM:** Minimum 2 GB system RAM; the browser tab itself uses under 200 MB.
- **GPU:** Any integrated graphics chip with WebGL 1.0 support (released after 2010).
- **Storage:** Under 1 MB total (3 source files: `index.html`, `main.js`, `package.json`).
- **Display:** 1280×720 resolution or higher recommended for the dual-panel layout.

---

## 4. Code

### Core Concepts & DSA Summary: `main.js`

The following data structures and algorithmic techniques are used in `main.js` to power the pathfinding and visualization:

---

#### 1. Data Structures (DSA)

**Adjacency List (JavaScript Map — Hash Map):**
The graph is stored as `adjList`, a `Map` where each key is a node ID and the value is an array of `{to, weight}` neighbour objects. This provides O(1) neighbour lookup for each node during traversal.

```js
adjList.get(cityA) → [{ to: cityB, weight: 22 }, { to: cityC, weight: 15 }]
```

**Priority Queue (Array + Sort):**
Dijkstra's and A* use a sorted array as a min-priority queue. The array is sorted by `weight` (Dijkstra) or `f = g + h` (A*) before each pop, ensuring the cheapest candidate is always processed first.

**Set (Hash Set):**
Used in BFS and DFS as a `visited` set for O(1) membership checks, preventing nodes from being processed more than once.

**Stack (LIFO Array):**
DFS uses a JavaScript array with `.push()` and `.pop()` to simulate a stack — diving deep into one branch before backtracking.

**Queue (FIFO Array):**
BFS uses `.push()` and `.shift()` for level-by-level traversal — exploring all 1-hop neighbours before 2-hop neighbours.

**Map (Hash Map for path tracing):**
All four algorithms use a `cameFrom` Map (`nodeId → parentId`) to record the shortest path tree during search, enabling O(n) path reconstruction.

---

#### 2. Algorithmic Techniques

**Dijkstra's Algorithm:**
Explores the graph by always expanding the node with the lowest cumulative cost from the source. Guarantees the minimum-weight path.

```js
while (pq.length > 0) {
    pq.sort((a, b) => a.weight - b.weight);   // cheapest first
    const current = pq.shift().node;
    if (current === endNode) return reconstructPath(cameFrom, current);
    for (const neighbor of adjList.get(current)) {
        const alt = dist.get(current) + neighbor.weight;
        if (alt < dist.get(neighbor.to)) {
            dist.set(neighbor.to, alt);
            cameFrom.set(neighbor.to, current);
            pq.push({ node: neighbor.to, weight: alt });
        }
    }
}
```

**A\* Search (Heuristic-guided):**
Extends Dijkstra by adding a heuristic `h(n)` — the Euclidean 3D distance from node `n` to the destination. The priority queue is sorted by `f = g + h`, guiding the search toward the goal and visiting significantly fewer nodes.

```js
const h = (nodeId) => nodes[nodeId].pos.distanceTo(nodes[endNode].pos);
// f = g + h: actual cost + estimated remaining distance
fScore.set(neighbor.to, tentative_g + h(neighbor.to));
pq.sort((a, b) => a.f - b.f);
```

**Breadth-First Search (BFS):**
Traverses level by level using a FIFO queue, ignoring edge weights. Finds the path with the fewest hops (not the lowest weight).

**Depth-First Search (DFS):**
Traverses using a LIFO stack, diving deep down one branch before backtracking. Non-optimal — used for demonstration purposes.

**Path Reconstruction (`reconstructPath`):**
After the destination is reached, the `cameFrom` map is traced backwards from destination to source and reversed to produce the ordered path.

```js
function reconstructPath(cameFrom, current) {
    const path = [current];
    while (cameFrom.has(current)) {
        current = cameFrom.get(current);
        path.unshift(current);
    }
    return path;
}
```

---

#### 3. 3D Visualization & Rendering

**Terrain Generation:**
A `PlaneGeometry` has its vertices displaced using sine/cosine math to create organic hills, giving the map a realistic, non-flat appearance.

**City Nodes:**
Each of the 80 cities is a `CylinderGeometry` mesh. City names float above as `SpriteMaterial` billboards rendered from a `CanvasTexture`, scaling dynamically with the camera zoom so labels remain legible at any distance.

**Road Edges:**
Roads are rendered as `TubeGeometry` wrapped around a `CatmullRomCurve3` spline (connecting the two city positions), making roads appear curved and organic rather than straight lines.

**Search Animation:**
After an algorithm finishes, its recorded `visitedEdges` are replayed frame-by-frame using `setInterval` with a 25ms delay, colouring each traversed edge yellow. This decouples computation from rendering.

**Final Path:**
The shortest path is drawn as a thicker tube (`tubeRadius: 0.9`) with an emissive green material (`emissive: 0x22c55e`, `emissiveIntensity: 1.5`), making it glow visually distinct from grey idle roads.

---

#### 4. UI & Interaction Logic

**Autocomplete Search:**
City names are matched case-insensitively against the typed query; top matches are ranked by prefix similarity and rendered with `<mark>` tags highlighting matching characters.

**Bidirectional Sync:**
Clicking a city in the 3D scene updates the search bar inputs automatically via `window._syncSearchBarFromUI()`. Typing in the search bar highlights the node in the 3D scene — both directions stay in sync.

**Result Modal:**
Displays algorithm name, total path weight, number of nodes visited, and execution time in milliseconds after every completed search.

**Search History:**
Every completed search is appended to a history panel, colour-coded by algorithm type, for easy comparison across multiple runs.

---

## 5. Real-Time Example

This section illustrates how the system functions in a practical navigational scenario, focusing on a **logistics dispatcher** routing delivery vehicles across a city network.

### Phase 1: Route Setup (Graph Construction)

Before the dispatcher begins, the system has already built a weighted graph of 80 city nodes connected by roads. Each road's weight reflects distance plus a randomized traffic factor — simulating real-world dynamic road conditions.

- **Action:** The dispatcher opens the application in the browser (`http://localhost:5500`).
- **Scene Load:** The 3D terrain renders with all 80 cities (labeled cylinders) and their interconnecting road tubes.
- **Graph Ready:** The adjacency list is fully initialized. Every city knows its neighbours and the cost of reaching them.

---

### Phase 2: Finding the Optimal Route (The "Dijkstra" Operation)

The dispatcher needs the absolute fastest (lowest-cost) route between two cities to minimize fuel costs.

- **Action:** They type "Whiterun" in the Start bar and "Solitude" in the Destination bar using the autocomplete search.
- **Algorithm Selected:** Dijkstra's (from the dropdown).
- **Execution:** The system runs the full Dijkstra traversal instantly, recording every edge examined.
- **Animation Replay:** Yellow edges ripple outward from Whiterun across the map — showing every road the algorithm considered.
- **Path Found:** A glowing green tube traces the optimal route. The result modal shows:
  - **Total Distance:** e.g., 187 units
  - **Nodes Visited:** e.g., 42 out of 80
  - **Time Taken:** e.g., 2 ms

---

### Phase 3: Speed Comparison (The "A\*" Operation)

The dispatcher is curious whether A* would have found the same route with less work.

- **Action:** They reset the map, select the **same start and destination**, and switch to **A\*** in the dropdown.
- **Heuristic in Action:** A* uses the straight-line 3D distance to Solitude as a guide, skipping cities that are clearly moving away from the destination.
- **Result:** The same optimal path is found, but the animation shows visibly **fewer yellow edges** — confirming A* explored only ~24 nodes vs Dijkstra's 42.
- **Insight:** Both found the same route. A* was smarter about where it looked.

---

### Phase 4: Exploring Alternatives (BFS & DFS Demo)

To understand algorithm trade-offs, the dispatcher tests BFS and DFS on the same pair.

- **Scenario A — BFS:** The animation expands level by level, like a flood. The path found has fewer city-hops but a higher total weight — proving BFS ignores road costs.
- **Scenario B — DFS:** The animation dives deep into one branch before backtracking erratically. The path found is neither the shortest in hops nor in weight — confirming DFS is non-optimal but illustrative.
- **History Panel:** All four searches are logged side by side with their costs and node counts, allowing direct comparison with one glance.

---

### Phase 5: Interactive Exploration (Camera & Labels)

After finding routes, the dispatcher explores the map visually.

- **Zoom In:** The camera tilts from top-down toward a street-level view (GTA V-style dynamic tilt). City names scale down to remain readable without cluttering.
- **Zoom to Cursor:** Scrolling zooms toward wherever the mouse is pointing — the map slides toward the cursor, not the center.
- **Panel Toggle:** The left control panel is collapsed via the `›` button, giving a full-screen view of the 3D map without losing the glowing green path.
- **Reset:** Clicking **Reset Map** clears all highlights and returns the scene to its original idle state, ready for the next query.

---

*Project developed as part of the Data Structures and Algorithm course submission.*
