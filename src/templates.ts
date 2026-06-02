/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LevelData } from './types';

export const TEMPLATES: Record<string, LevelData> = {
  obby: {
    id: 'obby',
    name: 'Classic Obby',
    description: 'Пройди полосу препятствий, избегая светящуюся лаву, и собери все монеты!',
    creator: 'FlexBlox Admin',
    updatedAt: 1717362000000,
    parts: [
      {
        id: 'spawn_1',
        name: 'Spawn Location',
        shape: 'spawn',
        material: 'plastic',
        color: '#3b82f6', // Bright Blue
        position: [0, 0.5, 0],
        rotation: [0, 0, 0],
        scale: [6, 1, 6],
      },
      {
        id: 'step_1',
        name: 'Step 1',
        shape: 'box',
        material: 'wood',
        color: '#f59e0b', // Orange
        position: [0, 1.2, -8],
        rotation: [0, 0, 0],
        scale: [3, 0.8, 3],
      },
      {
        id: 'step_2',
        name: 'Step 2',
        shape: 'box',
        material: 'wood',
        color: '#eab308', // Yellow
        position: [3, 2.5, -15],
        rotation: [0, 0.3, 0],
        scale: [3, 0.8, 3],
      },
      {
        id: 'coin_1',
        name: 'Bounty Coin 1',
        shape: 'coin',
        material: 'neon',
        color: '#facc15', // Gold
        position: [3, 3.8, -15],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        touchInterest: true,
        rewardCoins: 1,
      },
      {
        id: 'step_3',
        name: 'Step 3',
        shape: 'box',
        material: 'wood',
        color: '#22c55e', // Green
        position: [-3, 3.8, -22],
        rotation: [0, -0.3, 0],
        scale: [3, 0.8, 3],
      },
      {
        id: 'coin_2',
        name: 'Bounty Coin 2',
        shape: 'coin',
        material: 'neon',
        color: '#facc15',
        position: [-3, 5.0, -22],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        touchInterest: true,
        rewardCoins: 1,
      },
      // Lava laser bridge
      {
        id: 'lava_bridge',
        name: 'Lava Beam',
        shape: 'lava',
        material: 'neon',
        color: '#ef4444', // Red Neon Glow
        position: [0, 4.6, -31],
        rotation: [0, 0, 0],
        scale: [2.5, 0.4, 7],
      },
      {
        id: 'safe_landing',
        name: 'Safe Platform',
        shape: 'box',
        material: 'metal',
        color: '#94a3b8', // Gray Metal
        position: [0, 5.0, -40],
        rotation: [0, 0, 0],
        scale: [4, 1, 4],
      },
      {
        id: 'finish_trigger',
        name: 'Finish Zone',
        shape: 'trigger',
        material: 'plastic',
        color: '#a855f7', // Purple
        position: [0, 6.0, -48],
        rotation: [0, 0, 0],
        scale: [5, 1, 5],
        triggerText: '🏆 ПОЗДРАВЛЯЕМ! Вы успешно прошли классический Obby! 🏆',
      },
      {
        id: 'coin_3',
        name: 'Mega Coin',
        shape: 'coin',
        material: 'neon',
        color: '#a855f7',
        position: [0, 7.5, -48],
        rotation: [0, 0, 0],
        scale: [1.5, 1.5, 1.5],
        touchInterest: true,
        rewardCoins: 5,
      }
    ],
  },
  race: {
    id: 'race',
    name: 'Speed Simulator',
    description: 'Разгоняйся на зеленых ускорителях, огибай огромные стены и доберись до финиша первым за минимальное время!',
    creator: 'FlexBlox Admin',
    updatedAt: 1717362100000,
    parts: [
      {
        id: 'spawn_2',
        name: 'Start Location',
        shape: 'spawn',
        material: 'metal',
        color: '#d1d5db',
        position: [0, 0.2, 0],
        rotation: [0, 0, 0],
        scale: [10, 0.4, 10],
      },
      // First Speedpad
      {
        id: 'speed_1',
        name: 'Boost Pad 1',
        shape: 'speedpad',
        material: 'neon',
        color: '#10b981', // Neon emerald
        position: [0, 0.1, -15],
        rotation: [0, 0, 0],
        scale: [4, 0.2, 4],
        speedBoost: 1.8,
      },
      {
        id: 'coin_p1',
        name: 'Track Coin 1',
        shape: 'coin',
        material: 'neon',
        color: '#facc15',
        position: [0, 1.5, -15],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        touchInterest: true,
        rewardCoins: 1,
      },
      // Obstacle Slalom
      {
        id: 'slalom_left',
        name: 'Obstacle Pillar 1',
        shape: 'cylinder',
        material: 'wood',
        color: '#7c2d12', // Rich wooden reddish brown
        position: [-6, 3, -30],
        rotation: [0, 0, 0],
        scale: [4, 6, 4],
      },
      {
        id: 'slalom_right',
        name: 'Obstacle Pillar 2',
        shape: 'cylinder',
        material: 'wood',
        color: '#7c2d12',
        position: [6, 3, -45],
        rotation: [0, 0, 0],
        scale: [4, 6, 4],
      },
      // Second Booster
      {
        id: 'speed_2',
        name: 'Boost Pad 2',
        shape: 'speedpad',
        material: 'neon',
        color: '#10b981',
        position: [0, 0.1, -60],
        rotation: [0, 0, 0],
        scale: [5, 0.2, 5],
        speedBoost: 2.2,
      },
      {
        id: 'coin_p2',
        name: 'Super Boost Coin',
        shape: 'coin',
        material: 'neon',
        color: '#facc15',
        position: [0, 2.0, -60],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        touchInterest: true,
        rewardCoins: 3,
      },
      // Lava warning laser zone
      {
        id: 'race_laser',
        name: 'Laser Barrier',
        shape: 'lava',
        material: 'neon',
        color: '#dc2626',
        position: [0, 0.5, -75],
        rotation: [0, 0, 0],
        scale: [12, 0.3, 1.5],
      },
      // Finish Zone
      {
        id: 'finish_platform',
        name: 'Finish Hub',
        shape: 'box',
        material: 'plastic',
        color: '#f43f5e', // Pinkish red
        position: [0, 0.2, -90],
        rotation: [0, 0, 0],
        scale: [8, 0.4, 8],
      },
      {
        id: 'finish_zone',
        name: 'Race Finish Line',
        shape: 'trigger',
        material: 'neon',
        color: '#ec4899',
        position: [0, 1.0, -90],
        rotation: [0, 0, 0],
        scale: [6, 1.5, 6],
        triggerText: '🏁 ФИНИШ! Вы прошли трассу на супер-скорости! 🏁',
      }
    ],
  },
  city: {
    id: 'city',
    name: 'Roblox City Sandbox',
    description: 'Исследуй небольшой уютный город, заберись на вершину стеклянного небоскреба и найди все тайники с монетами!',
    creator: 'FlexBlox Admin',
    updatedAt: 1717362200000,
    parts: [
      {
        id: 'spawn_3',
        name: 'City Square Spawn',
        shape: 'spawn',
        material: 'plastic',
        color: '#06b6d4', // Cyan
        position: [-10, 0.2, 10],
        rotation: [0, 0, 0],
        scale: [8, 0.3, 8],
      },
      // Road Plate
      {
        id: 'road_1',
        name: 'Main Street Asphalt',
        shape: 'box',
        material: 'plastic',
        color: '#1e293b', // Asphalt slate
        position: [0, 0.05, 0],
        rotation: [0, 0, 0],
        scale: [30, 0.1, 12],
      },
      // Brick Brick Small House
      {
        id: 'house_base',
        name: 'Red Brick House',
        shape: 'box',
        material: 'wood',
        color: '#b91c1c', // Brick Red
        position: [-15, 3.5, -15],
        rotation: [0, 0, 0],
        scale: [10, 7, 10],
      },
      {
        id: 'house_roof',
        name: 'House Roof',
        shape: 'box',
        material: 'wood',
        color: '#f97316', // Slate orange roof
        position: [-15, 7.5, -15],
        rotation: [0, 0, 0],
        scale: [11, 1.5, 11],
      },
      {
        id: 'house_door_sensor',
        name: 'House Entry Sensor',
        shape: 'trigger',
        material: 'plastic',
        color: '#ea580c',
        position: [-15, 1, -9.5],
        rotation: [0, 0, 0],
        scale: [3, 2, 1.5],
        triggerText: '🛋️ Добро пожаловать домой! Здесь тепло и уютно. 🛋️',
      },
      // Tall Glass Skyscraper
      {
        id: 'skyscraper_core',
        name: 'Glass Skyscraper',
        shape: 'box',
        material: 'glass',
        color: '#38bdf8', // Glass blue trans
        position: [15, 12, -15],
        rotation: [0, 0, 0],
        scale: [12, 24, 12],
      },
      // Elevator Platforms to climb the high tower
      {
        id: 'elevator_node_1',
        name: 'Climbing Step 1',
        shape: 'box',
        material: 'metal',
        color: '#64748b',
        position: [15, 6, -8],
        rotation: [0, 0, 0],
        scale: [4, 0.5, 4],
      },
      {
        id: 'elevator_node_2',
        name: 'Climbing Step 2',
        shape: 'box',
        material: 'metal',
        color: '#64748b',
        position: [15, 12, -22],
        rotation: [0, 0, 0],
        scale: [4, 0.5, 4],
      },
      {
        id: 'elevator_node_3',
        name: 'Climbing Step 3',
        shape: 'box',
        material: 'metal',
        color: '#64748b',
        position: [8, 18, -15],
        rotation: [0, 0, 0],
        scale: [4, 0.5, 4],
      },
      // Top Glass Tower Secret Zone
      {
        id: 'top_skys_platform',
        name: 'Skyscraper Penthouse Floor',
        shape: 'box',
        material: 'metal',
        color: '#0f172a', // Obsidian Dark
        position: [15, 24.2, -15],
        rotation: [0, 0, 0],
        scale: [12.2, 0.4, 12.2],
      },
      {
        id: 'top_skys_trigger',
        name: 'Sky Penthouse Trigger',
        shape: 'trigger',
        material: 'neon',
        color: '#06b6d4',
        position: [15, 25.0, -15],
        rotation: [0, 0, 0],
        scale: [8, 2, 8],
        triggerText: '⭐️ ВЫ НА ВЕРШИНЕ МИРА! Вы покорили стеклянный небоскреб FlexBlox! ⭐️',
      },
      {
        id: 'top_sky_coin_1',
        name: 'Sky Coin A',
        shape: 'coin',
        material: 'neon',
        color: '#facc15',
        position: [12, 26, -15],
        rotation: [0, 0, 0],
        scale: [1.2, 1.2, 1.2],
        touchInterest: true,
        rewardCoins: 2,
      },
      {
        id: 'top_sky_coin_2',
        name: 'Sky Coin B',
        shape: 'coin',
        material: 'neon',
        color: '#facc15',
        position: [18, 26, -15],
        rotation: [0, 0, 0],
        scale: [1.2, 1.2, 1.2],
        touchInterest: true,
        rewardCoins: 2,
      },
      // Simple street obstacles & trees
      {
        id: 'tree_trunk_1',
        name: 'Pine Tree Trunk',
        shape: 'cylinder',
        material: 'wood',
        color: '#7c2d12',
        position: [-5, 3, 5],
        rotation: [0, 0, 0],
        scale: [2, 6, 2],
      },
      {
        id: 'tree_foliage_1',
        name: 'Pine Core',
        shape: 'sphere',
        material: 'plastic',
        color: '#15803d',
        position: [-5, 7, 5],
        rotation: [0, 0, 0],
        scale: [6, 6, 6],
      }
    ]
  }
};
