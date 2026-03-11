# Gamma AI Presentation Prompt

---

## Prompt to paste into Gamma AI

---

Create a professional and visually stunning 10-slide presentation titled **"Inter-City Pathfinder — 3D Graph Algorithm Visualizer"**.

Use a **dark tech theme** with glowing neon green and blue accents (similar to a map or navigation UI). Modern sans-serif fonts. Include icons, code snippets, and comparison tables where relevant.

---

### Slide 1 — Title Slide
**Title:** Inter-City Pathfinder
**Subtitle:** A Real-Time 3D Graph Algorithm Visualizer built with Three.js
**Tags:** Data Structures · Pathfinding · Interactive Web App
**Visuals:** A futuristic glowing map network with nodes and edges on a dark background.

---

### Slide 2 — Project Overview
**Heading:** What Is This Project?

- A **3D interactive map** rendered in the browser using **Three.js**.
- Simulates a network of **80 fictional cities** connected by weighted roads.
- Users pick **Start** and **Destination** cities and watch a pathfinding algorithm find the shortest route — step by step, in real time.
- Think of it as **"Google Maps in 3D"** for a fictional world, showing *how* the algorithm searches before highlighting the final route.
- **Pure frontend** — no backend, no server-side logic. Runs entirely in the browser.

**Visuals:** Split view — left side shows the UI panel, right side shows the 3D map.

---

### Slide 3 — Tech Stack & Architecture
**Heading:** Built With

| Layer | Technology |
|---|---|
| 3D Rendering | Three.js (WebGL) |
| Graph / Logic | Vanilla JavaScript (ES Modules) |
| UI & Layout | HTML5 + Inline CSS |
| Dev Server | npx serve (localhost:5500) |
| Data Structure | Adjacency List (JavaScript Map) |

- **No frameworks, no backend.** Everything is in 3 files: `index.html`, `main.js`, `package.json`.
- Algorithms run instantly in JS; animations are a **visual replay** of the recorded search trace.

**Visuals:** File structure diagram and a tech stack icon strip.

---

### Slide 4 — The Graph Data Structure
**Heading:** How the City Network is Stored

- **80 cities (nodes)** placed randomly on a 3D terrain with sin/cos height bumps.
- Each city is a **cylinder mesh** with a floating name label that scales dynamically with zoom.
- Each city is connected to its **3 nearest neighbours** via weighted roads.
- Roads are drawn as **3D curved tubes** (CatmullRomCurve3) for a realistic, organic look.
- **Weight** = road length + random traffic/roughness factor.

**Code snippet:**
```js
adjList.get(cityA) → [
  { to: cityB, weight: 22 },
  { to: cityC, weight: 15 }
]
```

**Visuals:** Diagram of adjacency list + screenshot of the 3D map with city labels.

---

### Slide 5 — Algorithms: Dijkstra's
**Heading:** Algorithm 1 — Dijkstra's (Guaranteed Shortest Path)

- **Core Idea:** Always expand the city with the **lowest known total cost** first.
- Uses a **Priority Queue** — cheapest node is always processed next.
- Explores in all directions like an expanding circle — no awareness of where the destination is.
- **Guarantees** the optimal (minimum weight) path.
- **Weakness:** Visits many unnecessary nodes in the wrong direction.

**Mini step trace:**
```
dist = {A:0, B:∞, C:∞, D:∞, E:∞}
Pop A → update B(10), C(20)
Pop B → update D(15), E(60)
Pop D → update E(23) ✓ cheaper!
Pop E → DESTINATION FOUND: A→B→D→E (cost: 23)
```

**Visuals:** Expanding circle animation diagram, priority queue illustration.

---

### Slide 6 — Algorithms: A* Search
**Heading:** Algorithm 2 — A\* (Smarter, Direction-Aware)

- **Core Idea:** Like Dijkstra, but also considers **how far you still are** from the destination.
- Uses a **heuristic** = Euclidean (straight-line) 3D distance to destination.
- Every node gets an **f score = g(n) + h(n)**:
  - `g(n)` = actual cost to reach node
  - `h(n)` = estimated cost remaining (heuristic)
  - `f(n)` = total estimated path cost
- **Admissible heuristic** → never overestimates → guarantees optimal path.
- Explores **far fewer nodes** than Dijkstra by aiming toward the goal.

**Comparison:**
```
Dijkstra: expands in all directions ← ← S → →
A*:       aims at destination          S → → E
```

**Visuals:** Side-by-side diagram of Dijkstra vs A* expansion, f = g + h formula card.

---

### Slide 7 — Algorithms: BFS & DFS
**Heading:** Algorithms 3 & 4 — BFS and DFS

**BFS (Breadth-First Search):**
- Explores cities **level by level** (1 hop, then 2 hops, then 3…)
- Uses a **Queue (FIFO)**
- Finds path with the **fewest hops** — ignores edge weights
- Good for: unweighted graphs, minimum stops

**DFS (Depth-First Search):**
- Dives deeply down one branch before backtracking
- Uses a **Stack (LIFO)**
- **Not optimal** — path depends on graph order
- Good for: graph exploration demonstrations

**Analogy:**
> BFS = flood filling a map outward.  
> DFS = wandering a maze, always taking the first available turn.

**Visuals:** Two side-by-side tree diagrams showing BFS level traversal and DFS deep dive.

---

### Slide 8 — Algorithm Comparison Table
**Heading:** Which Algorithm Should You Use?

| Feature | Dijkstra | A\* | BFS | DFS |
|---|---|---|---|---|
| Optimal Path? | ✅ (weight) | ✅ (weight) | ✅ (hops) | ❌ No |
| Considers Weights? | ✅ | ✅ | ❌ | ❌ |
| Uses Heuristic? | ❌ | ✅ | ❌ | ❌ |
| Speed | Medium | Fast | Medium | Unpredictable |
| Data Structure | Priority Queue | Priority Queue | Queue (FIFO) | Stack (LIFO) |
| Best Use Case | Weighted shortest | Weighted + faster | Minimum hops | Exploration demo |

**Visuals:** Color-coded comparison table with icons for each algorithm.

---

### Slide 9 — Key Features & UI
**Heading:** Application Features

- 🔍 **Autocomplete Search Bar** — type city names with live suggestions, keyboard navigation (↑↓ Enter Esc), highlighted matching letters
- 🔄 **City Swap Button** — instantly swap start and destination
- 🎥 **Step-by-Step Animation** — watch the search spread across the map (yellow), then the final path glow green
- 📊 **Result Modal** — shows algorithm used, total distance, nodes visited, time in ms
- 📋 **Search History Panel** — logs every completed search, color-coded by algorithm
- 🗺️ **Camera Controls** — drag to rotate, scroll to zoom, dynamic tilt (top-down → street-level like GTA V), zoom-to-cursor
- 📐 **Dynamic Label Scaling** — city names and weights always readable at any zoom level
- 🚧 **Map Boundary Clamping** — prevents panning outside the playable area

**Visuals:** Annotated screenshot of the UI with callout arrows.

---

### Slide 10 — Conclusion & Learnings
**Heading:** What We Built & What We Learned

**Project Outcome:**
A fully interactive 3D pathfinding visualizer that makes abstract graph algorithms tangible and visual.

**Key Takeaways:**
- Graph theory (adjacency list, weighted edges) applies directly to real-world navigation.
- A* is provably better than Dijkstra when a good heuristic exists.
- Visual animation requires **decoupling computation from rendering** (pre-compute → replay).
- Three.js enables GPU-accelerated 3D directly in the browser with no plugins.

**Future Scope:**
- Add real-world map data (OpenStreetMap)
- Implement Bellman-Ford for negative weight edges
- Multiplayer route racing mode
- Mobile touch support

**Closing Line:**  
> "Algorithms are not just theory — they are the invisible roads that navigation, AI, and the internet travel on every second."

**Visuals:** Final glowing green path screenshot. GitHub/project link placeholder.

---

*Paste this entire prompt into Gamma AI → "Generate from text" → select dark tech theme.*
