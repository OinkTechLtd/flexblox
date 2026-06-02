/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Play, Clipboard, Plus, Shield, Settings, Laptop, Users, Palette, Trash2, Wifi, Zap } from 'lucide-react';
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
];

const HATS = [
  { id: 'none', label: 'No Hat', value: '' },
  { id: 'cap', label: 'Roblox Red Cap', value: '#ef4444' },
  { id: 'fedora', label: 'Classic Black Fedora', value: '#1e293b' },
  { id: 'crown', label: 'Golden Crown', value: '#eab308' },
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
  const [activeSubTab, setActiveSubTab] = useState<'games' | 'my-projects' | 'avatar' | 'settings'>('games');
  const [roomsList, setRoomsList] = useState<any[]>([]);

  // Periodically fetch active rooms on the local server if available
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await fetch('/api/rooms');
        if (res.ok) {
          const list = await res.json();
          setRoomsList(list);
        }
      } catch (e) {
        // Silent block - fallback to empty if server offline/local
      }
    };
    fetchRooms();
    const interval = setInterval(fetchRooms, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-full bg-[#12131a] overflow-y-auto roblox-chat-container pb-12 select-none relative" id="start-menu-host">
      {/* Upper Brand Header */}
      <div className="w-full h-16 bg-[#1a1b24] border-b border-gray-800 flex items-center justify-between px-6 sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-3">
          {/* Authentic Roblox style slanted block icon */}
          <div className="w-9 h-9 bg-red-600 rounded flex items-center justify-center font-bold text-white text-xl transform -rotate-12 border border-red-500 shadow-md" id="roblox-slanted-logo">
            FB
          </div>
          <span className="text-2xl font-black tracking-wider text-white select-none">
            FLEX<span className="text-red-600">BLOX</span>
          </span>
          <span className="text-[10px] bg-red-600/20 text-red-500 px-1.5 py-0.5 rounded font-mono font-bold tracking-widest uppercase border border-red-600/30">
            OFFLINE WI-FI
          </span>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => setActiveSubTab('games')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-150 ${
              activeSubTab === 'games'
                ? 'bg-red-600 text-white shadow'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
            id="tab-games"
          >
            Главная
          </button>
          <button
            onClick={() => setActiveSubTab('my-projects')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-150 ${
              activeSubTab === 'my-projects'
                ? 'bg-red-600 text-white shadow'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
            id="tab-projects"
          >
            Мои Проекты
          </button>
          <button
            onClick={() => setActiveSubTab('avatar')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-150 ${
              activeSubTab === 'avatar'
                ? 'bg-red-600 text-white shadow'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
            id="tab-avatar"
          >
            Аватар
          </button>
          <button
            onClick={() => setActiveSubTab('settings')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-150 ${
              activeSubTab === 'settings'
                ? 'bg-red-600 text-white shadow'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
            id="tab-settings"
          >
            Настройки
          </button>
        </div>

        {/* Current User Pill */}
        <div className="flex items-center gap-3 bg-gray-900/80 px-4 py-1.5 rounded-full border border-gray-800">
          <div
            className="w-7 h-7 rounded-sm flex items-center justify-center text-sm shadow font-bold"
            style={{ backgroundColor: avatarColor }}
          >
            {avatarFace}
          </div>
          <span className="text-sm font-semibold text-gray-200 truncate max-w-[120px]">{username}</span>
        </div>
      </div>

      {/* Hero Welcome Banner */}
      <div className="max-w-7xl mx-auto px-6 pt-8">
        <div className="bg-gradient-to-r from-red-900/30 to-slate-900/80 rounded-2xl p-6 sm:p-8 border border-red-900/40 relative overflow-hidden backdrop-blur shadow-xl mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2 relative z-10 max-w-xl">
            <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight">
              Привет, <span className="text-red-500 drop-shadow">{username}</span>!
            </h1>
            <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
              Добро пожаловать в <span className="font-bold text-white">FlexBlox Studio</span> — полноценный оффлайн-конструктор и игровой клиент. Создавай свои 3D миры, делись с друзьями по Wi-Fi или играй с ботами прямо сейчас!
            </p>
          </div>

          <div className="flex gap-3 relative z-10 flex-wrap shrink-0">
            <button
              onClick={onCreateEmpty}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-sm shadow-md hover:shadow-lg transition flex items-center gap-2 border border-red-500/20"
              id="hero-create-empty"
            >
              <Plus className="w-5 h-5" />
              Новый Плейс
            </button>
          </div>
        </div>

        {/* Dynamic Inner Tab Renderer */}
        {activeSubTab === 'games' && (
          <div className="space-y-8 animate-fade-in">
            {/* Quick Wi-Fi Connection Overlay */}
            <div className="bg-[#1f212d] border border-gray-800 rounded-xl p-5 flex flex-col lg:flex-row justify-between gap-5 shadow">
              <div className="space-y-1">
                <span className="text-xs font-bold tracking-widest text-red-500 uppercase flex items-center gap-1.5">
                  <Wifi className="w-4 h-4 text-red-500 animate-pulse" /> Подключение по Wi-Fi / LAN
                </span>
                <h3 className="text-lg font-bold text-white">Групповая игра на одном роутере</h3>
                <p className="text-gray-400 text-xs leading-relaxed max-w-xl">
                  Введите номер комнаты друга (например, <span className="font-mono text-gray-200">1234</span>). Один игрок будет Сервером (Host), а остальные подключатся к нему для синхронных прыжков, чата и битвы за монеты.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 bg-[#171821] px-3 py-1.5 rounded-lg border border-gray-800">
                  <span className="text-xs font-semibold text-gray-400 shrink-0">Код комнаты:</span>
                  <input
                    type="text"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    placeholder="Например: 100"
                    className="w-24 bg-transparent outline-none text-sm text-white font-bold placeholder-gray-600 text-center"
                    id="connect-room-input"
                  />
                </div>

                <div className="flex items-center gap-2 bg-[#171821] p-1 rounded-lg border border-gray-800">
                  <button
                    onClick={() => setIsHost(true)}
                    className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                      isHost ? 'bg-red-600 text-white shadow' : 'text-gray-400'
                    }`}
                  >
                    Хост
                  </button>
                  <button
                    onClick={() => setIsHost(false)}
                    className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                      !isHost ? 'bg-red-600 text-white shadow' : 'text-gray-400'
                    }`}
                  >
                    Клиент
                  </button>
                </div>

                <button
                  onClick={joinRoom}
                  className="px-5 py-2.5 rounded-lg bg-[#a855f7] hover:bg-[#b05ffb] text-white text-xs font-bold shadow-md flex items-center gap-2 transition"
                  id="connect-room-btn"
                >
                  <Users className="w-4 h-4" /> Connect!
                </button>
              </div>
            </div>

            {/* Active shared Wi-Fi lobbies found */}
            {roomsList.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-gray-300 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-500 animate-bounce" /> Доступные Wi-Fi игры
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {roomsList.map((room) => (
                    <div key={room.id} className="bg-[#1f212d] hover:bg-[#252838] duration-150 rounded-xl p-4 border border-gray-800 flex items-center justify-between shadow">
                      <div>
                        <h4 className="font-bold text-white text-sm">{room.name}</h4>
                        <p className="text-xs text-gray-400 mt-0.5">Комната: {room.id} • Объектов: {room.partsCount}</p>
                      </div>
                      <button
                        onClick={() => {
                          setRoomId(room.id);
                          setIsHost(false);
                          joinRoom();
                        }}
                        className="px-3 py-1.5 rounded bg-red-600 hover:bg-red-500 duration-150 text-xs text-white font-bold"
                      >
                        Войти ({room.playerCount} 👤)
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Default Templates Directory */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-300">Основные Шаблоны Миров (Встроенные Roblox Игры)</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* OBBY PLATFORM */}
                <div className="bg-[#1a1b24] outline outline-1 outline-gray-800 hover:outline-red-500/50 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition duration-200 flex flex-col group">
                  <div className="relative h-44 bg-gradient-to-tr from-[#701a75]/40 to-[#e879f9]/20 flex items-center justify-center border-b border-gray-800 overflow-hidden">
                    {/* Roblox visual decoration */}
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 duration-200 transition" />
                    <div className="relative text-center p-4">
                      <span className="text-[10px] bg-red-500 text-white font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow">
                        🏆 POPULAR
                      </span>
                      <h4 className="text-2xl font-black text-white mt-2 drop-shadow">CLASSIC OBBY</h4>
                      <p className="text-[10px] text-gray-300 font-mono tracking-widest uppercase mt-1">Опасная Лава & Золото</p>
                    </div>
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-1">
                      <h3 className="font-bold text-white text-base">Classic Obby Sandbox</h3>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        Полоса препятствий из парящих блоков, неонового излучения и чекпоинтов. Соберите все монеты!
                      </p>
                    </div>
                    <button
                      onClick={() => onSelectTemplate(TEMPLATES.obby)}
                      className="w-full py-2.5 rounded-xl bg-red-600 text-white font-bold text-sm tracking-wide duration-150 shadow border border-red-500/10 hover:bg-red-500 active:scale-95 transition flex items-center justify-center gap-1.5"
                    >
                      <Play className="w-4 h-4 fill-white text-white" /> Играть & Править
                    </button>
                  </div>
                </div>

                {/* RACE RUNNER */}
                <div className="bg-[#1a1b24] outline outline-1 outline-gray-800 hover:outline-red-500/50 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition duration-200 flex flex-col group">
                  <div className="relative h-44 bg-gradient-to-tr from-[#065f46]/40 to-[#34d399]/20 flex items-center justify-center border-b border-gray-800 overflow-hidden">
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 duration-200 transition" />
                    <div className="relative text-center p-4">
                      <span className="text-[10px] bg-green-500 text-white font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow">
                        ⚡️ SPEED UP
                      </span>
                      <h4 className="text-2xl font-black text-white mt-2 drop-shadow">SPEED SIMULATOR</h4>
                      <p className="text-[10px] text-gray-200 font-mono tracking-widest uppercase mt-1">Зеленые бусты & Секунды</p>
                    </div>
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-1">
                      <h3 className="font-bold text-white text-base">Race Simulator</h3>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        Плейс с огромной скоростью, широкими дорогами, зелеными ускорителями и финишной лентой на таймере.
                      </p>
                    </div>
                    <button
                      onClick={() => onSelectTemplate(TEMPLATES.race)}
                      className="w-full py-2.5 rounded-xl bg-red-600 text-white font-bold text-sm tracking-wide duration-150 shadow border border-red-500/10 hover:bg-red-500 active:scale-95 transition flex items-center justify-center gap-1.5"
                    >
                      <Play className="w-4 h-4 fill-white text-white" /> Играть & Править
                    </button>
                  </div>
                </div>

                {/* CITY MULTIPLAYER */}
                <div className="bg-[#1a1b24] outline outline-1 outline-gray-800 hover:outline-red-500/50 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition duration-200 flex flex-col group">
                  <div className="relative h-44 bg-gradient-to-tr from-[#1e3a8a]/40 to-[#60a5fa]/20 flex items-center justify-center border-b border-gray-800 overflow-hidden">
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 duration-200 transition" />
                    <div className="relative text-center p-4">
                      <span className="text-[10px] bg-cyan-500 text-white font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow">
                        🏙️ EXPLORE
                      </span>
                      <h4 className="text-2xl font-black text-white mt-2 drop-shadow">CITY SANDBOX</h4>
                      <p className="text-[10px] text-gray-200 font-mono tracking-widest uppercase mt-1">Тайники, Высотки, Дома</p>
                    </div>
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-1">
                      <h3 className="font-bold text-white text-base">City Playground</h3>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        Огромный город со стеклянным небоскребом для карабканья, секретной комнатой под крышей и домами.
                      </p>
                    </div>
                    <button
                      onClick={() => onSelectTemplate(TEMPLATES.city)}
                      className="w-full py-2.5 rounded-xl bg-red-600 text-white font-bold text-sm tracking-wide duration-150 shadow border border-red-500/10 hover:bg-red-500 active:scale-95 transition flex items-center justify-center gap-1.5"
                    >
                      <Play className="w-4 h-4 fill-white text-white" /> Играть & Править
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* My Saved Projects */}
        {activeSubTab === 'my-projects' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center sm:pb-2">
              <h2 className="text-xl font-bold text-white">Моя Креативная Студия (Сохранено локально)</h2>
              <button
                onClick={onCreateEmpty}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 duration-150 text-xs font-bold text-white rounded-lg flex items-center gap-1.5 shadow"
              >
                <Plus className="w-4 h-4" /> Создать Пустой Плейс
              </button>
            </div>

            {savedProjects.length === 0 ? (
              <div className="bg-[#1a1b24] rounded-2xl p-12 text-center border border-gray-800 space-y-4 max-w-lg mx-auto">
                <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mx-auto text-xl font-bold text-gray-400">
                  📁
                </div>
                <h3 className="font-bold text-white text-base">Нет сохраненных проектов</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Вы пока не создавали кастомных миров. Откройте любой из шаблонов выше, добавьте новые блоки, поменяйте цвета и нажмите "Сохранить проект" в левом верхнем углу!
                </p>
                <button
                  onClick={onCreateEmpty}
                  className="px-4 py-2 bg-red-600/30 text-red-400 border border-red-600/30 hover:bg-red-600 hover:text-white duration-150 text-xs font-bold rounded"
                >
                  Создать новый пустой плейс
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedProjects.map((proj) => (
                  <div key={proj.id} className="bg-[#1a1b24] border border-gray-800 hover:border-red-600/30 hover:shadow-lg rounded-2xl p-5 flex flex-col justify-between gap-5 transition duration-150">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-bold text-white text-base truncate pr-2">{proj.name}</h4>
                        <span className="text-[10px] bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded font-mono font-bold shrink-0 uppercase">
                          CUSTOM
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed h-8">
                        {proj.description || 'Пользовательский 3D-мир в реальном времени.'}
                      </p>
                      <div className="text-[10px] text-gray-500 flex items-center gap-3">
                        <span>Блоков: {proj.parts?.length || 0}</span>
                        <span>•</span>
                        <span>Создатель: {proj.creator || 'Ваш Аватар'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onSelectProject(proj)}
                        className="flex-1 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-500 rounded-lg shadow transition duration-150 flex items-center justify-center gap-1"
                      >
                        <Play className="w-3.5 h-3.5 fill-white text-white" /> Запустить
                      </button>
                      <button
                        onClick={() => onDeleteProject(proj.id)}
                        className="px-3 py-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg border border-gray-800 transition duration-150"
                        title="Удалить плейс"
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

        {/* Avatar Customization Mode */}
        {activeSubTab === 'avatar' && (
          <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Palette className="w-5 h-5 text-red-500" /> Студия кастомизации Roblox-Аватара
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
              {/* Customizable options left */}
              <div className="bg-[#1a1b24] rounded-2xl p-6 border border-gray-800 space-y-6">
                {/* Name */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Игровая подпись (Никнейм)</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.substring(0, 20))}
                    placeholder="Назовите вашего игрока..."
                    className="w-full bg-[#12131a] px-4 py-3 rounded-lg border border-gray-800 text-sm text-white font-bold tracking-wide outline-none focus:border-red-600 duration-150"
                    id="username-character-input"
                  />
                </div>

                {/* Face selection */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Выражение лица</label>
                  <div className="grid grid-cols-2 gap-2">
                    {FACES.map((face) => (
                      <button
                        key={face.id}
                        onClick={() => setAvatarFace(face.value)}
                        className={`px-4 py-2.5 rounded-lg border text-xs font-bold text-left transition ${
                          avatarFace === face.value
                            ? 'bg-red-600 text-white border-red-500'
                            : 'bg-[#12131a] text-gray-300 border-gray-800 hover:bg-gray-800/40'
                        }`}
                      >
                        {face.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hat selector */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Головной убор (Шапка R6)</label>
                  <div className="grid grid-cols-2 gap-2">
                    {HATS.map((hat) => (
                      <button
                        key={hat.id}
                        onClick={() => setAvatarHat(hat.value)}
                        className={`px-4 py-2.5 rounded-lg border text-xs font-bold text-left transition ${
                          avatarHat === hat.value
                            ? 'bg-red-600 text-white border-red-500'
                            : 'bg-[#12131a] text-gray-300 border-gray-800 hover:bg-gray-800/40'
                        }`}
                      >
                        {hat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Torso/Jersey Color selector */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Цвет Футболки / Кожа</label>
                  <div className="flex flex-wrap gap-2.5">
                    {[
                      '#ef4444', // Red
                      '#3b82f6', // Blue
                      '#10b981', // Emerald
                      '#f59e0b', // Amber/Orange
                      '#8b5cf6', // Indigo
                      '#eab308', // Gold Yellow
                      '#ec4899', // Pink
                      '#06b6d4', // Cyan
                      '#14b8a6', // Teal
                      '#ffffff', // Roblox Classic White
                    ].map((color) => (
                      <button
                        key={color}
                        onClick={() => setAvatarColor(color)}
                        className={`w-8 h-8 rounded-sm shadow-inner transition duration-150 transform active:scale-95 ${
                          avatarColor === color ? 'ring-2 ring-white scale-110' : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* 3D Roblox Classic Mock preview right */}
              <div className="bg-[#1a1b24] rounded-2xl p-6 border border-gray-800 flex flex-col justify-between items-center space-y-4">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Предпросмотр Roblox-Аватара</span>

                <div className="relative w-48 h-64 bg-[#12131a] border border-gray-800 rounded-xl flex items-center justify-center p-4">
                  {/* Human shape design matching requested Roblox-style characters (No standard boring blocks, detailed joints build) */}
                  <div className="scale-110 flex flex-col items-center">
                    {/* Golden/White Hat if selected */}
                    {avatarHat && (
                      <div
                        className="w-10 h-3.5 rounded-t-lg shadow"
                        style={{ backgroundColor: avatarHat }}
                      />
                    )}

                    {/* R6 Head */}
                    <div className="w-8 h-8 bg-[#fed7aa] rounded-sm flex items-center justify-center text-lg shadow-md border border-orange-200">
                      {avatarFace}
                    </div>

                    {/* R6 Neck joint */}
                    <div className="w-4 h-1 bg-[#fed7aa]" />

                    {/* Torso + Limbs layout */}
                    <div className="flex items-start gap-1 justify-center">
                      {/* Left Arm */}
                      <div className="w-3.5 h-11 bg-[#fed7aa] rounded-sm mt-0.5 border border-[#fcdda3]" />

                      {/* Torso */}
                      <div
                        className="w-10 h-11 rounded-sm flex items-center justify-center font-bold text-white text-[10px] uppercase shadow-sm border"
                        style={{ backgroundColor: avatarColor, borderColor: `${avatarColor}cc` }}
                      >
                        R6
                      </div>

                      {/* Right Arm */}
                      <div className="w-3.5 h-11 bg-[#fed7aa] rounded-sm mt-0.5 border border-[#fcdda3]" />
                    </div>

                    {/* R6 Legs */}
                    <div className="flex gap-1 -mt-0.5 justify-center">
                      {/* Left leg */}
                      <div className="w-4 h-9 bg-gray-700 rounded-b border border-gray-800" />
                      {/* Right leg */}
                      <div className="w-4 h-9 bg-gray-700 rounded-b border border-gray-800" />
                    </div>
                  </div>
                </div>

                <div className="text-center space-y-1">
                  <span className="text-sm font-bold text-white">{username}</span>
                  <p className="text-[10px] text-gray-400">Стиль R6 Classic Roblox Blocky</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeSubTab === 'settings' && (
          <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-red-500" /> Конфигурация Движка FlexBlox
            </h2>

            <div className="bg-[#1a1b24] rounded-2xl p-6 border border-gray-800 space-y-6 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-gray-800/60 pb-4">
                <div className="space-y-0.5">
                  <h4 className="font-bold text-white">Высокое качество графики (Тени и сглаживание)</h4>
                  <p className="text-xs text-gray-400">Рендеринг мягких теней при игре и в редакторе.</p>
                </div>
                <div className="w-12 h-6 bg-red-600 rounded-full p-1 cursor-pointer flex items-center">
                  <div className="w-4 h-4 bg-white rounded-full transform translate-x-6" />
                </div>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-gray-800/60 pb-4">
                <div className="space-y-0.5">
                  <h4 className="font-bold text-white">Звуковые эффекты прыжка и гибели</h4>
                  <p className="text-xs text-gray-400">Проигрывать классический звук 'Oof' при падении в лаву.</p>
                </div>
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`w-12 h-6 rounded-full p-1 cursor-pointer flex items-center transition-all ${
                    soundEnabled ? 'bg-red-600' : 'bg-gray-800'
                  }`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-all ${
                    soundEnabled ? 'transform translate-x-6' : 'transform translate-x-0'
                  }`} />
                </button>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-gray-800/60 pb-4">
                <div className="space-y-0.5">
                  <h4 className="font-bold text-white">Сетка привязки (Snap Grid)</h4>
                  <p className="text-xs text-gray-400">Сетка по умолчанию 1 метр в Creator Studio.</p>
                </div>
                <span className="text-xs font-mono font-bold text-gray-300">1.0m (Снаппинг)</span>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-white">Управление в игре</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="px-4 py-3 bg-[#12131a] rounded-xl border border-gray-800 space-y-1">
                    <span className="text-xs font-bold text-red-500">Клавиатура</span>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      WASD или Стрелки — движение.<br />
                      Пробел (Space) — прыжок.<br />
                      Мышь — вращение камеры.
                    </p>
                  </div>

                  <div className="px-4 py-3 bg-[#12131a] rounded-xl border border-gray-800 space-y-1">
                    <span className="text-xs font-bold text-red-500">Сенсорное управление</span>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      Интерактивный джойстик слева.<br />
                      Кнопка прыжка справа.<br />
                      Камера вращается пальцем на экране.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
