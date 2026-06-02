/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { 
  ArrowLeft, MessageSquare, Send, Award, Clock, RotateCcw, 
  Volume2, VolumeX, Users, Plus, Star, Shield, HelpCircle,
  ShoppingBag, Coins
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

  // AUTHENTIC ROBLOX SYSTEM COPIES TOGGLES
  const [isEscOpen, setIsEscOpen] = useState<boolean>(false);
  const [chatVisible, setChatVisible] = useState<boolean>(true);
  const [leaderboardVisible, setLeaderboardVisible] = useState<boolean>(true);
  const [cameraSensitivity, setCameraSensitivity] = useState<number>(2.0);
  const [soundEnabledState, setSoundEnabledState] = useState<boolean>(soundEnabled);

  // Speed and Gravity coils active state
  const [isSpeedCoilOwned, setIsSpeedCoilOwned] = useState<boolean>(false);
  const [isGravityCoilOwned, setIsGravityCoilOwned] = useState<boolean>(false);

  // In-Game Shop states
  const [isShopOpen, setIsShopOpen] = useState<boolean>(false);
  const [globalCoins, setGlobalCoins] = useState<number>(0);

  // References bypassing react re-renders inside orbiters
  const cameraSensitivityRef = useRef<number>(2.0);
  const isEscOpenRef = useRef<boolean>(false);

  // Synchronise references on changes
  useEffect(() => {
    isEscOpenRef.current = isEscOpen;
  }, [isEscOpen]);

  // Load local items configurations on mount
  useEffect(() => {
    const sCoil = localStorage.getItem('fb_has_speed_coil') === 'true';
    const gCoil = localStorage.getItem('fb_has_gravity_coil') === 'true';
    setIsSpeedCoilOwned(sCoil);
    setIsGravityCoilOwned(gCoil);

    const storedGlobalCoins = localStorage.getItem('fb_user_coins');
    if (storedGlobalCoins) {
      setGlobalCoins(Number(storedGlobalCoins));
    } else {
      localStorage.setItem('fb_user_coins', '100');
      setGlobalCoins(100);
    }
  }, []);
  const [bots] = useState<{ id: string; nickname: string; color: string }[]>([
    { id: 'bot_1', nickname: 'BuilderPRO_99', color: '#eab308' },
    { id: 'bot_2', nickname: 'Flexian_2026', color: '#22c55e' },
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
  const buildRobloxAvatarRig = (jerseyColor: string, faceChar: string, hatColor: string, isLocal: boolean = false): {
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

    // Add 3D Gamepass coils if owned by local player!
    if (isLocal) {
      const speedOwned = localStorage.getItem('fb_has_speed_coil') === 'true';
      const gravityOwned = localStorage.getItem('fb_has_gravity_coil') === 'true';

      if (speedOwned) {
        // Red speed coil spirals going around left arm mesh!
        for (let i = 0; i < 4; i++) {
          const coilGeo = new THREE.TorusGeometry(0.22, 0.04, 8, 24);
          const coilMat = new THREE.MeshBasicMaterial({ color: '#ef4444' });
          const coil = new THREE.Mesh(coilGeo, coilMat);
          coil.rotation.x = Math.PI / 2;
          coil.position.set(0, -0.3 + i * 0.18, 0);
          leftArm.add(coil);
        }
      }

      if (gravityOwned) {
        // Blue gravity coil spirals going around right arm mesh!
        for (let i = 0; i < 4; i++) {
          const coilGeo = new THREE.TorusGeometry(0.22, 0.04, 8, 24);
          const coilMat = new THREE.MeshBasicMaterial({ color: '#3b82f6' });
          const coil = new THREE.Mesh(coilGeo, coilMat);
          coil.rotation.x = Math.PI / 2;
          coil.position.set(0, -0.3 + i * 0.18, 0);
          rightArm.add(coil);
        }
      }
    }

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
    const theme = level.skyTheme || 'classic';
    let bgColor = '#38bdf8'; // classic blue
    let fogColor = '#38bdf8';
    let sunColor = '#ffffff';
    let sunIntensity = 1.1;

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
      sunIntensity = 1.15;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(bgColor); // Sky theme background
    sceneRef.current = scene;

    // Atmospheric fog
    scene.fog = new THREE.FogExp2(fogColor, 0.006);

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

    const sun = new THREE.DirectionalLight(sunColor, sunIntensity);
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

    // Real physical cylinder studs on the baseplate for authentic Roblox/FlexBlox blocky vibes!
    const studGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.08, 8);
    const studMat = new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.95 });
    const studsGroup = new THREE.Group();
    // Render spaced out studs around active gameplay zone
    for (let x = -60; x <= 60; x += 3) {
      for (let z = -60; z <= 60; z += 3) {
        if (Math.abs(x) < 40 && Math.abs(z) < 40) {
          const stud = new THREE.Mesh(studGeo, studMat);
          stud.position.set(x, 0.04, z);
          stud.receiveShadow = true;
          stud.castShadow = true;
          studsGroup.add(stud);
        }
      }
    }
    scene.add(studsGroup);

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
      } else if (part.shape === 'coin') {
        geometry = new THREE.CylinderGeometry(1.0, 1.0, 0.25, 12);
      } else { // box, spawn, trigger, speedpad
        geometry = new THREE.BoxGeometry(1.0, 1.0, 1.0);
      }

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(part.position[0], part.position[1], part.position[2]);
      mesh.rotation.set(part.rotation[0], part.rotation[1], part.rotation[2]);
      mesh.scale.set(part.scale[0], part.scale[1], part.scale[2]);
      
      if (part.shape === 'coin') {
        mesh.rotation.x = Math.PI / 2;
      }

      mesh.castShadow = true;
      mesh.receiveShadow = true;
      
      mesh.userData = { id: part.id };

      scene.add(mesh);
      levelMeshesMapRef.current.set(part.id, mesh);
    });

    // 8. Construct My Own Character Mesh (Local Roblox Player Setup)
    const myRig = buildRobloxAvatarRig(avatarColor, avatarFace, avatarHat, true);
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

      const sens = cameraSensitivityRef.current || 2.0;
      cameraYaw -= dx * 0.0025 * sens;
      cameraPitch = Math.max(-0.4, Math.min(Math.PI / 2 - 0.2, cameraPitch + dy * 0.0025 * sens));
    };

    const handleCanvasMouseUp = () => {
      isOrbiting = false;
    };

    const handleWheel = (e: WheelEvent) => {
      cameraZoom = Math.max(3, Math.min(45, cameraZoom + e.deltaY * 0.03));
    };

    // Keyboard bindings
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        setIsEscOpen(prev => !prev);
        return;
      }

      // Block character walk controls if Roblox Pause menu is active on screen
      if (isEscOpenRef.current) return;

      keysRef.current[e.code] = true;
      // Spacebar triggers Jump kinematic (Modified with Gravity Coil jump booster!)
      if (e.code === 'Space' && isGroundedRef.current) {
        const hasGravityCoil = localStorage.getItem('fb_has_gravity_coil') === 'true';
        const jumpForce = 13.0 * (hasGravityCoil ? 1.5 : 1.0);
        playerVelRef.current[1] = jumpForce; // Initial upward jump force
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

    const BotNames = ['BuilderPRO_99', 'Flexian_2026', 'FlexGamer', 'NoobSlayer', 'BloxHero'];
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

      // Set moving speeds (Speed Coil yields an authentic 1.65x speed multiplier!)
      const defaultRunSpeed = 8.5;
      const speedCoilLocal = localStorage.getItem('fb_has_speed_coil') === 'true';
      const coilSpeedMult = speedCoilLocal ? 1.65 : 1.0;
      const speed = defaultRunSpeed * speedBoostMultiplierRef.current * coilSpeedMult;
      
      // Update forces
      playerVelRef.current[0] = dx * speed;
      playerVelRef.current[2] = dz * speed;

      // Handle Gravity (Gravity Coil scales gravity pull down by 45% for high-altitude leaps)
      const gravityCoilLocal = localStorage.getItem('fb_has_gravity_coil') === 'true';
      const gravity = 25.0 * (gravityCoilLocal ? 0.55 : 1.0); // Standard world pull
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
              const reward = part.rewardCoins || 10;
              if (mpClient && mpClient.isSocketOpen()) {
                mpClient.sendCoinCollected(part.id, reward);
                // Sync to local coin bank
                setGlobalCoins(prev => {
                  const next = prev + reward;
                  localStorage.setItem('fb_user_coins', String(next));
                  return next;
                });
                setHudMessage(`+${reward} Блок-Монет 🪙`);
                setTimeout(() => setHudMessage(''), 1500);
              } else {
                // Offline fallback mode
                setCollectedCoinIds(prev => {
                  const next = new Set(prev);
                  next.add(part.id);
                  return next;
                });
                setTotalCoins(c => c + reward);
                mesh.visible = false;
                playCoinSound();

                // Add to global coins vault
                setGlobalCoins(prev => {
                  const next = prev + reward;
                  localStorage.setItem('fb_user_coins', String(next));
                  return next;
                });
                setHudMessage(`+${reward} Блок-Монет 🪙`);
                setTimeout(() => setHudMessage(''), 1500);
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
              'Привет всем игрокам FlexBlox!'
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

      // Spin normal coin objects
      levelMeshesMapRef.current.forEach((mesh, partId) => {
        const part = level.parts.find(p => p.id === partId);
        if (part && part.shape === 'coin') {
          mesh.rotation.z += 2.5 * dt;
        }
      });

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
    <div className="w-full h-full relative bg-[#02050a] select-none text-gray-200 overflow-hidden flex flex-col">
      
      {/* Absolute 3D viewport canvas stretches fully in the background */}
      <div className="absolute inset-0 z-0 bg-[#0c141d]" ref={containerRef} />

      {/* 1. AUTHENTIC TRANSMISSION ROBLOX HUD TOP BAR */}
      <div className="absolute top-3 left-3 right-3 z-40 flex justify-between items-center pointer-events-none select-none">
        
        {/* TOP LEFT CLUSTER (Translucent grey pill container, exactly like Roblox on Mobile and Desktop!) */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="bg-black/60 rounded-xl px-2.5 py-1.5 border border-white/10 flex items-center gap-2.5 backdrop-blur-md shadow-lg">
            
            {/* The Classic Tilting Hollow Square logo badge */}
            <button
              onClick={() => setIsEscOpen(prev => !prev)}
              className="p-1 hover:bg-white/10 rounded-md transition duration-150 relative active:scale-90"
              title="Открыть меню или Esc"
            >
              <div className="w-5 h-5 border-2 border-white rounded transform rotate-12 flex items-center justify-center font-black text-[10px] text-white">
                <div className="w-1.5 h-1.5 bg-white rounded-sm transform -rotate-12" />
              </div>
            </button>

            <div className="h-4 w-[1px] bg-white/15" />

            {/* In-Game Chat toggle icon */}
            <button
              onClick={() => setChatVisible(!chatVisible)}
              className={`p-1 hover:bg-white/10 rounded-md transition duration-150 ${chatVisible ? 'text-white' : 'text-slate-400'}`}
              title="Переключить Чат"
            >
              <MessageSquare className="w-4 h-4" />
            </button>

            {/* Player Leaderboard lists toggle icon */}
            <button
              onClick={() => setLeaderboardVisible(!leaderboardVisible)}
              className={`p-1 hover:bg-white/10 rounded-md transition duration-150 ${leaderboardVisible ? 'text-white' : 'text-slate-400'}`}
              title="Список игроков (Таблица)"
            >
              <Users className="w-4 h-4" />
            </button>

            <div className="h-4 w-[1px] bg-white/15" />

            {/* In-Game Store toggle button */}
            <button
              onClick={() => setIsShopOpen(!isShopOpen)}
              className={`p-1 hover:bg-white/15 rounded-md transition duration-150 relative cursor-pointer ${isShopOpen ? 'text-amber-400 bg-amber-500/15' : 'text-slate-400 hover:text-white'}`}
              title="Магазин Катушек (SHOP)"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 bg-amber-500 rounded-full w-2 h-2 animate-pulse" />
            </button>
          </div>

          {/* Quick Info text badge */}
          <div className="hidden sm:flex bg-black/45 px-3 py-1 rounded-xl border border-white/5 backdrop-blur-md text-[10px] font-mono select-none text-slate-300 pointer-events-none uppercase tracking-widest leading-none flex-col gap-0.5">
            <span className="font-bold text-white tracking-wider truncate max-w-[120px]">{level.name}</span>
            <span className="opacity-60 text-[8px]">Сервер No.{roomId} • Wi-Fi Sandbox</span>
          </div>
        </div>

        {/* TOP CENTER - SPEEDRUN RACING TIMER TAB */}
        <div className="absolute left-1/2 -translate-x-1/2 bg-black/70 border border-white/10 px-4 py-1.5 rounded-xl backdrop-blur-md flex items-center gap-1.5 font-mono text-xs shadow-lg font-black tracking-normal select-none text-sky-450">
          <Clock className="w-3.5 h-3.5 text-sky-300 animate-pulse" />
          <span>TIME: {raceTime.toFixed(1)}s</span>
        </div>

        {/* TOP RIGHT - claims quick exit indicator triggers */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* VIP Coils claimed info overlays (Only displays if purchased and active!) */}
          <div className="flex gap-1.5">
            {isSpeedCoilOwned && (
              <span className="hidden md:flex bg-rose-500/25 border border-rose-500/40 text-[9px] text-rose-300 font-extrabold px-2 py-1 rounded-lg uppercase shadow-sm animate-pulse tracking-wide items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Speed Coil Active
              </span>
            )}
            {isGravityCoilOwned && (
              <span className="hidden md:flex bg-blue-500/25 border border-blue-500/40 text-[9px] text-blue-300 font-extrabold px-2 py-1 rounded-lg uppercase shadow-sm animate-pulse tracking-wide items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Gravity Coil Active
              </span>
            )}
          </div>

          <button
            onClick={triggerResetMapScore}
            className="p-1 px-3 bg-black/60 rounded-xl border border-white/10 text-white hover:bg-black/85 text-xs font-mono tracking-wider flex items-center gap-1 transition"
            title="Сбросить рекорды / Респавн на спавне"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-extrabold text-[9px] leading-none">RESPAWN</span>
          </button>
        </div>
      </div>

      {/* Floating Center Notification alerts of progress */}
      {hudMessage && (
        <div className="absolute left-1/2 top-16 -translate-x-1/2 bg-black/90 px-6 py-3.5 rounded-xl border border-yellow-500/40 shadow-2xl text-yellow-400 font-bold text-sm text-center z-40 max-w-md animate-bounce">
          {hudMessage}
        </div>
      )}

      {/* Left side standard Roblox-styles chat box */}
      {chatVisible && (
        <div className="absolute left-4 top-16 z-30 w-72 h-56 bg-black/40 rounded-xl border border-white/10 flex flex-col justify-between overflow-hidden backdrop-blur-sm pointer-events-auto shadow-2xl transition duration-200">
          {/* Scrollable chat body */}
          <div className="flex-1 p-3 overflow-y-auto roblox-chat-container space-y-1 text-xs">
            {chats.map((ch) => (
              <div key={ch.id} className="leading-snug bg-black/10 p-1 rounded-lg text-gray-100">
                <span className="font-sans font-black pr-1 text-[11px]" style={{ color: ch.color }}>[{ch.username}]:</span>
                <span className="text-gray-200 break-words font-medium text-[11px]">{ch.text}</span>
              </div>
            ))}
          </div>

          {/* Typing inputs element bar */}
          <div className="h-9 bg-black/60 flex items-center border-t border-white/5 px-2 gap-1 shrink-0">
            <input
              type="text"
              placeholder="Нажмите Enter для отправки..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
              className="flex-1 bg-transparent border-none text-[11px] text-white outline-none px-2 py-1 placeholder-slate-500 font-medium"
            />
            <button
              onClick={handleSendChat}
              className="p-1 px-2.5 bg-[#4f46e5]/80 rounded-lg text-[10px] text-white hover:bg-[#4f46e5] transition flex items-center gap-1 font-bold"
            >
              <Send className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>
      )}

      {/* Right side Roblox Leaderboard / Leaderboard Columns (PlayerList) */}
      {leaderboardVisible && (
        <div className="absolute right-4 top-16 z-30 p-2 w-52 bg-[#181a1e]/85 rounded-xl border border-white/10 backdrop-blur-md pointer-events-auto flex flex-col gap-1.5 shadow-2xl text-xs max-h-52 overflow-y-auto select-none">
          <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1 border-b border-white/10 pb-1.5">
            <Users className="w-3.5 h-3.5" /> В СЕТИ (LOBBY CLIENT)
          </span>
          <div className="space-y-1">
            {/* Local Client Player */}
            <div className="flex items-center justify-between text-yellow-300 gap-2 bg-yellow-500/10 p-1 rounded border border-yellow-500/25">
              <span className="font-black truncate block">{username} (Я)</span>
              <span className="font-mono text-[10px] shrink-0 font-extrabold bg-yellow-500/25 px-1.5 py-0.5 rounded text-yellow-400">👑 {totalCoins}</span>
            </div>

            {/* Synced remote players */}
            {Array.from(playersMapRef.current.entries()).map(([pId, rig]) => (
              <div key={pId} className="flex items-center justify-between text-slate-200 text-[11px] gap-2 p-1 bg-white/5 rounded">
                <span className="truncate block font-medium">{rig.state.username}</span>
                <span className="font-mono bg-white/10 px-1 py-0.5 rounded text-[10px] font-bold">🪙 {rig.state.coins || 0}</span>
              </div>
            ))}

            {/* Simulated AI competitors */}
            {botsActive && bots.map(b => (
              <div key={b.id} className="flex items-center justify-between text-cyan-300 text-[11px] p-1 bg-cyan-950/20 rounded border border-cyan-500/15">
                <span className="truncate text-[10px] font-medium flex items-center gap-1">🤖 {b.nickname}</span>
                <span className="font-mono text-[9px] shrink-0 font-bold text-cyan-400 bg-cyan-500/10 px-1 py-0.5 rounded">COINS</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MOBILE JOYSTICK CONTROLLER ON THE LOWER LEFT SECTION OF VIEWPORT */}
      <div
        className="absolute left-8 bottom-8 w-32 h-32 bg-black/30 rounded-full border border-white/15 backdrop-blur-sm flex items-center justify-center p-3 select-none pointer-events-auto touch-none z-10"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        id="virtual-joystick-touchzone"
      >
        <div
          className="w-12 h-12 bg-gray-100 rounded-full border shadow-2xl transition duration-75 absolute transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
          style={{
            left: `${joyPos.x}%`,
            top: `${joyPos.y}%`,
          }}
        >
          <div className="w-4 h-4 bg-gray-450 rounded-full" />
        </div>
      </div>

      {/* MOBILE JUMP PAD ON THE LOWER RIGHT SECTION OF VIEWPORT */}
      <button
        onClick={handleMobileJump}
        className="absolute right-8 bottom-12 w-16 h-16 bg-[#0084ff] hover:bg-sky-500 rounded-full border border-sky-450/30 shadow-2xl flex items-center justify-center text-white text-xs select-none font-black pointer-events-auto transform active:scale-90 duration-75 z-10 tracking-widest"
        id="mobile-jump-pad-btn"
      >
        JUMP
      </button>

      {/* Lower Settings Controls widget bar (Toggle Bots) */}
      <div className="absolute bottom-0 left-0 right-0 h-10 bg-black/75 border-t border-white/15 px-4 flex justify-between items-center text-xs text-slate-400 z-30 backdrop-blur shrink-0 select-none">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setBotsActive(!botsActive)}
            className={`font-bold transition flex items-center gap-1 text-[11px] ${
              botsActive ? 'text-amber-500' : 'text-gray-450'
            }`}
          >
            <span>🤖 Боты-соперники:</span> {botsActive ? 'АКТИВНЫ' : 'ОТКЛЮЧЕНЫ'}
          </button>
        </div>

        <span className="text-[10px] font-mono tracking-widest text-[#0084ff] font-extrabold uppercase animate-pulse">FlexBlox Sandbox Engine R6 • WASD + Space</span>
      </div>

      {/* 2. COMPLETELY PORTED INTERACTIVE ROBLOX ESCAPE OVERLAY WINDOW */}
      {isEscOpen && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1f2125] w-full max-w-2xl rounded-xl border border-slate-700/10 flex flex-col overflow-hidden text-slate-200 shadow-2xl">
            
            {/* ESC Header block with tabs */}
            <div className="h-12 bg-[#17181c] border-b border-slate-800 flex justify-between items-center px-6">
              <div className="flex gap-4">
                <span className="font-sans font-black text-xs text-[#0084ff] uppercase tracking-wider flex items-center gap-1.5 select-none">
                  <span className="w-2.5 h-2.5 bg-[#0084ff] transform rotate-45 inline-block shrink-0" />
                  FlexBlox Game Pause Menu
                </span>
              </div>
              
              <button
                onClick={() => setIsEscOpen(false)}
                className="text-xs font-bold text-slate-300 hover:text-white transition duration-100"
              >
                Вернуться в игру (RESUME)
              </button>
            </div>

            {/* Tab options side or central rows */}
            <div className="p-6 space-y-6">
              
              {/* Main title stats section */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-700/25">
                <div>
                  <h3 className="text-[#facc15] font-black text-sm uppercase tracking-wider">{level.name}</h3>
                  <p className="text-[10px] text-gray-400 font-mono">Server Lobby Code: No.{roomId} • By FlexBlox Developer</p>
                </div>
                
                <button
                  onClick={onBackToMenu}
                  className="p-2 px-5 bg-rose-600 hover:bg-rose-500 font-black text-slate-100 uppercase text-xs rounded-lg transition active:scale-95 duration-100 shadow border-b-2 border-rose-800"
                >
                  Leave Game (Выйти)
                </button>
              </div>

              {/* Settings / Controls slider panels */}
              <div className="space-y-4">
                <span className="text-[10px] text-indigo-400 font-extrabold uppercase tracking-wide block">Player In-Game Client Settings</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Sensitivity adjust */}
                  <div className="p-4 bg-[#141518] rounded-xl border border-slate-700/30 space-y-2">
                    <div className="flex justify-between items-center text-xs text-left">
                      <span className="font-bold text-slate-350">Camera Sensitivity</span>
                      <span className="font-mono text-cyan-400 font-black">{cameraSensitivity.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="3.0"
                      step="0.1"
                      value={cameraSensitivity}
                      onChange={(e) => {
                        const nextVal = Number(e.target.value);
                        setCameraSensitivity(nextVal);
                        cameraSensitivityRef.current = nextVal;
                      }}
                      className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-slate-700 accent-[#0084ff]"
                    />
                  </div>

                  {/* Sound toggle status */}
                  <div className="p-4 bg-[#141518] rounded-xl border border-slate-700/30 flex justify-between items-center">
                    <div className="space-y-0.5 text-xs text-left">
                      <span className="font-bold text-slate-350 block">Classic "Oof" Sound</span>
                      <span className="text-[10px] text-slate-500 leading-none">Synthesize retro player collision vocal chimes.</span>
                    </div>
                    <button
                      onClick={() => {
                        const nextS = !soundEnabledState;
                        setSoundEnabledState(nextS);
                        localStorage.setItem('fb_sound_effects', String(nextS));
                      }}
                      className={`w-11 h-6 rounded-full p-1 cursor-pointer flex items-center transition-all ${
                        soundEnabledState ? 'bg-emerald-600 justify-end' : 'bg-slate-800 justify-start'
                      }`}
                    >
                      <div className="w-4 h-4 bg-white rounded-full shadow" />
                    </button>
                  </div>

                  {/* Reset Character handle inside Pause Menu */}
                  <div className="p-4 bg-[#141518] rounded-xl border border-slate-700/30 flex items-center justify-between col-span-1 sm:col-span-2 text-xs">
                    <div className="text-left space-y-0.5">
                      <span className="font-bold text-slate-350 block">Stuck / Broken Joint Status</span>
                      <span className="text-[10px] text-slate-500 leading-none">Reset character's block coordinates and respawn on active spawn stud point.</span>
                    </div>
                    <button
                      onClick={() => {
                        executeRespawn();
                        setIsEscOpen(false);
                      }}
                      className="p-2 px-5 bg-slate-700 hover:bg-[#2e323b] rounded-lg text-slate-100 font-semibold transition active:scale-95 duration-100 border border-slate-600 uppercase"
                    >
                      Reset Character (Респавн)
                    </button>
                  </div>

                </div>
              </div>

            </div>

            {/* Footer info box */}
            <div className="h-10 bg-[#17181c] border-t border-slate-800 px-6 flex items-center justify-between text-[11px] text-gray-500">
              <span>R6 Lego humanoid rig</span>
              <span>Click Resume or press Escape key to close</span>
            </div>

          </div>
        </div>
      )}

      {/* 3. COMPLETELY PORTED INTERACTIVE IN-GAME SHOP MODAL */}
      {isShopOpen && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1e2024] w-full max-w-lg rounded-xl border border-slate-700/25 flex flex-col overflow-hidden text-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            
            <div className="h-12 bg-[#17181c] border-b border-slate-800 flex justify-between items-center px-6">
              <span className="font-sans font-black text-xs text-yellow-500 uppercase tracking-wider flex items-center gap-1.5 select-none">
                <ShoppingBag className="w-4 h-4 text-yellow-400" />
                Внутриигровой Магазин FlexBlox
              </span>
              <button
                onClick={() => setIsShopOpen(false)}
                className="text-xs font-bold text-slate-350 hover:text-white transition duration-100 cursor-pointer"
              >
                Закрыть (Esc)
              </button>
            </div>

            <div className="p-6 space-y-4">
              
              {/* Header balances metrics */}
              <div className="bg-[#141518] p-4 rounded-xl border border-slate-700/20 flex justify-between items-center text-xs">
                <div className="text-left space-y-1">
                  <span className="text-slate-400 font-bold block">Ваш баланс Блок-Монет:</span>
                  <span className="font-mono text-xl font-black text-yellow-400 flex items-center gap-1.5">
                    🪙 {globalCoins}
                  </span>
                </div>
                <div className="text-right space-y-1">
                  <span className="text-slate-400 font-bold block">Собрано за этот раунд:</span>
                  <span className="font-mono text-base font-black text-emerald-400">
                    👑 {totalCoins} монет
                  </span>
                </div>
              </div>

              {/* Items grid info cards */}
              <div className="space-y-3">
                
                {/* Speed Coil Card */}
                <div className="bg-[#141518]/60 p-3.5 rounded-xl border border-slate-700/20 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-red-600/10 rounded-lg border border-red-500/20 flex items-center justify-center text-2xl shrink-0">
                      ⚡
                    </div>
                    <div className="text-left">
                      <h4 className="font-black text-red-400 text-xs">Speed Coil (Катушка Скорости)</h4>
                      <p className="text-[10px] text-slate-400 leading-normal max-w-[210px]">
                        Постоянно ускоряет бег до 1.65x. Эффект активируется мгновенно!
                      </p>
                    </div>
                  </div>

                  <div>
                    {isSpeedCoilOwned ? (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 p-1 px-2 border border-emerald-500/30 rounded">КУПЛЕНО ✔️</span>
                    ) : (
                      <button
                        onClick={() => {
                          if (globalCoins >= 250) {
                            const nextCoins = globalCoins - 250;
                            setGlobalCoins(nextCoins);
                            localStorage.setItem('fb_user_coins', String(nextCoins));
                            localStorage.setItem('fb_has_speed_coil', 'true');
                            setIsSpeedCoilOwned(true);
                            executeRespawn(); // Rebuild avatar
                            alert("🎉 Поздравляем! Катушка Скорости куплена за 250 🪙 во внутриигровом магазине! Ваше тело пересобрано с активным ускорителем!");
                          } else {
                            alert("❌ Недостаточно монет! Требуется 250 🪙. Собирайте золотые монеты на карте!");
                          }
                        }}
                        className="p-1.5 px-3 rounded bg-yellow-500 hover:bg-yellow-450 text-slate-950 font-black text-[11px] cursor-pointer shadow hover:scale-105 active:scale-95 duration-100 transition whitespace-nowrap"
                      >
                        250 🪙
                      </button>
                    )}
                  </div>
                </div>

                {/* Gravity Coil Card */}
                <div className="bg-[#141518]/60 p-3.5 rounded-xl border border-slate-700/20 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-blue-600/10 rounded-lg border border-blue-500/20 flex items-center justify-center text-2xl shrink-0">
                      🌀
                    </div>
                    <div className="text-left font-sans">
                      <h4 className="font-black text-blue-400 text-xs">Gravity Coil (Катушка Гравитации)</h4>
                      <p className="text-[10px] text-slate-400 leading-normal max-w-[210px]">
                        Снижает притяжение на -45%. Позволяет прыгать в 1.8x выше!
                      </p>
                    </div>
                  </div>

                  <div>
                    {isGravityCoilOwned ? (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 p-1 px-2 border border-emerald-500/30 rounded">КУПЛЕНО ✔️</span>
                    ) : (
                      <button
                        onClick={() => {
                          if (globalCoins >= 400) {
                            const nextCoins = globalCoins - 400;
                            setGlobalCoins(nextCoins);
                            localStorage.setItem('fb_user_coins', String(nextCoins));
                            localStorage.setItem('fb_has_gravity_coil', 'true');
                            setIsGravityCoilOwned(true);
                            executeRespawn(); // Rebuild avatar
                            alert("🎉 Поздравляем! Катушка Гравитации куплена за 400 🪙 во внутриигровом магазине! Наслаждайтесь высокими прыжками!");
                          } else {
                            alert("❌ Недостаточно монет! Требуется 400 🪙. Собирайте золотые монеты на карте!");
                          }
                        }}
                        className="p-1.5 px-3 rounded bg-yellow-500 hover:bg-yellow-450 text-slate-950 font-black text-[11px] cursor-pointer shadow hover:scale-105 active:scale-95 duration-100 transition whitespace-nowrap"
                      >
                        400 🪙
                      </button>
                    )}
                  </div>
                </div>

              </div>

              <div className="bg-slate-800/25 p-3 rounded-lg border border-slate-700/10 text-[10px] text-slate-400 leading-relaxed text-left">
                💡 <span className="text-slate-200">Совет разработчика:</span> Собирая монеты в плейсе, они мгновенно и без задержки сохраняются в ваших Блок-Монетах. Вся продукция сохраняется навсегда во всех сессиях!
              </div>

            </div>

            <div className="h-12 bg-[#17181c] border-t border-slate-800 px-6 flex items-center justify-end">
              <button
                onClick={() => setIsShopOpen(false)}
                className="p-1.5 px-4 rounded bg-slate-700 hover:bg-slate-650 text-white font-bold text-xs cursor-pointer shadow active:scale-95 duration-100 transition"
              >
                Вернуться к Игре
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
