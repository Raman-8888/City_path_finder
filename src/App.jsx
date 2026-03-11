import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './App.css';

export default function App() {
  const mountRef = useRef(null);

  useEffect(() => {
    // ─────────────────────────────────────────────
    // Configuration
    // ─────────────────────────────────────────────
    const NODE_COUNT = 80;
    const CONNECTION_DISTANCE = 60;
    const MAP_SIZE = 300;
    const ANIMATION_SPEED_MS = 25;

    const COLOR_BG = 0x111111;
    const COLOR_TERRAIN = 0x222621;
    const COLOR_NODE_IDLE = 0xaaaaaa;
    const COLOR_EDGE_IDLE = 0x444444;
    const COLOR_NODE_HOVER = 0xffffff;
    const COLOR_START = 0x4ade80;
    const COLOR_END = 0xf87171;
    const COLOR_SEARCHING = 0xfacc15;
    const COLOR_PATH = 0x3b82f6;

    const CITY_NAMES = [
      "Aethelgard","Bravil","Corinth","Dalaran","Eboracum","Falkreath","Gondolin",
      "Hogsmeade","Ithaca","Jorrvaskr","Kakariko","Lothlorien","Midgar","Narshe",
      "Osgiliath","Pallet","Qeynos","Rapture","Solitude","Taris","Uruk",
      "Valyria","Whiterun","Xanadu","Yharnam","Zanarkand","Atlantis","Babylon",
      "Camelot","Delphi","Eldorado","Gomorrah","Hyperborea","Kyoto","Memphis",
      "Nineveh","Petra","Rome","Sparta","Troy","Uruk","Carthage","Thebes",
      "Shambhala","Avalon","Lyonesse","Agartha","Lemuria","Mu"
    ];

    // ─────────────────────────────────────────────
    // Scene Setup
    // ─────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(COLOR_BG);
    scene.fog = new THREE.FogExp2(COLOR_BG, 0.002);

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 250, 150);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2.2;
    controls.minDistance = 20;
    controls.maxDistance = 500;
    controls.enablePan = true;
    controls.panSpeed = 1.0;
    controls.autoRotate = false;
    controls.enableZoom = true;
    controls.zoomSpeed = 1.2;  // smooth zoom speed
    controls.dampingFactor = 0.08; // slightly more damping for smooth deceleration

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Zoom to cursor — gently shift the orbit pivot toward wherever the mouse is pointing
    // Use a small factor (0.02) to avoid lateral snap; applied on both in & out
    const onWheel = (event) => {
      raycaster.setFromCamera(mouse, camera);
      const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const hitPoint = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(groundPlane, hitPoint)) {
        const shiftVec = new THREE.Vector3()
          .subVectors(hitPoint, controls.target)
          .multiplyScalar(0.02); // gentle nudge — prevents lateral snap
        controls.target.add(shiftVec);
        camera.position.add(shiftVec);
      }
    };
    window.addEventListener('wheel', onWheel, { passive: true });

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0x38bdf8, 2, 200);
    pointLight.position.set(20, 50, 20);
    scene.add(pointLight);

    // ─────────────────────────────────────────────
    // Graph Data Structures
    // ─────────────────────────────────────────────
    const nodes = [];
    const edges = [];
    const adjList = new Map();

    const mapGroup = new THREE.Group();
    scene.add(mapGroup);

    // Terrain
    const terrainGeo = new THREE.PlaneGeometry(MAP_SIZE * 1.5, MAP_SIZE * 1.5, 64, 64);
    const posAttribute = terrainGeo.attributes.position;
    const vertex = new THREE.Vector3();
    for (let i = 0; i < posAttribute.count; i++) {
      vertex.fromBufferAttribute(posAttribute, i);
      const distanceToCenter = Math.sqrt(vertex.x * vertex.x + vertex.y * vertex.y);
      const noise = (Math.sin(vertex.x * 0.05) + Math.cos(vertex.y * 0.05)) * 5;
      const borderDrop = Math.max(0, (distanceToCenter - MAP_SIZE * 0.5) * 0.2);
      vertex.z = noise - borderDrop;
      posAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    terrainGeo.computeVertexNormals();
    const terrainMat = new THREE.MeshStandardMaterial({
      color: COLOR_TERRAIN, roughness: 0.9, metalness: 0.1, flatShading: true
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.rotation.x = -Math.PI / 2;
    mapGroup.add(terrainMesh);

    // Materials
    const nodeMaterialIdle      = new THREE.MeshStandardMaterial({ color: COLOR_NODE_IDLE, roughness: 0.5, metalness: 0.3 });
    const nodeMaterialHover     = new THREE.MeshStandardMaterial({ color: COLOR_NODE_HOVER, emissive: COLOR_NODE_HOVER, emissiveIntensity: 0.3 });
    const nodeMaterialStart     = new THREE.MeshStandardMaterial({ color: COLOR_START, emissive: COLOR_START, emissiveIntensity: 0.6 });
    const nodeMaterialEnd       = new THREE.MeshStandardMaterial({ color: COLOR_END,   emissive: COLOR_END,   emissiveIntensity: 0.6 });
    const nodeMaterialSearching = new THREE.MeshStandardMaterial({ color: COLOR_SEARCHING, emissive: COLOR_SEARCHING, emissiveIntensity: 0.4 });
    const nodeMaterialPath      = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 1.2 });

    const edgeMaterialSearching = new THREE.MeshBasicMaterial({ color: COLOR_SEARCHING, transparent: true, opacity: 0.6 });
    const edgeMaterialPath      = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 1.5, roughness: 0.2, metalness: 0.1 });

    const nodeGeometry = new THREE.CylinderGeometry(1.5, 1.5, 1, 16);

    // ─────────────────────────────────────────────
    // Sprite helpers
    // ─────────────────────────────────────────────
    function createTextSprite(message, color = 'rgba(255, 255, 255, 0.7)', isWeight = false) {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = 256;
      canvas.height = 128;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      if (isWeight) {
        context.fillStyle = 'rgba(15, 23, 42, 0.8)';
        context.fillRect(64, 32, 128, 64);
        context.font = 'bold 32px monospace';
        context.fillStyle = '#facc15';
      } else {
        context.font = 'bold 36px Courier New';
        context.fillStyle = 'black';
        context.fillText(message, 128 + 2, 64 + 2);
        context.fillText(message, 128 - 2, 64 - 2);
        context.fillStyle = color;
      }
      context.fillText(message, 128, 64);
      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.scale.set(isWeight ? 8 : 14, isWeight ? 4 : 7, 1);
      return sprite;
    }

    function getRandomCityName() {
      const prefix = CITY_NAMES[Math.floor(Math.random() * CITY_NAMES.length)];
      const suffix = Math.random() > 0.5 ? Math.floor(Math.random() * 99) : '';
      return prefix + (suffix ? '-' + suffix : '');
    }

    function updateSpriteText(sprite, line1, line2 = null, color = 'rgba(255,255,255,0.9)') {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (line2) {
        ctx.font = 'bold 28px Courier New';
        ctx.fillStyle = 'black';
        ctx.fillText(line1, 130, 38); ctx.fillText(line1, 126, 34);
        ctx.fillStyle = color;
        ctx.fillText(line1, 128, 36);
        ctx.strokeStyle = 'rgba(34,197,94,0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(40, 68); ctx.lineTo(216, 68); ctx.stroke();
        ctx.font = 'bold 24px monospace';
        ctx.fillStyle = '#22c55e';
        ctx.fillText(line2, 128, 92);
      } else {
        ctx.font = 'bold 36px Courier New';
        ctx.fillStyle = 'black';
        ctx.fillText(line1, 130, 66); ctx.fillText(line1, 126, 62);
        ctx.fillStyle = color;
        ctx.fillText(line1, 128, 64);
      }
      const newTexture = new THREE.CanvasTexture(canvas);
      newTexture.minFilter = THREE.LinearFilter;
      if (sprite.material.map) sprite.material.map.dispose();
      sprite.material.map = newTexture;
      sprite.material.needsUpdate = true;
    }

    function applyHeuristicLabels() {
      if (endNode === null) return;
      if (pathResult && pathResult.path) {
        const pathSet = new Set(pathResult.path);
        for (const nodeId of pathResult.path) {
          const node = nodes[nodeId];
          const h = Math.round(node.pos.distanceTo(nodes[endNode].pos));
          updateSpriteText(node.sprite, node.name, `h=${h}`, '#22c55e');
        }
        for (const nodeId of searchedNodes) {
          if (!pathSet.has(nodeId) && nodeId !== startNode && nodeId !== endNode) {
            const node = nodes[nodeId];
            const h = Math.round(node.pos.distanceTo(nodes[endNode].pos));
            updateSpriteText(node.sprite, node.name, `h=${h}`, '#facc15');
          }
        }
      }
    }

    function restoreNodeLabels() {
      for (const node of nodes) updateSpriteText(node.sprite, node.name);
    }

    // ─────────────────────────────────────────────
    // Generate Nodes
    // ─────────────────────────────────────────────
    for (let i = 0; i < NODE_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * (MAP_SIZE / 2);
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const noise = (Math.sin(x * 0.05) + Math.cos(z * 0.05)) * 5;
      const y = noise + 0.5;
      const cityName = getRandomCityName();

      const mesh = new THREE.Mesh(nodeGeometry, nodeMaterialIdle);
      mesh.position.set(x, y, z);
      mesh.userData = { id: i, name: cityName };
      mapGroup.add(mesh);

      const sprite = createTextSprite(cityName);
      sprite.position.set(x, y + 8, z);
      mapGroup.add(sprite);

      nodes.push({ id: i, pos: new THREE.Vector3(x, y, z), mesh, name: cityName, sprite });
      adjList.set(i, []);
    }

    // ─────────────────────────────────────────────
    // Build edges
    // ─────────────────────────────────────────────
    function buildCurvedEdge(p1, p2, segments = 10) {
      const mid1 = p1.clone().lerp(p2, 0.33);
      const mid2 = p1.clone().lerp(p2, 0.66);
      const dist = p1.distanceTo(p2);
      const noiseAmt = dist * 0.1;
      mid1.x += (Math.random() - 0.5) * noiseAmt;
      mid1.z += (Math.random() - 0.5) * noiseAmt;
      mid2.x += (Math.random() - 0.5) * noiseAmt;
      mid2.z += (Math.random() - 0.5) * noiseAmt;
      const getTerY = (x, z) => (Math.sin(x * 0.05) + Math.cos(z * 0.05)) * 5 + 0.1;
      mid1.y = getTerY(mid1.x, mid1.z);
      mid2.y = getTerY(mid2.x, mid2.z);
      const curve = new THREE.CatmullRomCurve3([p1, mid1, mid2, p2]);
      const points = curve.getPoints(segments);
      return { points, curve };
    }

    const edgePathData = new Map();
    let idleEdgeLabels = [];

    const ROAD_COLORS = {
      highway:   0x38bdf8,
      normal:    0x555555,
      difficult: 0x92400e,
    };

    for (let i = 0; i < NODE_COUNT; i++) {
      const neighbors = [];
      for (let j = 0; j < NODE_COUNT; j++) {
        if (i !== j) neighbors.push({ id: j, dist: nodes[i].pos.distanceTo(nodes[j].pos) });
      }
      neighbors.sort((a, b) => a.dist - b.dist);
      const toConnect = neighbors.slice(0, 5);

      for (const neighbor of toConnect) {
        const j = neighbor.id;
        if (i < j && neighbor.dist < CONNECTION_DISTANCE * 1.5) {
          const dist = neighbor.dist;
          const roll = Math.random();
          let roadType, multiplier, roadColor, tubeW;
          if (roll < 0.15) {
            roadType = 'highway'; multiplier = 0.3 + Math.random() * 0.3;
            roadColor = ROAD_COLORS.highway; tubeW = 0.55;
          } else if (roll < 0.40) {
            roadType = 'difficult'; multiplier = 2.5 + Math.random() * 2.5;
            roadColor = ROAD_COLORS.difficult; tubeW = 0.25;
          } else {
            roadType = 'normal'; multiplier = 0.9 + Math.random() * 1.1;
            roadColor = ROAD_COLORS.normal; tubeW = 0.35;
          }
          const weight = Math.max(1, Math.floor(dist * multiplier));
          edges.push({ u: i, v: j, weight, roadType });
          adjList.get(i).push({ to: j, weight });
          adjList.get(j).push({ to: i, weight });

          const { points, curve } = buildCurvedEdge(nodes[i].pos, nodes[j].pos);
          const edgeKey = `${i}-${j}`;
          edgePathData.set(edgeKey, curve);

          const lineGeo = new THREE.TubeGeometry(curve, 8, tubeW, 4, false);
          const lineMesh = new THREE.Mesh(lineGeo, new THREE.MeshBasicMaterial({
            color: roadColor, transparent: true, opacity: roadType === 'highway' ? 0.9 : 0.6
          }));
          mapGroup.add(lineMesh);

          const labelColor = roadType === 'highway' ? '#38bdf8'
            : roadType === 'difficult' ? '#f97316'
            : '#facc15';
          const midpt = curve.getPointAt(0.5);
          const labelSprite = createTextSprite(weight.toString(), labelColor, true);
          labelSprite.position.copy(midpt);
          labelSprite.position.y += 3.5;
          mapGroup.add(labelSprite);
          idleEdgeLabels.push(labelSprite);
        }
      }
    }

    // ─────────────────────────────────────────────
    // Interaction State
    // ─────────────────────────────────────────────
    let hoveredNode = null;
    let startNode = null;
    let endNode = null;
    let activeSearchEdges = [];
    let finalPathEdges = [];
    let searchedNodes = new Set();
    let cameraAnimInterval = null;

    function animateCameraToNode(nodeId) {
      if (cameraAnimInterval) clearInterval(cameraAnimInterval);
      const targetPos = nodes[nodeId].pos;
      let ticks = 0;
      const maxTicks = 15;
      cameraAnimInterval = setInterval(() => {
        controls.target.lerp(targetPos, 0.2);
        const dir = new THREE.Vector3().subVectors(targetPos, camera.position).normalize();
        if (camera.position.distanceTo(targetPos) > 100) camera.position.add(dir.multiplyScalar(3));
        ticks++;
        if (ticks >= maxTicks) { clearInterval(cameraAnimInterval); cameraAnimInterval = null; }
      }, 16);
    }

    function updateUI() {
      if (startNode === null) {
        document.getElementById('status').innerText = 'Select starting city.';
      } else if (endNode === null) {
        document.getElementById('status').innerText = 'Select destination city.';
      }
      if (typeof window._syncSearchBarFromUI === 'function') window._syncSearchBarFromUI();
    }

    function resetGraphVisuals() {
      for (const node of nodes) {
        if (node.id === startNode) node.mesh.material = nodeMaterialStart;
        else if (node.id === endNode) node.mesh.material = nodeMaterialEnd;
        else if (pathResult && pathResult.path && pathResult.path.includes(node.id)) { /* keep green */ }
        else node.mesh.material = nodeMaterialIdle;
      }
      for (const edgeObj of activeSearchEdges) {
        mapGroup.remove(edgeObj.mesh);
        edgeObj.mesh.geometry.dispose();
        if (edgeObj.sprite) {
          mapGroup.remove(edgeObj.sprite);
          edgeObj.sprite.material.map.dispose();
          edgeObj.sprite.material.dispose();
        }
      }
      activeSearchEdges = [];
    }

    function resetPathVisuals() {
      pathResult = null;
      searchedNodes.clear();
      for (const node of nodes) node.mesh.material = nodeMaterialIdle;
      restoreNodeLabels();
      for (const edgeObj of [...activeSearchEdges, ...finalPathEdges]) {
        mapGroup.remove(edgeObj.mesh);
        edgeObj.mesh.geometry.dispose();
        if (edgeObj.sprite) {
          mapGroup.remove(edgeObj.sprite);
          edgeObj.sprite.material.map.dispose();
          edgeObj.sprite.material.dispose();
        }
      }
      activeSearchEdges = [];
      finalPathEdges = [];
    }

    const onMouseMove = (event) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodes.map(n => n.mesh));
      if (intersects.length > 0) {
        const mesh = intersects[0].object;
        const nodeId = mesh.userData.id;
        if (hoveredNode !== nodeId) {
          if (hoveredNode !== null && hoveredNode !== startNode && hoveredNode !== endNode)
            nodes[hoveredNode].mesh.material = nodeMaterialIdle;
          hoveredNode = nodeId;
          document.body.style.cursor = 'pointer';
          if (hoveredNode !== startNode && hoveredNode !== endNode)
            nodes[hoveredNode].mesh.material = nodeMaterialHover;
        }
      } else {
        if (hoveredNode !== null) {
          if (hoveredNode !== startNode && hoveredNode !== endNode)
            nodes[hoveredNode].mesh.material = nodeMaterialIdle;
          hoveredNode = null;
          document.body.style.cursor = 'default';
        }
      }
    };
    window.addEventListener('mousemove', onMouseMove);

    const onClick = () => {
      if (hoveredNode !== null && isSearchActive === false) {
        if (startNode === null) {
          startNode = hoveredNode;
          nodes[startNode].mesh.material = nodeMaterialStart;
          animateCameraToNode(startNode);
          updateUI();
        } else if (endNode === null && hoveredNode !== startNode) {
          endNode = hoveredNode;
          nodes[endNode].mesh.material = nodeMaterialEnd;
          animateCameraToNode(endNode);
          updateUI();
          startPathfinding();
        } else if (startNode !== null && endNode !== null) {
          startNode = hoveredNode;
          endNode = null;
          resetGraphVisuals();
          nodes[startNode].mesh.material = nodeMaterialStart;
          animateCameraToNode(startNode);
          updateUI();
          document.getElementById('result-modal').classList.remove('show');
          document.getElementById('modal-overlay').style.display = 'none';
        }
      }
    };
    window.addEventListener('click', onClick);

    // ─────────────────────────────────────────────
    // Pathfinding
    // ─────────────────────────────────────────────
    let isSearchActive = false;
    let searchQueue = [];
    let searchInterval = null;
    let pathInterval = null;
    let pathResult = null;
    let algoStartTime = 0;

    function createVisualEdge(u, v, material, weight, isFinalPath = false) {
      const key1 = `${u}-${v}`;
      const key2 = `${v}-${u}`;
      const curve = edgePathData.get(key1) || edgePathData.get(key2);
      if (curve) {
        const tubeRadius = isFinalPath ? 0.9 : 0.4;
        const geometry = new THREE.TubeGeometry(curve, 10, tubeRadius, 6, false);
        const tube = new THREE.Mesh(geometry, material);
        if (isFinalPath) tube.renderOrder = 1;
        mapGroup.add(tube);
        let sprite = null;
        const midpt = curve.getPointAt(0.5);
        if (weight !== undefined) {
          sprite = createTextSprite(weight.toString(), '', true);
          sprite.position.copy(midpt);
          sprite.position.y += 4.5;
          sprite.userData = { isFinalPath };
          if (isFinalPath) { sprite.renderOrder = 999; sprite.material.depthTest = false; }
          mapGroup.add(sprite);
        }
        if (isFinalPath) finalPathEdges.push({ mesh: tube, sprite });
        else activeSearchEdges.push({ mesh: tube, sprite });
        return tube;
      }
      return null;
    }

    function startPathfinding() {
      const algoType = document.getElementById('algo-select').value;
      document.getElementById('status').innerText = `Running ${algoType.toUpperCase()}...`;
      controls.autoRotate = false;
      isSearchActive = true;
      algoStartTime = performance.now();
      searchQueue = [];
      clearInterval(searchInterval);
      if (pathInterval !== null) { clearInterval(pathInterval); pathInterval = null; }
      resetPathVisuals();
      nodes[startNode].mesh.material = nodeMaterialStart;
      nodes[endNode].mesh.material   = nodeMaterialEnd;
      let result;
      if (algoType === 'dijkstra') result = solveDijkstra();
      else if (algoType === 'astar') result = solveAStar();
      else if (algoType === 'bfs')   result = solveBFS();
      else if (algoType === 'dfs')   result = solveDFS();
      if (!result || !result.path) {
        showResultModal('Failed', 0, result.visitedEdges.length, performance.now() - algoStartTime);
        isSearchActive = false;
        return;
      }
      pathResult = result;
      searchInterval = setInterval(animateAlgorithmStep, ANIMATION_SPEED_MS);
    }

    function animateAlgorithmStep() {
      if (pathResult.visitedEdges.length > 0) {
        const edge = pathResult.visitedEdges.shift();
        if (edge.v !== startNode && edge.v !== endNode) {
          nodes[edge.v].mesh.material = nodeMaterialSearching;
          searchedNodes.add(edge.v);
        }
        createVisualEdge(edge.u, edge.v, edgeMaterialSearching, edge.weight);
      } else {
        clearInterval(searchInterval);
        animatePath();
      }
    }

    function animatePath() {
      let pathIdx = 0;
      pathInterval = setInterval(() => {
        if (pathIdx >= pathResult.path.length - 1) {
          clearInterval(pathInterval);
          pathInterval = null;
          const timeTaken = performance.now() - algoStartTime;
          document.getElementById('status').innerText = 'Path Found!';
          document.getElementById('status').className = 'success';
          document.getElementById('stop-btn').style.display = 'none';
          applyHeuristicLabels();
          const algoName = document.getElementById('algo-select').options[document.getElementById('algo-select').selectedIndex].text;
          showResultModal(algoName, pathResult.totalWeight, pathResult.visitedCount, timeTaken);
          isSearchActive = false;
          controls.autoRotate = false;
          return;
        }
        const u = pathResult.path[pathIdx];
        const v = pathResult.path[pathIdx + 1];
        if (u !== startNode && u !== endNode) nodes[u].mesh.material = nodeMaterialPath;
        if (v !== startNode && v !== endNode) nodes[v].mesh.material = nodeMaterialPath;
        const edgeData = adjList.get(u).find(e => e.to === v);
        createVisualEdge(u, v, edgeMaterialPath, edgeData ? edgeData.weight : 0, true);
        pathIdx++;
      }, 50);
    }

    function showResultModal(algoName, weight, visited, timeMs) {
      document.getElementById('res-algo').innerText    = algoName;
      document.getElementById('res-weight').innerText  = weight;
      document.getElementById('res-visited').innerText = visited;
      document.getElementById('res-time').innerText    = timeMs.toFixed(2) + ' ms';
      document.getElementById('modal-overlay').style.display = 'flex';
      setTimeout(() => document.getElementById('result-modal').classList.add('show'), 10);
      addToHistory(algoName, weight, visited, timeMs);
    }

    function addToHistory(algoName, weight, visited, timeMs) {
      const historyList = document.getElementById('history-list');
      const emptyMsg = document.getElementById('history-empty');
      if (emptyMsg) emptyMsg.style.display = 'none';
      const item = document.createElement('div');
      let colorClass = 'dijkstra';
      if (algoName.includes('A*'))      colorClass = 'astar';
      else if (algoName.includes('Breadth')) colorClass = 'bfs';
      else if (algoName.includes('Depth'))   colorClass = 'dfs';
      item.className = `history-item ${colorClass}`;
      const startName = nodes[startNode].name;
      const endName   = nodes[endNode].name;
      item.innerHTML = `
        <div class="hist-route">${startName} &rarr; ${endName}</div>
        <div style="font-size:11px;margin-bottom:5px;">${algoName}</div>
        <div class="hist-detail"><span>Cost: ${weight}</span><span>Time: ${timeMs.toFixed(1)}ms</span></div>
        <div class="hist-detail" style="color:#64748b;"><span>Visited: ${visited} nodes</span></div>
      `;
      historyList.insertBefore(item, historyList.firstChild);
    }

    document.getElementById('close-btn').addEventListener('click', () => {
      document.getElementById('result-modal').classList.remove('show');
      setTimeout(() => { document.getElementById('modal-overlay').style.display = 'none'; }, 300);
    });

    document.getElementById('stop-btn').addEventListener('click', () => {
      if (isSearchActive || pathInterval !== null) {
        clearInterval(searchInterval);
        if (pathInterval !== null) { clearInterval(pathInterval); pathInterval = null; }
        document.getElementById('stop-btn').style.display = 'none';
        document.getElementById('status').innerText = 'Search Stopped.';
        document.getElementById('status').className = '';
        isSearchActive = false;
        controls.autoRotate = false;
      }
    });

    document.getElementById('reset-btn').addEventListener('click', () => {
      clearInterval(searchInterval);
      if (pathInterval !== null) { clearInterval(pathInterval); pathInterval = null; }
      isSearchActive = false;
      startNode = null;
      endNode   = null;
      resetPathVisuals();
      updateUI();
      document.getElementById('stop-btn').style.display = 'none';
      document.getElementById('status').innerText = 'Awaiting Selection...';
      document.getElementById('status').className = 'highlight';
      controls.autoRotate = false;
    });

    // ─────────────────────────────────────────────
    // Algorithms
    // ─────────────────────────────────────────────
    function reconstructPath(cameFrom, current) {
      const path = [current];
      while (cameFrom.has(current)) { current = cameFrom.get(current); path.unshift(current); }
      return path;
    }

    function calculatePathWeight(path) {
      let weight = 0;
      for (let i = 0; i < path.length - 1; i++) {
        const u = path[i]; const v = path[i + 1];
        const edge = adjList.get(u).find(e => e.to === v);
        if (edge) weight += edge.weight;
      }
      return weight;
    }

    function solveDijkstra() {
      const dist = new Map(); const cameFrom = new Map(); const visitedEdges = [];
      for (let i = 0; i < NODE_COUNT; i++) dist.set(i, Infinity);
      dist.set(startNode, 0);
      let pq = [{ node: startNode, weight: 0 }]; let visitedCount = 0;
      while (pq.length > 0) {
        pq.sort((a, b) => a.weight - b.weight);
        const current = pq.shift().node;
        visitedCount++;
        if (current === endNode) {
          const path = reconstructPath(cameFrom, endNode);
          return { path, visitedEdges, totalWeight: calculatePathWeight(path), visitedCount };
        }
        for (const neighbor of adjList.get(current)) {
          const alt = dist.get(current) + neighbor.weight;
          if (alt < dist.get(neighbor.to)) {
            dist.set(neighbor.to, alt);
            cameFrom.set(neighbor.to, current);
            pq.push({ node: neighbor.to, weight: alt });
            visitedEdges.push({ u: current, v: neighbor.to, weight: neighbor.weight });
          }
        }
      }
      return null;
    }

    function solveAStar() {
      const h = (nodeId) => nodes[nodeId].pos.distanceTo(nodes[endNode].pos);
      const gScore = new Map(); const fScore = new Map(); const cameFrom = new Map(); const visitedEdges = [];
      for (let i = 0; i < NODE_COUNT; i++) { gScore.set(i, Infinity); fScore.set(i, Infinity); }
      gScore.set(startNode, 0); fScore.set(startNode, h(startNode));
      let pq = [{ node: startNode, f: fScore.get(startNode) }]; let visitedCount = 0;
      while (pq.length > 0) {
        pq.sort((a, b) => a.f - b.f);
        const current = pq.shift().node;
        visitedCount++;
        if (current === endNode) {
          const path = reconstructPath(cameFrom, endNode);
          return { path, visitedEdges, totalWeight: calculatePathWeight(path), visitedCount };
        }
        for (const neighbor of adjList.get(current)) {
          const tentative_gScore = gScore.get(current) + neighbor.weight;
          if (tentative_gScore < gScore.get(neighbor.to)) {
            cameFrom.set(neighbor.to, current);
            gScore.set(neighbor.to, tentative_gScore);
            fScore.set(neighbor.to, gScore.get(neighbor.to) + h(neighbor.to));
            if (!pq.find(item => item.node === neighbor.to)) {
              pq.push({ node: neighbor.to, f: fScore.get(neighbor.to) });
              visitedEdges.push({ u: current, v: neighbor.to, weight: neighbor.weight });
            }
          }
        }
      }
      return null;
    }

    function solveBFS() {
      const queue = [startNode]; const visited = new Set([startNode]);
      const cameFrom = new Map(); const visitedEdges = []; let visitedCount = 0;
      while (queue.length > 0) {
        const current = queue.shift(); visitedCount++;
        if (current === endNode) {
          const path = reconstructPath(cameFrom, endNode);
          return { path, visitedEdges, totalWeight: calculatePathWeight(path), visitedCount };
        }
        for (const neighbor of adjList.get(current)) {
          if (!visited.has(neighbor.to)) {
            visited.add(neighbor.to); cameFrom.set(neighbor.to, current);
            queue.push(neighbor.to);
            visitedEdges.push({ u: current, v: neighbor.to, weight: neighbor.weight });
          }
        }
      }
      return null;
    }

    function solveDFS() {
      const stack = [startNode]; const visited = new Set([startNode]);
      const cameFrom = new Map(); const visitedEdges = []; let visitedCount = 0;
      while (stack.length > 0) {
        const current = stack.pop(); visitedCount++;
        if (current === endNode) {
          const path = reconstructPath(cameFrom, endNode);
          return { path, visitedEdges, totalWeight: calculatePathWeight(path), visitedCount };
        }
        for (const neighbor of adjList.get(current)) {
          if (!visited.has(neighbor.to)) {
            visited.add(neighbor.to); cameFrom.set(neighbor.to, current);
            stack.push(neighbor.to);
            visitedEdges.push({ u: current, v: neighbor.to, weight: neighbor.weight });
          }
        }
      }
      return null;
    }

    // ─────────────────────────────────────────────
    // Label Scaling
    // ─────────────────────────────────────────────
    function updateLabels() {
      const dist = camera.position.distanceTo(controls.target);
      const minScale = 0.4; const maxScale = 2.5;
      const normalizedDist = THREE.MathUtils.clamp((dist - 20) / (500 - 20), 0, 1);
      const dynamicScaleFactor = THREE.MathUtils.lerp(minScale, maxScale, normalizedDist);

      nodes.forEach(node => {
        const isHovered = (hoveredNode === node.id);
        const isStart   = (startNode === node.id);
        const isEnd     = (endNode === node.id);
        const isInPath  = pathResult && pathResult.path.includes(node.id);
        if (isHovered || isStart || isEnd || isInPath) {
          node.sprite.scale.set(18 * dynamicScaleFactor, 9 * dynamicScaleFactor, 1);
          if (isStart)      node.sprite.material.color.setHex(0x4ade80);
          else if (isEnd)   node.sprite.material.color.setHex(0xf87171);
          else if (isInPath) node.sprite.material.color.setHex(0x22c55e);
          else               node.sprite.material.color.setHex(0xffffff);
        } else {
          node.sprite.scale.set(14 * dynamicScaleFactor, 7 * dynamicScaleFactor, 1);
          node.sprite.material.color.setHex(0xffffff);
        }
      });

      idleEdgeLabels.forEach(sprite => {
        sprite.material.opacity = 0.85;
        sprite.scale.set(10 * dynamicScaleFactor, 5 * dynamicScaleFactor, 1);
        sprite.visible = true;
      });

      activeSearchEdges.forEach(obj => {
        if (obj.sprite && obj.sprite.userData.isFinalPath) {
          obj.sprite.scale.set(12 * dynamicScaleFactor, 6 * dynamicScaleFactor, 1);
          obj.sprite.material.opacity = 0.95;
          obj.sprite.visible = true;
        }
      });

      const maxTilt = THREE.MathUtils.lerp(Math.PI / 3, Math.PI / 2, normalizedDist);
      controls.minPolarAngle = Math.PI / 8;
      controls.maxPolarAngle = maxTilt;
    }

    // ─────────────────────────────────────────────
    // Resize
    // ─────────────────────────────────────────────
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    // ─────────────────────────────────────────────
    // Render Loop
    // ─────────────────────────────────────────────
    let animFrameId;
    function animate() {
      animFrameId = requestAnimationFrame(animate);
      const limit = MAP_SIZE / 2;
      controls.target.x = THREE.MathUtils.clamp(controls.target.x, -limit, limit);
      controls.target.z = THREE.MathUtils.clamp(controls.target.z, -limit, limit);
      camera.position.x = THREE.MathUtils.clamp(camera.position.x, -limit * 2, limit * 2);
      camera.position.z = THREE.MathUtils.clamp(camera.position.z, -limit * 2, limit * 2);
      controls.update();
      renderer.render(scene, camera);
      updateLabels();
    }

    updateUI();
    animate();

    // ─────────────────────────────────────────────
    // Panel collapse toggle
    // ─────────────────────────────────────────────
    const infoPanel  = document.getElementById('info');
    const collapseBtn = document.getElementById('collapse-btn');
    const showTab     = document.getElementById('show-tab');

    const onCollapse = () => {
      infoPanel.classList.add('collapsed');
      showTab.style.display = 'block';
    };
    const onShow = () => {
      infoPanel.classList.remove('collapsed');
      showTab.style.display = 'none';
    };
    collapseBtn.addEventListener('click', onCollapse);
    showTab.addEventListener('click', onShow);

    // ─────────────────────────────────────────────
    // Search Bar Logic
    // ─────────────────────────────────────────────
    (function initSearchBar() {
      const inputFrom = document.getElementById('search-from');
      const inputTo   = document.getElementById('search-to');
      const acFrom    = document.getElementById('ac-from');
      const acTo      = document.getElementById('ac-to');
      const clearFrom = document.getElementById('clear-from');
      const clearTo   = document.getElementById('clear-to');
      const swapBtn   = document.getElementById('search-swap-btn');
      const goBtn     = document.getElementById('search-go-btn');

      let searchFromId = null;
      let searchToId   = null;
      let acFromIdx = -1;
      let acToIdx   = -1;

      function highlightMatch(text, query) {
        if (!query) return text;
        const idx = text.toLowerCase().indexOf(query.toLowerCase());
        if (idx === -1) return text;
        return text.slice(0, idx) + '<mark>' + text.slice(idx, idx + query.length) + '</mark>' + text.slice(idx + query.length);
      }

      function getMatches(query) {
        if (!query || query.length < 1) return [];
        const q = query.toLowerCase();
        return nodes
          .filter(n => n.name.toLowerCase().includes(q))
          .sort((a, b) => {
            const aStarts = a.name.toLowerCase().startsWith(q);
            const bStarts = b.name.toLowerCase().startsWith(q);
            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;
            return a.name.localeCompare(b.name);
          })
          .slice(0, 10);
      }

      function showDropdown(acEl, items, query, onSelect, activeIdxRef, setActiveIdx) {
        acEl.innerHTML = '';
        if (items.length === 0) { acEl.classList.remove('open'); return; }
        items.forEach((node, i) => {
          const div = document.createElement('div');
          div.className = 'autocomplete-item';
          div.innerHTML = `<span class="ac-icon">📍</span><span>${highlightMatch(node.name, query)}</span>`;
          div.addEventListener('mousedown', (e) => { e.preventDefault(); onSelect(node); });
          div.addEventListener('mouseover', () => setActiveIdx(i));
          acEl.appendChild(div);
        });
        setActiveIdx(-1);
        acEl.classList.add('open');
      }

      function hideDropdown(acEl) { acEl.classList.remove('open'); }

      function setActive(acEl, idx) {
        const items = acEl.querySelectorAll('.autocomplete-item');
        items.forEach((el, i) => el.classList.toggle('active', i === idx));
      }

      function selectFrom(node) {
        searchFromId = node.id;
        inputFrom.value = node.name;
        clearFrom.style.display = 'inline';
        hideDropdown(acFrom);
        acFromIdx = -1;
        updateGoButton();
        applySearchSelection();
      }

      function selectTo(node) {
        searchToId = node.id;
        inputTo.value = node.name;
        clearTo.style.display = 'inline';
        hideDropdown(acTo);
        acToIdx = -1;
        updateGoButton();
        applySearchSelection();
      }

      function applySearchSelection() {
        clearInterval(searchInterval);
        if (pathInterval !== null) { clearInterval(pathInterval); pathInterval = null; }
        isSearchActive = false;
        startNode = searchFromId;
        endNode   = searchToId;
        resetGraphVisuals();
        if (startNode !== null) { nodes[startNode].mesh.material = nodeMaterialStart; animateCameraToNode(startNode); }
        if (endNode !== null)   { nodes[endNode].mesh.material   = nodeMaterialEnd;   if (startNode !== null) animateCameraToNode(endNode); }
        updateUI();
        document.getElementById('status').innerText = startNode === null
          ? 'Select starting city.'
          : endNode === null ? 'Select destination city.' : 'Ready. Click "Find Route".';
        document.getElementById('status').className = 'highlight';
        document.getElementById('stop-btn').style.display = 'none';
        document.getElementById('result-modal').classList.remove('show');
        document.getElementById('modal-overlay').style.display = 'none';
      }

      function updateGoButton() {
        goBtn.disabled = !(searchFromId !== null && searchToId !== null && searchFromId !== searchToId);
      }

      let fromMatches = [];
      inputFrom.addEventListener('input', () => {
        const q = inputFrom.value.trim();
        clearFrom.style.display = q ? 'inline' : 'none';
        if (!q) { searchFromId = null; updateGoButton(); hideDropdown(acFrom); applySearchSelection(); return; }
        fromMatches = getMatches(q);
        showDropdown(acFrom, fromMatches, q, selectFrom, acFromIdx, (i) => { acFromIdx = i; setActive(acFrom, i); });
      });

      inputFrom.addEventListener('keydown', (e) => {
        const items = acFrom.querySelectorAll('.autocomplete-item');
        if (e.key === 'ArrowDown') { e.preventDefault(); acFromIdx = Math.min(acFromIdx + 1, items.length - 1); setActive(acFrom, acFromIdx); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); acFromIdx = Math.max(acFromIdx - 1, -1); setActive(acFrom, acFromIdx); }
        else if (e.key === 'Enter') { if (acFromIdx >= 0 && fromMatches[acFromIdx]) selectFrom(fromMatches[acFromIdx]); else if (fromMatches.length === 1) selectFrom(fromMatches[0]); }
        else if (e.key === 'Escape') hideDropdown(acFrom);
      });

      inputFrom.addEventListener('blur', () => setTimeout(() => hideDropdown(acFrom), 150));
      inputFrom.addEventListener('focus', () => {
        if (inputFrom.value.trim()) {
          fromMatches = getMatches(inputFrom.value.trim());
          showDropdown(acFrom, fromMatches, inputFrom.value.trim(), selectFrom, acFromIdx, (i) => { acFromIdx = i; setActive(acFrom, i); });
        }
      });

      clearFrom.addEventListener('click', () => {
        inputFrom.value = ''; clearFrom.style.display = 'none'; searchFromId = null;
        hideDropdown(acFrom); updateGoButton(); applySearchSelection(); inputFrom.focus();
      });

      let toMatches = [];
      inputTo.addEventListener('input', () => {
        const q = inputTo.value.trim();
        clearTo.style.display = q ? 'inline' : 'none';
        if (!q) { searchToId = null; updateGoButton(); hideDropdown(acTo); applySearchSelection(); return; }
        toMatches = getMatches(q);
        showDropdown(acTo, toMatches, q, selectTo, acToIdx, (i) => { acToIdx = i; setActive(acTo, i); });
      });

      inputTo.addEventListener('keydown', (e) => {
        const items = acTo.querySelectorAll('.autocomplete-item');
        if (e.key === 'ArrowDown') { e.preventDefault(); acToIdx = Math.min(acToIdx + 1, items.length - 1); setActive(acTo, acToIdx); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); acToIdx = Math.max(acToIdx - 1, -1); setActive(acTo, acToIdx); }
        else if (e.key === 'Enter') { if (acToIdx >= 0 && toMatches[acToIdx]) selectTo(toMatches[acToIdx]); else if (toMatches.length === 1) selectTo(toMatches[0]); }
        else if (e.key === 'Escape') hideDropdown(acTo);
      });

      inputTo.addEventListener('blur', () => setTimeout(() => hideDropdown(acTo), 150));
      inputTo.addEventListener('focus', () => {
        if (inputTo.value.trim()) {
          toMatches = getMatches(inputTo.value.trim());
          showDropdown(acTo, toMatches, inputTo.value.trim(), selectTo, acToIdx, (i) => { acToIdx = i; setActive(acTo, i); });
        }
      });

      clearTo.addEventListener('click', () => {
        inputTo.value = ''; clearTo.style.display = 'none'; searchToId = null;
        hideDropdown(acTo); updateGoButton(); applySearchSelection(); inputTo.focus();
      });

      swapBtn.addEventListener('click', () => {
        const tmpVal = inputFrom.value; const tmpId = searchFromId;
        inputFrom.value = inputTo.value; searchFromId = searchToId;
        inputTo.value = tmpVal; searchToId = tmpId;
        clearFrom.style.display = inputFrom.value ? 'inline' : 'none';
        clearTo.style.display   = inputTo.value   ? 'inline' : 'none';
        updateGoButton(); applySearchSelection();
      });

      goBtn.addEventListener('click', () => {
        if (searchFromId === null || searchToId === null || searchFromId === searchToId) return;
        startNode = searchFromId; endNode = searchToId;
        nodes[startNode].mesh.material = nodeMaterialStart;
        nodes[endNode].mesh.material   = nodeMaterialEnd;
        updateUI(); startPathfinding();
      });

      window._syncSearchBarFromUI = function () {
        if (startNode !== null && nodes[startNode]) {
          inputFrom.value = nodes[startNode].name; searchFromId = startNode; clearFrom.style.display = 'inline';
        } else {
          inputFrom.value = ''; searchFromId = null; clearFrom.style.display = 'none';
        }
        if (endNode !== null && nodes[endNode]) {
          inputTo.value = nodes[endNode].name; searchToId = endNode; clearTo.style.display = 'inline';
        } else {
          inputTo.value = ''; searchToId = null; clearTo.style.display = 'none';
        }
        updateGoButton();
      };
    })();

    // ─────────────────────────────────────────────
    // Cleanup on unmount
    // ─────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(animFrameId);
      clearInterval(searchInterval);
      if (pathInterval) clearInterval(pathInterval);
      if (cameraAnimInterval) clearInterval(cameraAnimInterval);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('click', onClick);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('wheel', onWheel);
      collapseBtn.removeEventListener('click', onCollapse);
      showTab.removeEventListener('click', onShow);
      renderer.dispose();
      if (mountRef.current && renderer.domElement.parentNode === mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      window._syncSearchBarFromUI = undefined;
    };
  }, []);

  return (
    <>
      {/* Three.js canvas mount point */}
      <div ref={mountRef} style={{ position: 'fixed', inset: 0 }} />

      {/* Left-edge show tab */}
      <div id="show-tab" title="Show panel">&#8249; Menu</div>

      {/* Control panel */}
      <div id="info">
        <button id="collapse-btn" title="Hide panel">&#8250;</button>
        <h1>Inter-City Pathfinder</h1>
        <p>Click on two distinct cities to find the optimal route between them.</p>

        <div id="route-finder">
          <div className="route-finder-title">🗺 Route Finder</div>

          <div className="search-field">
            <span className="search-dot from"></span>
            <div className="search-input-wrap">
              <input id="search-from" className="search-input from" type="text" placeholder="Starting city…" autoComplete="off" />
              <button className="search-clear-btn" id="clear-from" title="Clear">✕</button>
              <div className="search-autocomplete" id="ac-from"></div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '2px', position: 'relative' }}>
            <div className="search-connector"></div>
            <button className="search-swap-btn" id="search-swap-btn" title="Swap cities">⇅</button>
          </div>

          <div className="search-field">
            <span className="search-dot to"></span>
            <div className="search-input-wrap">
              <input id="search-to" className="search-input to" type="text" placeholder="Destination city…" autoComplete="off" />
              <button className="search-clear-btn" id="clear-to" title="Clear">✕</button>
              <div className="search-autocomplete" id="ac-to"></div>
            </div>
          </div>

          <button id="search-go-btn" disabled>Find Route</button>
        </div>

        <select id="algo-select">
          <option value="dijkstra">Dijkstra's Algorithm</option>
          <option value="astar">A* Search (Heuristic)</option>
          <option value="bfs">Breadth-First Search</option>
          <option value="dfs">Depth-First Search</option>
        </select>

        <div style={{ display: 'flex', gap: '10px', marginTop: '12px', alignItems: 'center' }}>
          <p style={{ margin: 0 }}>Status: <span id="status" className="highlight">Awaiting Selection...</span></p>
          <button id="stop-btn" style={{ display: 'none', background: '#f87171', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Stop Search</button>
          <button id="reset-btn" style={{ background: '#38bdf8', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Reset Map</button>
        </div>
      </div>

      {/* History panel */}
      <div id="history-panel">
        <h2>Search History</h2>
        <div id="history-list">
          <div style={{ color: '#aaa', fontStyle: 'italic', fontSize: '12px', textAlign: 'center' }} id="history-empty">
            No searches yet. Run an algorithm!
          </div>
        </div>
      </div>

      {/* Result modal */}
      <div id="modal-overlay">
        <div id="result-modal">
          <h2>Path Found!</h2>
          <div className="result-stat"><span>Algorithm:</span><span className="result-val" id="res-algo">Dijkstra</span></div>
          <div className="result-stat"><span>Distance/Weight:</span><span className="result-val" id="res-weight">0</span></div>
          <div className="result-stat"><span>Nodes Visited:</span><span className="result-val" id="res-visited">0</span></div>
          <div className="result-stat" style={{ borderBottom: 'none' }}><span>Time Taken:</span><span className="result-val" id="res-time">0ms</span></div>
          <button id="close-btn">Close</button>
        </div>
      </div>
    </>
  );
}
