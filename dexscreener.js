const API_BASE_URL = 'https://api.dexscreener.com/latest/dex/pairs/solana';
const PRESET_TOKENS = {
  'TROLL': '5UUH9RTDiSpq6HKS6bp4NdU9PNJpXRXuiw6ShBTBhgH2',
  'AURA': 'DtR4D9FtVoTX2569gaL837ZgrB6wNjj6tkmnX9Rdk9B2',
  'FARTCOIN': '9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump',
  'GIGA': '63LfDmNb3MQ8mw9MtZ2To9bEA2M71kZUUGq5tiJxcqj9',
};

const DEFAULT_DATA = { 
  symbol: 'UNKNOWN', 
  buys: 0, 
  sells: 0, 
  volume: 0, 
  priceChange: 0,
  priceChange24h: 0
};

export class DexScreenerAPI {
  constructor() {
    this.cache = new Map();
    this.baseCacheDuration = 60000; // 60 sec base duration
    this.requestQueue = new Map(); // Track ongoing requests
    this.rateLimitDelay = 0; // Current delay for rate limiting
    this.maxRetries = 3;
    this.baseDelay = 1000; // 1 second base delay
    this.batchQueue = [];
    this.batchTimeout = null;
    this.batchDelay = 500; // 500ms batch delay
    this.requestCount = 0;
    this.errorCount = 0;
    this.lastResetTime = Date.now();
  }

  async getTokenData(tokenIdentifier) {
    const isPreset = PRESET_TOKENS.hasOwnProperty(tokenIdentifier);
    const address = isPreset ? PRESET_TOKENS[tokenIdentifier] : tokenIdentifier;

    const cacheKey = tokenIdentifier;
    const cached = this.cache.get(cacheKey);
    const dynamicCacheDuration = this.getDynamicCacheDuration();
    if (cached && (Date.now() - cached.timestamp < dynamicCacheDuration)) {
      return cached.data;
    }

    // Check if request is already in progress
    if (this.requestQueue.has(cacheKey)) {
      return await this.requestQueue.get(cacheKey);
    }

    // Create request promise and add to queue
    const requestPromise = this.fetchWithRetry(tokenIdentifier, address, isPreset);
    this.requestQueue.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;
      return result;
    } finally {
      // Remove from queue when done
      this.requestQueue.delete(cacheKey);
    }
  }

  async fetchWithRetry(tokenIdentifier, address, isPreset, retryCount = 0) {
    try {
      // Apply rate limiting delay
      if (this.rateLimitDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
      }

      const endpoint = isPreset
        ? `${API_BASE_URL}/${address}`
        : `https://api.dexscreener.com/latest/dex/tokens/${address}`;

      const response = await fetch(endpoint);
      
      // Handle rate limiting
      if (response.status === 429) {
        if (retryCount < this.maxRetries) {
          const delay = this.baseDelay * Math.pow(2, retryCount); // Exponential backoff
          this.rateLimitDelay = delay;
          console.warn(`Rate limited, retrying in ${delay}ms (attempt ${retryCount + 1}/${this.maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.fetchWithRetry(tokenIdentifier, address, isPreset, retryCount + 1);
        } else {
          throw new Error('Rate limit exceeded, max retries reached');
        }
      }

      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

      // Reset rate limit delay on success
      this.rateLimitDelay = Math.max(0, this.rateLimitDelay - 100);

      const data = await response.json();
      let pair = data.pair || (data.pairs?.length && data.pairs.sort((a,b) =>
        (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0]);

      if (!pair) return { ...DEFAULT_DATA, symbol: 'UNKNOWN' };

      const tokenData = {
        symbol: pair.baseToken?.symbol || 'UNKNOWN',
        buys: pair.txns?.h1?.buys || 0,
        sells: pair.txns?.h1?.sells || 0,
        volume: pair.volume?.h1 || 0,
        priceChange: pair.priceChange?.h1 || 0,
        priceChange24h: pair.priceChange?.h24 || 0,
      };

      this.cache.set(tokenIdentifier, { data: tokenData, timestamp: Date.now() });
      this.requestCount++;
      return tokenData;

    } catch (err) {
      if (retryCount < this.maxRetries && err.message.includes('Rate limit')) {
        const delay = this.baseDelay * Math.pow(2, retryCount);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.fetchWithRetry(tokenIdentifier, address, isPreset, retryCount + 1);
      }
      
      this.errorCount++;
      console.error(`Dexscreener error for ${tokenIdentifier}:`, err);
      return { ...DEFAULT_DATA, symbol: tokenIdentifier.slice(0, 5).toUpperCase() };
    }
  }

  // Dynamic cache duration based on traffic and error rate
  getDynamicCacheDuration() {
    const now = Date.now();
    const timeSinceReset = now - this.lastResetTime;
    
    // Reset counters every 5 minutes
    if (timeSinceReset > 300000) {
      this.requestCount = 0;
      this.errorCount = 0;
      this.lastResetTime = now;
    }
    
    // Calculate error rate
    const errorRate = this.requestCount > 0 ? this.errorCount / this.requestCount : 0;
    
    // Adjust cache duration based on conditions
    let multiplier = 1;
    
    // High error rate = longer cache
    if (errorRate > 0.2) {
      multiplier = 3;
    } else if (errorRate > 0.1) {
      multiplier = 2;
    }
    
    // High request rate = longer cache
    if (this.requestCount > 50) {
      multiplier = Math.max(multiplier, 2);
    }
    
    // Rate limiting active = much longer cache
    if (this.rateLimitDelay > 0) {
      multiplier = Math.max(multiplier, 5);
    }
    
    return this.baseCacheDuration * multiplier;
  }

  // Batch multiple token requests for better efficiency
  async getMultipleTokenData(tokenIdentifiers) {
    const results = new Map();
    const uncachedTokens = [];

    // Check cache first
    for (const tokenIdentifier of tokenIdentifiers) {
      const cached = this.cache.get(tokenIdentifier);
      if (cached && (Date.now() - cached.timestamp < this.cacheDuration)) {
        results.set(tokenIdentifier, cached.data);
      } else {
        uncachedTokens.push(tokenIdentifier);
      }
    }

    // If all tokens are cached, return immediately
    if (uncachedTokens.length === 0) {
      return results;
    }

    // Batch process uncached tokens
    const batchPromises = uncachedTokens.map(tokenIdentifier => {
      return this.getTokenData(tokenIdentifier).then(data => ({
        tokenIdentifier,
        data
      }));
    });

    try {
      // Process in parallel with controlled concurrency
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const { tokenIdentifier, data } = result.value;
          results.set(tokenIdentifier, data);
        } else {
          // Handle failed requests
          const tokenIdentifier = uncachedTokens[index];
          results.set(tokenIdentifier, { 
            ...DEFAULT_DATA, 
            symbol: tokenIdentifier.slice(0, 5).toUpperCase() 
          });
        }
      });
    } catch (err) {
      console.error('Batch token data fetch error:', err);
    }

    return results;
  }
}