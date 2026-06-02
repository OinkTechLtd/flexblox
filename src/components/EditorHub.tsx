/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { 
  Plus, Trash2, Save, Share2, Play, Grid, Eye, EyeOff,
  Settings, ArrowLeft, Layers, Palette, Compass, RefreshCw, Sparkles, Sun, Moon
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

const DEFAULT_SHAPES: { shape: PartShape; name: string; color: string; icon: string }[] = [
  { shape: 'box', name: 'Part (Block)', color: '#a1a1aa', icon: '🧱' },
  { shape: 'sphere', name: 'Sphere Ball', color: '#3b82f6', icon: '🔵' },
  { shape: 'cylinder', name: 'Cylinder', color: '#f59e0b', icon: '🧪' },
  { shape: 'spawn', name: 'Spawn Location', color: '#0084ff', icon: '🏁' },
  { shape: 'coin', name: 'FlexBlox Coin', color: '#facc15', icon: '🪙' },
  { shape: 'lava', name: 'Killer Lava', color: '#fdba74', icon: '🔥' },
  { shape: 'trigger', name: 'Speech Trigger', color: '#c084fc', icon: '💬' },
  { shape: 'speedpad', name: 'Speed Pad', color: '#4ade80', icon: '⚡' }
];

export default function EditorHub({
  initialLevel,
  onSave,
  onPublish,
  onPlay,
  onBackToMenu,
  isSocketOpen
}: EditorHubProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Ribbon Navigation: 'home' | 'model' | 'view'
  const [activeRibbon, setActiveRibbon] = useState<'home' | 'model' | 'view'>('home');

  // State
  const [level, setLevel] = useState<LevelData>({ 
    skyTheme: 'classic',
    ...initialLevel 
  });
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [gridSnapping, setGridSnapping] = useState<boolean>(true);
  const [showGizmos, setShowGizmos] = useState<boolean>(true);
  const [showBaseplate, setShowBaseplate] = useState<boolean>(true);
  
  const snapValue = 1.0;

  // ThreeJS Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const partMeshesMapRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const selectionOutlineRef = useRef<THREE.BoxHelper | null>(null);
  const baseplateMeshRef = useRef<THREE.Mesh | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);

  const selectedPart = level.parts.find(p => p.id === selectedPartId);

  // Sync state mutation with three.js renderer
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

  // Set Skybox theme on fly inside active scene helper
  const updateSceneSkyAndLights = (theme: 'classic' | 'sunset' | 'cosmic' | 'vaporwave') => {
    const scene = sceneRef.current;
    if (!scene) return;

    let bgColor = '#a5f3fc'; // classic blue
    let fogColor = '#e0f7fa';
    let sunColor = '#ffffff';
    let sunIntensity = 1.2;

    if (theme === 'sunset') {
      bgColor = '#4c1d95'; // deep warm violet
      fogColor = '#f43f5e'; // orange rose
      sunColor = '#fdba74';
      sunIntensity = 1.0;
    } else if (theme === 'cosmic') {
      bgColor = '#030712'; // obsidian
      fogColor = '#111827'; // charcoal gray
      sunColor = '#c084fc'; // neon violet stars
      sunIntensity = 0.5;
    } else if (theme === 'vaporwave') {
      bgColor = '#1e1b4b'; // deep retro indigo
      fogColor = '#ec4899'; // sharp hot pink
      sunColor = '#22d3ee'; // cyber cyan
      sunIntensity = 1.1;
    }

    scene.background = new THREE.Color(bgColor);
    scene.fog = new THREE.FogExp2(fogColor, 0.006);

    // Update Sun parameters
    const sun = sunLightRef.current;
    if (sun) {
      sun.color.set(sunColor);
      sun.intensity = sunIntensity;
    }
  };

  const handleSetSkyTheme = (theme: 'classic' | 'sunset' | 'cosmic' | 'vaporwave') => {
    setLevel(prev => ({ ...prev, skyTheme: theme, updatedAt: Date.now() }));
    updateSceneSkyAndLights(theme);
  };

  // Insert model
  const handleAddNewPart = (shapeInfo: { shape: PartShape; name: string; color: string }) => {
    const newPartId = `part_${Date.now()}`;
    const newPart: PartData = {
      id: newPartId,
      name: `${shapeInfo.name} ${level.parts.length + 1}`,
      shape: shapeInfo.shape,
      material: shapeInfo.shape === 'coin' || shapeInfo.shape === 'lava' || shapeInfo.shape === 'speedpad' ? 'neon' : 'plastic',
      color: shapeInfo.color,
      position: [0, 1.5, -4], 
      rotation: [0, 0, 0],
      scale: shapeInfo.shape === 'spawn' ? [6, 1, 6] : shapeInfo.shape === 'coin' ? [1.2, 1.2, 1.2] : [3, 2, 3],
      touchInterest: shapeInfo.shape === 'coin',
      rewardCoins: shapeInfo.shape === 'coin' ? 10 : undefined,
      triggerText: shapeInfo.shape === 'trigger' ? 'Welcome to my Custom Studio Place!' : undefined,
      speedBoost: shapeInfo.shape === 'speedpad' ? 1.6 : undefined
    };

    const nextLevel = {
      ...level,
      parts: [...level.parts, newPart],
      updatedAt: Date.now()
    };
    setLevel(nextLevel);
    setSelectedPartId(newPartId);
  };

  // Clone active piece
  const handleClonePart = () => {
    if (!selectedPart) return;
    const clonedId = `part_${Date.now()}`;
    const clonedPart: PartData = {
      ...selectedPart,
      id: clonedId,
      name: `${selectedPart.name} Copy`,
      position: [selectedPart.position[0] + 3, selectedPart.position[1], selectedPart.position[2] + 3]
    };
    const nextLevel = {
      ...level,
      parts: [...level.parts, clonedPart],
      updatedAt: Date.now()
    };
    setLevel(nextLevel);
    setSelectedPartId(clonedId);
  };

  // Delete Selection
  const handleDeletePart = () => {
    if (!selectedPartId) return;
    const nextParts = level.parts.filter(p => p.id !== selectedPartId);
    setLevel({ ...level, parts: nextParts, updatedAt: Date.now() });
    setSelectedPartId(null);
  };

  // Build full-size ThreeJS workspace environment
  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // View camera angles config
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(0, 20, 36);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Fast robust WebGL renderer instance
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting rig
    const ambientLight = new THREE.AmbientLight('#ffffff', 0.65);
    scene.add(ambientLight);

    const sun = new THREE.DirectionalLight('#ffffff', 1.2);
    sun.position.set(30, 48, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    scene.add(sun);
    sunLightRef.current = sun;

    // Baseplate (Standard Green Roblox grid platform)
    const baseplateGeo = new THREE.BoxGeometry(160, 1.0, 160);
    const baseplateMat = new THREE.MeshStandardMaterial({ 
      color: '#1e3a22', // deep rich studio dark forest green
      roughness: 0.9, 
      metalness: 0.05 
    });
    const baseplate = new THREE.Mesh(baseplateGeo, baseplateMat);
    baseplate.position.y = -0.5;
    baseplate.receiveShadow = true;
    scene.add(baseplate);
    baseplateMeshRef.current = baseplate;

    // Snapping helper grid
    const grid = new THREE.GridHelper(160, 80, '#2d3748', '#4a5568');
    grid.position.y = 0.02;
    scene.add(grid);
    gridHelperRef.current = grid;

    // Outline hover highlighters
    const outline = new THREE.BoxHelper(new THREE.Mesh(), '#0084ff');
    outline.visible = false;
    scene.add(outline);
    selectionOutlineRef.current = outline;

    // Raycast click detection handler
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleCanvasClick = (event: MouseEvent) => {
      if (!containerRef.current || !cameraRef.current) return;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, cameraRef.current);
      const meshesArray = Array.from(partMeshesMapRef.current.values()) as THREE.Mesh[];
      const intersects = raycaster.intersectObjects(meshesArray);
      
      if (intersects.length > 0) {
        const hitMesh = intersects[0].object as THREE.Mesh;
        for (const [partId, mesh] of partMeshesMapRef.current.entries()) {
          if (mesh === hitMesh) {
            setSelectedPartId(partId);
            return;
          }
        }
      }
    };

    renderer.domElement.addEventListener('click', handleCanvasClick);

    // Orbit coordinates mouse movements tracking
    let isOrbiting = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let polarAngle = Math.PI / 5;
    let azimuthAngle = 0.5;
    let radius = 42;

    const onMouseDown = (e: MouseEvent) => {
      isOrbiting = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isOrbiting) return;
      const dx = e.clientX - prevMouseX;
      const dy = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      azimuthAngle -= dx * 0.005;
      polarAngle = Math.max(0.1, Math.min(Math.PI / 2 - 0.02, polarAngle + dy * 0.005));
    };

    const onMouseUp = () => {
      isOrbiting = false;
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // Render loop
    let animeFrameId: number;
    const tick = () => {
      animeFrameId = requestAnimationFrame(tick);

      // Smooth camera interpolation
      if (cameraRef.current) {
        cameraRef.current.position.x = radius * Math.sin(azimuthAngle) * Math.cos(polarAngle);
        cameraRef.current.position.y = radius * Math.sin(polarAngle);
        cameraRef.current.position.z = radius * Math.cos(azimuthAngle) * Math.cos(polarAngle);
        cameraRef.current.lookAt(0, 1.5, 0);
      }

      // Rotate Coins mesh items inside studio view
      partMeshesMapRef.current.forEach((mesh, id) => {
        const item = level.parts.find(p => p.id === id);
        if (item?.shape === 'coin') {
          mesh.rotation.y += 0.02;
        }
      });

      renderer.render(scene, camera);
    };
    tick();

    // Setup initial light and background matching Level configuration
    updateSceneSkyAndLights(level.skyTheme || 'classic');

    return () => {
      cancelAnimationFrame(animeFrameId);
      renderer.domElement.removeEventListener('click', handleCanvasClick);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Update base level geometries, positions & outlines
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Outdated clean up
    const currentPartIds = new Set(level.parts.map(p => p.id));
    partMeshesMapRef.current.forEach((mesh, id) => {
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
    });

    // Spawn / Sync
    level.parts.forEach((part) => {
      let mesh = partMeshesMapRef.current.get(part.id);
      let material: THREE.Material;

      // Real material rendering formulas
      const hexColor = part.color;

      if (part.material === 'neon' || part.shape === 'coin' || part.shape === 'speedpad' || part.shape === 'lava') {
        material = new THREE.MeshBasicMaterial({ color: hexColor });
      } else if (part.material === 'glass') {
        material = new THREE.MeshStandardMaterial({
          color: hexColor,
          roughness: 0.05,
          metalness: 0.1,
          transparent: true,
          opacity: 0.45,
        });
      } else if (part.material === 'wood') {
        material = new THREE.MeshStandardMaterial({
          color: hexColor, 
          roughness: 0.95,
          metalness: 0.0
        });
      } else if (part.material === 'metal') {
        material = new THREE.MeshStandardMaterial({
          color: hexColor,
          roughness: 0.25,
          metalness: 0.92
        });
      } else { // plastic
        material = new THREE.MeshStandardMaterial({
          color: hexColor,
          roughness: 0.45,
          metalness: 0.1
        });
      }

      if (!mesh) {
        let geo: THREE.BufferGeometry;
        if (part.shape === 'sphere') {
          geo = new THREE.SphereGeometry(1.0, 16, 16);
        } else if (part.shape === 'cylinder') {
          geo = new THREE.CylinderGeometry(1.0, 1.0, 2.0, 16);
        } else if (part.shape === 'coin') {
          geo = new THREE.CylinderGeometry(1.0, 1.0, 0.25, 12);
        } else { // box, spawn, lava, Trigger
          geo = new THREE.BoxGeometry(1.0, 1.0, 1.0);
        }

        mesh = new THREE.Mesh(geo, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
        partMeshesMapRef.current.set(part.id, mesh);
      } else {
        mesh.material = material;
      }

      // Live sizing configurations
      mesh.scale.set(part.scale[0], part.scale[1], part.scale[2]);
      mesh.position.set(part.position[0], part.position[1], part.position[2]);
      mesh.rotation.set(part.rotation[0], part.rotation[1], part.rotation[2]);

      // Adjust coin horizontal alignment in studio view
      if (part.shape === 'coin') {
        mesh.rotation.x = Math.PI / 2;
      }
    });

    // Update highlight outline indicator
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

  // Handle display gizmos toggles
  useEffect(() => {
    const outline = selectionOutlineRef.current;
    if (outline) {
      outline.visible = showGizmos && !!selectedPartId;
    }
  }, [showGizmos, selectedPartId]);

  useEffect(() => {
    const grid = gridHelperRef.current;
    if (grid) {
      grid.visible = gridSnapping;
    }
  }, [gridSnapping]);

  useEffect(() => {
    const bp = baseplateMeshRef.current;
    if (bp) {
      bp.visible = showBaseplate;
    }
  }, [showBaseplate]);

  // Resize adjust WebGL canvas
  useEffect(() => {
    const resizeRenderer = () => {
      const parent = containerRef.current;
      const renderer = rendererRef.current;
      const camera = cameraRef.current;
      if (!parent || !renderer || !camera) return;

      const w = parent.clientWidth;
      const h = parent.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', resizeRenderer);
    return () => window.removeEventListener('resize', resizeRenderer);
  }, []);

  // Moving offset transform triggers
  const translateSelection = (axis: 'x' | 'y' | 'z', val: number) => {
    if (!selectedPartId || !selectedPart) return;
    
    const index = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
    let nextPosValue = selectedPart.position[index] + val;
    
    if (gridSnapping) {
      nextPosValue = Math.round(nextPosValue / snapValue) * snapValue;
    }

    const nextPosition = [...selectedPart.position] as [number, number, number];
    nextPosition[index] = nextPosValue;
    updatePartProperty(selectedPartId, { position: nextPosition });
  };

  // Sizing adjust transform triggers
  const scaleSelection = (axis: 'x' | 'y' | 'z', val: number) => {
    if (!selectedPartId || !selectedPart) return;

    const index = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
    let nextScaleValue = Math.max(0.1, selectedPart.scale[index] + val);

    if (gridSnapping) {
      nextScaleValue = Math.max(0.5, Math.round(nextScaleValue / snapValue) * snapValue);
    }

    const nextScale = [...selectedPart.scale] as [number, number, number];
    nextScale[index] = nextScaleValue;
    updatePartProperty(selectedPartId, { scale: nextScale });
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#111214] select-none text-gray-200 font-sans" id="roblox-studio-main">
      
      {/* 1. TOP TITLE BAR CLIENT (ROBLOX SHIELD) */}
      <div className="h-10 bg-[#1b1c1e] px-4 flex items-center justify-between border-b border-[#252729] shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToMenu}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-gray-300 bg-[#282a2d] hover:bg-[#34373a] rounded border border-[#3e4145] transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Close Studio
          </button>
          
          <div className="h-4 w-px bg-[#2d3034]" />

          <div className="flex items-center gap-2">
            <span className="text-white text-[11px] font-black bg-[#0084ff] px-1.5 py-0.5 rounded shadow">STUDIO 2026</span>
            <span className="text-xs font-extrabold text-[#cbcbcb] tracking-wide">{level.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
          <span>Objects: {level.parts.length}</span>
          {isSocketOpen && (
            <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">● Multi-Client Sync</span>
          )}
        </div>
      </div>

      {/* 2. AUTHENTIC ROBLOX STUDIO TAB RIBBON BAR */}
      <div className="bg-[#242629] border-b border-[#1b1c1e] shrink-0">
        
        {/* Ribbon Header Tabs */}
        <div className="flex items-center px-4 bg-[#1b1c1e] border-b border-[#252729]">
          <button
            onClick={() => setActiveRibbon('home')}
            className={`px-4 py-2 text-xs font-bold uppercase transition duration-150 relative ${
              activeRibbon === 'home'
                ? 'text-white border-b-2 border-[#0084ff]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Home
          </button>
          <button
            onClick={() => setActiveRibbon('model')}
            className={`px-4 py-2 text-xs font-bold uppercase transition duration-150 relative ${
              activeRibbon === 'model'
                ? 'text-white border-b-2 border-[#0084ff]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Insert Models
          </button>
          <button
            onClick={() => setActiveRibbon('view')}
            className={`px-4 py-2 text-xs font-bold uppercase transition duration-150 relative ${
              activeRibbon === 'view'
                ? 'text-white border-b-2 border-[#0084ff]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            View & Atmosphere
          </button>
        </div>

        {/* Dynamic Ribbon Controls Tray */}
        <div className="p-3 bg-[#242629] min-h-[56px] flex flex-wrap items-center gap-4 text-xs">
          
          {/* TAB 1: HOME CONTROLS TRAY */}
          {activeRibbon === 'home' && (
            <div className="flex items-center gap-3 w-full justify-between flex-wrap">
              <div className="flex items-center gap-3">
                
                {/* Save and Run games */}
                <button
                  onClick={() => onPlay(level)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-700 font-black rounded shadow flex items-center gap-1.5 transition active:scale-95"
                >
                  <Play className="w-3.5 h-3.5 fill-white" /> PLAY / TEST PLACE
                </button>

                <div className="w-px h-6 bg-[#32363b]" />

                {/* Local Saving */}
                <button
                  onClick={() => onSave(level)}
                  className="px-3.5 py-2 bg-[#3a3d42] hover:bg-[#4a4e54] text-white font-extrabold rounded flex items-center gap-1.5 transition"
                >
                  <Save className="w-4 h-4 text-gray-300" /> Save Instance
                </button>

                <button
                  onClick={() => onPublish(level)}
                  className="px-3.5 py-2 bg-[#0084ff] hover:bg-[#0095ff] text-white font-bold rounded flex items-center gap-1.5 transition"
                >
                  <Share2 className="w-4 h-4" /> Publish to LAN
                </button>
              </div>

              {/* Status information right */}
              <div className="bg-[#1b1c1e] px-3 py-1.5 rounded text-[11px] text-[#84868a] font-mono border border-[#32363b]">
                Drag Mouse in viewport to adjust camera view angle
              </div>
            </div>
          )}

          {/* TAB 2: INSERT MODELS TRAY */}
          {activeRibbon === 'model' && (
            <div className="flex items-center gap-2 overflow-x-auto w-full pb-1 roblox-chat-container select-none">
              <span className="text-gray-400 font-bold uppercase text-[10px] tracking-wider shrink-0 mr-1">ADD BLOCK INSTANCE:</span>
              {DEFAULT_SHAPES.map((sh) => (
                <button
                  key={sh.shape}
                  onClick={() => handleAddNewPart(sh)}
                  className="px-3 py-1.5 bg-[#31343a] hover:bg-red-600 hover:text-white border border-[#3e4249] duration-150 text-slate-200 font-bold rounded flex items-center gap-1 whitespace-nowrap"
                >
                  <span>{sh.icon}</span>
                  <span>{sh.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* TAB 3: VIEW & ENVIRONMENT SETTINGS TRAY */}
          {activeRibbon === 'view' && (
            <div className="flex items-center gap-4 flex-wrap w-full">
              
              {/* Sky theme options */}
              <div className="flex items-center gap-2 bg-[#1b1c1e] p-1.5 rounded border border-[#32363b]">
                <span className="text-[10px] font-bold text-gray-400 px-1 uppercase shrink-0">STUDIO SKYBOX:</span>
                {[
                  { id: 'classic', label: 'Classic Sky', icon: '☀️' },
                  { id: 'sunset', label: 'Neon Sunset', icon: '🌅' },
                  { id: 'cosmic', label: 'Nebula Space', icon: '🌌' },
                  { id: 'vaporwave', label: 'Vaporwave', icon: '🎆' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleSetSkyTheme(t.id as any)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded transition ${
                      level.skyTheme === t.id
                        ? 'bg-[#0084ff] text-white font-black'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <span className="mr-0.5">{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Toggle baseplate, toggle snapping, outline config */}
              <div className="flex items-center gap-2">
                
                {/* Grid toggle */}
                <button
                  onClick={() => setGridSnapping(!gridSnapping)}
                  className={`px-3 py-1.5 rounded border text-[11px] font-bold transition flex items-center gap-1.5 ${
                    gridSnapping
                      ? 'bg-emerald-600 border-emerald-700 text-white'
                      : 'bg-[#1b1c1e] border-[#32363b] text-gray-400'
                  }`}
                >
                  <Grid className="w-3.5 h-3.5" /> Grid Snapping ({snapValue} stud)
                </button>

                {/* Baseplate toggle */}
                <button
                  onClick={() => setShowBaseplate(!showBaseplate)}
                  className={`px-3 py-1.5 rounded border text-[11px] font-bold transition flex items-center gap-1.5 ${
                    showBaseplate
                      ? 'bg-purple-600 border-purple-700 text-white'
                      : 'bg-[#1b1c1e] border-[#32363b] text-gray-400'
                  }`}
                >
                  {showBaseplate ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  Grass Baseplate
                </button>

                {/* Gizmo select */}
                <button
                  onClick={() => setShowGizmos(!showGizmos)}
                  className={`px-3 py-1.5 rounded border text-[11px] font-bold transition flex items-center gap-1.5 ${
                    showGizmos
                      ? 'bg-blue-600 border-blue-700 text-white'
                      : 'bg-[#1b1c1e] border-[#32363b] text-gray-400'
                  }`}
                >
                  {showGizmos ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  Selection Box outline
                </button>

              </div>

            </div>
          )}

        </div>
      </div>

      {/* 3. CORE EDITING VIEW CONTAINING WORKSPACE SCREEN & DRAWER SIDEBARS */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative bg-[#111214]">
        
        {/* Workspace Explorer Left Sidebar */}
        <aside className="w-60 bg-[#1b1c1f] border-r border-[#26282a] flex flex-col justify-between shrink-0 h-full">
          <div className="p-4 space-y-4 overflow-y-auto roblox-chat-container flex-1">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 border-b border-[#2d3033] pb-2">
              <Layers className="w-4 h-4 text-emerald-400" /> Explorer Hierarchical
            </h3>
            
            <div className="space-y-1">
              <div className="text-[11px] font-extrabold text-white flex items-center gap-1 cursor-pointer">
                <span>📁</span>
                <span>Workspace</span>
              </div>
              
              <div className="pl-4 space-y-1 mt-1 border-l border-[#32363b]">
                {level.parts.map((p) => {
                  let iconStr = '🧱';
                  if (p.shape === 'spawn') iconStr = '🏁';
                  else if (p.shape === 'coin') iconStr = '🪙';
                  else if (p.shape === 'lava') iconStr = '🔥';
                  else if (p.shape === 'speedpad') iconStr = '⚡';
                  else if (p.shape === 'trigger') iconStr = '💬';

                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPartId(p.id)}
                      className={`w-full px-2.5 py-1.5 rounded text-[11px] font-semibold text-left transition duration-75 flex items-center gap-1.5 truncate ${
                        selectedPartId === p.id 
                          ? 'bg-[#0084ff]/20 text-[#0084ff] border border-[#0084ff]/30 font-black' 
                          : 'text-gray-300 hover:bg-[#25282c]'
                      }`}
                    >
                      <span className="shrink-0">{iconStr}</span>
                      <span className="truncate">{p.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="p-3 bg-[#131416] border-t border-[#26282a] space-y-1">
            <span className="text-[9px] font-black text-[#0084ff] uppercase tracking-wider block">Viewport Help</span>
            <p className="text-[10px] text-gray-400 leading-relaxed font-sans">
              Tilt camera by holding mouse click. Select parts directly by clicking them in 3D frame or Explorer list.
            </p>
          </div>
        </aside>

        {/* Studio Canvas Viewport Center */}
        <section className="flex-1 flex flex-col min-w-0 h-full relative border-r border-[#26282a]">
          
          <div className="flex-1 min-h-0 bg-[#0d0e10] relative" ref={containerRef} id="canvas-3d-host" />

          {/* Floating Onscreen Status Indicator */}
          <div className="absolute left-4 bottom-4 px-3 py-2 bg-[#1b1c1e]/90 border border-[#2d3033] rounded text-xs text-slate-300 font-mono flex items-center gap-3 shadow-xl">
            <span>Atmosphere: {level.skyTheme ? level.skyTheme.toUpperCase() : 'CLASSIC'}</span>
            <span>•</span>
            <span className="text-blue-400 font-bold">1 stud snap grid</span>
          </div>

        </section>

        {/* Right Inspector Sidebar for configured values */}
        <aside className="w-80 bg-[#1b1c1f] flex flex-col justify-between shrink-0 h-full">
          {selectedPartId && selectedPart ? (
            <div className="flex-1 flex flex-col justify-between overflow-hidden">
              <div className="p-4 space-y-4 overflow-y-auto roblox-chat-container flex-1">
                
                <div className="flex justify-between items-center pb-2 border-b border-[#2d3033]">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Palette className="w-4 h-4 text-[#0084ff]" /> Properties (Инспектор)
                  </h3>
                  <button 
                    onClick={handleClonePart}
                    className="p-1 px-2 text-[10px] font-bold bg-[#282a2d] hover:bg-[#34373a] text-gray-300 rounded border border-[#3e4145] transition"
                  >
                    Clone Part
                  </button>
                </div>

                {/* Name setting */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-wide">Name ID</label>
                  <input
                    type="text"
                    value={selectedPart.name}
                    onChange={(e) => updatePartProperty(selectedPart.id, { name: e.target.value })}
                    className="w-full bg-[#111214] px-3 py-2 rounded border border-[#2c2f32] text-xs text-white outline-none focus:border-[#0084ff] font-mono"
                  />
                </div>

                {/* Material setting */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-wide">Physical Material</label>
                  <select
                    value={selectedPart.material}
                    onChange={(e) => updatePartProperty(selectedPart.id, { material: e.target.value as PartMaterial })}
                    className="w-full bg-[#111214] px-3 py-2 rounded border border-[#2c2f32] text-xs text-white font-semibold outline-none focus:border-[#0084ff]"
                  >
                    <option value="plastic">Plastic (Smooth Gloss)</option>
                    <option value="wood">Wood (Stud Roughness)</option>
                    <option value="metal">Metal (Reflections)</option>
                    <option value="glass">Glass (Specular Glass)</option>
                    <option value="neon">Neon glow (Emissive Lights)</option>
                  </select>
                </div>

                {/* Color picker */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-wide block">Deform Color (BrickColor)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={selectedPart.color}
                      onChange={(e) => updatePartProperty(selectedPart.id, { color: e.target.value })}
                      className="w-8 h-8 rounded bg-transparent border border-[#2d3033] cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      value={selectedPart.color}
                      onChange={(e) => updatePartProperty(selectedPart.id, { color: e.target.value })}
                      className="flex-1 bg-[#111214] px-3 py-2 rounded border border-[#2c2f32] text-xs text-white font-mono font-bold uppercase"
                    />
                  </div>
                </div>

                {/* Special variables configurations */}
                {selectedPart.shape === 'coin' && (
                  <div className="space-y-2 p-3 rounded bg-yellow-400/5 border border-yellow-400/20">
                    <span className="text-[10px] font-black text-yellow-500 uppercase flex items-center gap-1">🪙 Coin settings</span>
                    <label className="block text-[10px] text-gray-400">Coins yield standard reward:</label>
                    <input
                      type="number"
                      min="1"
                      className="w-full bg-[#111214] px-2.5 py-1.5 rounded border border-[#2d3033] text-xs text-yellow-400 font-extrabold"
                      value={selectedPart.rewardCoins || 10}
                      onChange={(e) => updatePartProperty(selectedPart.id, { rewardCoins: Number(e.target.value) })}
                    />
                  </div>
                )}

                {selectedPart.shape === 'speedpad' && (
                  <div className="space-y-2 p-3 rounded bg-emerald-400/5 border border-emerald-400/20">
                    <span className="text-[10px] font-black text-emerald-400 uppercase flex items-center gap-1 font-mono">⚡ Speed Multiplier</span>
                    <label className="block text-[10px] text-gray-400">Multiplier speed step (1.0 - 3.0):</label>
                    <input
                      type="number"
                      step="0.1"
                      min="1.0"
                      max="3.0"
                      className="w-full bg-[#111214] px-2.5 py-1.5 rounded border border-[#2d3033] text-xs text-emerald-400 font-bold"
                      value={selectedPart.speedBoost || 1.6}
                      onChange={(e) => updatePartProperty(selectedPart.id, { speedBoost: Number(e.target.value) })}
                    />
                  </div>
                )}

                {selectedPart.shape === 'trigger' && (
                  <div className="space-y-2 p-3 rounded bg-purple-450/5 border border-purple-400/20">
                    <span className="text-[10px] font-black text-purple-400 uppercase flex items-center gap-1">💬 Speech Bubble popup</span>
                    <label className="block text-[10px] text-gray-400">Trigger Alert Notification Text:</label>
                    <textarea
                      rows={3}
                      className="w-full bg-[#111214] px-2.5 py-1.5 rounded border border-[#2d3033] text-xs text-purple-300 outline-none focus:border-[#0084ff] resize-none font-sans"
                      value={selectedPart.triggerText || ''}
                      onChange={(e) => updatePartProperty(selectedPart.id, { triggerText: e.target.value })}
                    />
                  </div>
                )}

                {/* 3D Coordinates fine adjuster */}
                <div className="space-y-3 pt-3 border-t border-[#2d3033]/60">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Transform Coordinates (studs)</span>
                  
                  <div className="grid grid-cols-3 gap-1 text-center font-mono text-[10px]">
                    <div className="bg-[#111214] py-1.5 rounded border border-[#2d3033] text-red-400">X: {selectedPart.position[0]}</div>
                    <div className="bg-[#111214] py-1.5 rounded border border-[#2d3033] text-emerald-400">Y: {selectedPart.position[1]}</div>
                    <div className="bg-[#111214] py-1.5 rounded border border-[#2d3033] text-blue-400">Z: {selectedPart.position[2]}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-[10px] font-bold">
                    <button onClick={() => translateSelection('x', -1)} className="py-1 bg-[#282a2d] hover:bg-[#3e4145] text-gray-200 rounded">Left (-X)</button>
                    <button onClick={() => translateSelection('x', 1)} className="py-1 bg-[#282a2d] hover:bg-[#3e4145] text-gray-200 rounded">Right (+X)</button>
                    <button onClick={() => translateSelection('y', 1)} className="py-1 bg-[#282a2d] hover:bg-[#3e4145] text-gray-200 rounded">Up (+Y)</button>
                    <button onClick={() => translateSelection('y', -1)} className="py-1 bg-[#282a2d] hover:bg-[#3e4145] text-gray-200 rounded">Down (-Y)</button>
                    <button onClick={() => translateSelection('z', -1)} className="py-1 bg-[#282a2d] hover:bg-[#3e4145] text-gray-200 rounded">Forward (-Z)</button>
                    <button onClick={() => translateSelection('z', 1)} className="py-1 bg-[#282a2d] hover:bg-[#3e4145] text-gray-200 rounded">Backward (+Z)</button>
                  </div>
                </div>

                {/* 3D scale sizing fine adjuster */}
                <div className="space-y-3 pt-3 border-t border-[#2d3033]/60">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Scale Dimensions (Sizing studs)</span>
                  
                  <div className="grid grid-cols-3 gap-1 text-center font-mono text-[10px]">
                    <div className="bg-[#111214] py-1.5 rounded border border-[#2d3033] text-slate-400">W: {selectedPart.scale[0]}</div>
                    <div className="bg-[#111214] py-1.5 rounded border border-[#2d3033] text-slate-400">H: {selectedPart.scale[1]}</div>
                    <div className="bg-[#111214] py-1.5 rounded border border-[#2d3033] text-slate-400">L: {selectedPart.scale[2]}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-[10px] font-bold">
                    <button onClick={() => scaleSelection('x', -1)} className="py-1 bg-[#282a2d] hover:bg-[#3e4145] text-gray-300 rounded">Narrow (-X)</button>
                    <button onClick={() => scaleSelection('x', 1)} className="py-1 bg-[#282a2d] hover:bg-[#3e4145] text-gray-300 rounded">Wide (+X)</button>
                    <button onClick={() => scaleSelection('y', -1)} className="py-1 bg-[#282a2d] hover:bg-[#3e4145] text-gray-300 rounded">Flatten (-Y)</button>
                    <button onClick={() => scaleSelection('y', 1)} className="py-1 bg-[#282a2d] hover:bg-[#3e4145] text-gray-300 rounded">Elevate (+Y)</button>
                    <button onClick={() => scaleSelection('z', -1)} className="py-1 bg-[#282a2d] hover:bg-[#3e4145] text-gray-300 rounded">Shorten (-Z)</button>
                    <button onClick={() => scaleSelection('z', 1)} className="py-1 bg-[#282a2d] hover:bg-[#3e4145] text-gray-300 rounded">Lengthen (+Z)</button>
                  </div>
                </div>

              </div>

              {/* Delete panel bottom */}
              <div className="p-3 bg-[#131416] border-t border-[#2d3033]">
                <button
                  onClick={handleDeletePart}
                  className="w-full py-2 bg-rose-650 hover:bg-rose-600 text-xs font-black text-white rounded shadow-sm flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Part instance
                </button>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3">
              <span className="text-3xl">📡</span>
              <h3 className="text-xs font-bold text-gray-300 uppercase">Explorer Inspector empty</h3>
              <p className="text-[10px] text-gray-400 leading-relaxed max-w-[200px]">
                Click any block in the center 3D field or select from hierarchical list of Explorer to inspect.
              </p>
            </div>
          )}
        </aside>

      </div>

    </div>
  );
}
