/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import StartMenu from './components/StartMenu';
import EditorHub from './components/EditorHub';
import GameClient from './components/GameClient';
import { LevelData } from './types';
import { MultiplayerClient } from './lib/mpConnection';

export default function App() {
  // Screen Router state: 'start' | 'editor' | 'game'
  const [activeScreen, setActiveScreen] = useState<'start' | 'editor' | 'game'>('start');
  
  // Customization choices
  const [username, setUsername] = useState<string>('');
  const [avatarColor, setAvatarColor] = useState<string>('#3b82f6'); // Default Blue
  const [avatarFace, setAvatarFace] = useState<string>('🙂');
  const [avatarHat, setAvatarHat] = useState<string>(''); // No hat
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Active level payload
  const [currentLevel, setCurrentLevel] = useState<LevelData | null>(null);

  // Saved levels array (persistent in localStorage)
  const [savedProjects, setSavedProjects] = useState<LevelData[]>([]);

  // Room Connection detail
  const [roomId, setRoomId] = useState<string>('100'); // Default room
  const [isHost, setIsHost] = useState<boolean>(true);
  const [playerId, setPlayerId] = useState<string>('');
  const [mpClient, setMpClient] = useState<MultiplayerClient | null>(null);

  // On App Mount
  useEffect(() => {
    // Generate simple randomized names if missing
    const cachedName = localStorage.getItem('fb_username');
    if (cachedName) {
      setUsername(cachedName);
    } else {
      const generatedName = `Guest_${Math.floor(Math.random() * 8999 + 1000)}`;
      setUsername(generatedName);
      localStorage.setItem('fb_username', generatedName);
    }

    const cachedColor = localStorage.getItem('fb_avatar_color');
    if (cachedColor) setAvatarColor(cachedColor);

    const cachedFace = localStorage.getItem('fb_avatar_face');
    if (cachedFace) setAvatarFace(cachedFace);

    const cachedHat = localStorage.getItem('fb_avatar_hat');
    if (cachedHat) setAvatarHat(cachedHat);

    // Initialise randomized unique player ID
    const cachedPId = localStorage.getItem('fb_player_id');
    if (cachedPId) {
      setPlayerId(cachedPId);
    } else {
      const generatedPId = `p_${Math.floor(Math.random() * 89999 + 10000)}`;
      setPlayerId(generatedPId);
      localStorage.setItem('fb_player_id', generatedPId);
    }

    // Load custom projects
    const rawProjects = localStorage.getItem('flexblox_saved_projects');
    if (rawProjects) {
      try {
        setSavedProjects(JSON.parse(rawProjects));
      } catch (e) {
        setSavedProjects([]);
      }
    }
  }, []);

  // Update localStorage when user changes values
  useEffect(() => {
    if (username) localStorage.setItem('fb_username', username);
  }, [username]);

  useEffect(() => {
    if (avatarColor) localStorage.setItem('fb_avatar_color', avatarColor);
  }, [avatarColor]);

  useEffect(() => {
    if (avatarFace) localStorage.setItem('fb_avatar_face', avatarFace);
  }, [avatarFace]);

  useEffect(() => {
    if (avatarHat !== undefined) localStorage.setItem('fb_avatar_hat', avatarHat);
  }, [avatarHat]);

  // Method to persist a custom level locally
  const handleSaveLevelLocally = (levelData: LevelData) => {
    const isNew = !savedProjects.some(p => p.id === levelData.id);
    let nextProjects: LevelData[];

    if (isNew) {
      nextProjects = [...savedProjects, levelData];
    } else {
      nextProjects = savedProjects.map(p => p.id === levelData.id ? levelData : p);
    }

    setSavedProjects(nextProjects);
    localStorage.setItem('flexblox_saved_projects', JSON.stringify(nextProjects));
    
    alert(`🎉 Проект "${levelData.name}" успешно сохранен локально!`);
  };

  // Method to remove a saved project
  const handleDeleteLevel = (id: string) => {
    if (confirm('Вы уверены, что хотите навсегда удалить этот проект?')) {
      const nextProjects = savedProjects.filter(p => p.id !== id);
      setSavedProjects(nextProjects);
      localStorage.setItem('flexblox_saved_projects', JSON.stringify(nextProjects));
    }
  };

  // Connect & Spin room WebSocket
  const handleJoinMultiplayerRoom = () => {
    if (!currentLevel) return;

    // Build socket
    const client = new MultiplayerClient(() => {});
    client.connect(roomId, playerId, username, avatarColor, currentLevel.parts);
    setMpClient(client);
    setActiveScreen('game');
  };

  // Host publishing custom Level via Wi-Fi network API
  const handlePublishToServer = async (levelData: LevelData) => {
    try {
      const res = await fetch('/api/rooms/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: roomId,
          name: levelData.name,
          parts: levelData.parts
        })
      });

      if (res.ok) {
        const details = await res.json();
        alert(`📡 Проект опубликован по локальной сети! Комната №${roomId}. Друзья могут подключаться.`);
      } else {
        alert('❌ Ошибка публикации. Убедитесь, что сервер запущен.');
      }
    } catch (e) {
      alert('📡 Сохранено локально! Мультиплеер переведен в автономный P2P режим.');
    }
  };

  const handleLaunchEmptyPlace = () => {
    const freshId = `custom_${Date.now()}`;
    const emptyLevel: LevelData = {
      id: freshId,
      name: `New Place ${savedProjects.length + 1}`,
      description: 'Пользовательский свободный мир для конструирования.',
      creator: username,
      updatedAt: Date.now(),
      parts: [
        {
          id: 'default_spawn',
          name: 'Spawn Location',
          shape: 'spawn',
          material: 'plastic',
          color: '#3b82f6',
          position: [0, 0.5, 0],
          rotation: [0, 0, 0],
          scale: [6, 1, 6],
        }
      ]
    };
    setCurrentLevel(emptyLevel);
    setActiveScreen('editor');
  };

  return (
    <div className="w-full h-full text-slate-100 bg-[#12131a]" id="flexblox-master-application">
      {activeScreen === 'start' && (
        <StartMenu
          username={username}
          setUsername={setUsername}
          avatarColor={avatarColor}
          setAvatarColor={setAvatarColor}
          avatarFace={avatarFace}
          setAvatarFace={setAvatarFace}
          avatarHat={avatarHat}
          setAvatarHat={setAvatarHat}
          onSelectTemplate={(tmpl) => {
            setCurrentLevel(tmpl);
            setActiveScreen('editor');
          }}
          onSelectProject={(proj) => {
            setCurrentLevel(proj);
            setActiveScreen('game');
          }}
          onCreateEmpty={handleLaunchEmptyPlace}
          savedProjects={savedProjects}
          onDeleteProject={handleDeleteLevel}
          roomId={roomId}
          setRoomId={setRoomId}
          isHost={isHost}
          setIsHost={setIsHost}
          joinRoom={() => {
            // Check if place is chosen
            if (savedProjects.length > 0) {
              setCurrentLevel(savedProjects[0]);
            } else {
              // Fail-safe select classic obby map if they don't have custom project loaded
              const defaultObby = {
                id: ' LobbyPlace',
                name: 'Classic Lobby Place',
                description: 'Лобби по умолчанию для совместной игры.',
                creator: 'System',
                updatedAt: Date.now(),
                parts: [
                  {
                    id: 'default_lobby_spawn',
                    name: 'Spawn Location',
                    shape: 'spawn',
                    material: 'plastic',
                    color: '#3b82f6',
                    position: [0, 0.5, 0],
                    rotation: [0, 0, 0],
                    scale: [12, 1, 12],
                  }
                ]
              };
              setCurrentLevel(defaultObby);
            }
            // Trigger connection after layout sync completes
            setTimeout(() => {
              handleJoinMultiplayerRoom();
            }, 100);
          }}
          soundEnabled={soundEnabled}
          setSoundEnabled={setSoundEnabled}
        />
      )}

      {activeScreen === 'editor' && currentLevel && (
        <EditorHub
          initialLevel={currentLevel}
          onSave={(lvl) => {
            setCurrentLevel(lvl);
            handleSaveLevelLocally(lvl);
          }}
          onPublish={(lvl) => {
            setCurrentLevel(lvl);
            handleSaveLevelLocally(lvl);
            handlePublishToServer(lvl);
          }}
          onPlay={(lvl) => {
            setCurrentLevel(lvl);
            setActiveScreen('game');
          }}
          onBackToMenu={() => {
            setActiveScreen('start');
          }}
          isSocketOpen={!!mpClient && mpClient.isSocketOpen()}
        />
      )}

      {activeScreen === 'game' && currentLevel && (
        <GameClient
          level={currentLevel}
          username={username}
          avatarColor={avatarColor}
          avatarFace={avatarFace}
          avatarHat={avatarHat}
          roomId={roomId}
          isHost={isHost}
          mpClient={mpClient}
          onBackToMenu={() => {
            if (mpClient) {
              mpClient.close();
              setMpClient(null);
            }
            setActiveScreen('start');
          }}
          soundEnabled={soundEnabled}
        />
      )}
    </div>
  );
}
