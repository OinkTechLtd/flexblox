/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { 
  ArrowLeft, MessageSquare, Send, Award, Clock, RotateCcw, 
  Volume2, VolumeX, Users, Plus, Star, Shield, HelpCircle 
} from 'lucide-react';
import { LevelData, PartData, PlayerState, NetworkMessage } from '../types';
import { MultiplayerClient } from '../lib/mpConnection';

interface GameClientProps {
  level: LevelData;
  username: string;
  avatarColor: string;
  avatarFace: string;
  avatarHat: string;
  roomId: string;
  isHost: boolean;
  mpClient: MultiplayerClient | null;
  onBackToMenu: () => void;
  soundEnabled: boolean;
}

interface ChatMessage {
  id: string;
  username: string;
  text: string;
  color: string;
  timestamp: string;
}

export default function GameClient({
  level,
  username,
  avatarColor,
  avatarFace,
  avatarHat,
  roomId,
  isHost,
  mpClient,
  onBackToMenu,
  soundEnabled
}: GameClientProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Scoring / Game States
  const [totalCoins, setTotalCoins] = useState<number>(0);
  const [collectedCoinIds, setCollectedCoinIds] = useState<Set<string>>(new Set());
  const [raceTime, setRaceTime] = useState<number>(0);
  const [raceActive, setRaceActive] = useState<boolean>(true);
  const [hudMessage, setHudMessage] = useState<string>('');
  const [showNetworkSettings, setShowNetworkSettings] = useState<boolean>(false);
  const [botsActive, setBotsActive] = useState<boolean>(true);
  const [bots] = useState<{ id: string; nickname: string; color: string }[]>([
    { id: 'bot_1', nickname: 'BuilderPRO_99', color: '#eab308' },
    { id: 'bot_2', nickname: 'Robloxian_2026', color: '#22c55e' },
    { id: 'bot_3', nickname: 'FlexGamer', color: '#ec4899' }
  ]);

  // Chat Log State
  const [chatInput, setChatInput] = useState<string>('');
  const [chats, setChats] = useState<ChatMessage[]>([
    {
      id: 'system_welcome',
      username: 'FlexBlox System',
      text: `Вы вошли в игру "${level.name}" в комнате №${roomId}.`,
      color: '#ef4444',
      timestamp: 'SYSTEM'
    }
  ]);

  // Three.js and Physics variables stored in Refs to bypass react re-renders
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  
  // Players map: ID -> Three Object group
  const playersMapRef = useRef<Map<string, {
    group: THREE.Group;
    torso: THREE.Mesh;
    leftArm: THREE.Mesh;
    rightArm: THREE.Mesh;
    leftLeg: THREE.Mesh;
    rightLeg: THREE.Mesh;
    head: THREE.Mesh;
    state: PlayerState;
  }>>(new Map());

  // Local physical states
  const playerPosRef = useRef<[number, number, number]>([0, 1.5, 0]);
  const playerVelRef = useRef<[number, number, number]>([0, 0, 0]);
  const playerRotRef = useRef<number>(0);
  const isGroundedRef = useRef<boolean>(true);
  const speedBoostMultiplierRef = useRef<number>(1.0);
  
  // Keyboard tracking
  const keysRef = useRef<Record<string, boolean>>({});

  // Mobile virtual joystick variables
  const joystickStartRef = useRef<{ x: number; y: number } | null>(null);
  const joystickVectorRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isMobileTouched, setIsMobileTouched] = useState<boolean>(false);
  const [joyPos, setJoyPos] = useState<{ x: number; y: number }>({ x: 50, y: 50 });

  // Mesh objects maps
  const levelMeshesMapRef = useRef<Map<string, THREE.Mesh>>(new Map());

  // Local character 3D object for tracking our own client avatar
  const myAvatarGroupRef = useRef<THREE.Group | null>(null);
  const myLimbSwingsRef = useRef<number>(0);

  // Load sound effects fallback (using Web Audio API synthesiser - guarantees 100% offline coverage!)
  const playOofSound = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Oof Sound Synthesis (deep hollow pop)
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, audioCtx.currentTime); // high freq drop
      osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.15);
      
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.18);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
    } catch (e) {
      // Audio block
    }
  };

  const playCoinSound = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      // Coin Chime Synthesis (clean double ding!)
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc1.type = 'sine';
      osc2.type = 'sine';
      
      osc1.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      osc1.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.08); // E5
      
      osc2.frequency.setValueAtTime(1046.5, audioCtx.currentTime); // C6
      osc2.frequency.setValueAtTime(1318.5, audioCtx.currentTime + 0.08); // E6
      
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
      
      osc1.start();
      osc2.start();
      osc1.stop(audioCtx.currentTime + 0.3);
      osc2.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      // Audio block
    }
  };

  const playTriggerSound = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(100, audioCtx.currentTime);
      osc.frequency.linearRampToValueAtTime(600, audioCtx.currentTime + 0.1);
      osc.frequency.linearRampToValueAtTime(300, audioCtx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch (e) {}
  };

  // 3D Avatar Rig Creator (Classic Roblox humanoid)
  const buildRobloxAvatarRig = (jerseyColor: string, faceChar: string, hatColor: string): {
    group: THREE.Group;
    torso: THREE.Mesh;
    leftArm: THREE.Mesh;
    rightArm: THREE.Mesh;
    leftLeg: THREE.Mesh;
    rightLeg: THREE.Mesh;
    head: THREE.Mesh;
  } => {
    const group = new THREE.Group();

    // R6 Head (Yellow flesh skin)
    const headGeo = new THREE.BoxGeometry(0.7, 0.7, 0.7);
    const skinMat = new THREE.MeshStandardMaterial({ color: '#fed7aa', roughness: 0.8 });
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 1.35;
    head.castShadow = true;
    group.add(head);

    // Dynamic eyes & smile face drawn into canvas texture or fallback simple 3D blocks
    // To make it look incredibly real, we can append glowing eye blocks or 3D sunglasses
    if (faceChar === '😎') {
      const glassesGeo = new THREE.BoxGeometry(0.65, 0.15, 0.1);
      const glassesMat = new THREE.MeshBasicMaterial({ color: '#111827' });
      const glasses = new THREE.Mesh(glassesGeo, glassesMat);
      glasses.position.set(0, 1.38, 0.36);
      group.add(glasses);
    } else {
      // Add cute little eyes
      const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), new THREE.MeshBasicMaterial({ color: '#000000' }));
      eyeL.position.set(-0.16, 1.4, 0.36);
      const eyeR = eyeL.clone();
      eyeR.position.x = 0.16;
      group.add(eyeL);
      group.add(eyeR);
      // Mouth
      const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.1), new THREE.MeshBasicMaterial({ color: '#311005' }));
      mouth.position.set(0, 1.27, 0.36);
      group.add(mouth);
    }

    // Hat if selected
    if (hatColor) {
      const hatGeo = new THREE.BoxGeometry(0.9, 0.12, 0.9);
      const hatMat = new THREE.MeshStandardMaterial({ color: hatColor });
      const mainHat = new THREE.Mesh(hatGeo, hatMat);
      mainHat.position.y = 1.74;
      group.add(mainHat);
      
      const capVisorGeo = new THREE.BoxGeometry(0.85, 0.04, 0.45);
      const capVisor = new THREE.Mesh(capVisorGeo, hatMat);
      capVisor.position.set(0, 1.70, 0.55);
      group.add(capVisor);
    }

    // Torso (Main colored jacket)
    const torsoGeo = new THREE.BoxGeometry(0.9, 1.0, 0.5);
    const jerseyMat = new THREE.MeshStandardMaterial({ color: jerseyColor, roughness: 0.7 });
    const torso = new THREE.Mesh(torsoGeo, jerseyMat);
    torso.position.y = 0.5;
    torso.castShadow = true;
    torso.receiveShadow = true;
    group.add(torso);

    // Left Arm
    const armGeo = new THREE.BoxGeometry(0.35, 1.0, 0.42);
    const leftArm = new THREE.Mesh(armGeo, skinMat);
    leftArm.position.set(-0.68, 0.5, 0);
    leftArm.castShadow = true;
    group.add(leftArm);

    // Right Arm
    const rightArm = new THREE.Mesh(armGeo, skinMat);
    rightArm.position.set(0.68, 0.5, 0);
    rightArm.castShadow = true;
    group.add(rightArm);

    // Left Leg (Roblox trousers)
    const legGeo = new THREE.BoxGeometry(0.4, 0.9, 0.46);
    const pantsMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.8 });
    const leftLeg = new THREE.Mesh(legGeo, pantsMat);
    leftLeg.position.set(-0.25, -0.45, 0);
    leftLeg.castShadow = true;
    group.add(leftLeg);

    // Right Leg
    const rightLeg = new THREE.Mesh(legGeo, pantsMat);
    rightLeg.position.set(0.25, -0.45, 0);
    rightLeg.castShadow = true;
    group.add(rightLeg);

    return { group, torso, leftArm, rightArm, leftLeg, rightLeg, head };
  };

  // Local Respawn triggers
  const executeRespawn = () => {
    // Search default Spawn Point block inside level
    const spawnPart = level.parts.find(p => p.shape === 'spawn');
    let startX = 0, startY = 3.0, startZ = 0;
    
    if (spawnPart) {
      startX = spawnPart.position[0];
      startY = spawnPart.position[1] + 2.0;
      startZ = spawnPart.position[2];
    }
    
    playerPosRef.current = [startX, startY, startZ];
    playerVelRef.current = [0, 0, 0];
    speedBoostMultiplierRef.current = 1.0;
    playOofSound();
    setHudMessage('☠️ ВЫ ПОГИБЛИ! Возрождение на Спавне... ☠️');
    
    setTimeout(() => {
      setHudMessage('');
    }, 2500);
  };

  // Submit text chats
  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    
    // Send to web socket if open
    if (mpClient && mpClient.isSocketOpen()) {
      mpClient.sendChat(chatInput);
    } else {
      // Local chat echo
      const stamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setChats(prev => [
        ...prev,
        {
          id: `chat_${Date.now()}`,
          username: username,
          text: chatInput,
          color: avatarColor,
          timestamp: stamp
        }
      ]);
    }
    setChatInput('');
  };

  // Connect & listen to WebSocket multiplayer signals
  useEffect(() => {
    if (!mpClient) return;

    // Listen to WS operations (sync positions, joins, leaves, coins)
    const handleServerMessage = (msg: NetworkMessage) => {
      const scene = sceneRef.current;
      if (!scene) return;

      switch (msg.type) {
        case 'init': {
          const { players, parts } = msg.payload;
          // Spawn others
          Object.values(players).forEach((pData: any) => {
            if (pData.id === mpClient['currentPlayerId']) return; // Skip myself
            
            // Build their blocky character meshes
            const rig = buildRobloxAvatarRig(pData.color, '🙂', '');
            scene.add(rig.group);
            playersMapRef.current.set(pData.id, { ...rig, state: pData as PlayerState });
          });
          break;
        }

        case 'join': {
          const { player } = msg.payload;
          if (player.id === mpClient['currentPlayerId']) return;
          
          if (!playersMapRef.current.has(player.id)) {
            const rig = buildRobloxAvatarRig(player.color, '🙂', '');
            scene.add(rig.group);
            playersMapRef.current.set(player.id, { ...rig, state: player as PlayerState });
            
            setChats(prev => [
              ...prev,
              {
                id: `usr_join_${Date.now()}`,
                username: 'FlexBlox LAN',
                text: `${player.username} подключился к игре!`,
                color: '#10b981',
                timestamp: 'JOIN'
              }
            ]);
          }
          break;
        }

        case 'leave': {
          const pId = msg.senderId;
          if (pId && playersMapRef.current.has(pId)) {
            const rig = playersMapRef.current.get(pId);
            if (rig) {
              scene.remove(rig.group);
            }
            playersMapRef.current.delete(pId);

            setChats(prev => [
              ...prev,
              {
                id: `usr_leave_${Date.now()}`,
                username: 'FlexBlox LAN',
                text: `${msg.payload.username} покинул игру.`,
                color: '#94a3b8',
                timestamp: 'LEAVE'
              }
            ]);
          }
          break;
        }

        case 'update': {
          const pId = msg.senderId;
          const rig = playersMapRef.current.get(pId || '');
          if (rig && msg.payload) {
            // Anchor network locations
            Object.assign(rig.state, msg.payload);
          }
          break;
        }

        case 'chat': {
          const stamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          setChats(prev => [
            ...prev,
            {
              id: `ws_chat_${Date.now()}`,
              username: msg.payload.username,
              text: msg.payload.text,
              color: msg.payload.color || '#ffffff',
              timestamp: stamp
            }
          ]);
          break;
        }

        case 'collect_coin': {
          const { coinId, playerId, coins } = msg.payload;
          setCollectedCoinIds(prev => {
            const next = new Set(prev);
            next.add(coinId);
            return next;
          });

          // Disable coin visibility in 3D frame
          const coinMesh = levelMeshesMapRef.current.get(coinId);
          if (coinMesh) {
            coinMesh.visible = false;
          }

          // If someone else got it, show notification
          if (playerId !== mpClient['currentPlayerId']) {
            const otherPlayer = playersMapRef.current.get(playerId);
            if (otherPlayer) {
              otherPlayer.state.coins = coins;
            }
          } else {
            setTotalCoins(coins);
            playCoinSound();
          }
          break;
        }

        case 'level_sync': {
          // Re-synchronize level blocks real-time if publisher pushed it
          setHudMessage('⚙️ Обновление карты хостом...');
          setTimeout(() => {
            window.location.reload(); // Quick reset
          }, 1500);
          break;
        }

        case 'reset_level': {
          setCollectedCoinIds(new Set());
          levelMeshesMapRef.current.forEach(mesh => {
            const partInfo = level.parts.find(p => p.id === mesh.userData.id);
            if (partInfo?.shape === 'coin') {
              mesh.visible = true;
            }
          });
          setTotalCoins(0);
          setRaceTime(0);
          executeRespawn();
          break;
        }
      }
    };

    // Link client connection callback logic
    mpClient['onMessageCallback'] = handleServerMessage;

    return () => {
      mpClient['onMessageCallback'] = () => {};
    };
  }, [mpClient]);

  // Three.js Mount & Animation Core Loop
  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Initialise Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#38bdf8'); // Skyblue skybox
    sceneRef.current = scene;

    // Atmospheric fog
    scene.fog = new THREE.FogExp2('#38bdf8', 0.005);

    // 2. Camera Setup
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 800);
    cameraRef.current = camera;

    // 3. Renderer Setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Lights
    const ambientLight = new THREE.AmbientLight('#ffffff', 0.65);
    scene.add(ambientLight);

    const sun = new THREE.DirectionalLight('#ffffff', 1.1);
    sun.position.set(40, 75, 45);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 250;
    const d = 100;
    sun.shadow.camera.left = -d;
    sun.shadow.camera.right = d;
    sun.shadow.camera.top = d;
    sun.shadow.camera.bottom = -d;
    scene.add(sun);

    // 5. Ambient Clouds and Realistic sky elements
    // We add a glowing yellow Sun Sphere!
    const sunGeom = new THREE.SphereGeometry(6, 16, 16);
    const sunMat = new THREE.MeshBasicMaterial({ color: '#fef08a' });
    const sunMesh = new THREE.Mesh(sunGeom, sunMat);
    sunMesh.position.set(100, 160, 100);
    scene.add(sunMesh);

    // 6. Realistic grassy base plate (Green blocky turf)
    const baseplateGeo = new THREE.BoxGeometry(200, 1.0, 200);
    const baseplateMat = new THREE.MeshStandardMaterial({ color: '#16a34a', roughness: 0.9 });
    const baseplate = new THREE.Mesh(baseplateGeo, baseplateMat);
    baseplate.position.y = -0.5;
    baseplate.receiveShadow = true;
    scene.add(baseplate);

    // 7. Load Level Parts
    level.parts.forEach((part) => {
      // Materials configuration
      let material: THREE.Material;
      if (part.shape === 'coin' || part.shape === 'lava' || part.shape === 'speedpad') {
        const glowColor = part.shape === 'coin' ? '#eab308' : part.shape === 'lava' ? '#ef4444' : '#10b981';
        material = new THREE.MeshBasicMaterial({ color: glowColor });
      } else if (part.material === 'glass') {
        material = new THREE.MeshStandardMaterial({
          color: part.color,
          roughness: 0.1,
          metalness: 0.1,
          transparent: true,
          opacity: 0.4
        });
      } else if (part.material === 'wood') {
        material = new THREE.MeshStandardMaterial({ color: part.color, roughness: 0.95, metalness: 0.05 });
      } else if (part.material === 'metal') {
        material = new THREE.MeshStandardMaterial({ color: part.color, roughness: 0.15, metalness: 0.9 });
      } else { // plastic
        material = new THREE.MeshStandardMaterial({ color: part.color, roughness: 0.6, metalness: 0.1 });
      }

      // Geometries
      let geometry: THREE.BufferGeometry;
      if (part.shape === 'sphere') {
        geometry = new THREE.SphereGeometry(1.0, 16, 16);
      } else if (part.shape === 'cylinder') {
        geometry = new THREE.CylinderGeometry(1.0, 1.0, 2.0, 16);
      } else { // box, spawn, trigger, speedpad
        geometry = new THREE.BoxGeometry(1.0, 1.0, 1.0);
      }

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(part.position[0], part.position[1], part.position[2]);
      mesh.rotation.set(part.rotation[0], part.rotation[1], part.rotation[2]);
      mesh.scale.set(part.scale[0], part.scale[1], part.scale[2]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      
      mesh.userData = { id: part.id };

      scene.add(mesh);
      levelMeshesMapRef.current.set(part.id, mesh);
    });

    // 8. Construct My Own Character Mesh (Local Roblox Player Setup)
    const myRig = buildRobloxAvatarRig(avatarColor, avatarFace, avatarHat);
    scene.add(myRig.group);
    myAvatarGroupRef.current = myRig.group;

    // Anchor player start position at spawn locator
    const spawnPart = level.parts.find(p => p.shape === 'spawn');
    if (spawnPart) {
      playerPosRef.current = [spawnPart.position[0], spawnPart.position[1] + 1.8, spawnPart.position[2]];
    } else {
      playerPosRef.current = [0, 1.5, 0];
    }

    // 9. Camera Orbit and Keyboard Controls setup
    let isOrbiting = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let cameraPitch = 0.2; // vertical look (0 to PI/2)
    let cameraYaw = 0; // horizontal circle (0 to 2*PI)
    let cameraZoom = 12; // zoom distance

    const handleCanvasMouseDown = (e: MouseEvent) => {
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

      cameraYaw -= dx * 0.005;
      cameraPitch = Math.max(-0.4, Math.min(Math.PI / 2 - 0.2, cameraPitch + dy * 0.005));
    };

    const handleCanvasMouseUp = () => {
      isOrbiting = false;
    };

    const handleWheel = (e: WheelEvent) => {
      cameraZoom = Math.max(3, Math.min(45, cameraZoom + e.deltaY * 0.03));
    };

    // Keyboard bindings
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
      // Spacebar triggers Jump kinematic
      if (e.code === 'Space' && isGroundedRef.current) {
        playerVelRef.current[1] = 13.0; // Initial upward jump force
        isGroundedRef.current = false;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };

    renderer.domElement.addEventListener('mousedown', handleCanvasMouseDown);
    window.addEventListener('mousemove', handleCanvasMouseMove);
    window.addEventListener('mouseup', handleCanvasMouseUp);
    renderer.domElement.addEventListener('wheel', handleWheel);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // 10. BOT SPANNER (Network bots simulation for immersive local Wi-Fi sandbox feel!)
    const simulatedBots: {
      id: string;
      nickname: string;
      color: string;
      pos: [number, number, number];
      vel: [number, number, number];
      targetWaypoint: [number, number, number];
      rig: any;
      swing: number;
    }[] = [];

    const BotNames = ['BuilderPRO_99', 'Robloxian_2026', 'FlexGamer', 'NoobSlayer', 'BloxHero'];
    const BotColors = ['#eab308', '#22c55e', '#ec4899', '#06b6d4', '#eab308'];

    // If bots is toggle enabled, generate 3 random active characters in game sandbox
    if (botsActive) {
      for (let i = 0; i < 3; i++) {
        const id = `bot_${Date.now()}_${i}`;
        const bRig = buildRobloxAvatarRig(BotColors[i], '😏', '');
        scene.add(bRig.group);
        
        simulatedBots.push({
          id,
          nickname: BotNames[i],
          color: BotColors[i],
          pos: [
            spawnPart ? spawnPart.position[0] + (Math.random() * 4 - 2) : 0,
            2.0,
            spawnPart ? spawnPart.position[2] + (Math.random() * 4 - 2) : 0
          ],
          vel: [0, 0, 0],
          targetWaypoint: [Math.random() * 40 - 20, 2.0, Math.random() * 40 - 20],
          rig: bRig,
          swing: 0
        });
      }
    }

    // 11. Physics and Rendering Tick timer
    let prevTime = performance.now();
    let requestFrameId: number;

    const gameTick = () => {
      requestFrameId = requestAnimationFrame(gameTick);

      const currentTime = performance.now();
      const dt = Math.min(0.03, (currentTime - prevTime) / 1000); // Caps time-step spike
      prevTime = currentTime;

      // UPDATE Timer count for races
      if (raceActive) {
        setRaceTime(t => t + dt);
      }

      // 11.1 PHYSICS MATH ENGINE FOR CHACTER MOVEMENT (KINEMATIC COLLISION BLOCKING)
      // Accumulate keyboard WASD inputs
      let moveX = 0;
      let moveZ = 0;

      if (keysRef.current['KeyW'] || keysRef.current['ArrowUp']) moveZ -= 1;
      if (keysRef.current['KeyS'] || keysRef.current['ArrowDown']) moveZ += 1;
      if (keysRef.current['KeyA'] || keysRef.current['ArrowLeft']) moveX -= 1;
      if (keysRef.current['KeyD'] || keysRef.current['ArrowRight']) moveX += 1;

      // Add Virtual Touch Joystick coordinates overrides
      if (joystickVectorRef.current.x !== 0 || joystickVectorRef.current.y !== 0) {
        moveX = joystickVectorRef.current.x;
        moveZ = joystickVectorRef.current.y;
      }

      // Calculate driving vectors relative to active Camera Angle azimuth
      let dx = 0;
      let dz = 0;

      if (moveX !== 0 || moveZ !== 0) {
        const length = Math.sqrt(moveX * moveX + moveZ * moveZ);
        const normX = moveX / length;
        const normZ = moveZ / length;

        // Drive axes
        const cameraForward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraYaw);
        cameraForward.y = 0;
        cameraForward.normalize();

        const cameraRight = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraYaw);
        cameraRight.y = 0;
        cameraRight.normalize();

        dx = cameraForward.x * normZ + cameraRight.x * normX;
        dz = cameraForward.z * normZ + cameraRight.z * normX;
      }

      // Set moving speeds
      const defaultRunSpeed = 8.5;
      const speed = defaultRunSpeed * speedBoostMultiplierRef.current;
      
      // Update forces
      playerVelRef.current[0] = dx * speed;
      playerVelRef.current[2] = dz * speed;

      // Handle Gravity
      const gravity = 25.0; // Standard world pull
      playerVelRef.current[1] -= gravity * dt;

      // Update character coordinates positions
      const pos = playerPosRef.current;
      const vel = playerVelRef.current;

      pos[0] += vel[0] * dt;
      pos[1] += vel[1] * dt;
      pos[2] += vel[2] * dt;

      // Ground plane grid barrier limitation
      isGroundedRef.current = false;
      if (pos[1] <= 0.45) {
        pos[1] = 0.45;
        vel[1] = 0;
        isGroundedRef.current = true;
      }

      // 11.2 Kinematic overlap collision tests with level blocks
      level.parts.forEach((part) => {
        // Retrieve three mesh
        const mesh = levelMeshesMapRef.current.get(part.id);
        if (!mesh || !mesh.visible) return;

        // Bounding calculation box size
        const halfX = part.scale[0] / 2;
        const halfY = part.scale[1] / 2;
        const halfZ = part.scale[2] / 2;

        const bx = part.position[0];
        const by = part.position[1];
        const bz = part.position[2];

        // Player AABB box properties (radius offset: width 0.5, height 1.2)
        const prW = 0.5;
        const prH = 1.1;

        // Intersection overlap test along the dimensions
        const overlapX = (prW + halfX) - Math.abs(pos[0] - bx);
        const overlapY = (prH + halfY) - Math.abs(pos[1] - by);
        const overlapZ = (prW + halfZ) - Math.abs(pos[2] - bz);

        if (overlapX > 0 && overlapY > 0 && overlapZ > 0) {
          // INTERSECTED! Trigger properties reaction!
          if (part.shape === 'coin') {
            // Collect Gold and trigger web sockets sync
            if (!collectedCoinIds.has(part.id)) {
              if (mpClient && mpClient.isSocketOpen()) {
                mpClient.sendCoinCollected(part.id, part.rewardCoins || 1);
              } else {
                // Offline fallback mode
                setCollectedCoinIds(prev => {
                  const next = new Set(prev);
                  next.add(part.id);
                  return next;
                });
                setTotalCoins(c => c + (part.rewardCoins || 1));
                mesh.visible = false;
                playCoinSound();
              }
            }
          } 
          else if (part.shape === 'lava') {
            // Lava resets player position
            executeRespawn();
          } 
          else if (part.shape === 'speedpad') {
            // Speed Boostpad
            speedBoostMultiplierRef.current = part.speedBoost || 1.6;
            // Display floating boost message
            setHudMessage('⚡️ УСКОРЕНИЕ ФЛЕКСБЛОКС! ⚡️');
            setTimeout(() => setHudMessage(''), 1500);
          } 
          else if (part.shape === 'trigger') {
            // Event alert message display
            if (part.triggerText) {
              setHudMessage(part.triggerText);
              // reset tag after a while
              setTimeout(() => setHudMessage(''), 4000);
            }
          } 
          else if (part.shape === 'spawn') {
            // Safe lander zone
          } 
          else {
            // Solid solid block! Push player out along the smallest overlapping dimension axis
            if (overlapX < overlapY && overlapX < overlapZ) {
              pos[0] += (pos[0] > bx ? 1 : -1) * overlapX;
              vel[0] = 0;
            } else if (overlapZ < overlapY && overlapZ < overlapX) {
              pos[2] += (pos[2] > bz ? 1 : -1) * overlapZ;
              vel[2] = 0;
            } else {
              // Y overlap
              if (pos[1] > by) {
                pos[1] += overlapY;
                vel[1] = 0;
                isGroundedRef.current = true;
              } else {
                pos[1] -= overlapY;
                vel[1] = 0;
              }
            }
          }
        }
      });

      // Death bounds (falling off infinite world blocks)
      if (pos[1] < -20) {
        executeRespawn();
      }

      // 11.3 Local character rig animations
      if (myAvatarGroupRef.current) {
        myAvatarGroupRef.current.position.set(pos[0], pos[1], pos[2]);
        
        // Rotate body character in running heading direction
        if (moveX !== 0 || moveZ !== 0) {
          const targetRot = Math.atan2(dx, dz);
          myAvatarGroupRef.current.rotation.y = targetRot;
          playerRotRef.current = targetRot;

          // Swing classic limbs arms & legs R6 Roblox style
          myLimbSwingsRef.current += 10.5 * dt;
          const swingAngle = Math.sin(myLimbSwingsRef.current) * 0.45;
          
          const rig = myAvatarGroupRef.current;
          // Left Arm swing forward
          rig.children[4].rotation.x = swingAngle; // Left Arm
          rig.children[5].rotation.x = -swingAngle; // Right Arm
          rig.children[6].rotation.x = -swingAngle; // Left Leg
          rig.children[7].rotation.x = swingAngle; // Right Leg
        } else {
          // Revert limbs back to standing idle coordinates
          const rig = myAvatarGroupRef.current;
          if (rig && rig.children.length >= 8) {
            rig.children[4].rotation.x = 0;
            rig.children[5].rotation.x = 0;
            rig.children[6].rotation.x = 0;
            rig.children[7].rotation.x = 0;
          }
        }
      }

      // Send telemetry updates to multiplayer server with websocket
      if (mpClient && mpClient.isSocketOpen()) {
        const animState = !isGroundedRef.current ? (vel[1] > 0 ? 'jump' : 'fall') : (moveX !== 0 || moveZ !== 0 ? 'run' : 'idle');
        mpClient.updateState(pos, playerRotRef.current, vel, isGroundedRef.current, animState);
      }

      // 11.4 Animate multiplayer remote users with interp lerp
      playersMapRef.current.forEach((rig, id) => {
        const state = rig.state;
        if (!state) return;

        // Smoothly double step position coordinates (Lerp)
        rig.group.position.x = THREE.MathUtils.lerp(rig.group.position.x, state.position[0], 0.28);
        rig.group.position.y = THREE.MathUtils.lerp(rig.group.position.y, state.position[1], 0.28);
        rig.group.position.z = THREE.MathUtils.lerp(rig.group.position.z, state.position[2], 0.28);
        rig.group.rotation.y = THREE.MathUtils.lerp(rig.group.rotation.y, state.rotation, 0.28);

        // swing limbs depending on state
        if (state.animation === 'run') {
          rig.swing += 10 * dt;
          const sa = Math.sin(rig.swing) * 0.45;
          rig.leftArm.rotation.x = sa;
          rig.rightArm.rotation.x = -sa;
          rig.leftLeg.rotation.x = -sa;
          rig.rightLeg.rotation.x = sa;
        } else {
          rig.leftArm.rotation.x = 0;
          rig.rightArm.rotation.x = 0;
          rig.leftLeg.rotation.x = 0;
          rig.rightLeg.rotation.x = 0;
        }
      });

      // 11.5 AI Bots Simulation movement calculations
      if (botsActive) {
        simulatedBots.forEach((bot) => {
          // Direct moving direction to target waypoint
          const bx = bot.pos[0];
          const bz = bot.pos[2];

          const tx = bot.targetWaypoint[0];
          const tz = bot.targetWaypoint[2];

          const diffX = tx - bx;
          const diffZ = tz - bz;
          const distance = Math.sqrt(diffX * diffX + diffZ * diffZ);

          if (distance < 1.5) {
            // Generate a new target coordinate
            bot.targetWaypoint = [Math.random() * 80 - 40, 2.0, Math.random() * 80 - 40];
          } else {
            // Move bot kinematic
            const bdx = diffX / distance;
            const bdz = diffZ / distance;
            
            bot.pos[0] += bdx * 4.2 * dt;
            bot.pos[2] += bdz * 4.2 * dt;

            // Align bot rotation
            bot.rig.group.rotation.y = Math.atan2(bdx, bdz);

            // swing
            bot.swing += 9 * dt;
            const s = Math.sin(bot.swing) * 0.4;
            bot.rig.leftArm.rotation.x = s;
            bot.rig.rightArm.rotation.x = -s;
            bot.rig.leftLeg.rotation.x = -s;
            bot.rig.rightLeg.rotation.x = s;
          }

          // Anchor 3D height
          bot.rig.group.position.set(bot.pos[0], 2.0 - 1.05 + 0.4, bot.pos[2]);

          // Simple bot chat simulator (one comment sometimes)
          if (Math.random() < 0.0003) {
            const botComments = [
              'Ого, красивый плейс во FlexBlox!',
              'Кто со мной по сети на лазер бридж?',
              'Прыгайте на зеленые бусты, они дают супер скорость!',
              'FlexBlox топчик, работает без лагов!',
              'Привет всем игрокам Roblox!'
            ];
            const randomComm = botComments[Math.floor(Math.random() * botComments.length)];
            const stamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            setChats(prev => [
              ...prev,
              {
                id: `bot_chat_${Date.now()}`,
                username: `🤖 ${bot.nickname}`,
                text: randomComm,
                color: bot.color,
                timestamp: stamp
              }
            ]);
            playTriggerSound();
          }
        });
      }

      // 11.6 Third-Person Chase Camera alignment
      if (cameraRef.current) {
        cameraRef.current.position.x = pos[0] + cameraZoom * Math.sin(cameraYaw) * Math.cos(cameraPitch);
        cameraRef.current.position.y = pos[1] + cameraZoom * Math.sin(cameraPitch) + 1.2;
        cameraRef.current.position.z = pos[2] + cameraZoom * Math.cos(cameraYaw) * Math.cos(cameraPitch);
        cameraRef.current.lookAt(pos[0], pos[1] + 1.0, pos[2]);
      }

      renderer.render(scene, camera);
    };
    gameTick();

    // Resize viewport hook
    const handleResize = () => {
      if (!renderer || !camera || !containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Unmount memory cleanup
    return () => {
      cancelAnimationFrame(requestFrameId);
      
      renderer.domElement.removeEventListener('mousedown', handleCanvasMouseDown);
      window.removeEventListener('mousemove', handleCanvasMouseMove);
      window.removeEventListener('mouseup', handleCanvasMouseUp);
      renderer.domElement.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);

      // Remove and dispose meshes
      levelMeshesMapRef.current.forEach((mesh) => {
        scene.remove(mesh);
        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(m => m.dispose());
        } else {
          mesh.material.dispose();
        }
      });
      levelMeshesMapRef.current.clear();

      playersMapRef.current.forEach((rig) => {
        scene.remove(rig.group);
      });
      playersMapRef.current.clear();

      simulatedBots.forEach((b) => {
        scene.remove(b.rig.group);
      });

      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Joystick handlers for touch screen mobile devices (prevent double taps, zoom bugs)
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsMobileTouched(true);
    const touch = e.touches[0];
    joystickStartRef.current = { x: touch.clientX, y: touch.clientY };
    setJoyPos({ x: 50, y: 50 });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!joystickStartRef.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - joystickStartRef.current.x;
    const dy = touch.clientY - joystickStartRef.current.y;
    
    // Clamp joystick boundary (max 50px delta radius)
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxRadius = 45;

    let moveX = dx;
    let moveY = dy;

    if (distance > maxRadius) {
      moveX = (dx / distance) * maxRadius;
      moveY = (dy / distance) * maxRadius;
    }

    setJoyPos({
      x: 50 + (moveX / maxRadius) * 50,
      y: 50 + (moveY / maxRadius) * 50,
    });

    // Normalize coordinates direction vector for physics input [-1, 1]
    joystickVectorRef.current = {
      x: moveX / maxRadius,
      y: moveY / maxRadius
    };
  };

  const handleTouchEnd = () => {
    setIsMobileTouched(false);
    joystickStartRef.current = null;
    joystickVectorRef.current = { x: 0, y: 0 };
    setJoyPos({ x: 50, y: 50 });
  };

  const handleMobileJump = () => {
    if (isGroundedRef.current) {
      playerVelRef.current[1] = 13.0; // trigger jump force physics
      isGroundedRef.current = false;
    }
  };

  const triggerResetMapScore = () => {
    if (mpClient && mpClient.isSocketOpen()) {
      mpClient.sendResetLevel();
    } else {
      // Local fallback
      setCollectedCoinIds(new Set());
      levelMeshesMapRef.current.forEach(mesh => {
        const partInfo = level.parts.find(p => p.id === mesh.userData.id);
        if (partInfo?.shape === 'coin') {
          mesh.visible = true;
        }
      });
      setTotalCoins(0);
      setRaceTime(0);
      executeRespawn();
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#02050a] select-none text-gray-200">
      
      {/* Upper Navigation Game Header in Roblox style */}
      <div className="h-14 bg-red-700/80 px-4 flex items-center justify-between border-b border-red-800 shadow relative z-20 shrink-0 select-none">
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToMenu}
            className="p-1 px-3 rounded bg-black/40 hover:bg-black/60 font-bold text-white text-xs flex items-center gap-1 shadow-inner transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Выйти в меню
          </button>
          
          <div className="flex flex-col">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">{level.name}</h2>
            <span className="text-[10px] text-red-200">Комната: №{roomId} • Мультиплеер Roblox</span>
          </div>
        </div>

        {/* Global Level Stats Hud */}
        <div className="flex items-center gap-4 text-xs font-bold">
          <div className="flex items-center gap-1 bg-black/20 p-1.5 px-3 rounded-md border border-red-500/20">
            <Award className="w-4 h-4 text-yellow-450" />
            <span className="text-yellow-400">Монеты: {totalCoins}</span>
          </div>

          <div className="flex items-center gap-1 bg-black/20 p-1.5 px-3 rounded-md border border-red-500/20 font-mono">
            <Clock className="w-4 h-4 text-sky-300" />
            <span className="text-sky-300">Время: {raceTime.toFixed(1)} сек</span>
          </div>

          <button
            onClick={triggerResetMapScore}
            className="p-1.5 bg-black/30 hover:bg-black/55 text-white rounded transition"
            title="Обнулить рекорды / Респавн"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main viewport containing layout Canvas, chat block overlay and mobil stick */}
      <div className="flex-1 min-h-0 relative flex overflow-hidden">
        
        {/* The 3D Render Field absolute layout */}
        <div className="absolute inset-0 z-0 bg-sky-950" ref={containerRef} />

        {/* HUD Notification text display triggers layer (Floating central roblox alerts) */}
        {hudMessage && (
          <div className="absolute left-1/2 top-11 -translate-x-1/2 bg-black/90 px-6 py-3.5 rounded-xl border border-yellow-500/40 shadow-2xl text-yellow-400 font-bold text-sm text-center z-10 max-w-md animate-bounce">
            {hudMessage}
          </div>
        )}

        {/* TOP LEFT ROBLOX CHAT OVERLAY BOX */}
        <div className="absolute left-4 top-4 z-10 w-72 h-64 bg-black/60 rounded-xl border border-white/10 flex flex-col justify-between overflow-hidden backdrop-blur-sm pointer-events-auto">
          {/* Messages Lists window */}
          <div className="flex-1 p-3 overflow-y-auto roblox-chat-container space-y-2 text-xs">
            {chats.map((ch) => (
              <div key={ch.id} className="leading-relaxed bg-white/5 p-1.5 rounded text-gray-200">
                <span className="font-bold pr-1 text-xs" style={{ color: ch.color }}>{ch.username}:</span>
                <span className="text-gray-100 break-words">{ch.text}</span>
              </div>
            ))}
          </div>

          {/* Typing box */}
          <div className="h-10 bg-black/80 flex items-center border-t border-white/5 px-2 gap-1 shrink-0">
            <input
              type="text"
              placeholder="Напишите сообщение..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
              className="flex-1 bg-transparent border-none text-xs text-white outline-none px-2 py-1 placeholder-gray-500 font-semibold"
            />
            <button
              onClick={handleSendChat}
              className="p-1 px-2.5 bg-red-600 rounded text-xs text-white hover:bg-red-500 transition shadow"
            >
              <Send className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* TOP RIGHT ONLINE PLAYERS LISTS OVERLAY SCREEN */}
        <div className="absolute right-4 top-4 z-10 p-3 bg-black/40 rounded-xl border border-white/10 backdrop-blur-sm pointer-events-auto flex flex-col gap-2 max-h-48 overflow-y-auto width-48 text-xs select-none min-w-[150px]">
          <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider flex items-center gap-1 border-b border-white/5 pb-1">
            <Users className="w-3.5 h-3.5" /> В игре (Игроки)
          </span>
          <div className="space-y-1">
            {/* Myself */}
            <div className="flex items-center justify-between text-yellow-400 gap-2">
              <span className="font-bold truncate">{username} (Я)</span>
              <span className="font-mono text-[10px] shrink-0 font-bold bg-yellow-500/20 px-1 py-0.5 rounded">👑 {totalCoins}</span>
            </div>

            {/* Simulated bots */}
            {botsActive && bots.map(b => (
              <div key={b.id} className="flex items-center justify-between text-cyan-300 text-[11px]">
                <span className="truncate flex items-center gap-1">🤖 {b.nickname}</span>
                <span className="font-mono opacity-80 shrink-0 font-bold bg-cyan-500/10 px-1 py-0.5 rounded">Coins</span>
              </div>
            ))}

            {/* Synced users */}
            {Array.from(playersMapRef.current.entries()).map(([pId, rig]) => (
              <div key={pId} className="flex items-center justify-between text-gray-300 text-[11px] gap-2">
                <span className="truncate">{rig.state.username}</span>
                <span className="font-mono bg-white/10 px-1 py-0.5 rounded text-[10px] font-bold">🪙 {rig.state.coins || 0}</span>
              </div>
            ))}
          </div>
        </div>

        {/* MOBILE JOYSTICK CONTROLLER ON THE LOWER LEFT SECTION OF CANVAS */}
        <div
          className="absolute left-8 bottom-8 w-32 h-32 bg-black/30 rounded-full border border-white/15 backdrop-blur-sm flex items-center justify-center p-3 select-none pointer-events-auto touch-none z-10"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          id="virtual-joystick-touchzone"
        >
          {/* Physical floating Joystick thumb core node */}
          <div
            className="w-12 h-12 bg-gray-100 rounded-full border shadow-2xl transition duration-75 absolute transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
            style={{
              left: `${joyPos.x}%`,
              top: `${joyPos.y}%`,
            }}
          >
            <div className="w-4 h-4 bg-gray-400 rounded-full" />
          </div>
        </div>

        {/* MOBILE JUMP PAD ON THE LOWER RIGHT SECTION OF CANVAS */}
        <button
          onClick={handleMobileJump}
          className="absolute right-8 bottom-12 w-16 h-16 bg-red-600 hover:bg-red-500 rounded-full border border-red-500 shadow-2xl flex items-center justify-center text-white text-base select-none font-black pointer-events-auto transform active:scale-90 duration-75 z-10"
          id="mobile-jump-pad-btn"
        >
          JUMP
        </button>
      </div>

      {/* Footer Settings Controls widget bar (Toggle Bots) */}
      <div className="h-10 bg-slate-900 border-t border-gray-800 px-4 flex items-center justify-between text-xs text-gray-400 shrink-0 select-none">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setBotsActive(!botsActive)}
            className={`font-semibold transition flex items-center gap-1 ${
              botsActive ? 'text-red-500' : 'text-gray-400'
            }`}
          >
            <span>🤖 Боты-соперники:</span> {botsActive ? 'АКТИВНЫ' : 'ОТКЛЮЧЕНЫ'}
          </button>
        </div>

        <span className="text-[10px] font-mono tracking-wider text-gray-500">FlexBlox 3D Physics v1.0 • WASD + Space</span>
      </div>
    </div>
  );
}
