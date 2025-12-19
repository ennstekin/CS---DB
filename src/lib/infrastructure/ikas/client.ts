/**
 * İkas GraphQL Client
 * Single Responsibility: Execute GraphQL queries
 */

import { IkasAuth } from './auth';
import { GET_ORDER_BY_NUMBER_QUERY, GET_ORDERS_BY_EMAIL_QUERY } from './queries';

export class IkasClient {
  private readonly graphqlUrl = 'https://api.myikas.com/api/v1/admin/graphql';

  constructor(private auth: IkasAuth) {}

  /**
   * Execute GraphQL query
   */
  private async query<T>(query: string, variables?: Record<string, any>): Promise<T> {
    const token = await this.auth.getAccessToken();

    const response = await fetch(this.graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      const errorText = await response.text();

      // Handle rate limit
      if (response.status === 429) {
        throw new Error('RATE_LIMIT: Too many requests to İkas API');
      }

      throw new Error(`İkas GraphQL failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();

    if (result.errors) {
      throw new Error(`İkas GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    return result.data;
  }

  /**
   * Get order by order number
   */
  async getOrderByNumber(orderNumber: string): Promise<any | null> {
    console.log('📦 İkas: Querying order by number:', orderNumber);

    try {
      const data: any = await this.query(GET_ORDER_BY_NUMBER_QUERY, { orderNumber });

      const order = data.listOrder?.data?.[0];

      if (!order) {
        console.log('⚠️ İkas: Order not found:', orderNumber);
        return null;
      }

      console.log('✅ İkas: Order found:', order.orderNumber);
      return order;

    } catch (error) {
      console.error('❌ İkas: getOrderByNumber error:', error);
      throw error;
    }
  }

  /**
   * Get orders by customer email
   */
  async getOrdersByEmail(email: string, limit: number = 10): Promise<any[]> {
    // Clean email (remove name if present)
    const cleanEmail = email.includes('<')
      ? email.split('<')[1].split('>')[0].trim()
      : email.trim();

    console.log('📧 İkas: Querying orders by email:', cleanEmail, 'Limit:', limit);

    try {
      const data: any = await this.query(GET_ORDERS_BY_EMAIL_QUERY, {
        limit,
        emailQuery: `email:${cleanEmail}`
      });

      if (!data.orders?.edges) {
        console.log('⚠️ İkas: No orders found for email:', cleanEmail);
        return [];
      }

      const orders = data.orders.edges.map((edge: any) => edge.node);
      console.log(`✅ İkas: Found ${orders.length} order(s) for email:`, cleanEmail);

      return orders;

    } catch (error) {
      console.error('❌ İkas: getOrdersByEmail error:', error);
      throw error;
    }
  }
}
