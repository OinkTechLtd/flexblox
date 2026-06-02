/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { 
  Plus, Trash2, Save, Share2, Play, Grid, 
  Settings, ArrowLeft, Layers, Palette, Maximize2, Move 
} from 'lucide-react';
import { LevelData, PartData, PartShape, PartMaterial } from '../types';

interface EditorHubProps {
  initialLevel: LevelData;
  onSave: (updatedLevel: LevelData) => void;
  onPublish: (updatedLevel: LevelData) => void;
  onPlay: (updatedLevel: LevelData) => void;
  onBackToMenu: () => void;
  isSocketOpen: boolean;
}

const DEFAULT_SHAPES: { shape: PartShape; name: string; color: string }[] = [
  { shape: 'box', name: 'Standard Block', color: '#10b981' },
  { shape: 'sphere', name: 'Sphere Ball', color: '#3b82f6' },
  { shape: 'cylinder', name: 'Cylinder Pole', color: '#f59e0b' },
  { shape: 'spawn', name: 'Spawn Zone', color: '#38bdf8' },
  { shape: 'coin', name: 'Touch Coin', color: '#facc15' },
  { shape: 'lava', name: 'Lava Beam', color: '#ef4444' },
  { shape: 'trigger', name: 'Trigger Event', color: '#a855f7' },
  { shape: 'speedpad', name: 'Speed Boost', color: '#22c55e' }
];

const METALS = ['metal'];
const GLOWS = ['neon'];

export default function EditorHub({
  initialLevel,
  onSave,
  onPublish,
  onPlay,
  onBackToMenu,
  isSocketOpen
}: EditorHubProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // State for level design
  const [level, setLevel] = useState<LevelData>({ ...initialLevel });
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [toolMode, setToolMode] = useState<'select' | 'move' | 'scale' | 'rotate'>('select');
  const [gridSnapping, setGridSnapping] = useState<boolean>(true);
  const snapValue = 1.0;

  // React Refs to link with three.js render tick
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const partMeshesMapRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const selectionOutlineRef = useRef<THREE.BoxHelper | null>(null);

  // States mirroring edited properties
  const selectedPart = level.parts.find(p => p.id === selectedPartId);

  // Sync state mutations cleanly back to parent and update three meshes on the fly
  const updatePartProperty = (id: string, updates: Partial<PartData>) => {
    const updatedParts = level.parts.map(p => {
      if (p.id === id) {
        return { ...p, ...updates };
      }
      return p;
    });
    const nextLevel = { ...level, parts: updatedParts, updatedAt: Date.now() };
    setLevel(nextLevel);
  };

  // Helper to append a shape into the level
  const handleAddNewPart = (shapeInfo: { shape: PartShape; name: string; color: string }) => {
    const newPartId = `part_${Date.now()}`;
    const newPart: PartData = {
      id: newPartId,
      name: `${shapeInfo.name} ${level.parts.length + 1}`,
      shape: shapeInfo.shape,
      material: shapeInfo.shape === 'coin' || shapeInfo.shape === 'lava' || shapeInfo.shape === 'speedpad' ? 'neon' : 'plastic',
      color: shapeInfo.color,
      position: [0, 1.5, -5], // Put screen center
      rotation: [0, 0, 0],
      scale: shapeInfo.shape === 'spawn' ? [6, 1, 6] : shapeInfo.shape === 'coin' ? [1, 1, 1] : [3, 2, 3],
      touchInterest: shapeInfo.shape === 'coin',
      rewardCoins: shapeInfo.shape === 'coin' ? 1 : undefined,
      triggerText: shapeInfo.shape === 'trigger' ? 'Введите текст уведомления...' : undefined,
      speedBoost: shapeInfo.shape === 'speedpad' ? 1.5 : undefined
    };

    const nextLevel = {
      ...level,
      parts: [...level.parts, newPart],
      updatedAt: Date.now()
    };
    setLevel(nextLevel);
    setSelectedPartId(newPartId);
  };

  // Helper to clone a selected item
  const handleClonePart = () => {
    if (!selectedPart) return;
    const clonedId = `part_${Date.now()}`;
    const clonedPart: PartData = {
      ...selectedPart,
      id: clonedId,
      name: `${selectedPart.name} Copy`,
      position: [selectedPart.position[0] + 2, selectedPart.position[1], selectedPart.position[2] + 2]
    };
    const nextLevel = {
      ...level,
      parts: [...level.parts, clonedPart],
      updatedAt: Date.now()
    };
    setLevel(nextLevel);
    setSelectedPartId(clonedId);
  };

  // Delete selection
  const handleDeletePart = () => {
    if (!selectedPartId) return;
    const nextParts = level.parts.filter(p => p.id !== selectedPartId);
    setLevel({ ...level, parts: nextParts, updatedAt: Date.now() });
    setSelectedPartId(null);
  };

  // Three.js Mount Setup
  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Initialise core scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#02040a'); // Dark Roblox grid color
    sceneRef.current = scene;

    // Fog for nice deep rendering
    scene.fog = new THREE.FogExp2('#02040a', 0.008);

    // 2. Camera setup
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(0, 18, 30);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Lights
    const ambientLight = new THREE.AmbientLight('#ffffff', 0.6);
    scene.add(ambientLight);

    const sun = new THREE.DirectionalLight('#ffffff', 1.0);
    sun.position.set(20, 45, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 150;
    const d = 50;
    sun.shadow.camera.left = -d;
    sun.shadow.camera.right = d;
    sun.shadow.camera.top = d;
    sun.shadow.camera.bottom = -d;
    scene.add(sun);

    // 5. Ground plate (Green Baseplate like real Roblox grass baseplate)
    const baseplateGeo = new THREE.BoxGeometry(160, 1.0, 160);
    const baseplateMat = new THREE.MeshStandardMaterial({ 
      color: '#15803d', // Dark Forest Green
      roughness: 0.9, 
      metalness: 0.1 
    });
    const baseplate = new THREE.Mesh(baseplateGeo, baseplateMat);
    baseplate.position.y = -0.5;
    baseplate.receiveShadow = true;
    scene.add(baseplate);

    // 6. Studio Grid Overlay
    const grid = new THREE.GridHelper(160, 160, '#94a3b8', '#334155');
    grid.position.y = 0.02;
    scene.add(grid);

    // 7. Outline highlighter helper for designated selection
    const outline = new THREE.BoxHelper(new THREE.Mesh(), '#3b82f6');
    outline.visible = false;
    scene.add(outline);
    selectionOutlineRef.current = outline;

    // 8. Event listeners for selection tracking via Raycaster
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleCanvasClick = (event: MouseEvent) => {
      if (!containerRef.current || !cameraRef.current) return;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, cameraRef.current);
      
      // Select intersection against active meshes
      const meshesArray = Array.from(partMeshesMapRef.current.entries()).map(([_, mesh]) => mesh);
      const intersects = raycaster.intersectObjects(meshesArray);
      
      if (intersects.length > 0) {
        const intersectedMesh = intersects[0].object as THREE.Mesh;
        // Search matching part ID
        for (const [partId, mesh] of partMeshesMapRef.current.entries()) {
          if (mesh === intersectedMesh) {
            setSelectedPartId(partId);
            return;
          }
        }
      }
    };

    renderer.domElement.addEventListener('click', handleCanvasClick);

    // Rotation angle tracking variables
    let isOrbiting = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let polarAngle = Math.PI / 4; // Vertical inclination
    let azimuthAngle = 0; // Horizontal rotation
    let radius = 35; // Target distance

    const handleCanvasMouseDown = (e: MouseEvent) => {
      // Rotate camera via Click drag
      isOrbiting = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const handleCanvasMouseMove = (e: MouseEvent) => {
      if (!isOrbiting) return;
      const dx = e.clientX - prevMouseX;
      const dy = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      azimuthAngle -= dx * 0.005;
      polarAngle = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, polarAngle + dy * 0.005));
    };

    const handleCanvasMouseUp = () => {
      isOrbiting = false;
    };

    // Camera target position for smooth editor camera tracking
    const cameraTarget = new THREE.Vector3(0, 0, 0);

    // Orbit listeners
    renderer.domElement.addEventListener('mousedown', handleCanvasMouseDown);
    window.addEventListener('mousemove', handleCanvasMouseMove);
    window.addEventListener('mouseup', handleCanvasMouseUp);

    // 9. Animation Framerate ticking loop
    let requestFrameId: number;
    const animate = () => {
      requestFrameId = requestAnimationFrame(animate);

      // Perform camera orbit calculation smoothly
      if (cameraRef.current) {
        cameraRef.current.position.x = cameraTarget.x + radius * Math.sin(azimuthAngle) * Math.cos(polarAngle);
        cameraRef.current.position.y = cameraTarget.y + radius * Math.sin(polarAngle);
        cameraRef.current.position.z = cameraTarget.z + radius * Math.cos(azimuthAngle) * Math.cos(polarAngle);
        cameraRef.current.lookAt(cameraTarget);
      }

      // Animate dynamic objects in real-time (e.g. rotating coins)
      for (const [id, mesh] of partMeshesMapRef.current.entries()) {
        const pData = level.parts.find(p => p.id === id);
        if (pData?.shape === 'coin') {
          mesh.rotation.y += 0.03;
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    // Clean viewport on unmount
    return () => {
      cancelAnimationFrame(requestFrameId);
      renderer.domElement.removeEventListener('click', handleCanvasClick);
      renderer.domElement.removeEventListener('mousedown', handleCanvasMouseDown);
      window.removeEventListener('mousemove', handleCanvasMouseMove);
      window.removeEventListener('mouseup', handleCanvasMouseUp);
      
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Update logic syncing 3D parts from level state
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Remove obsolete meshes
    const currentPartIds = new Set(level.parts.map(p => p.id));
    for (const [id, mesh] of partMeshesMapRef.current.entries()) {
      if (!currentPartIds.has(id)) {
        scene.remove(mesh);
        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(m => m.dispose());
        } else {
          mesh.material.dispose();
        }
        partMeshesMapRef.current.delete(id);
      }
    }

    // Spawn or update level objects
    level.parts.forEach((part) => {
      let mesh = partMeshesMapRef.current.get(part.id);

      // Materials definitions matching Roblox classic values
      let material: THREE.Material;

      // Special material settings: Neon glows, transparent glass etc.
      if (part.material === 'neon' || part.shape === 'coin' || part.shape === 'lava' || part.shape === 'speedpad') {
        material = new THREE.MeshBasicMaterial({ color: part.color });
      } else if (part.material === 'glass') {
        material = new THREE.MeshStandardMaterial({
          color: part.color,
          roughness: 0.1,
          metalness: 0.1,
          transparent: true,
          opacity: 0.4
        });
      } else if (part.material === 'wood') {
        material = new THREE.MeshStandardMaterial({
          color: part.color,
          roughness: 0.9,
          metalness: 0.0
        });
      } else if (part.material === 'metal') {
        material = new THREE.MeshStandardMaterial({
          color: part.color,
          roughness: 0.2,
          metalness: 0.95
        });
      } else { // plastic
        material = new THREE.MeshStandardMaterial({
          color: part.color,
          roughness: 0.5,
          metalness: 0.1
        });
      }

      if (!mesh) {
        // Construct visual geometry (box, sphere, cylinder)
        let geometry: THREE.BufferGeometry;

        if (part.shape === 'sphere') {
          geometry = new THREE.SphereGeometry(1.0, 16, 16);
        } else if (part.shape === 'cylinder') {
          geometry = new THREE.CylinderGeometry(1.0, 1.0, 2.0, 16);
        } else { // box, spawn, trigger, speedpad
          geometry = new THREE.BoxGeometry(1.0, 1.0, 1.0);
        }

        mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
        partMeshesMapRef.current.set(part.id, mesh);
      } else {
        // Just update existing material properties to save CPU power
        mesh.material = material;
      }

      // Re-scale, rotate and translate live objects
      mesh.scale.set(part.scale[0], part.scale[1], part.scale[2]);
      
      // Position height adjusting offset (sphere and cylinder radius adjustments)
      mesh.position.set(part.position[0], part.position[1], part.position[2]);
      mesh.rotation.set(part.rotation[0], part.rotation[1], part.rotation[2]);
    });

    // Handle outline helper attachment to selected meshes
    const outline = selectionOutlineRef.current;
    if (outline) {
      if (selectedPartId) {
        const mesh = partMeshesMapRef.current.get(selectedPartId);
        if (mesh) {
          outline.setFromObject(mesh);
          outline.visible = true;
        } else {
          outline.visible = false;
        }
      } else {
        outline.visible = false;
      }
    }

  }, [level.parts, selectedPartId]);

  // Adjust Canvas Layout on Window resize
  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      const renderer = rendererRef.current;
      const camera = cameraRef.current;
      if (!container || !renderer || !camera) return;

      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Quick translation offsets helper for mobile-friendly coordinates tweaking buttons
  const translateSelected = (axis: 'x' | 'y' | 'z', delta: number) => {
    if (!selectedPartId || !selectedPart) return;
    
    const axisIndex = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
    let nextValue = selectedPart.position[axisIndex] + delta;
    
    if (gridSnapping) {
      nextValue = Math.round(nextValue / snapValue) * snapValue;
    }

    const nextPosition = [...selectedPart.position] as [number, number, number];
    nextPosition[axisIndex] = nextValue;

    updatePartProperty(selectedPartId, { position: nextPosition });
  };

  // Quick scale offsets helper
  const scaleSelected = (axis: 'x' | 'y' | 'z', delta: number) => {
    if (!selectedPartId || !selectedPart) return;

    const axisIndex = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
    let nextValue = Math.max(0.1, selectedPart.scale[axisIndex] + delta);

    if (gridSnapping) {
      nextValue = Math.max(0.5, Math.round(nextValue / snapValue) * snapValue);
    }

    const nextScale = [...selectedPart.scale] as [number, number, number];
    nextScale[axisIndex] = nextValue;

    updatePartProperty(selectedPartId, { scale: nextScale });
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#0b0c10] select-none text-gray-200">
      
      {/* Upper Studio Header Bar */}
      <div className="h-14 bg-[#1e2030] px-4 flex items-center justify-between border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToMenu}
            className="p-1 px-3 rounded bg-gray-800 hover:bg-gray-700 font-bold text-gray-400 text-xs flex items-center gap-1 shadow-sm transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Студия
          </button>
          
          <div className="h-4 w-px bg-gray-700" />
          
          <div className="flex flex-col">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">{level.name}</h2>
            <span className="text-[10px] text-gray-400">FlexBlox Creator Studio</span>
          </div>
        </div>

        {/* Level Controls Actions (PlayTest, LocalSave, Wi-Fi Server Publish) */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPlay(level)}
            className="px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold text-xs rounded shadow flex items-center gap-1.5 transition active:scale-95"
            id="play-test-btn"
          >
            <Play className="w-3.5 h-3.5 fill-white text-white animate-pulse" /> ТЕСТ (Играть)
          </button>
          
          <button
            onClick={() => onSave(level)}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white font-semibold text-xs rounded shadow flex items-center gap-1.5 transition duration-150"
            id="save-local-btn"
          >
            <Save className="w-3.5 h-3.5" /> Сохранить
          </button>

          <button
            onClick={() => onPublish(level)}
            className="px-3 py-1.5 bg-[#a855f7] hover:bg-[#b56ef8] text-white font-bold text-xs rounded shadow flex items-center gap-1.5 transition"
            id="publish-wifi-btn"
          >
            <Share2 className="w-3.5 h-3.5" /> Опубликовать Wi-Fi
          </button>
        </div>
      </div>

      {/* Editor Main Content Division containing ThreeJS canvas and panels */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        
        {/* Workspace Explorer Left Sidebar */}
        <div className="w-60 bg-[#141522] border-r border-gray-800 flex flex-col justify-between shrink-0 h-full">
          <div className="p-4 space-y-4 overflow-y-auto roblox-chat-container flex-1">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" /> Иерархия (Workspace)
            </h3>
            
            {/* Displaying listing of parts in RBLX core style */}
            <div className="space-y-1">
              {level.parts.map((p) => {
                let badge = '🧱';
                if (p.shape === 'spawn') badge = '🏁';
                else if (p.shape === 'coin') badge = '🪙';
                else if (p.shape === 'lava') badge = '🔥';
                else if (p.shape === 'speedpad') badge = '⚡️';
                else if (p.shape === 'trigger') badge = '🔔';

                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPartId(p.id)}
                    className={`w-full px-3 py-1.5 rounded-lg text-xs font-medium text-left transition duration-100 flex items-center gap-2 truncate ${
                      selectedPartId === p.id 
                        ? 'bg-red-600 text-white shadow font-bold' 
                        : 'text-gray-300 hover:bg-gray-800/40'
                    }`}
                  >
                    <span>{badge}</span>
                    <span className="truncate">{p.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick instructions block */}
          <div className="p-4 bg-slate-900/40 border-t border-gray-800/50 space-y-1">
            <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Камера Студии</span>
            <p className="text-[10px] text-gray-400 leading-relaxed">
              Зажмите мышь на 3D поле и двигайте, чтобы вращать камеру. Кликните по любому блоку вWorkspace чтобы настроить.
            </p>
          </div>
        </div>

        {/* Tool Box Header & Render Area Center */}
        <div className="flex-1 flex flex-col min-w-0 h-full relative">
          
          {/* Upper Quick Parts Adder Palette inside Editor Center View */}
          <div className="h-12 bg-[#1b1c28] border-b border-gray-800 px-4 flex items-center gap-3 overflow-x-auto select-none shrink-0" id="tool-bar-palette">
            <span className="text-xs font-bold text-gray-400 shrink-0 uppercase tracking-wider">Вставить Part:</span>
            {DEFAULT_SHAPES.map((sh) => (
              <button
                key={sh.shape}
                onClick={() => handleAddNewPart(sh)}
                className="px-3 py-1 bg-red-600/10 border border-red-600/20 hover:bg-red-600 hover:text-white duration-100 text-xs text-red-400 font-bold rounded flex items-center gap-1 whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                {sh.name}
              </button>
            ))}
          </div>

          {/* Canvas Render Element (ThreeJS Canvas) */}
          <div className="flex-1 min-h-0 bg-slate-950 relative" ref={containerRef} id="canvas-3d-host" />

          {/* Floating On-Screen Widgets (Snap grid togglers) */}
          <div className="absolute right-4 bottom-4 p-2 bg-[#141522]/90 border border-gray-800 rounded-lg flex items-center gap-3 shadow-md">
            <button
              onClick={() => setGridSnapping(!gridSnapping)}
              className={`p-1.5 rounded text-xs font-bold flex items-center gap-1 ${
                gridSnapping ? 'bg-red-600 text-white shadow' : 'bg-gray-800 text-gray-400'
              }`}
            >
              <Grid className="w-4 h-4" /> Сетка {gridSnapping ? 'Вкл' : 'Выкл'}
            </button>
            {isSocketOpen && (
              <div className="text-[10px] text-emerald-500 font-bold bg-[#15803d]/10 border border-emerald-500/20 px-2 py-1 rounded">
                ● WI-FI SYNCED
              </div>
            )}
          </div>
        </div>

        {/* Right Inspector Sidebar for selected Parts config */}
        <div className="w-80 bg-[#141522] border-l border-gray-800 flex flex-col justify-between shrink-0 h-full">
          {selectedPartId && selectedPart ? (
            <div className="flex-1 flex flex-col justify-between overflow-hidden">
              <div className="p-4 space-y-4 overflow-y-auto roblox-chat-container">
                <div className="flex justify-between items-center pb-2 border-b border-gray-800">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5" /> свойства (Properties)
                  </h3>
                  <button 
                    onClick={handleClonePart}
                    className="p-1 px-2 text-[10px] font-bold bg-[#1e2030] hover:bg-gray-800 text-gray-300 rounded border border-gray-800 transition"
                  >
                    Клонировать
                  </button>
                </div>

                {/* Name setting */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Название детали</label>
                  <input
                    type="text"
                    value={selectedPart.name}
                    onChange={(e) => updatePartProperty(selectedPart.id, { name: e.target.value })}
                    className="w-full bg-[#12131a] px-3 py-2 rounded-lg border border-gray-800 text-xs text-white font-semibold outline-none focus:border-red-600 duration-150"
                  />
                </div>

                {/* Material setting */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Материал (Material)</label>
                  <select
                    value={selectedPart.material}
                    onChange={(e) => updatePartProperty(selectedPart.id, { material: e.target.value as PartMaterial })}
                    className="w-full bg-[#12131a] px-3 py-2 rounded-lg border border-gray-800 text-xs text-white font-semibold outline-none focus:border-red-600 duration-150"
                  >
                    <option value="plastic">Пластик (Plastic)</option>
                    <option value="wood">Дерево (Wood)</option>
                    <option value="metal">Металл (Metal)</option>
                    <option value="glass">Стекло (Glass)</option>
                    <option value="neon">Неон (Neon Glow)</option>
                  </select>
                </div>

                {/* Color picker */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Цвет облика (Hex Color)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={selectedPart.color}
                      onChange={(e) => updatePartProperty(selectedPart.id, { color: e.target.value })}
                      className="w-8 h-8 rounded bg-transparent border border-gray-800 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={selectedPart.color}
                      onChange={(e) => updatePartProperty(selectedPart.id, { color: e.target.value })}
                      className="flex-1 bg-[#12131a] px-3 py-2 rounded-lg border border-gray-800 text-xs text-white font-mono font-bold outline-none uppercase"
                    />
                  </div>
                </div>

                {/* Advanced Touch / Action properties */}
                {selectedPart.shape === 'coin' && (
                  <div className="space-y-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <span className="text-[10px] font-bold text-yellow-500 uppercase">Параметры Монеты</span>
                    <label className="block text-[10px] text-gray-400">Награда (монеты):</label>
                    <input
                      type="number"
                      min="1"
                      className="w-16 bg-[#12131a] px-2 py-1.5 rounded border border-gray-800 text-xs text-yellow-500 font-bold"
                      value={selectedPart.rewardCoins || 1}
                      onChange={(e) => updatePartProperty(selectedPart.id, { rewardCoins: Number(e.target.value) })}
                    />
                  </div>
                )}

                {selectedPart.shape === 'speedpad' && (
                  <div className="space-y-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <span className="text-[10px] font-bold text-emerald-500 uppercase font-mono">Параметры Буста</span>
                    <label className="block text-[10px] text-gray-400">Множитель скорости:</label>
                    <input
                      type="number"
                      step="0.1"
                      min="1.1"
                      max="3"
                      className="w-16 bg-[#12131a] px-2 py-1.5 rounded border border-gray-800 text-xs text-emerald-400 font-bold"
                      value={selectedPart.speedBoost || 1.5}
                      onChange={(e) => updatePartProperty(selectedPart.id, { speedBoost: Number(e.target.value) })}
                    />
                  </div>
                )}

                {selectedPart.shape === 'trigger' && (
                  <div className="space-y-2 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <span className="text-[10px] font-bold text-purple-400 uppercase">Событие Зоны</span>
                    <label className="block text-[10px] text-gray-400">Всплывающее уведомление:</label>
                    <textarea
                      rows={3}
                      className="w-full bg-[#12131a] px-2 py-1.5 rounded border border-gray-800 text-xs text-purple-300 outline-none focus:border-purple-500 resize-none"
                      value={selectedPart.triggerText || ''}
                      onChange={(e) => updatePartProperty(selectedPart.id, { triggerText: e.target.value })}
                    />
                  </div>
                )}

                {/* 3D Transform position fine-tweak */}
                <div className="space-y-3 pt-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase block tracking-widest border-t border-gray-800/80 pt-4">Позиция Блока (m)</span>
                  
                  {/* Position Coordinates with step button click support */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-500 font-bold block">Оси координат:</span>
                    <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold">
                      <div className="bg-[#12131a] p-1.5 rounded border border-gray-800">X: {selectedPart.position[0]}</div>
                      <div className="bg-[#12131a] p-1.5 rounded border border-gray-800">Y: {selectedPart.position[1]}</div>
                      <div className="bg-[#12131a] p-1.5 rounded border border-gray-800">Z: {selectedPart.position[2]}</div>
                    </div>
                  </div>

                  {/* Visual buttons movement controls (very easy to modify, mobile compatible) */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-gray-400 block font-bold">Двигатель (Переместить на 1.0м):</span>
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                      <button onClick={() => translateSelected('x', -1)} className="py-1 px-2 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 active:scale-95 duration-75 block">Влево (-X)</button>
                      <button onClick={() => translateSelected('x', 1)} className="py-1 px-2 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 active:scale-95 duration-75 block">Вправо (+X)</button>
                      <button onClick={() => translateSelected('y', 1)} className="py-1 px-2 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 active:scale-95 duration-75 block">Вверх (+Y)</button>
                      <button onClick={() => translateSelected('y', -1)} className="py-1 px-2 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 active:scale-95 duration-75 block">Вниз (-Y)</button>
                      <button onClick={() => translateSelected('z', -1)} className="py-1 px-2 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 active:scale-95 duration-75 block">Вперед (-Z)</button>
                      <button onClick={() => translateSelected('z', 1)} className="py-1 px-2 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 active:scale-95 duration-75 block">Назад (+Z)</button>
                    </div>
                  </div>
                </div>

                {/* 3D Scale sizing tools */}
                <div className="space-y-2 pt-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase block tracking-widest border-t border-gray-800/80 pt-4">Габариты блока (Размеры)</span>
                  
                  <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold">
                    <div className="bg-[#12131a] p-1.5 rounded border border-gray-800">Ширина: {selectedPart.scale[0]}</div>
                    <div className="bg-[#12131a] p-1.5 rounded border border-gray-800">Высота: {selectedPart.scale[1]}</div>
                    <div className="bg-[#12131a] p-1.5 rounded border border-gray-800">Длина: {selectedPart.scale[2]}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                    <button onClick={() => scaleSelected('x', -1)} className="py-1 px-2 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 active:scale-95">Сузить (X-)</button>
                    <button onClick={() => scaleSelected('x', 1)} className="py-1 px-2 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 active:scale-95">Расширить (X+)</button>
                    <button onClick={() => scaleSelected('y', -1)} className="py-1 px-2 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 active:scale-95">Сплюснуть (Y-)</button>
                    <button onClick={() => scaleSelected('y', 1)} className="py-1 px-2 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 active:scale-95">Вытянуть (Y+)</button>
                    <button onClick={() => scaleSelected('z', -1)} className="py-1 px-2 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 active:scale-95">Укоротить (Z-)</button>
                    <button onClick={() => scaleSelected('z', 1)} className="py-1 px-2 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 active:scale-95">Удлинить (Z+)</button>
                  </div>
                </div>
              </div>

              {/* Bottom Control Actions (Delete) */}
              <div className="p-4 bg-slate-950/60 border-t border-gray-800">
                <button
                  onClick={handleDeletePart}
                  className="w-full py-2.5 bg-red-650 hover:bg-red-600 font-bold text-xs text-white rounded-lg transition duration-75 flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" /> Удалить Деталь (Delete)
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3">
              <span className="text-3xl">🏗️</span>
              <h3 className="text-xs font-bold text-gray-300 uppercase">Нет выделенной детали</h3>
              <p className="text-[10px] text-gray-400 leading-relaxed max-w-[200px] mx-auto">
                Нажмите на любой объект в Workspace или на 3D поле, чтобы открыть его свойства и трансформы.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
