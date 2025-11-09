import { tokenMergerService } from '../../src/services/aggregation/merger.service';
import { TokenData } from '../../src/types/token.types';

describe('TokenMergerService', () => {
  const mockToken1: TokenData = {
    token_address: 'addr1',
    token_name: 'Token1',
    token_ticker: 'TK1',
    price_sol: 0.5,
    market_cap_sol: 1000,
    volume_sol: 100,
    liquidity_sol: 50,
    transaction_count: 200,
    price_1hr_change: 5,
    protocol: 'Raydium',
    last_updated: Date.now(),
  };

  const mockToken2: TokenData = {
    ...mockToken1,
    volume_sol: 150,
    liquidity_sol: 75,
    protocol: 'Orca',
  };

  it('should merge duplicate tokens correctly', () => {
    const result = tokenMergerService.mergeTokens([[mockToken1], [mockToken2]]);
    
    expect(result).toHaveLength(1);
    expect(result[0].volume_sol).toBe(250); // 100 + 150
    expect(result[0].liquidity_sol).toBe(125); // 50 + 75
  });

  it('should keep unique tokens separate', () => {
    const token3: TokenData = { ...mockToken1, token_address: 'addr2' };
    
    const result = tokenMergerService.mergeTokens([[mockToken1], [token3]]);
    
    expect(result).toHaveLength(2);
  });

  it('should deduplicate by address', () => {
    const tokens = [mockToken1, mockToken1, mockToken2];
    const result = tokenMergerService.deduplicateByAddress(tokens);
    
    expect(result).toHaveLength(1);
  });
});
