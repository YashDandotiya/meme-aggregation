import WebSocket from 'ws';
import { buildApp } from '../../src/app';
import { FastifyInstance } from 'fastify';
import { webSocketService } from '../../src/services/websocket/websocket.service';
describe('WebSocket Integration Tests', () => {
  let app: FastifyInstance;
  let ws: WebSocket;
  const PORT = 3001;

  beforeAll(async () => {
    app = await buildApp();
    await app.listen({ port: PORT, host: '0.0.0.0' });
  });

  afterAll(async () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
    await app.close();
  });

  it('should connect to WebSocket server', (done) => {
    ws = new WebSocket(`ws://localhost:${PORT}/ws`);

    ws.on('open', () => {
      expect(ws.readyState).toBe(WebSocket.OPEN);
      done();
    });

ws.on('message', (data: WebSocket.Data) => {
  const message = JSON.parse(data.toString());
    });
  });

  it('should handle subscribe message', (done) => {
    ws = new WebSocket(`ws://localhost:${PORT}/ws`);

    ws.on('open', () => {
      ws.send(JSON.stringify({
        type: 'subscribe',
        tokens: ['addr1', 'addr2'],
      }));

      setTimeout(() => {
        expect(ws.readyState).toBe(WebSocket.OPEN);
        done();
      }, 100);
    });
  });

  it('should receive price updates', (done) => {
  ws = new WebSocket(`ws://localhost:${PORT}/ws`);
  let messageReceived = false;

  ws.on('message', (data) => {
    if (messageReceived) return; // Prevent multiple done() calls
    
    const message = JSON.parse(data.toString());
    
    if (message.type === 'price_update') {
      messageReceived = true;
      expect(message).toHaveProperty('token_address');
      expect(message).toHaveProperty('price_sol');
      expect(message).toHaveProperty('timestamp');
      ws.close();
      done();
    }
  });

  ws.on('open', () => {
    // Subscribe to all tokens (empty array means subscribe to all)
    ws.send(JSON.stringify({ type: 'subscribe', tokens: [] }));
    
    // Manually trigger a price update after a short delay
    setTimeout(() => {
      webSocketService.broadcastPriceUpdate('test_token_address', {
        token_address: 'test_token_address',
        token_name: 'Test Token',
        token_ticker: 'TEST',
        price_sol: 0.5,
        market_cap_sol: 1000000,
        volume_sol: 50000,
        liquidity_sol: 100000,
        transaction_count: 500,
        price_1hr_change: 5.5,
        price_24hr_change: 10.2,
        protocol: 'raydium',
        last_updated: Date.now(),
      });
    }, 500);
  });

  ws.on('error', (error) => {
    if (!messageReceived) {
      done(error);
    }
  });

  ws.on('close', () => {
    if (!messageReceived) {
      done(new Error('WebSocket closed before receiving message'));
    }
  });
}, 10000);
});