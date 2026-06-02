/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NetworkMessage, PlayerState, PartData } from '../types';

export class MultiplayerClient {
  private ws: WebSocket | null = null;
  private onMessageCallback: (msg: NetworkMessage) => void = () => {};
  private reconnectTimeout: any = null;
  private isConnected = false;
  
  // Storage for connection info
  private currentRoomId = '';
  private currentPlayerId = '';
  private currentUsername = '';
  private currentColor = '';
  private currentParts: PartData[] = [];

  constructor(onMessage: (msg: NetworkMessage) => void) {
    this.onMessageCallback = onMessage;
  }

  public connect(roomId: string, playerId: string, username: string, color: string, initialParts: PartData[]) {
    this.currentRoomId = roomId;
    this.currentPlayerId = playerId;
    this.currentUsername = username;
    this.currentColor = color;
    this.currentParts = initialParts;

    if (this.ws) {
      this.close();
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      console.log(`[Multiplayer] Connecting to ${wsUrl} for Room: ${roomId}`);
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[Multiplayer] Web Socket Connected!');
        this.isConnected = true;
        
        // Autojoin right after connection
        this.send({
          type: 'join',
          senderId: playerId,
          payload: {
            roomId,
            playerId,
            username,
            color,
            parts: initialParts
          }
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const msg: NetworkMessage = JSON.parse(event.data);
          this.onMessageCallback(msg);
        } catch (err) {
          console.error('[Multiplayer] Failed parse packet:', err);
        }
      };

      this.ws.onclose = (event) => {
        console.log('[Multiplayer] WebSocket closed:', event.reason);
        this.isConnected = false;
        // Schedule auto-reconnect
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('[Multiplayer] WebSocket error occurred:', error);
        this.isConnected = false;
      };

    } catch (err) {
      console.error('[Multiplayer] Connection setup exception:', err);
      this.isConnected = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => {
      console.log('[Multiplayer] Attempting reconnection...');
      this.connect(
        this.currentRoomId,
        this.currentPlayerId,
        this.currentUsername,
        this.currentColor,
        this.currentParts
      );
    }, 5000); // Retry every 5s
  }

  public send(msg: NetworkMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  public updateState(position: [number, number, number], rotation: number, velocity: [number, number, number], isGrounded: boolean, animation: string) {
    if (!this.isConnected) return;
    this.send({
      type: 'update',
      senderId: this.currentPlayerId,
      payload: {
        position,
        rotation,
        velocity,
        isGrounded,
        animation
      }
    });
  }

  public sendChat(text: string) {
    this.send({
      type: 'chat',
      senderId: this.currentPlayerId,
      payload: { text }
    });
  }

  public sendCoinCollected(coinId: string, rewardCoins: number) {
    this.send({
      type: 'collect_coin',
      senderId: this.currentPlayerId,
      payload: { coinId, rewardCoins }
    });
  }

  public sendLevelParts(parts: PartData[]) {
    this.currentParts = parts;
    this.send({
      type: 'level_sync',
      senderId: this.currentPlayerId,
      payload: { parts }
    });
  }

  public sendResetLevel() {
    this.send({
      type: 'reset_level',
      senderId: this.currentPlayerId
    });
  }

  public close() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }

  public isSocketOpen(): boolean {
    return this.isConnected;
  }
}
