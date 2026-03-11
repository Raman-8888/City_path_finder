# 🗺️ Frontend Summary — Inter-City Pathfinder (3D)

## What is this project?

This is a **3D interactive map** built entirely in the browser using **Three.js** (a JavaScript library for 3D graphics). It shows a network of imaginary cities connected by roads, and lets you pick two cities and watch a pathfinding algorithm (like Dijkstra's) find the shortest route between them — visually, step by step.

Think of it as **Google Maps but in 3D**, for a fictional world, showing you *how* the algorithm searches before highlighting the final route.

---

## 📁 File Structure

```
threejs-dsa/
├── index.html   ← The whole UI (layout, styles, buttons)
├── main.js      ← All the logic (3D scene, graph, algorithms, interactions)
├── package.json ← Dev server setup (npm run dev → localhost:5500)
```

There is **no backend**. This is a pure frontend project. Everything runs in your browser.

---

## 🏗️ How the Page is Built — `index.html`

### Why HTML + inline CSS?
We keep everything in one HTML file with a `<style>` block so there are no extra CSS files to manage. It's simpler for a demo project.

### The Left Panel — `#info`
```
Inter-City Pathfinder
┌─────────────────────────────┐
│ 🗺 Route Finder             │
│  🟢 [Starting city…]  [✕]  │
│  ─────────── ⇅             │
│  🔴 [Destination city…][✕] │
│  [Find Route]               │
│─────────────────────────────│
│  Algorithm: [Dijkstra ▼]   │
│  Status: Awaiting…          │
│  [Stop Search] [Reset Map]  │
└─────────────────────────────┘
```

**Why this layout?**
- The **Route Finder** search section sits at the top so users immediately know how to interact — just like Google Maps.
- The **algorithm dropdown** is below it so users can switch between Dijkstra, A*, BFS, DFS before searching.
- **Status** tells you what's happening (searching, path found, etc.).
- **Reset Map** is always accessible to start fresh.

### The Collapse Button — `#collapse-btn` / `#show-tab`
- A small **`›`** button sits in the top-right corner of the panel.
- Clicking it slides the panel off-screen with a CSS `transform: translateX(...)` transition.
- A slim **`‹ Menu`** tab appears on the left edge of the screen.
- Clicking the tab slides the panel back in.
- **Why?** So the panel doesn't block the 3D map when you just want to look around.

### The Result Modal — `#modal-overlay`
After a path is found, a popup appears showing:
- Which algorithm was used
- Total distance (weight)
- How many nodes were visited
- Time taken in milliseconds

The **Close** button only dismisses the popup — it does NOT reset the map. The green glowing path stays visible until you click **Reset Map**.

### The Search History Panel — `#history-panel`
Every completed search is logged in the top-right panel, showing route, cost, and time. Color-coded by algorithm type.

---

## ⚙️ How the 3D Scene Works — `main.js`

### 1. Setting up Three.js
```js
const scene    = new THREE.Scene();      // The 3D world
const camera   = new THREE.PerspectiveCamera(...); // The "eye"
const renderer = new THREE.WebGLRenderer(); // Draws to the screen
```

Three.js works like a movie set:
- **Scene** = the set (everything lives here)
- **Camera** = where you're standing and looking
- **Renderer** = the film camera that outputs the image to the `<canvas>`

### 2. The Terrain (Ground)
A flat `PlaneGeometry` is given small random bumps using sine/cosine math to simulate hills. This makes the map look organic instead of perfectly flat.

### 3. The Graph (Cities + Roads)

**Cities (Nodes)**  
80 cities are randomly placed on the terrain. Each city is a cylinder mesh (`CylinderGeometry`) and has:
- A 3D position (`x, y, z`)
- A random name (e.g. "Whiterun", "Solitude-42")
- A floating text sprite (city label)

```js
nodes.push({ id, pos, mesh, name, sprite });
```

**Roads (Edges)**  
Each city is connected to its 3 nearest neighbours. The road is drawn as a **curved tube** (`TubeGeometry` + `CatmullRomCurve3`) to look organic — roads don't go perfectly straight in the real world.

Each road also stores:
- **Weight** = road length + random traffic factor
- A floating number label showing the weight

### 4. The Adjacency List
The graph is stored as a `Map`:
```js
adjList.get(cityA) → [{ to: cityB, weight: 15 }, { to: cityC, weight: 22 }, ...]
```
This is the data structure the algorithms search through.

---

## 🔍 The Route Finder Search Bar

### How autocomplete works
When you type in the input box:
1. The text is compared (case-insensitive) against all 80 city names.
2. Matches are sorted — exact-start matches come first.
3. Up to 10 results are shown in a dropdown.
4. The matching letters are **highlighted in blue** using `<mark>` tags.

```
Type: "whi"
→ Shows: Whiterun, Whiterun-45, ...
          ^^^       ^^^
          (blue)    (blue)
```

**Keyboard navigation:**
- `↑` / `↓` — move through suggestions
- `Enter` — confirm highlighted suggestion
- `Escape` — close the dropdown

### Selecting a city
When you click a suggestion:
1. The search bar stores the city's `id` internally.
2. The 3D scene immediately highlights that node (green for start, red for destination).
3. The camera smoothly pans to that node.

### The Swap Button `⇅`
Swaps the From and To city — both the text in the inputs and the internal node IDs — and re-highlights accordingly.

### Find Route Button
Only becomes active when **both** a valid start and destination are chosen (and they're different cities). Clicking it runs the selected algorithm.

### Bidirectional sync
If you click a city directly in the 3D scene (instead of using the search bar), the search bar inputs automatically update to show that city's name. This is done by a `window._syncSearchBarFromUI()` function that `updateUI()` calls every time the selection changes.

---

## 🧭 The Pathfinding Algorithms

All four algorithms follow the same pattern:
1. Run the full algorithm **instantly** in JavaScript, collecting every edge they examined (the "visited edges").
2. Return: `{ path, visitedEdges, totalWeight, visitedCount }`
3. Play back the visited edges one-by-one as an **animation** so you can watch the search spread across the map.
4. After the animation, draw the final path.

| Algorithm | How it finds the path | Best for |
|---|---|---|
| **Dijkstra** | Explores cheapest edges first (priority queue) | Guaranteed shortest weighted path |
| **A\*** | Dijkstra + estimates remaining distance (heuristic) | Faster than Dijkstra in practice |
| **BFS** | Explores level by level (ignores weights) | Fewest hops (not shortest distance) |
| **DFS** | Dives deep down one branch before backtracking | Demonstration only — not optimal |

---

## ✨ The Glowing Green Path

### How it's drawn
The final path is drawn as a **thick tube** (`TubeGeometry`) with:
- `tubeRadius: 0.9` (vs `0.4` for idle roads) — 2× thicker
- `MeshStandardMaterial` with `emissive: 0x22c55e` and `emissiveIntensity: 1.5` — the material actually *emits* green light
- `renderOrder: 1` — ensures it renders on top of grey idle roads

City name labels on the path also turn green.

### Why separate tracking arrays?
```js
let activeSearchEdges = []; // Yellow search animation (temporary)
let finalPathEdges    = []; // Green glowing path (persistent)
```

The search uses **two separate arrays** for the two types of visual elements:
- `activeSearchEdges` — the yellow lines that appear during the search animation. These are cleared at the start of every new search.
- `finalPathEdges` — the green glowing tube after the path is found. These **only** get cleared when you click **Reset Map**.

This means:
- Dismissing the popup ✅ path stays
- Starting a new search ✅ old path clears, new one appears
- Reset Map ✅ everything clears

---

## 🎥 Camera Controls

The camera uses **OrbitControls** from Three.js, which gives you:
- **Drag** to rotate around the map
- **Scroll** to zoom in/out
- **Right-drag** to pan

**Zoom-to-cursor:** When you scroll in, the map slides toward wherever your mouse is pointing (not just toward the center). This is done by casting a ray from the mouse cursor to the ground plane, then shifting the orbit target toward that hit point.

**Dynamic tilt:** The closer you zoom, the more the camera tilts toward a horizontal view (like a street-level perspective). The farther out, the more top-down the view becomes — similar to GTA V / RDR2 map behaviour.

**Dynamic label scaling:** City names and edge weight numbers scale with zoom level so they're always readable — larger when zoomed out, smaller when zoomed in.

---

## 🔄 The Render Loop

```js
function animate() {
    requestAnimationFrame(animate); // Repeat ~60 times/second
    controls.update();              // Apply damping to camera
    renderer.render(scene, camera); // Draw the frame
    updateLabels();                 // Resize labels + adjust tilt
}
```

`requestAnimationFrame` is the browser's built-in way of running smooth 60fps loops. Every frame, the scene is re-rendered and all dynamic behaviour (label sizing, camera tilt, boundary clamping) is recalculated.

---

## 🚀 Running the Project

Because `main.js` uses **ES Modules** (`import` statements), browsers block it when opened as a plain file (`file://`). You need a local server:

```bash
npm run dev
# → http://localhost:5500
```

This runs `npx serve .` which creates a tiny local HTTP server. Open your browser to `http://localhost:5500` and the map loads.
