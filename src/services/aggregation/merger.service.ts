import { TokenData } from '../../types/token.types';
import { logger } from '../../utils/logger';

export class TokenMergerService {
  mergeTokens(tokensList: TokenData[][]): TokenData[] {
    const tokenMap = new Map<string, TokenData[]>();

    // Group tokens by address
    for (const tokens of tokensList) {
      for (const token of tokens) {
        const existing = tokenMap.get(token.token_address) || [];
        existing.push(token);
        tokenMap.set(token.token_address, existing);
      }
    }

    // Merge duplicates
    const mergedTokens: TokenData[] = [];
    
    for (const [address, tokens] of tokenMap.entries()) {
      if (tokens.length === 1) {
        mergedTokens.push(tokens[0]);
      } else {
        mergedTokens.push(this.mergeDuplicates(tokens));
      }
    }

    return mergedTokens;
  }

  private mergeDuplicates(tokens: TokenData[]): TokenData {
    const base = tokens[0];
    
    // Aggregate metrics across DEXs
    const totalVolume = tokens.reduce((sum, t) => sum + t.volume_sol, 0);
    const totalLiquidity = tokens.reduce((sum, t) => sum + t.liquidity_sol, 0);
    const totalTxns = tokens.reduce((sum, t) => sum + t.transaction_count, 0);
    
    // Take average price (weighted by liquidity)
    const totalLiq = tokens.reduce((sum, t) => sum + t.liquidity_sol, 0);
    const weightedPrice = tokens.reduce((sum, t) => {
      const weight = totalLiq > 0 ? t.liquidity_sol / totalLiq : 1 / tokens.length;
      return sum + (t.price_sol * weight);
    }, 0);

    // Take most recent price change
    const sortedByTime = [...tokens].sort((a, b) => b.last_updated - a.last_updated);
    const latestChange = sortedByTime[0].price_1hr_change;

    // Prefer protocol with highest liquidity
    const protocolWithMostLiq = tokens.reduce((prev, curr) => 
      curr.liquidity_sol > prev.liquidity_sol ? curr : prev
    );

    return {
      ...base,
      price_sol: weightedPrice,
      volume_sol: totalVolume,
      liquidity_sol: totalLiquidity,
      transaction_count: totalTxns,
      price_1hr_change: latestChange,
      protocol: `${tokens.length} DEXs (${protocolWithMostLiq.protocol})`,
      last_updated: Date.now(),
    };
  }

  deduplicateByAddress(tokens: TokenData[]): TokenData[] {
    const seen = new Set<string>();
    return tokens.filter(token => {
      if (seen.has(token.token_address)) {
        return false;
      }
      seen.add(token.token_address);
      return true;
    });
  }
}

export const tokenMergerService = new TokenMergerService();