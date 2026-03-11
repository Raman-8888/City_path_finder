# 🧭 Algorithm Deep-Dive — Inter-City Pathfinder

## How the Graph is Stored

Before understanding the algorithms, you need to understand the data they work on.

### Adjacency List
Every city (node) has a list of neighbours it is directly connected to and the cost (weight) of that road:

```
adjList = {
  0: [ {to: 3, weight: 22}, {to: 7, weight: 15} ],
  1: [ {to: 5, weight: 30}, {to: 2, weight: 11} ],
  ...
}
```

**Weight** = road length + a small random traffic/roughness factor.  
So weight 22 means "it costs 22 units to travel from city 0 to city 3."

### What every algorithm returns
```js
{
  path:         [0, 7, 12, 31],  // Node IDs in order from start → end
  visitedEdges: [{u,v,weight}, ...], // Every edge the algorithm examined (for animation)
  totalWeight:  49,               // Sum of weights along the final path
  visitedCount: 18                // How many cities the algorithm "opened"
}
```

---

## 1. Dijkstra's Algorithm

> **Goal:** Find the cheapest (lowest total weight) path from start to end.

### Core idea
Always expand the city that has the **lowest known total cost so far**.  
It's like a greedy wave that expands outward, cheapest-first.

### Step-by-step

```
Start city = A,  End city = E

dist = { A:0,  B:∞,  C:∞,  D:∞,  E:∞ }
                           ↑ we don't know cost yet

Priority Queue (PQ) = [ {A, cost:0} ]
```

**Each iteration:**
1. Pull the city with **lowest cost** from the PQ.
2. If it's the destination → done, reconstruct path.
3. For each neighbour, check: `newCost = dist[current] + edgeWeight`
4. If `newCost < dist[neighbour]` → update and push to PQ.

```
Step 1: Pop A (cost 0)
  → neighbour B: 0+10=10  < ∞  → dist[B]=10, push {B,10}
  → neighbour C: 0+20=20  < ∞  → dist[C]=20, push {C,20}

Step 2: Pop B (cost 10) ← cheapest in PQ
  → neighbour D: 10+5=15 < ∞   → dist[D]=15, push {D,15}
  → neighbour E: 10+50=60 < ∞  → dist[E]=60, push {E,60}

Step 3: Pop D (cost 15) ← cheapest
  → neighbour E: 15+8=23 < 60  → dist[E]=23, update! push {E,23}

Step 4: Pop C (cost 20)
  → neighbour E: 20+40=60 > 23 → skip (already cheaper path found)

Step 5: Pop E (cost 23) ← it's the destination!
  → PATH FOUND: A → B → D → E  (total: 23)
```

### Why it works
Dijkstra never misses a cheaper path because it always processes the cheapest unvisited city first.  
Once a city is popped from the PQ, its distance is **final** — no cheaper way to reach it can exist.

### Weakness
It expands in **all directions** equally (like a circle growing outward from start).  
It doesn't know *where* the destination is, so it wastes time exploring cities in the wrong direction.

```js
// Code in main.js — solveDijkstra()
while (pq.length > 0) {
    pq.sort((a, b) => a.weight - b.weight);   // cheapest first
    const current = pq.shift().node;
    if (current === endNode) return path;
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

---

## 2. A\* Search (with Heuristic)

> **Goal:** Find the cheapest path, but search **smarter** by aiming toward the destination.

### What is a heuristic?

A **heuristic** is an *estimate* of how far you still are from the destination.  
In this project, the heuristic is the **straight-line (Euclidean) distance** between two cities in 3D space:

```js
const h = (nodeId) => nodes[nodeId].pos.distanceTo(nodes[endNode].pos);
```

**Why Euclidean?**  
Because the actual road distance can never be *less* than the straight-line distance (you can't go through walls). This makes it an **admissible heuristic** — it never overestimates — which guarantees A* finds the optimal path.

### The two scores

Every city in A* gets two scores:

| Score | Formula | Meaning |
|---|---|---|
| `g(n)` | actual cost from start to n | How much did it cost to reach here? |
| `h(n)` | estimated cost from n to end | How far do we still have to go? |
| `f(n)` | `g(n) + h(n)` | **Total estimated cost of path through n** |

A* always expands the city with the **lowest `f` score**.

### Step-by-step comparison with Dijkstra

Imagine cities laid out like this with a destination in the top-right:

```
Dijkstra expands like this:      A* expands like this:
   ← ← ← S → → →                    S → → →
   ← ← ← ↓ → → →                        ↓ → →
   ← ← ← ↓ → → E                            → E
(expands everywhere)             (aimed at E, much fewer cities explored)
```

A* "knows" which direction the destination is, so it prioritises cities that bring it closer.

```js
// Code in main.js — solveAStar()
const h = (nodeId) => nodes[nodeId].pos.distanceTo(nodes[endNode].pos);

while (pq.length > 0) {
    pq.sort((a, b) => a.f - b.f);              // lowest f = g+h first
    const current = pq.shift().node;
    if (current === endNode) return path;

    for (const neighbor of adjList.get(current)) {
        const tentative_g = gScore.get(current) + neighbor.weight;
        if (tentative_g < gScore.get(neighbor.to)) {
            cameFrom.set(neighbor.to, current);
            gScore.set(neighbor.to, tentative_g);
            fScore.set(neighbor.to, tentative_g + h(neighbor.to)); // g + h
            pq.push({ node: neighbor.to, f: fScore.get(neighbor.to) });
        }
    }
}
```

### Why A* is faster than Dijkstra (usually)

| | Dijkstra | A* |
|---|---|---|
| Expansion order | Cheapest `g` first | Cheapest `g + h` first |
| Direction awareness | None | Yes (heuristic guides it) |
| Nodes visited | More | Fewer |
| Path optimality | ✅ Always optimal | ✅ Always optimal (admissible h) |

**Real-world analogy:**  
Dijkstra = checking every road on a map from your starting point outward.  
A* = checking roads that are both cheap AND heading roughly toward your destination.

---

## 3. Breadth-First Search (BFS)

> **Goal:** Find the path with the **fewest hops** (ignores weights completely).

### Core idea
Explore cities **level by level** — first all cities 1 hop away, then 2 hops away, then 3, etc.  
Uses a **Queue (FIFO)** — first in, first out.

```
Start = A
Queue: [A]

Level 1: Pop A → visit B, C, D  → Queue: [B, C, D]
Level 2: Pop B → visit E, F     → Queue: [C, D, E, F]
         Pop C → visit G        → Queue: [D, E, F, G]
         Pop D → D has no new   → Queue: [E, F, G]
Level 3: Pop E → it's the end!  → PATH FOUND: A → B → E
```

### Why BFS ignores weights
BFS was designed for **unweighted graphs** where every edge costs the same.  
It finds the path that goes through the fewest cities — not the cheapest one.

**Example where BFS fails:**
```
A ──(1)── B ──(1)── E     BFS picks: A→B→E (2 hops, cost 2)
A ──(1)── C                 But:      A→C   (1 hop, cost 1) would be cheaper
                                              BFS doesn't see this!
```

```js
// Code in main.js — solveBFS()
const queue = [startNode];
const visited = new Set([startNode]);

while (queue.length > 0) {
    const current = queue.shift();   // FIFO — take from front
    if (current === endNode) return path;

    for (const neighbor of adjList.get(current)) {
        if (!visited.has(neighbor.to)) {
            visited.add(neighbor.to);
            cameFrom.set(neighbor.to, current);
            queue.push(neighbor.to); // Add to BACK of queue
        }
    }
}
```

### When BFS is useful
- When all roads have equal cost (or cost doesn't matter)
- When you want to guarantee the **minimum number of stops**
- Teaching/demonstration purposes

---

## 4. Depth-First Search (DFS)

> **Goal:** Find *a* path (not necessarily optimal) by diving as deep as possible before backtracking.

### Core idea
Pick one direction and follow it all the way to the end (or until stuck),  
then backtrack and try another direction.  
Uses a **Stack (LIFO)** — last in, first out.

```
Start = A  (connected to B, C, D)
Stack: [A]

Pop A → push neighbours D, C, B  → Stack: [D, C, B]
Pop B → push neighbour E         → Stack: [D, C, E]
Pop E → it's the end!            → PATH FOUND: A → B → E
                                     (happened to find it quickly here)
```

```
But if B connected to F first:
Pop B → push F, E     → Stack: [D, C, F, E]   ← E is buried!
Pop E → end found after exploring F first
```

DFS can find the destination quickly OR explore almost the entire graph before finding it — depends on the order neighbours are stored.

```js
// Code in main.js — solveDFS()
const stack = [startNode];
const visited = new Set([startNode]);

while (stack.length > 0) {
    const current = stack.pop();   // LIFO — take from top
    if (current === endNode) return path;

    for (const neighbor of adjList.get(current)) {
        if (!visited.has(neighbor.to)) {
            visited.add(neighbor.to);
            cameFrom.set(neighbor.to, current);
            stack.push(neighbor.to); // Add to TOP of stack
        }
    }
}
```

### Why DFS is not optimal
DFS does **not** guarantee the shortest or cheapest path.  
The path it finds depends entirely on the order the graph was built.

**Real-world analogy:**  
DFS = wandering through a maze by always taking the first available turning — you might find an exit quickly, or you might circle almost the entire maze first.

---

## Path Reconstruction — `reconstructPath()`

All 4 algorithms use the same trick to trace back the path once the destination is reached.

During the search, every time we decide "I reached city B from city A", we store:
```js
cameFrom.set(B, A);
```

When we reach the destination, we **trace backwards**:
```js
function reconstructPath(cameFrom, current) {
    const path = [current];              // Start from destination
    while (cameFrom.has(current)) {
        current = cameFrom.get(current); // Step back one city
        path.unshift(current);           // Add to FRONT of array
    }
    return path; // Now it's in order: start → ... → destination
}
```

```
cameFrom: { E→D, D→B, B→A }
Start from E:
  E → look up cameFrom[E] = D → path: [D, E]
  D → look up cameFrom[D] = B → path: [B, D, E]
  B → look up cameFrom[B] = A → path: [A, B, D, E]
  A → not in cameFrom         → DONE
```

---

## Path Weight Calculation — `calculatePathWeight()`

After reconstruction, we calculate the actual total cost by summing up the edge weights along the path:

```js
function calculatePathWeight(path) {
    let weight = 0;
    for (let i = 0; i < path.length - 1; i++) {
        const u = path[i];
        const v = path[i + 1];
        const edge = adjList.get(u).find(e => e.to === v);
        if (edge) weight += edge.weight;
    }
    return weight;
}
```

BFS/DFS don't track total weight during search, so we compute it afterwards.  
Dijkstra/A* already know the optimal weight, but we recalculate consistently for uniformity.

---

## Visual Animation System

The algorithms all run **instantly** in JavaScript (the graph is small enough). The step-by-step animation you see is a **replay** of the edges they examined, not the actual search happening live.

```js
// After algorithm finishes:
pathResult = { path, visitedEdges, totalWeight, visitedCount };

// Replay search animation:
searchInterval = setInterval(() => {
    const edge = pathResult.visitedEdges.shift(); // Pop one edge
    nodes[edge.v].mesh.material = nodeMaterialSearching; // Turn yellow
    createVisualEdge(edge.u, edge.v, edgeMaterialSearching, edge.weight);
}, 25); // 25ms between each edge = smooth animation

// After search replay, trace the final path:
pathInterval = setInterval(() => {
    createVisualEdge(u, v, edgeMaterialPath, weight, true); // Thick green tube
}, 50);
```

**Why animate separately?**  
If algorithms ran step-by-step in real-time, the UI would freeze during each tick (JavaScript is single-threaded). Pre-computing then replaying gives a smooth visual without any stutter.

---

## Algorithm Comparison Summary

| | Dijkstra | A* | BFS | DFS |
|---|---|---|---|---|
| **Optimal path?** | ✅ Yes (weight) | ✅ Yes (weight) | ✅ Yes (hops) | ❌ No |
| **Considers weights?** | ✅ Yes | ✅ Yes | ❌ No | ❌ No |
| **Uses heuristic?** | ❌ No | ✅ Yes | ❌ No | ❌ No |
| **Speed** | Medium | Fast | Medium | Unpredictable |
| **Data structure** | Priority Queue | Priority Queue | Queue (FIFO) | Stack (LIFO) |
| **Best use case** | Weighted shortest path | Weighted + faster search | Minimum hops | Graph exploration demo |
