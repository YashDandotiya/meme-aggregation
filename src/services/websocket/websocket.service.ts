import { FastifyInstance } from 'fastify';
import { logger } from '../../utils/logger';
import { TokenData } from '../../types/token.types';

interface PriceUpdateMessage {
  type: 'price_update';
  token_address: string;
  price_sol: number;
  price_1hr_change: number;
  timestamp: number;
}

interface VolumeSpike {
  type: 'volume_spike';
  token_address: string;
  volume_change_percent: number;
  new_volume: number;
  timestamp: number;
}

export class WebSocketService {
  private connections = new Set<any>();
  private subscribedTokens = new Map<any, Set<string>>();

  initialize(fastify: FastifyInstance): void {
    // ✅ Key change: (socket, req) not (connection)
    fastify.get('/ws', { websocket: true }, (socket: any, req: any) => {
      this.handleConnection(socket);
    });
  }

  private handleConnection(socket: any): void {
    this.connections.add(socket);
    this.subscribedTokens.set(socket, new Set());
    
    logger.info('WebSocket client connected');

    // ✅ Direct socket access
    socket.on('message', (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        this.handleMessage(socket, data);
      } catch (error) {
        logger.error('WebSocket message error:', error);
      }
    });

    socket.on('close', () => {
      this.connections.delete(socket);
      this.subscribedTokens.delete(socket);
      logger.info('WebSocket client disconnected');
    });

    socket.on('error', (error: Error) => {
      logger.error('WebSocket error:', error);
    });
  }

  private handleMessage(socket: any, message: any): void {
    switch (message.type) {
      case 'subscribe':
        this.handleSubscribe(socket, message.tokens || []);
        break;
      case 'unsubscribe':
        this.handleUnsubscribe(socket, message.tokens || []);
        break;
      default:
        logger.warn('Unknown WebSocket message type:', message.type);
    }
  }

  private handleSubscribe(socket: any, tokens: string[]): void {
    const subscribed = this.subscribedTokens.get(socket);
    if (subscribed) {
      tokens.forEach(token => subscribed.add(token));
      logger.debug(`Client subscribed to ${tokens.length} tokens`);
    }
  }

  private handleUnsubscribe(socket: any, tokens: string[]): void {
    const subscribed = this.subscribedTokens.get(socket);
    if (subscribed) {
      tokens.forEach(token => subscribed.delete(token));
      logger.debug(`Client unsubscribed from ${tokens.length} tokens`);
    }
  }

  broadcastPriceUpdate(tokenAddress: string, newData: TokenData): void {
    const message: PriceUpdateMessage = {
      type: 'price_update',
      token_address: tokenAddress,
      price_sol: newData.price_sol,
      price_1hr_change: newData.price_1hr_change,
      timestamp: Date.now(),
    };

    this.broadcastToSubscribers(tokenAddress, message);
  }

  broadcastVolumeSpike(tokenAddress: string, oldVolume: number, newVolume: number): void {
    const changePercent = ((newVolume - oldVolume) / oldVolume) * 100;
    
    if (changePercent < 50) return;

    const message: VolumeSpike = {
      type: 'volume_spike',
      token_address: tokenAddress,
      volume_change_percent: changePercent,
      new_volume: newVolume,
      timestamp: Date.now(),
    };

    this.broadcastToSubscribers(tokenAddress, message);
  }

  private broadcastToSubscribers(tokenAddress: string, message: any): void {
    let count = 0;
    
    for (const [socket, tokens] of this.subscribedTokens.entries()) {
      if (tokens.has(tokenAddress) || tokens.size === 0) {
        try {
          socket.send(JSON.stringify(message));
          count++;
        } catch (error) {
          logger.error('Error sending WebSocket message:', error);
        }
      }
    }

    if (count > 0) {
      logger.debug(`Broadcasted ${message.type} to ${count} clients`);
    }
  }

  broadcastToAll(message: any): void {
    const payload = JSON.stringify(message);
    
    for (const socket of this.connections) {
      try {
        socket.send(payload);
      } catch (error) {
        logger.error('Error broadcasting to all:', error);
      }
    }
  }

  getConnectionCount(): number {
    return this.connections.size;
  }
}

export const webSocketService = new WebSocketService();