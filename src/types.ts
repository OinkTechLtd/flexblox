/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PartShape = 'box' | 'sphere' | 'cylinder' | 'spawn' | 'coin' | 'trigger' | 'lava' | 'speedpad';

export type PartMaterial = 'plastic' | 'wood' | 'metal' | 'glass' | 'neon';

export interface PartData {
  id: string;
  name: string;
  shape: PartShape;
  material: PartMaterial;
  color: string;
  position: [number, number, number];
  rotation: [number, number, number]; // Radians [x, y, z]
  scale: [number, number, number];
  touchInterest?: boolean;
  rewardCoins?: number;
  triggerText?: string;
  speedBoost?: number;
}

export interface LevelData {
  id: string;
  name: string;
  description: string;
  creator: string;
  updatedAt: number;
  parts: PartData[];
  skyTheme?: 'classic' | 'sunset' | 'cosmic' | 'vaporwave';
}

export interface PlayerState {
  id: string;
  username: string;
  position: [number, number, number];
  rotation: number; // Y-rotation
  velocity: [number, number, number];
  isGrounded: boolean;
  isCustomizing?: boolean;
  animation: 'idle' | 'run' | 'jump' | 'fall';
  coins: number;
  color: string;
}

export interface NetworkMessage {
  type: 'init' | 'join' | 'leave' | 'update' | 'chat' | 'level_sync' | 'collect_coin' | 'checkpoint' | 'reset_level';
  senderId?: string;
  payload?: any;
}
