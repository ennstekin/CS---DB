/**
 * Order Service
 * Single Responsibility: Order business logic + caching
 */

import { IkasClient } from '../infrastructure/ikas/client';
import { Order, mapIkasOrderToEntity } from '../domain/order';

interface CacheEntry {
  data: Order;
  expiresAt: number;
}

export class OrderService {
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL = 900000; // 15 minutes in milliseconds
  private readonly MAX_CACHE_SIZE = 100; // Prevent memory leak

  constructor(private ikasClient: IkasClient) {}

  /**
   * Get order by order number (with caching)
   */
  async getOrderByNumber(orderNumber: string): Promise<Order | null> {
    // 1. Check cache
    const cached = this.cache.get(`order:${orderNumber}`);
    if (cached && Date.now() < cached.expiresAt) {
      console.log('✅ Cache hit for order:', orderNumber);
      return cached.data;
    }

    // 2. Fetch from İkas
    try {
      const ikasOrder = await this.ikasClient.getOrderByNumber(orderNumber);

      if (!ikasOrder) {
        return null;
      }

      // 3. Map to domain entity
      const order = mapIkasOrderToEntity(ikasOrder);

      // 4. Cache it (with LRU-like eviction)
      if (this.cache.size >= this.MAX_CACHE_SIZE) {
        // Remove oldest entries (first 20%)
        const entriesToRemove = Math.floor(this.MAX_CACHE_SIZE * 0.2);
        const keys = Array.from(this.cache.keys()).slice(0, entriesToRemove);
        keys.forEach(key => this.cache.delete(key));
        console.log(`🗑️ Evicted ${entriesToRemove} old cache entries`);
      }

      this.cache.set(`order:${orderNumber}`, {
        data: order,
        expiresAt: Date.now() + this.CACHE_TTL
      });

      console.log('✅ Order cached:', orderNumber);
      return order;

    } catch (error) {
      // Handle rate limit gracefully
      if (error instanceof Error && error.message.includes('RATE_LIMIT')) {
        console.warn('⏸️ Rate limit hit, returning null');
        return null;
      }

      console.error('❌ Failed to fetch order:', error);
      throw error;
    }
  }

  /**
   * Get orders by customer email
   */
  async getOrdersByEmail(email: string, limit: number = 10): Promise<Order[]> {
    try {
      const ikasOrders = await this.ikasClient.getOrdersByEmail(email, limit);

      // Map to domain entities
      return ikasOrders.map(mapIkasOrderToEntity);

    } catch (error) {
      if (error instanceof Error && error.message.includes('RATE_LIMIT')) {
        console.warn('⏸️ Rate limit hit, returning empty array');
        return [];
      }

      console.error('❌ Failed to fetch orders by email:', error);
      throw error;
    }
  }

  /**
   * Clear cache (for testing/debugging)
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ Cache cleared');
  }

  /**
   * Get cache stats (for monitoring)
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }
}
