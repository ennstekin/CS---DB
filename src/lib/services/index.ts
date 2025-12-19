/**
 * Service Instances
 * Singleton pattern for service layer
 */

import { supabase } from '../supabase';
import { IkasAuth } from '../infrastructure/ikas/auth';
import { IkasClient } from '../infrastructure/ikas/client';
import { OrderService } from './order-service';

let orderServiceInstance: OrderService | null = null;

/**
 * Get OrderService instance (singleton)
 */
export async function getOrderService(): Promise<OrderService> {
  if (orderServiceInstance) {
    return orderServiceInstance;
  }

  // Fetch İkas credentials from Supabase
  const { data: settings, error } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', ['ikas_client_id', 'ikas_client_secret', 'ikas_store_name']);

  if (error) {
    throw new Error(`Failed to fetch İkas settings: ${error.message}`);
  }

  const settingsMap: Record<string, string> = {};
  settings?.forEach((row) => {
    settingsMap[row.key] = row.value;
  });

  if (!settingsMap.ikas_client_id || !settingsMap.ikas_client_secret || !settingsMap.ikas_store_name) {
    throw new Error('İkas credentials not configured');
  }

  // Create instances
  const auth = new IkasAuth({
    clientId: settingsMap.ikas_client_id,
    clientSecret: settingsMap.ikas_client_secret,
    storeName: settingsMap.ikas_store_name,
  });

  const client = new IkasClient(auth);
  orderServiceInstance = new OrderService(client);

  return orderServiceInstance;
}
