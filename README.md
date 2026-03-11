# 🗺️ Inter-City Pathfinder — 3D Graph Algorithm Visualizer

A **real-time, interactive 3D map visualization** of classic graph traversal and shortest-path algorithms, rendered using **Three.js**. Inspired by the atmospheric map aesthetics of GTA V and Red Dead Redemption 2.

---

## 📖 Synopsis

This project visualizes how different pathfinding algorithms explore a graph and find the optimal route between two cities on a stylized 3D map.

An undirected weighted graph of **80 cities** (nodes) is procedurally generated on a textured terrain, connected by organically curved **3D tube roads** (edges). The user clicks any two cities to trigger a selected algorithm, which then **animates its search process step by step** before tracing the final route in glowing yellow.

The goal is to make abstract DSA concepts tangible and intuitive through an immersive 3D interface.

---

## ✨ Features

### 🌍 3D Procedural Map
- A 300×300 unit terrain with per-vertex noise-based hills, rendered in `flatShading` for a stylized look.
- 80 fantasy/mythological city nodes (Midgar, Whiterun, Zanarkand, etc.) placed in a circular distribution.
- Roads rendered as `TubeGeometry` meshes following organically curved `CatmullRomCurve3` paths.

### 🧭 Four Pathfinding Algorithms
| Algorithm | Strategy | Notes |
|-----------|----------|-------|
| **Dijkstra's** | Greedy, minimum-cost priority queue | Guarantees shortest weighted path |
| **A\* Search** | Heuristic (Euclidean distance) | Faster than Dijkstra on average |
| **BFS** | Level-by-level queue | Shortest path by hop count |
| **DFS** | Stack-based depth exploration | Not optimal, shows contrast |

### 🎬 Step-by-Step Animation
- **Search phase**: Edges explored by the algorithm light up in glowing yellow as the algorithm runs.
- **Path phase**: The final optimal route is traced in blue/yellow tubes at a slower speed for dramatic effect.
- "Stop Search" button halts animation at any point.

### 📊 Result Modal & Search History
- A modal pops up on path completion showing: **Algorithm Used**, **Total Distance/Weight**, **Nodes Visited**, and **Time Taken (ms)**.
- A scrollable **Search History** panel on the right tracks all previous runs with color-coded entries per algorithm.

### 🔭 GTA V / RDR2 Style Camera
- **Zoom-to-cursor**: Scrolling zooms toward the mouse position on the ground plane.
- **Dynamic camera tilt**: The maximum pitch (vertical angle) adjusts automatically with zoom level — more overhead when zoomed out, more isometric when zoomed in.
- **Pan boundary clamping**: Camera and orbit target are clamped to the map bounds so you can never pan into empty void.
- **Animated camera snap**: Clicking a city smoothly slides the camera to center on it.

### 🏷️ Dynamic Labels
- City name **sprites** scale dynamically with zoom distance — readable at any altitude.
- Edge **weight labels** remain permanently visible and scale proportionally.
- Final path weight labels are rendered with `depthTest = false` (always render on top).

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **3D Engine** | [Three.js r128](https://threejs.org/) |
| **Camera Controls** | `OrbitControls` (Three.js JSM addon) |
| **Rendering** | `WebGLRenderer` with antialiasing & high-performance power hint |
| **Labels** | `CanvasTexture` → `SpriteMaterial` sprites |
| **Roads** | `CatmullRomCurve3` + `TubeGeometry` |
| **Graph Logic** | Vanilla JavaScript (`Map`, `Set`, adjacency list) |
| **Module Loading** | ES Module Import Maps with `es-module-shims` polyfill |
| **Dev Server** | `npx serve` |

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (for `npx serve`)
- A modern browser with ES module support (Chrome, Firefox, Edge)

### Run Locally

```bash
# Clone or download the project
cd threejs-dsa

# Serve the project (Three.js requires a server for ES modules)
npx serve -l 3000

# Open in browser
# http://localhost:3000
```

> ⚠️ **Do not open `index.html` directly** via `file://` — ES module imports will be blocked by CORS. Always use a local server.

---

## 🎮 How to Use

1. **Select an algorithm** from the dropdown (top-left panel).
2. **Click a city node** (glowing dot on the map) — this sets your **Start** city.
3. **Click a second city** — this sets your **Destination**.
4. The algorithm runs automatically and **animates the search** in real time.
5. When complete, a **result modal** appears with stats.
6. Click **"Reset & Close"** or **"Reset Map"** to start a new search.
7. Use **mouse scroll** to zoom, **right-click drag** to pan, **left-click drag** to orbit.

---

## 📁 Project Structure

```
threejs-dsa/
├── index.html       # UI layout, CSS styling, modal, history panel
├── main.js          # Three.js scene, graph logic, algorithms, animation loop
├── fonts/           # Custom font assets (if any)
├── package.json     # Project metadata
└── README.md        # This file
```

---

## 🧠 Graph & Algorithm Details

### Graph Construction
- **Nodes**: 80 cities placed in polar coordinates (random angle + `sqrt(r)` for uniform circular distribution).
- **Edges**: Each node connects to its **3 nearest neighbors** within a `CONNECTION_DISTANCE * 1.5` threshold.
- **Weights**: `floor(euclideanDistance * (1 + random * 0.5))` — simulates road length with slight terrain roughness.
- **Adjacency List**: Stored as `Map<nodeId, Array<{to, weight}>>`.

### Visualization Architecture
1. All algorithms pre-compute the full `{ path, visitedEdges, totalWeight, visitedCount }` result **synchronously** in JavaScript.
2. The `visitedEdges` array is then **replayed visually** step-by-step using `setInterval` at 25ms per frame.
3. After the search animation, the `path` array is animated 50ms per edge using a second `setInterval`.
4. This separation ensures the visual speed is independent of algorithm complexity.

---

## 🎨 Color Legend

| Color | Meaning |
|-------|---------|
| 🔵 Blue tube | Algorithm is exploring this edge |
| 🟡 Yellow tube | Final shortest path |
| 🟢 Green node | Start city |
| 🔴 Red node | Destination city |
| ⚪ White/grey node | Unvisited city |
| 🟡 Yellow node | Node on the final path |

---

## 📜 License

MIT — Free to use, modify, and distribute.
