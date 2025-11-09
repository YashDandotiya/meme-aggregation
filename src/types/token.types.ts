export interface TokenData {
  token_address: string;
  token_name: string;
  token_ticker: string;
  price_sol: number;
  market_cap_sol: number;
  volume_sol: number;
  liquidity_sol: number;
  transaction_count: number;
  price_1hr_change: number;
  price_24hr_change?: number;
  protocol: string;
  last_updated: number;
}

export interface DexScreenerToken {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceNative: string;
  priceUsd: string;
  txns: {
    h1: { buys: number; sells: number };
    h24: { buys: number; sells: number };
  };
  volume: { h24: number };
  priceChange: { h1: number; h24: number };
  liquidity: { usd: number; base: number; quote: number };
  fdv: number;
}

export interface JupiterPrice {
  id: string;
  mintSymbol: string;
  vsToken: string;
  vsTokenSymbol: string;
  price: number;
}

export interface PaginationParams {
  limit: number;
  cursor?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  next_cursor: string | null;
  has_more: boolean;
}

export type SortField = 'volume' | 'price_change' | 'market_cap' | 'liquidity';
export type TimeFrame = '1h' | '24h' | '7d';

// ==================== FILE: src/types/websocket.types.ts ====================
export interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'price_update' | 'volume_spike';
  data?: any;
}

export interface PriceUpdateMessage {
  type: 'price_update';
  token_address: string;
  price_sol: number;
  price_1hr_change: number;
  timestamp: number;
}

export interface VolumeSpike {
  type: 'volume_spike';
  token_address: string;
  volume_change_percent: number;
  new_volume: number;
  timestamp: number;
}