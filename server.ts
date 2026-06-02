/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Active Rooms State
// Room ID -> { level: any, players: Record<string, PlayerState> }
interface RoomData {
  id: string;
  name: string;
  parts: any[];
  players: Record<string, {
    id: string;
    username: string;
    position: [number, number, number];
    rotation: number;
    velocity: [number, number, number];
    isGrounded: boolean;
    animation: 'idle' | 'run' | 'jump' | 'fall';
    coins: number;
    color: string;
  }>;
}

const activeRooms: Record<string, RoomData> = {};

async function startServer() {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ noServer: true });
  const PORT = 3000;

  app.use(express.json());

  // API Route for current rooms status (Lobby discovery)
  app.get('/api/rooms', (req, res) => {
    const list = Object.values(activeRooms).map(r => ({
      id: r.id,
      name: r.name,
      playerCount: Object.keys(r.players).length,
      partsCount: r.parts.length
    }));
    res.json(list);
  });

  // Handle Level Publish endpoint (Wi-Fi server capability)
  app.post('/api/rooms/publish', (req, res) => {
    const { id, name, parts } = req.body;
    if (!id) {
      return res.status(400).json({ error: 'Missing room/level ID' });
    }
    
    // Create or update the room level
    if (!activeRooms[id]) {
      activeRooms[id] = {
        id,
        name: name || `Room ${id}`,
        parts: parts || [],
        players: {}
      };
    } else {
      activeRooms[id].parts = parts || [];
      activeRooms[id].name = name || activeRooms[id].name;
    }

    // Broadcast level update to all active ws connections in this room
    broadcastToRoom(id, {
      type: 'level_sync',
      payload: activeRooms[id].parts
    });

    res.json({ success: true, roomId: id, partsCount: activeRooms[id].parts.length });
  });

  // Map of active Websocket -> Room ID and Player ID
  const socketMeta = new Map<WebSocket, { roomId: string; playerId: string }>();

  wss.on('connection', (ws) => {
    console.log('[WS] New client connected');

    ws.on('message', (messageBuffer) => {
      try {
        const messageString = messageBuffer.toString();
        const msg = JSON.parse(messageString);

        if (msg.type === 'join') {
          const { roomId, playerId, username, color, parts } = msg.payload;
          
          // Setup room if it doesn't exist
          if (!activeRooms[roomId]) {
            activeRooms[roomId] = {
              id: roomId,
              name: `Wi-Fi Room ${roomId.substring(0, 5)}`,
              parts: parts || [],
              players: {}
            };
          }

          socketMeta.set(ws, { roomId, playerId });

          // Register player
          activeRooms[roomId].players[playerId] = {
            id: playerId,
            username: username || 'Guest',
            position: [0, 1.5, 0],
            rotation: 0,
            velocity: [0, 0, 0],
            isGrounded: true,
            animation: 'idle',
            coins: 0,
            color: color || '#ff3b30'
          };

          console.log(`[WS] ${username} joined Room: ${roomId}`);

          // 1. Send initialization details to the joining player (world state + current players)
          ws.send(JSON.stringify({
            type: 'init',
            payload: {
              roomId,
              parts: activeRooms[roomId].parts,
              players: activeRooms[roomId].players,
            }
          }));

          // 2. Broadcast member join to others in the same room
          broadcastToRoom(roomId, {
            type: 'join',
            senderId: playerId,
            payload: {
              player: activeRooms[roomId].players[playerId]
            }
          }, ws);

        } else {
          // General client messages (movement, updates, chats, level edits)
          const meta = socketMeta.get(ws);
          if (!meta) return;

          const { roomId, playerId } = meta;
          const room = activeRooms[roomId];
          if (!room) return;

          if (msg.type === 'update') {
            const playerState = room.players[playerId];
            if (playerState) {
              // Update state
              Object.assign(playerState, msg.payload);
              // Simple broadcast with position & orientation
              broadcastToRoom(roomId, {
                type: 'update',
                senderId: playerId,
                payload: msg.payload
              }, ws);
            }
          } else if (msg.type === 'chat') {
            broadcastToRoom(roomId, {
              type: 'chat',
              senderId: playerId,
              payload: {
                username: room.players[playerId]?.username || 'Guest',
                text: msg.payload.text,
                color: room.players[playerId]?.color || '#ffffff'
              }
            });
          } else if (msg.type === 'level_sync') {
            room.parts = msg.payload.parts || [];
            broadcastToRoom(roomId, {
              type: 'level_sync',
              senderId: playerId,
              payload: room.parts
            }, ws);
          } else if (msg.type === 'collect_coin') {
            const { coinId, rewardCoins } = msg.payload;
            const player = room.players[playerId];
            if (player) {
              player.coins += (rewardCoins || 1);
            }
            // Broadcast the collection to remove the coin for everyone in this game session
            broadcastToRoom(roomId, {
              type: 'collect_coin',
              senderId: playerId,
              payload: { coinId, playerId, coins: player?.coins || 0 }
            });
          } else if (msg.type === 'reset_level') {
            broadcastToRoom(roomId, {
              type: 'reset_level',
              senderId: playerId
            });
          }
        }
      } catch (err) {
        console.error('[WS] Error processing message:', err);
      }
    });

    ws.on('close', () => {
      const meta = socketMeta.get(ws);
      if (meta) {
        const { roomId, playerId } = meta;
        console.log(`[WS] Client disconnected. Room: ${roomId}, Player: ${playerId}`);
        
        const room = activeRooms[roomId];
        if (room) {
          const p = room.players[playerId];
          delete room.players[playerId];
          
          // Clean empty room to free memory after a while
          if (Object.keys(room.players).length === 0) {
            // Wait 10 seconds before clean up to allow reconnecting
            setTimeout(() => {
              if (activeRooms[roomId] && Object.keys(activeRooms[roomId].players).length === 0) {
                console.log(`[WS] Cleaning up empty room: ${roomId}`);
                delete activeRooms[roomId];
              }
            }, 15000);
          }

          // Broadcast leave event
          broadcastToRoom(roomId, {
            type: 'leave',
            senderId: playerId,
            payload: {
              username: p?.username || 'Guest'
            }
          });
        }
        socketMeta.delete(ws);
      }
    });
  });

  // Helper to send to everyone in room except optional excluder
  function broadcastToRoom(roomId: string, messageObj: any, excludeWs?: WebSocket) {
    const rawMessage = JSON.stringify(messageObj);
    for (const [ws, meta] of socketMeta.entries()) {
      if (meta.roomId === roomId && ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
        ws.send(rawMessage);
      }
    }
  }

  // Handle upgrade header for ws binding
  server.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;
    
    // Bind to /ws endpoint
    if (pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
    }
  });

  // Serve static UI assets or connect Vite developer server
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER] FlexBlox is listening at http://0.0.0.0:${PORT}`);
  });
}

startServer();
