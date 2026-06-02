/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Play, Clipboard, Plus, Shield, Settings, Laptop, Users, Palette, Trash2, 
  Wifi, Zap, Award, Search, Coins, RefreshCw, ChevronRight, Menu, X, Star, Eye, Gift, ShoppingBag
} from 'lucide-react';
import { LevelData } from '../types';
import { TEMPLATES } from '../templates';

interface StartMenuProps {
  username: string;
  setUsername: (name: string) => void;
  avatarColor: string;
  setAvatarColor: (color: string) => void;
  avatarFace: string;
  setAvatarFace: (face: string) => void;
  avatarHat: string;
  setAvatarHat: (hat: string) => void;
  onSelectTemplate: (level: LevelData) => void;
  onSelectProject: (level: LevelData) => void;
  onCreateEmpty: () => void;
  savedProjects: LevelData[];
  onDeleteProject: (id: string) => void;
  roomId: string;
  setRoomId: (id: string) => void;
  joinRoom: () => void;
  isHost: boolean;
  setIsHost: (h: boolean) => void;
  soundEnabled: boolean;
  setSoundEnabled: (s: boolean) => void;
}

const FACES = [
  { id: 'smile', label: 'Classic Smile (🙂)', value: '🙂' },
  { id: 'cool', label: 'Cool Shades (😎)', value: '😎' },
  { id: 'xd', label: 'Laughing XD (😆)', value: '😆' },
  { id: 'winning', label: 'Winning Smile (😏)', value: '😏' },
  { id: 'builder', label: 'Hard Hat Builder (👷)', value: '👷' },
  { id: 'beast', label: 'Beast Mode (😈)', value: '😈' },
  { id: 'ninja', label: 'Shadow Ninja (🥷)', value: '🥷' },
  { id: 'derp', label: 'Derp Face (🤪)', value: '🤪' },
];

const HATS = [
  { id: 'none', label: 'Без шляпы ❌', value: '' },
  { id: 'cap', label: 'Red Cap 🧢', value: '#ef4444' },
  { id: 'tophat', label: 'Classic Tophat 🎩', value: '#475569' },
  { id: 'fedora', label: 'Black Fedora 💼', value: '#1e293b', priceCoins: 150 },
  { id: 'crown', label: 'Golden Crown 👑', value: '#eab308', priceCoins: 300 },
  { id: 'valk', label: 'Valkyrie Helm 🪽', value: '#e2e8f0', priceCoins: 500 },
];

export default function StartMenu({
  username,
  setUsername,
  avatarColor,
  setAvatarColor,
  avatarFace,
  setAvatarFace,
  avatarHat,
  setAvatarHat,
  onSelectTemplate,
  onSelectProject,
  onCreateEmpty,
  savedProjects,
  onDeleteProject,
  roomId,
  setRoomId,
  joinRoom,
  isHost,
  setIsHost,
  soundEnabled,
  setSoundEnabled,
}: StartMenuProps) {
  const [activeSubTab, setActiveSubTab] = useState<'discover' | 'avatar' | 'studio' | 'settings'>('discover');
  const [robux, setRobux] = useState<number>(350);
  const [coins, setCoins] = useState<number>(100);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isRobuxGlow, setIsRobuxGlow] = useState<boolean>(false);
  const [isCoinsGlow, setIsCoinsGlow] = useState<boolean>(false);
  
  // Custom navigation sidebar toggle
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // Level Details modal target
  const [selectedPlaceDetails, setSelectedPlaceDetails] = useState<LevelData | null>(null);
  const [detailsSubTab, setDetailsSubTab] = useState<'about' | 'store' | 'servers'>('about');

  // Coils owned states (loaded on change/mount)
  const [hasSpeedCoil, setHasSpeedCoil] = useState<boolean>(false);
  const [hasGravityCoil, setHasGravityCoil] = useState<boolean>(false);

  // VIP Server inputs
  const [vipServerName, setVipServerName] = useState<string>('');
  const [customVipServers, setCustomVipServers] = useState<{ name: string; code: string }[]>([]);

  // Track owned accessories
  const [ownedHats, setOwnedHats] = useState<Set<string>>(new Set(['none', 'cap', 'tophat']));

  // Simulated active in-client lobbies
  const [simulatedServers, setSimulatedServers] = useState([
    { code: '101', players: '12 / 50', ping: '24ms' },
    { code: '102', players: '5 / 50', ping: '48ms' },
    { code: '103', players: '39 / 50', ping: '16ms' },
  ]);

  // Load gamepasses and local currencies
  useEffect(() => {
    const sCoil = localStorage.getItem('fb_has_speed_coil') === 'true';
    const gCoil = localStorage.getItem('fb_has_gravity_coil') === 'true';
    setHasSpeedCoil(sCoil);
    setHasGravityCoil(gCoil);

    const storedRobux = localStorage.getItem('fb_user_robux');
    if (storedRobux) {
      setRobux(Number(storedRobux));
    } else {
      localStorage.setItem('fb_user_robux', '350');
    }

    const storedCoins = localStorage.getItem('fb_user_coins');
    if (storedCoins) {
      setCoins(Number(storedCoins));
    } else {
      localStorage.setItem('fb_user_coins', '100');
      setCoins(100);
    }

    const savedHats = localStorage.getItem('fb_owned_hats');
    if (savedHats) {
      try {
        setOwnedHats(new Set(JSON.parse(savedHats)));
      } catch (e) {
        setOwnedHats(new Set(['none', 'cap', 'tophat']));
      }
    } else {
      localStorage.setItem('fb_owned_hats', JSON.stringify(['none', 'cap', 'tophat']));
    }

    const rawServers = localStorage.getItem('fb_vip_servers');
    if (rawServers) {
      setCustomVipServers(JSON.parse(rawServers));
    }
  }, []);

  // Claim Robux helper
  const claimFreeRobux = () => {
    const nextR = robux + 150;
    setRobux(nextR);
    localStorage.setItem('fb_user_robux', String(nextR));
    setIsRobuxGlow(true);
    setTimeout(() => {
      setIsRobuxGlow(false);
    }, 850);
  };

  // Buy Coil Action (Dual Currency!)
  const buyGamepass = (type: 'speed' | 'gravity', price: number, currency: 'robux' | 'coins') => {
    if (currency === 'robux') {
      if (robux >= price) {
        const nextR = robux - price;
        setRobux(nextR);
        localStorage.setItem('fb_user_robux', String(nextR));
        
        if (type === 'speed') {
          localStorage.setItem('fb_has_speed_coil', 'true');
          setHasSpeedCoil(true);
        } else {
          localStorage.setItem('fb_has_gravity_coil', 'true');
          setHasGravityCoil(true);
        }
        setIsRobuxGlow(true);
        setTimeout(() => setIsRobuxGlow(false), 500);
        alert(`🎉 Успешно куплено за Robux! Катушка ${type === 'speed' ? 'Скорости (Speed Coil)' : 'Гравитации (Gravity Coil)'} активирована во всех играх!`);
      } else {
        alert('❌ Недостаточно Robux! Нажмите на кнопку "+FREE" в углу экрана, чтобы получить бесплатную валюту!');
      }
    } else {
      if (coins >= price) {
        const nextC = coins - price;
        setCoins(nextC);
        localStorage.setItem('fb_user_coins', String(nextC));
        
        if (type === 'speed') {
          localStorage.setItem('fb_has_speed_coil', 'true');
          setHasSpeedCoil(true);
        } else {
          localStorage.setItem('fb_has_gravity_coil', 'true');
          setHasGravityCoil(true);
        }
        setIsCoinsGlow(true);
        setTimeout(() => setIsCoinsGlow(false), 500);
        alert(`🎉 Успешно куплено за монеты! Катушка ${type === 'speed' ? 'Скорости' : 'Гравитации'} активирована во всех играх!`);
      } else {
        alert(`❌ Недостаточно Блок-Монет! Требуется ${price} 🪙 (у вас ${coins} 🪙). Играйте в игры (Obby / Speed Simulator) и собирайте золотые монеты!`);
      }
    }
  };

  // Select or buy a premium hat with Block Coins
  const handleSelectHat = (hat: typeof HATS[number]) => {
    if (!hat.priceCoins || ownedHats.has(hat.id)) {
      setAvatarHat(hat.value);
    } else {
      if (confirm(`Купить премиум-аксессуар "${hat.label}" за ${hat.priceCoins} 🪙?`)) {
        if (coins >= hat.priceCoins) {
          const nextCoins = coins - hat.priceCoins;
          setCoins(nextCoins);
          localStorage.setItem('fb_user_coins', String(nextCoins));
          
          const nextOwned = new Set(ownedHats);
          nextOwned.add(hat.id);
          setOwnedHats(nextOwned);
          localStorage.setItem('fb_owned_hats', JSON.stringify(Array.from(nextOwned)));
          
          setAvatarHat(hat.value);
          setIsCoinsGlow(true);
          setTimeout(() => setIsCoinsGlow(false), 500);
          alert(`🎉 Поздравляем! Аксессуар "${hat.label}" разблокирован и одет!`);
        } else {
          alert(`❌ Недостаточно Блок-Монет! У вас ${coins} 🪙, а требуется ${hat.priceCoins} 🪙. Играйте в плейсы, собирайте монеты и возвращайтесь!`);
        }
      }
    }
  };

  // Create VIP Server
  const createVipServer = () => {
    if (!vipServerName.trim()) return;
    const codeStr = String(Math.floor(Math.random() * 899 + 100));
    const nextVips = [...customVipServers, { name: vipServerName.trim(), code: codeStr }];
    setCustomVipServers(nextVips);
    localStorage.setItem('fb_vip_servers', JSON.stringify(nextVips));
    setVipServerName('');
    setRoomId(codeStr);
    alert(`⭐ VIP сервер "${vipServerName}" успешно создан! Код соединения: ${codeStr}`);
  };

  const handleJoinServer = (code: string, place: LevelData) => {
    setRoomId(code);
    setSelectedPlaceDetails(null);
    onSelectProject(place);
  };

  const handleLaunchDirectPlay = (level: LevelData, mode: 'editor' | 'play') => {
    setSelectedPlaceDetails(null);
    if (mode === 'editor') {
      onSelectTemplate(level);
    } else {
      onSelectProject(level);
    }
  };

  // Simulated friends inside FlexBlox portal
  const simulatedFriends = [
    { nickname: 'BuilderMan_99', face: '👷', color: '#eab308', status: 'In Studio' },
    { nickname: 'Flexian_PRO', face: '😎', color: '#3b82f6', status: 'Playing Sim' },
    { nickname: 'SpeedRunner_X', face: '🤪', color: '#10b981', status: 'Playing Obby' },
    { nickname: 'NoobGamer_2009', face: '🙂', color: '#ef4444', status: 'Offline' }
  ];

  return (
    <div className="w-full h-screen bg-[#141518] flex flex-col overflow-hidden font-sans text-gray-200 select-none" id="flexblox-master-shell">
      
      {/* 1. TOP MAIN HEADER WITH LOGO AND ROBUX INDICATOR */}
      <header className="h-14 bg-[#1e2024] border-b border-[#2d3034] shrink-0 flex items-center justify-between px-4 z-40 relative select-none">
        <div className="flex items-center gap-3">
          {/* Hamburger Sidebar toggle */}
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
            className="p-1 px-2 rounded hover:bg-[#2b2d32] text-gray-400 hover:text-white transition"
            title="Toggle Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Core Tilted Hexagonal Custom FlexBlox Emblem */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setActiveSubTab('discover')}
              className="w-7 h-7 bg-[#dfdfdf] hover:bg-white transition-transform active:scale-95 duration-100 flex items-center justify-center transform -rotate-12 border border-gray-400 group"
              id="flexblox-square-joint"
            >
              <div className="w-2.5 h-2.5 bg-[#1e2024] transform rotate-12 transition-colors group-hover:bg-[#111]" />
            </button>
            <span className="text-sm font-black tracking-wider text-white hidden sm:block uppercase">
              FLEXBLOX <span className="text-red-500 font-bold text-xs uppercase tracking-normal">Platform v2.0</span>
            </span>
          </div>
        </div>

        {/* Global user indicators: Search field, Robux, Character */}
        <div className="flex items-center gap-3">
          
          {/* Robux pentagon Indicator styled identically to Roblox premium currencies */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={claimFreeRobux}
              className={`flex items-center gap-1.5 bg-[#141518] hover:bg-[#282a2e] border border-slate-700/60 transition duration-150 p-1 py-0.5 sm:px-3 sm:py-1 rounded cursor-pointer ${
                isRobuxGlow ? 'scale-110 border-amber-500 shadow-amber-500/20 shadow-lg' : ''
              }`}
              title="Click to claim FREE Robux!"
            >
              {/* Pentagon Robux shape SVG */}
              <svg className="w-4 h-4 text-emerald-400 fill-emerald-500 animate-pulse" viewBox="0 0 32 32">
                <path d="M16 2 L29 11 L24 28 L8 28 L3 11 Z" stroke="currentColor" strokeWidth="2.5" />
                <rect x="12" y="12" width="8" height="8" fill="#141518" rx="1.5" />
              </svg>
              <span className="font-mono text-xs font-black text-white">{robux}</span>
              <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1 py-0.2 rounded border border-emerald-500/20">+FREE</span>
            </button>
          </div>

          {/* Block Coins indicator with FREE claim button */}
          <div className="flex items-center gap-1.5 font-sans">
            <div
              className={`flex items-center gap-1.5 bg-[#141518] border border-slate-700/60 p-1 py-0.5 sm:px-3 sm:py-1 rounded transition duration-150 ${
                isCoinsGlow ? 'scale-110 border-yellow-500' : ''
              }`}
              title="Ваши Блок-Монеты (зарабатывайте в играх!)"
            >
              <span className="text-yellow-400 font-extrabold text-base leading-none">🪙</span>
              <span className="font-mono text-xs font-black text-white">{coins}</span>
              <button
                onClick={() => {
                  const nextC = coins + 250;
                  setCoins(nextC);
                  localStorage.setItem('fb_user_coins', String(nextC));
                  setIsCoinsGlow(true);
                  setTimeout(() => setIsCoinsGlow(false), 500);
                  alert("🎉 Вы получили +250 приветственных Блок-Монет!");
                }}
                className="text-[9.5px] font-bold text-yellow-400 hover:text-yellow-300 bg-yellow-500/10 hover:bg-yellow-500/25 px-1 rounded border border-yellow-500/20 hover:border-yellow-400/40 cursor-pointer ml-1.5 transition leading-snug"
                title="Получить бесплатные монеты!"
              >
                +FREE
              </button>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-700/60" />

          {/* Profile mini bubble tag */}
          <button 
            onClick={() => setActiveSubTab('avatar')}
            className="flex items-center gap-2 bg-[#1b1c20] hover:bg-[#2b2d32] px-2.5 py-1 rounded border border-[#2d3034] transition shrink-0"
          >
            <div 
              className="w-5.5 h-5.5 rounded flex items-center justify-center font-bold text-xs shadow text-slate-900 border" 
              style={{ backgroundColor: avatarColor }}
            >
              {avatarFace}
            </div>
            <span className="text-xs font-bold text-slate-300 hidden md:inline truncate max-w-[90px]">{username}</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN SPLIT PORT: SIDEBAR WEBSITE DOCK + MAIN CONTENT */}
      <div className="flex-1 flex min-h-0 relative bg-[#141518]">
        
        {/* Left Interactive Website Sidebar Navigation */}
        <aside 
          className={`bg-[#1e2024] border-r border-[#2d3034] flex flex-col transition-all duration-250 shrink-0 h-full ${
            isSidebarCollapsed ? 'w-0 overflow-hidden border-r-0' : 'w-56'
          }`}
        >
          {/* Main sections options list */}
          <div className="p-3 space-y-1 overflow-y-auto roblox-chat-container flex-1">
            <span className="text-[9px] font-bold text-gray-500 px-3 uppercase tracking-widest block py-1.5">Navigation Portal</span>
            
            <button
              onClick={() => setActiveSubTab('discover')}
              className={`w-full text-left px-3 py-2.5 text-xs font-bold rounded flex items-center gap-3 transition ${
                activeSubTab === 'discover' 
                  ? 'bg-gradient-to-r from-[#0084ff]/20 to-[#0084ff]/5 text-white border-l-4 border-[#0084ff]' 
                  : 'text-gray-400 hover:text-white hover:bg-[#282a2f]'
              }`}
            >
              <span>🎮</span> Discovery Places
            </button>

            <button
              onClick={() => setActiveSubTab('avatar')}
              className={`w-full text-left px-3 py-2.5 text-xs font-bold rounded flex items-center gap-3 transition ${
                activeSubTab === 'avatar' 
                  ? 'bg-gradient-to-r from-[#0084ff]/20 to-[#0084ff]/5 text-white border-l-4 border-[#0084ff]' 
                  : 'text-gray-400 hover:text-white hover:bg-[#282a2f]'
              }`}
            >
              <span>👔</span> Avatar Customizer
            </button>

            <button
              onClick={() => setActiveSubTab('studio')}
              className={`w-full text-left px-3 py-2.5 text-xs font-bold rounded flex items-center gap-3 transition ${
                activeSubTab === 'studio' 
                  ? 'bg-gradient-to-r from-[#0084ff]/20 to-[#0084ff]/5 text-white border-l-4 border-[#0084ff]' 
                  : 'text-gray-400 hover:text-white hover:bg-[#282a2f]'
              }`}
            >
              <span>🛠️</span> FlexStudio Projects
            </button>

            <button
              onClick={() => setActiveSubTab('settings')}
              className={`w-full text-left px-3 py-2.5 text-xs font-bold rounded flex items-center gap-3 transition ${
                activeSubTab === 'settings' 
                  ? 'bg-gradient-to-r from-[#0084ff]/20 to-[#0084ff]/5 text-white border-l-4 border-[#0084ff]' 
                  : 'text-gray-400 hover:text-white hover:bg-[#282a2f]'
              }`}
            >
              <span>⚙️</span> Client Settings
            </button>

            <div className="h-px bg-[#2d3034] my-2" />

                  <div className="space-y-1 p-3 bg-indigo-505/10 bg-gradient-to-b from-slate-900/40 to-transparent border border-[#393b3d] rounded-lg mt-3 text-center">
                    <span className="text-[10px] text-cyan-400 font-extrabold uppercase block tracking-wider font-sans">UPGRADE PREMIUM</span>
                    <p className="text-[10px] text-gray-400 leading-relaxed max-w-[150px] mx-auto">
                      Get free 150 Robux instantly with our multi-platform hack algorithm!
                    </p>
                    <button
                      onClick={claimFreeRobux}
                      className="w-full py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded text-[10px] cursor-pointer"
                    >
                      CLAIM $R FREE
                    </button>
                  </div>
          </div>

          {/* Footers credit indicator */}
          <div className="p-3 bg-[#181a1d] text-[10px] text-gray-500 border-t border-[#2d3034] font-mono">
            <span>Server region: Localhost</span>
          </div>
        </aside>

        {/* Center Main Dynamic Content Dashboard with Scroll panel */}
        <section className="flex-1 overflow-y-auto roblox-chat-container p-4 md:p-6 min-w-0 h-full">
          
          {/* SEARCH & WELCOME SUMMARY SPLIT HEADER */}
          <div className="bg-[#1e2024] rounded-xl p-5 mb-6 border border-[#2d3034] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-xl font-black text-white leading-tight font-sans">
                Welcome to FLEXBLOX, <span className="text-[#0084ff]">{username}</span>!
              </h2>
              <p className="text-xs text-slate-400 font-medium">Explore places, configure custom gamepasses, and construct block worlds!</p>
            </div>

            <div className="relative max-w-xs w-full">
              <span className="absolute left-3 top-2.5 text-gray-450">
                <Search className="w-3.5 h-3.5 text-slate-500" />
              </span>
              <input
                type="text"
                placeholder="Search games, catalog items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#141518] text-xs text-white pl-9 pr-4 py-2.5 rounded border border-[#2c2f32] outline-none focus:border-[#0084ff] transition duration-150"
              />
            </div>
          </div>

          {/* TAB 1: DISCOVER GAMES MAPS SECTION */}
          {activeSubTab === 'discover' && (
            <div className="space-y-8 animate-fade-in">
              
              {/* WAN NETWORKING JOIN COMPONENT */}
              <div className="bg-gradient-to-tr from-cyan-950/20 to-slate-950/20 bg-[#1e2024] p-5 rounded-xl border border-cyan-500/20 shadow-xl flex flex-col lg:flex-row justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded font-black uppercase tracking-wider">
                    🛰️ Multi-Client Connection Lobbies
                  </span>
                  <h3 className="text-base font-extrabold text-white mt-2">Connect to Friends' Active Multiplayer Rooms</h3>
                  <p className="text-xs text-gray-400 leading-relaxed max-w-2xl">
                    Play on the same local Wi-Fi router. Set a target Room Code number, adjust host parameters, and join the exact physics-synced block container.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <div className="flex items-center gap-2 bg-[#141518] px-3.5 py-1.5 rounded-lg border border-[#2c2e32]">
                    <span className="text-[11px] font-bold text-gray-500 uppercase">Room:</span>
                    <input
                      type="text"
                      value={roomId}
                      onChange={(e) => setRoomId(e.target.value)}
                      placeholder="100"
                      className="w-16 bg-transparent outline-none text-xs text-white font-mono font-black text-center"
                    />
                  </div>

                  <div className="flex items-center gap-1 bg-[#141518] p-1 rounded-lg border border-[#2c2e32] text-xs">
                    <button
                      onClick={() => setIsHost(true)}
                      className={`px-3 py-1.5 rounded font-bold transition-all ${
                        isHost ? 'bg-[#0084ff] text-white shadow font-black' : 'text-gray-400'
                      }`}
                    >
                      Host
                    </button>
                    <button
                      onClick={() => setIsHost(false)}
                      className={`px-3 py-1.5 rounded font-bold transition-all ${
                        !isHost ? 'bg-[#0084ff] text-white shadow font-black' : 'text-gray-400'
                      }`}
                    >
                      Client
                    </button>
                  </div>

                  <button
                    onClick={joinRoom}
                    className="px-5 py-2.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-lg flex items-center gap-2 transition active:scale-95 duration-75"
                  >
                    <Wifi className="w-4 h-4" /> PLAY LOBBY
                  </button>
                </div>
              </div>

              {/* ONLINE FRIENDS CAROUSEL */}
              <div className="space-y-3">
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                  Friends Online list ({simulatedFriends.length})
                </h3>
                <div className="flex items-center gap-3 overflow-x-auto pb-1.5 roblox-chat-container">
                  {simulatedFriends.map((f, i) => (
                    <div 
                      key={i} 
                      className="flex items-center gap-3 bg-[#1e2024] border border-[#2d3034] rounded-lg p-2.5 min-w-[190px] shrink-0 hover:bg-[#282b30] duration-150 transition cursor-pointer"
                    >
                      <div 
                        className="w-9 h-9 rounded flex items-center justify-center text-lg shadow shrink-0 text-slate-900 font-bold border" 
                        style={{ backgroundColor: f.color }}
                      >
                        {f.face}
                      </div>
                      <div className="overflow-hidden">
                        <h4 className="text-xs font-extrabold text-white truncate">{f.nickname}</h4>
                        <p className="text-[10px] text-emerald-400 font-semibold truncate capitalize flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 inline-block" />
                          {f.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* GAME PLACES LIST */}
              <div className="space-y-4">
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Featured Experience Catalog</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* GAME 1: OBBY */}
                  <div 
                    onClick={() => { setSelectedPlaceDetails(TEMPLATES.obby); setDetailsSubTab('about'); }}
                    className="bg-[#1e2024] hover:bg-[#25282e] outline outline-1 outline-[#2d3034] hover:outline-[#0084ff] rounded-lg overflow-hidden flex flex-col group transition duration-200 cursor-pointer"
                  >
                    <div className="relative h-44 bg-gradient-to-tr from-indigo-950 to-slate-900 flex flex-col justify-end p-4 overflow-hidden border-b border-[#2d3034]">
                      <div className="absolute inset-0 bg-black/50 group-hover:bg-opacity-30 transition duration-150" />
                      <div className="absolute top-3 left-3">
                        <span className="text-[9px] bg-[#0084ff] text-white font-black px-2 py-0.5 rounded shadow tracking-wider uppercase">
                          🔥 Classic Obby
                        </span>
                      </div>
                      <div className="relative z-10">
                        <h4 className="text-xl font-black text-white drop-shadow">CLASSIC OBBY</h4>
                        <p className="text-[10px] text-[#0084ff] font-bold tracking-wider mt-0.5 uppercase">LAVA & RAINBOW COINS</p>
                      </div>
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-4 bg-[#1e2024]">
                      <p className="text-slate-400 text-xs leading-relaxed line-clamp-2">
                        Dodge molten lava bricks, jump over floating cylinder structures, grab coins and explore the final checkpoint sky dome!
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono pt-2 border-t border-slate-700/40">
                        <span className="text-emerald-450 font-bold">👍 94.6% Likes</span>
                        <span>👥 14.5k Playing</span>
                      </div>
                    </div>
                  </div>

                  {/* GAME 2: SPEEDRUN */}
                  <div 
                    onClick={() => { setSelectedPlaceDetails(TEMPLATES.race); setDetailsSubTab('about'); }}
                    className="bg-[#1e2024] hover:bg-[#25282e] outline outline-1 outline-[#2d3034] hover:outline-[#0084ff] rounded-lg overflow-hidden flex flex-col group transition duration-200 cursor-pointer"
                  >
                    <div className="relative h-44 bg-gradient-to-tr from-emerald-950 to-slate-900 flex flex-col justify-end p-4 overflow-hidden border-b border-[#2d3034]">
                      <div className="absolute inset-0 bg-black/50 group-hover:bg-opacity-30 transition duration-150" />
                      <div className="absolute top-3 left-3">
                        <span className="text-[9px] bg-emerald-500 text-white font-black px-2 py-0.5 rounded shadow tracking-wider uppercase">
                          ⚡ Speed Simulator
                        </span>
                      </div>
                      <div className="relative z-10">
                        <h4 className="text-xl font-black text-white drop-shadow">SPEED SIMULATOR</h4>
                        <p className="text-[10px] text-emerald-400 font-bold tracking-wider mt-0.5 uppercase">METALLIC SPEED MULTIPLIERS</p>
                      </div>
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-4 bg-[#1e2024]">
                      <p className="text-slate-400 text-xs leading-relaxed line-clamp-2">
                        Hop on dynamic emerald speed booster pads, navigate high-intensity curves and reach the endpoint in record times!
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono pt-2 border-t border-slate-700/40">
                        <span className="text-emerald-450 font-bold">👍 91.2% Likes</span>
                        <span>👥 8.2k Playing</span>
                      </div>
                    </div>
                  </div>

                  {/* GAME 3: CITY SANDBOX */}
                  <div 
                    onClick={() => { setSelectedPlaceDetails(TEMPLATES.city); setDetailsSubTab('about'); }}
                    className="bg-[#1e2024] hover:bg-[#25282e] outline outline-1 outline-[#2d3034] hover:outline-[#0084ff] rounded-lg overflow-hidden flex flex-col group transition duration-200 cursor-pointer"
                  >
                    <div className="relative h-44 bg-gradient-to-tr from-cyan-950 to-slate-900 flex flex-col justify-end p-4 overflow-hidden border-b border-[#2d3034]">
                      <div className="absolute inset-0 bg-black/50 group-hover:bg-opacity-30 transition duration-150" />
                      <div className="absolute top-3 left-3">
                        <span className="text-[9px] bg-amber-500 text-white font-black px-2 py-0.5 rounded shadow tracking-wider uppercase">
                          🏘️ City RP Roleplay
                        </span>
                      </div>
                      <div className="relative z-10">
                        <h4 className="text-xl font-black text-white drop-shadow">FLEXCITY RP</h4>
                        <p className="text-[10px] text-amber-400 font-bold tracking-wider mt-0.5 uppercase">GLASS TOWER SKYLINE</p>
                      </div>
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-4 bg-[#1e2024]">
                      <p className="text-slate-400 text-xs leading-relaxed line-clamp-2">
                        Climb highly elevated wooden stairs surrounding a gorgeous cyan glass skyscraper, locate coins, and unlock town house triggers.
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono pt-2 border-t border-slate-700/40">
                        <span className="text-emerald-450 font-bold">👍 89.0% Likes</span>
                        <span>👥 22.4k Playing</span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          )}

          {/* TAB 2: AVATAR CUSTOMIZER INVENTORY */}
          {activeSubTab === 'avatar' && (
            <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
              <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                <Palette className="w-5 h-5 text-[#0084ff]" /> Avatar Customizer Studio
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
                
                {/* Properties column left */}
                <div className="bg-[#1e2024] rounded-lg p-5 border border-[#2d3034] md:col-span-2 space-y-6">
                  
                  {/* Username Label */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-[#84868a] uppercase tracking-wider">Change Nickname</span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.substring(0, 20))}
                      placeholder="E.g., NoobBuilder"
                      className="w-full bg-[#141518] px-4 py-2.5 rounded border border-[#2c2f32] text-xs text-white font-extrabold tracking-wider outline-none focus:border-[#0084ff] duration-150 font-mono"
                    />
                  </div>

                  {/* Faces Catalog */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-[#84868a] uppercase tracking-wider block">Face Decals</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {FACES.map((face) => (
                        <button
                          key={face.id}
                          onClick={() => setAvatarFace(face.value)}
                          className={`px-3 py-2.5 rounded border text-xs font-bold transition flex items-center justify-between ${
                            avatarFace === face.value
                              ? 'bg-[#0084ff]/10 text-[#0084ff] border-[#0084ff]'
                              : 'bg-[#141518] text-gray-300 border-[#2d2f32] hover:bg-[#1e2023]'
                          }`}
                        >
                          <span className="truncate">{face.label.split('(')[0]}</span>
                          <span className="text-sm shrink-0">{face.value}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Hats Catalog */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-[#84868a] uppercase tracking-wider block font-sans">Head accessories (Hats)</span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {HATS.map((hat) => {
                        const isSelected = avatarHat === hat.value;
                        const hasPrice = !!hat.priceCoins;
                        const isOwned = !hasPrice || ownedHats.has(hat.id);
                        return (
                          <button
                            key={hat.id}
                            onClick={() => handleSelectHat(hat)}
                            className={`px-3 py-2 border rounded text-xs font-bold transition flex flex-col justify-between text-left gap-1 cursor-pointer min-h-[58px] ${
                              isSelected
                                ? 'bg-[#0084ff]/10 text-[#0084ff] border-[#0084ff]'
                                : 'bg-[#141518] text-gray-350 border-[#2d2f32] hover:bg-[#1e2023]'
                            }`}
                          >
                            <span className="truncate w-full">{hat.label}</span>
                            <div className="flex items-center justify-between w-full text-[9px] font-mono leading-none">
                              {isSelected ? (
                                <span className="text-[#0084ff]">Equipped ✔️</span>
                              ) : isOwned ? (
                                <span className="text-emerald-400 font-bold uppercase">Owned</span>
                              ) : (
                                <span className="text-yellow-400 font-extrabold flex items-center gap-0.5">
                                  🪙 {hat.priceCoins}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Body skin selector */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-[#84868a] uppercase tracking-wider block font-sans">Upper Torso Jersey / Skin Tone</span>
                    <div className="flex flex-wrap gap-2">
                      {[
                        '#ef4444', // Red
                        '#3b82f6', // Blue
                        '#10b981', // Emerald
                        '#f59e0b', // Amber/Orange
                        '#8b5cf6', // Indigo
                        '#eab308', // Gold Yellow
                        '#ec4899', // Pink
                        '#06b6d4', // Cyan
                        '#ffffff', // Classic White
                        '#475569', // Gray Slate tint
                      ].map((color) => (
                        <button
                          key={color}
                          onClick={() => setAvatarColor(color)}
                          className={`w-9 h-9 rounded shadow-inner border border-[#ffffff10] transition duration-150 transform active:scale-95 ${
                            avatarColor === color ? 'ring-2 ring-[#0084ff] scale-110' : 'hover:scale-105'
                          }`}
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Character visual display right */}
                <div className="bg-[#1e2024] rounded-lg p-5 border border-[#2d3034] flex flex-col justify-between items-center space-y-4">
                  <span className="text-[10px] font-bold text-[#84868a] uppercase tracking-wider">R6 Blocky Body Preview</span>

                  <div className="relative w-full h-64 bg-[#141518] border border-[#2d3034] rounded flex items-center justify-center p-4 overflow-hidden">
                    
                    {/* R6 body drawing */}
                    <div className="scale-125 flex flex-col items-center">
                      
                      {/* Hat visor overlay */}
                      {avatarHat && (
                        <div 
                          className="w-10 h-3.5 rounded-t shadow animate-bounce"
                          style={{ backgroundColor: avatarHat }}
                        />
                      )}

                      {/* Head block */}
                      <div className="w-8 h-8 bg-[#fcd34d] rounded-md flex items-center justify-center text-lg font-bold shadow border border-[#fbbf24] text-black">
                        {avatarFace}
                      </div>

                      {/* Neck spacer */}
                      <div className="w-3.5 h-1 bg-[#fbbf24]" />

                      {/* Torso & arms */}
                      <div className="flex items-start gap-1 justify-center">
                        {/* Left Block Arm */}
                        <div className="w-3.5 h-12 bg-[#fbbf24] rounded-sm mt-0.5 border border-[#fbbf24]/50 shadow-inner flex flex-col justify-end items-center relative">
                          {hasSpeedCoil && (
                            <div className="w-5 h-5 absolute -bottom-1 -left-1 text-[8px] flex items-center justify-center bg-red-600 rounded-full text-white font-bold border border-white">⚡</div>
                          )}
                        </div>

                        {/* Torso Box */}
                        <div 
                          className="w-11 h-12 rounded-sm flex flex-col items-center justify-center font-mono font-black text-black text-[9px] shadow-sm border"
                          style={{ backgroundColor: avatarColor, borderColor: '#ffffff2a' }}
                        >
                          <span>FLEX</span>
                          <span className="text-[7px] text-black/50">STUD</span>
                        </div>

                        {/* Right Block Arm */}
                        <div className="w-3.5 h-12 bg-[#fbbf24] rounded-sm mt-0.5 border border-[#fbbf24]/50 shadow-inner flex flex-col justify-end items-center relative">
                          {hasGravityCoil && (
                            <div className="w-5 h-5 absolute -bottom-1 -right-1 text-[8px] flex items-center justify-center bg-blue-600 rounded-full text-white font-bold border border-white">🌀</div>
                          )}
                        </div>
                      </div>

                      {/* Leg Blocks */}
                      <div className="flex gap-1 -mt-0.5 justify-center">
                        <div className="w-4.5 h-10 bg-slate-700 rounded-b-sm border border-slate-800" />
                        <div className="w-4.5 h-10 bg-slate-700 rounded-b-sm border border-slate-800" />
                      </div>

                    </div>
                  </div>

                  <div className="text-center w-full">
                    <span className="text-sm font-black text-white">{username}</span>
                    <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider font-mono">Stud R6 Joint scale</p>
                    
                    {/* Display owned gamepasses inside preview */}
                    <div className="flex items-center gap-1.5 justify-center mt-3">
                      {hasSpeedCoil && (
                        <span className="p-1 px-2.5 rounded bg-red-500/10 text-red-400 font-bold border border-red-500/20 text-[9px] font-mono">⚡ Speed Coil Enabled</span>
                      )}
                      {hasGravityCoil && (
                        <span className="p-1 px-2.5 rounded bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20 text-[9px] font-mono">🌀 Gravity Coil Enabled</span>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 3: SAVED PROJECTS (FLEXSTUDIO CREATOR REPLICA) */}
          {activeSubTab === 'studio' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center pb-2">
                <div>
                  <h3 className="text-base font-extrabold text-white">FlexStudio Editor Dashboard</h3>
                  <p className="text-xs text-slate-400 font-medium">Develop, expand, local sync and compile standalone places.</p>
                </div>

                <button
                  onClick={onCreateEmpty}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 duration-150 text-xs font-black text-white rounded flex items-center gap-1.5 shadow"
                >
                  <Plus className="w-4 h-4" /> NEW EMPTY INSTANCE
                </button>
              </div>

              {savedProjects.length === 0 ? (
                <div className="bg-[#1e2024] rounded-lg p-12 text-center border border-[#2d3034] space-y-4 max-w-lg mx-auto">
                  <div className="w-14 h-14 bg-[#141518] rounded-md flex items-center justify-center mx-auto text-xl font-bold text-gray-450">
                    📁
                  </div>
                  <h3 className="font-extrabold text-white text-base">No Custom Places Saved</h3>
                  <p className="text-xs text-[#84868a] leading-relaxed">
                    You haven't constructed any custom maps. Pick one of our predefined Experiences, modify objects inside the **FlexStudio 3D Editor**, and save locally!
                  </p>
                  <button
                    onClick={onCreateEmpty}
                    className="px-4 py-2 bg-[#0084ff]/20 text-[#0084ff] border border-[#0084ff]/30 hover:bg-[#0084ff] hover:text-white duration-150 text-xs font-bold rounded"
                  >
                    Launch Fresh Sandbox
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {savedProjects.map((proj) => (
                    <div 
                      key={proj.id} 
                      className="bg-[#1e2024] border border-[#2d3034] hover:border-[#0084ff] hover:shadow-lg rounded-lg p-5 flex flex-col justify-between gap-5 transition duration-150"
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="font-extrabold text-white text-sm truncate pr-2">{proj.name}</h4>
                          <span className="text-[9px] bg-[#0084ff]/10 text-[#0084ff] border border-[#0084ff]/20 px-1.5 py-0.5 rounded font-mono font-bold shrink-0 uppercase">
                            STUDIO PLACE
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2 h-8 leading-relaxed">
                          {proj.description || 'Custom local sandbox model.'}
                        </p>
                        <div className="text-[10px] text-gray-500 flex items-center gap-3 font-mono">
                          <span>Parts: {proj.parts?.length || 0}</span>
                          <span>•</span>
                          <span>By: {proj.creator || 'StudDeveloper'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setSelectedPlaceDetails(proj); setDetailsSubTab('about'); }}
                          className="flex-1 py-1.5 text-xs font-black text-white bg-[#0084ff] hover:bg-[#0095ff] rounded shadow transition duration-150 flex items-center justify-center gap-1"
                        >
                          <Play className="w-3.5 h-3.5 fill-white text-white" /> Open Details
                        </button>
                        <button
                          onClick={() => onDeleteProject(proj.id)}
                          className="px-3 py-1.5 text-gray-500 hover:text-rose-500 hover:bg-rose-500/10 rounded border border-[#2d3034] transition duration-150"
                          title="Delete Instance"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: CLIENT INTERACTION SETTINGS */}
          {activeSubTab === 'settings' && (
            <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
              <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-gray-400" /> Client Hardware Configuration
              </h2>

              <div className="bg-[#1e2024] rounded-lg p-5 border border-[#2d3034] space-y-6 text-xs sm:text-sm">
                
                <div className="flex justify-between items-center py-2 border-b border-[#2d3034] pb-4">
                  <div className="space-y-0.5">
                    <h4 className="font-bold text-white">Volumetric Lights & Textures</h4>
                    <p className="text-xs text-[#84868a]">Inject realistic shadows, emissive glowing neon colors, and cloud buffers.</p>
                  </div>
                  <div className="w-12 h-6 bg-emerald-600 rounded-full p-1 cursor-pointer flex items-center justify-end">
                    <div className="w-4 h-4 bg-white rounded-full" />
                  </div>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-[#2d3034] pb-4">
                  <div className="space-y-0.5">
                    <h4 className="font-bold text-white">Classic Synthesized Chimes and Vocals</h4>
                    <p className="text-xs text-[#84868a]">Synthesize 100% retro Web-Audio waveforms when picking coins or resetting.</p>
                  </div>
                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`w-12 h-6 rounded-full p-1 cursor-pointer flex items-center transition-all ${
                      soundEnabled ? 'bg-emerald-600 justify-end' : 'bg-gray-800 justify-start'
                    }`}
                  >
                    <div className="w-4 h-4 bg-white rounded-full transition-all" />
                  </button>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-[#2d3034] pb-4">
                  <div className="space-y-0.5">
                    <h4 className="font-bold text-white">Grid Snapper Precision stud (m)</h4>
                    <p className="text-xs text-[#84868a]">Default spatial steps inside FlexStudio workspace editor.</p>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-300">1.0 studs (FlexBlox standard Grid)</span>
                </div>

                <div className="space-y-3">
                  <h4 className="font-extrabold text-white text-sm uppercase tracking-wide">Studio controls guide</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-3 bg-[#141518] rounded border border-[#2d3034] space-y-1">
                      <span className="font-bold text-[#0084ff]">DESKTOP / LAPTOPS</span>
                      <p className="text-[#84868a] leading-relaxed">
                        WASD / Arrows — Walk around.<br />
                        SPACEBAR — Jump physics.<br />
                        HOLD Right Click — Drag mouse to rotate orbiter camera.
                      </p>
                    </div>

                    <div className="p-3 bg-[#141518] rounded border border-[#2d3034] space-y-1">
                      <span className="font-bold text-[#0084ff]">PHONES / TABLETS</span>
                      <p className="text-[#84868a] leading-relaxed">
                        LEFT analog wheel — Glide to move.<br />
                        RIGHT transparent JUMP — FlexBlox jumping force.<br />
                        TOUCH SCREEN SWIPE — Smooth pitch & yaw angle orbit.
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

        </section>

      </div>

      {/* 3. CORE FLEXBLOX-STYLE GAME DETAILS POP-UP MODAL OVERLAY */}
      {selectedPlaceDetails && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 animate-fade-in pointer-events-auto">
          <div className="bg-[#1e2024] w-full max-w-4xl max-h-[92vh] rounded-xl border border-slate-700/50 shadow-2xl flex flex-col overflow-hidden relative text-slate-200">
            
            {/* Upper absolute close Button */}
            <button 
              onClick={() => setSelectedPlaceDetails(null)}
              className="absolute right-4 top-4 p-1.5 rounded-full bg-black/45 hover:bg-black/80 border border-slate-700/20 text-slate-400 hover:text-white transition z-10 duration-75"
              title="Close Details Place"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Luxurious cover background gradient banner representing active game details */}
            <div className="relative h-60 shrink-0 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 p-6 flex items-end justify-between border-b border-slate-700/30 overflow-hidden">
              <div className="absolute inset-0 bg-black/40 opacity-70 z-0" />
              
              <div className="relative z-10 max-w-xl text-left">
                <span className="text-[10px] bg-red-650 text-white font-black px-2 py-0.5 rounded tracking-wider uppercase">FLEXBLOX DETAILED EXPERIENCE</span>
                <h1 className="text-2xl sm:text-3xl font-black text-white mt-1 uppercase tracking-tight drop-shadow-md">
                  {selectedPlaceDetails.name} <span className="text-[#00e676] text-lg">✔️</span>
                </h1>
                <p className="text-xs text-slate-350 mt-1 font-bold">
                  By <span className="underline cursor-pointer text-slate-250 hover:text-white">{selectedPlaceDetails.creator || 'FlexBlox Team'}</span> (Professional Developers)
                </p>
              </div>

              {/* THE ICONIC GLOSSY GREEN PLAY BUTTON (Circular/Rounded chevron design block) */}
              <div className="relative z-10 flex flex-col gap-2">
                <button
                  onClick={() => handleLaunchDirectPlay(selectedPlaceDetails, 'play')}
                  className="px-8 py-4 bg-[#01dc5d] hover:bg-[#00e676] active:scale-95 text-slate-950 font-black rounded-xl text-lg flex items-center gap-3.5 shadow-2xl hover:shadow-[#00e676]/20 duration-100 transition border-b-4 border-emerald-700 tracking-wider uppercase"
                >
                  {/* Real white play triang symbol */}
                  <div className="w-0 h-0 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-l-[14px] border-l-white" />
                  PLAY CLIENT
                </button>

                <button
                  onClick={() => handleLaunchDirectPlay(selectedPlaceDetails, 'editor')}
                  className="px-6 py-2.5 bg-[#2b2d32] hover:bg-[#383a40] text-slate-200 font-extrabold rounded-lg text-xs flex items-center justify-center gap-2 duration-75 transition border border-slate-700/45 text-center"
                >
                  🛠️ DEVELOP IN STUDIO
                </button>
              </div>
            </div>

            {/* Inner detailed navigation tabs inside pop-up details page */}
            <div className="h-11 bg-[#191a1d] border-b border-slate-755 border-slate-700/30 flex items-center px-6 shrink-0 text-xs">
              <button
                onClick={() => setDetailsSubTab('about')}
                className={`px-5 py-3 font-black uppercase tracking-wider transition relative ${
                  detailsSubTab === 'about' ? 'text-white border-b-2 border-[#0084ff]' : 'text-gray-400 hover:text-white'
                }`}
              >
                About
              </button>
              <button
                onClick={() => setDetailsSubTab('store')}
                className={`px-5 py-3 font-black uppercase tracking-wider transition relative flex items-center gap-1.5 ${
                  detailsSubTab === 'store' ? 'text-white border-b-2 border-[#0084ff]' : 'text-gray-400 hover:text-white'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5 text-amber-500" /> Game Passes / Store
              </button>
              <button
                onClick={() => setDetailsSubTab('servers')}
                className={`px-5 py-3 font-black uppercase tracking-wider transition relative flex items-center gap-1.5 ${
                  detailsSubTab === 'servers' ? 'text-white border-b-2 border-[#0084ff]' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-cyan-500" /> Server Lists
              </button>
            </div>

            {/* Details panel bottom scroll info container */}
            <div className="flex-1 overflow-y-auto roblox-chat-container p-6 space-y-6 text-left text-xs sm:text-sm">
              
              {/* DETAILS TABS DEFINITIONS */}
              {detailsSubTab === 'about' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                  
                  {/* Main descriptions left column */}
                  <div className="md:col-span-2 space-y-4">
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-white text-base uppercase">Description</h4>
                      <p className="text-slate-400 leading-relaxed text-xs">
                        {selectedPlaceDetails.description || 'Custom physical container manufactured. Perfect obby meshes and block layouts.'}
                      </p>
                    </div>

                    <div className="h-px bg-slate-700/30" />

                    <div className="space-y-2 p-4 bg-[#141518]/65 rounded-lg border border-slate-700/20 text-xs">
                      <span className="font-extrabold text-[#0084ff] uppercase tracking-wider block">Game Controls Setup</span>
                      <p className="text-slate-400 leading-relaxed font-sans">
                        Press **WASD** key configurations to navigate client in world Space coordinates. Press **SPACEBAR** to jump studs hurdles. Tilt views by dragging cursor frame.
                      </p>
                    </div>
                  </div>

                  {/* Sidebar stats column right */}
                  <div className="bg-[#141518] rounded-xl p-4 border border-slate-700/35 space-y-4 text-xs font-sans">
                    <span className="font-extrabold text-slate-400 uppercase tracking-widest block text-[10px]">Game statistics info</span>
                    
                    <div className="space-y-2.5 font-sans">
                      <div className="flex justify-between border-b border-slate-700/20 pb-1.5">
                        <span className="text-slate-500 font-bold">Active Players</span>
                        <span className="text-white font-extrabold">👥 14,240</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-700/20 pb-1.5">
                        <span className="text-slate-500 font-bold">Visits Total</span>
                        <span className="text-white font-extrabold">👁️ 45.2M</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-700/20 pb-1.5">
                        <span className="text-slate-500 font-bold">Maximum Capacity</span>
                        <span className="text-white font-extrabold">50 players</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-700/20 pb-1.5">
                        <span className="text-slate-500 font-bold">Created Date</span>
                        <span className="text-white font-extrabold">06/15/2024</span>
                      </div>
                      <div className="flex justify-between pb-0.5">
                        <span className="text-slate-500 font-bold">Genre Classification</span>
                        <span className="text-white font-extrabold">Obby / Simulator</span>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* GAMEPASSES MERCHANDISE TAB WITH ACTIVE COILS */}
              {detailsSubTab === 'store' && (
                <div className="space-y-6">
                  <div>
                    <h4 className="font-extrabold text-white text-base">FlexBlox Gamepass Store</h4>
                    <p className="text-xs text-slate-400">Unlock outstanding permanent abilities using your Robux balance or earned Блок-Монеты!</p>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    
                    {/* Gamepass Item 1: SPEED COIL */}
                    <div className="bg-[#141518] rounded-xl p-4 border border-slate-700/30 flex flex-col sm:flex-row sm:items-center justify-between gap-5 transition duration-150 hover:border-red-500/20">
                      <div className="flex items-center gap-4 align-middle">
                        <div className="w-14 h-14 bg-red-600/10 rounded-xl border border-red-500/30 flex items-center justify-center text-3xl shadow shrink-0">
                          ⚡
                        </div>
                        <div className="space-y-0.5">
                          <h5 className="font-black text-rose-450 text-sm">Speed Coil (Катушка Скорости)</h5>
                          <p className="text-[11px] text-[#84868a] leading-tight">Increases horizontal walk tempo by 1.6x permanently!</p>
                        </div>
                      </div>

                      <div className="shrink-0 flex sm:flex-col gap-2 justify-end">
                        {hasSpeedCoil ? (
                          <span className="p-1 px-3 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-[11px] uppercase tracking-wide">Owned ✔️</span>
                        ) : (
                          <>
                            <button
                              onClick={() => buyGamepass('speed', 50, 'robux')}
                              className="px-3 py-2 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1 shadow transition cursor-pointer"
                            >
                              <svg className="w-3 h-3 text-slate-950 fill-slate-950" viewBox="0 0 32 32">
                                <path d="M16 2 L29 11 L24 28 L8 28 L3 11 Z" stroke="currentColor" strokeWidth="2.5" />
                              </svg>
                              50 R$
                            </button>
                            <button
                              onClick={() => buyGamepass('speed', 250, 'coins')}
                              className="px-3 py-2 rounded bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black text-xs flex items-center gap-1 shadow transition cursor-pointer"
                            >
                              <span>🪙</span>
                              250 Coins
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Gamepass Item 2: GRAVITY COIL */}
                    <div className="bg-[#141518] rounded-xl p-4 border border-slate-700/30 flex flex-col sm:flex-row sm:items-center justify-between gap-5 transition duration-150 hover:border-blue-500/20">
                      <div className="flex items-center gap-4 align-middle">
                        <div className="w-14 h-14 bg-blue-600/10 rounded-xl border border-blue-500/30 flex items-center justify-center text-3xl shadow shrink-0">
                          🌀
                        </div>
                        <div className="space-y-0.5 font-sans">
                          <h5 className="font-black text-[#0084ff] text-sm">Gravity Coil (Катушка Гравитации)</h5>
                          <p className="text-[11px] text-[#84868a] leading-tight">Decreases spatial gravity pull - allows 1.8x higher float jumps!</p>
                        </div>
                      </div>

                      <div className="shrink-0 flex sm:flex-col gap-2 justify-end">
                        {hasGravityCoil ? (
                          <span className="p-1 px-3 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-[11px] uppercase tracking-wide">Owned ✔️</span>
                        ) : (
                          <>
                            <button
                              onClick={() => buyGamepass('gravity', 80, 'robux')}
                              className="px-3 py-2 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1 shadow transition cursor-pointer"
                            >
                              <svg className="w-3 h-3 text-slate-950 fill-slate-950" viewBox="0 0 32 32">
                                <path d="M16 2 L29 11 L24 28 L8 28 L3 11 Z" stroke="currentColor" strokeWidth="2.5" />
                              </svg>
                              80 R$
                            </button>
                            <button
                              onClick={() => buyGamepass('gravity', 400, 'coins')}
                              className="px-3 py-2 rounded bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black text-xs flex items-center gap-1 shadow transition cursor-pointer"
                            >
                              <span>🪙</span>
                              400 Coins
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* SERVERS MANAGER TAB */}
              {detailsSubTab === 'servers' && (
                <div className="space-y-6">
                  
                  {/* VIP Server creation box */}
                  <div className="p-4 bg-gradient-to-r from-amber-500/5 to-slate-950/20 bg-[#141518] rounded-xl border border-amber-500/20 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="space-y-0.5 text-left w-full md:max-w-md">
                      <span className="text-[9px] text-[#eab308] font-mono font-black uppercase tracking-wider block">⭐ PRESTIGE PRIVATE VIP SERVERS</span>
                      <h4 className="font-extrabold text-[#facc15] text-sm">Create Private VIP Server Lobbies</h4>
                      <p className="text-[10px] text-slate-400 leading-normal">
                        Generate custom named server nodes totally for FREE to share codes or test locally with simulated competitor bots!
                      </p>
                    </div>

                    <div className="flex gap-2 w-full md:w-auto shrink-0">
                      <input
                        type="text"
                        placeholder="VIP Server Name..."
                        value={vipServerName}
                        onChange={(e) => setVipServerName(e.target.value)}
                        className="bg-[#141518] px-3 py-1.5 rounded-md border border-slate-700/50 outline-none focus:border-amber-500 text-xs text-white flex-1 md:w-36 font-semibold"
                      />
                      <button
                        onClick={createVipServer}
                        className="p-1.5 px-3 bg-amber-500 hover:bg-amber-400 font-black text-slate-950 text-xs rounded-md transition shadow"
                      >
                        Create
                      </button>
                    </div>
                  </div>

                  {/* Servers lists */}
                  <div className="space-y-3">
                    <h5 className="font-extrabold text-white text-xs uppercase tracking-wider">Running Server Nodes</h5>
                    
                    <div className="space-y-2">
                      
                      {/* Custom user VIP servers */}
                      {customVipServers.map((srv, idx) => (
                        <div key={idx} className="p-3 bg-amber-500/5 rounded-lg border border-amber-500/10 flex items-center justify-between text-xs">
                          <div className="space-y-0.5">
                            <span className="font-extrabold text-[#facc15]">⭐ Private VIP Server: {srv.name}</span>
                            <p className="text-[10px] text-gray-500 font-mono">Room code: {srv.code} • Max player cap 50 • Online</p>
                          </div>
                          <button
                            onClick={() => handleJoinServer(srv.code, selectedPlaceDetails)}
                            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-extrabold text-[11px] transition shadow"
                          >
                            Join Lobbies
                          </button>
                        </div>
                      ))}

                      {/* Default simulated servers */}
                      {simulatedServers.map((srv, idx) => (
                        <div key={idx} className="p-3 bg-[#141518] rounded-lg border border-slate-700/30 flex items-center justify-between text-xs">
                          <div className="space-y-0.5">
                            <span className="font-extrabold text-slate-200">Public Server #{srv.code}</span>
                            <p className="text-[10px] text-gray-500 font-mono">Sync latency: {srv.ping} • Player load: {srv.players}</p>
                          </div>
                          <button
                            onClick={() => handleJoinServer(srv.code, selectedPlaceDetails)}
                            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-extrabold text-[11px] transition shadow"
                          >
                            Join
                          </button>
                        </div>
                      ))}

                    </div>
                  </div>

                </div>
              )}

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
