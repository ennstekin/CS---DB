// İkas API Client
export interface IkasConfig {
  clientId: string;
  clientSecret: string;
  storeName: string; // Mağaza adı (örn: "mystore" -> mystore.myikas.com)
}

export interface IkasOrder {
  id: string;
  orderNumber: string;
  status: string;
  customerEmail: string;
  customerName: string;
  totalPrice: number;
  currency: string;
  createdAt: string;
  items: IkasOrderItem[];
  shippingInfo?: IkasShippingInfo;
}

export interface IkasOrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface IkasShippingInfo {
  trackingNumber?: string;
  trackingUrl?: string;
  carrier?: string;
  status?: string;
  estimatedDelivery?: string;
}

export interface IkasReturn {
  id: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerEmail: string;
  customerName: string;
  status: string;
  lineItems: IkasReturnLineItem[];
  totalRefundAmount: number;
  currency: string;
  requestedAt: string;
  updatedAt: string;
}

export interface IkasReturnLineItem {
  id: string;
  productName: string;
  variantName?: string;
  quantity: number;
  price: number;
  status: string;
}

export class IkasClient {
  private clientId: string;
  private clientSecret: string;
  private storeName: string;
  private baseUrl: string;
  private tokenUrl: string;
  private accessToken: string | null = null;
  private tokenExpiresAt: number | null = null;

  constructor(config: IkasConfig) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.storeName = config.storeName;
    this.baseUrl = 'https://api.myikas.com/api/v1/admin/graphql';
    // OAuth endpoint mağazaya özel: https://<store>.myikas.com/api/admin/oauth/token
    this.tokenUrl = `https://${config.storeName}.myikas.com/api/admin/oauth/token`;
  }

  /**
   * OAuth 2.0 ile access token al
   */
  private async getAccessToken(): Promise<string> {
    // Token hala geçerliyse mevcut token'ı kullan
    if (this.accessToken && this.tokenExpiresAt && Date.now() < this.tokenExpiresAt) {
      console.log('🔄 İkas: Using cached access token');
      return this.accessToken;
    }

    console.log('🔐 İkas: Requesting new access token from:', this.tokenUrl);
    console.log('📝 İkas: Client ID:', this.clientId.substring(0, 10) + '...');

    // Yeni token al
    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });

    console.log('📡 İkas: OAuth response status:', response.status, response.statusText);

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ İkas: OAuth failed:', error);
      throw new Error(`İkas authentication failed: ${error}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    // Token'ı biraz erken expire ettir (güvenlik için)
    this.tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;

    console.log('✅ İkas: Access token received, expires in', data.expires_in, 'seconds');

    return this.accessToken!;
  }

  /**
   * GraphQL query çalıştır
   */
  private async graphqlQuery<T>(query: string, variables?: any): Promise<T> {
    const token = await this.getAccessToken();

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`İkas GraphQL request failed: ${error}`);
    }

    const result = await response.json();

    if (result.errors) {
      throw new Error(`İkas GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    return result.data;
  }

  /**
   * Sipariş numarasına göre sipariş bilgilerini getir
   */
  async getOrderByNumber(orderNumber: string): Promise<IkasOrder | null> {
    console.log('🔍 İkas: Querying order by number:', orderNumber);

    const query = `
      query GetOrder($orderNumber: String!) {
        order(orderNumber: $orderNumber) {
          id
          orderNumber
          status
          customer {
            email
            name
          }
          totalPrice
          currency
          createdAt
          lineItems {
            id
            name
            quantity
            price
          }
          fulfillments {
            trackingNumber
            trackingUrl
            carrier
            status
          }
        }
      }
    `;

    try {
      const data: any = await this.graphqlQuery(query, { orderNumber });

      if (!data.order) {
        console.log('⚠️ İkas: Order not found:', orderNumber);
        return null;
      }

      const order = data.order;
      console.log('✅ İkas: Order found:', order.orderNumber, 'Status:', order.status);

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        customerEmail: order.customer?.email || '',
        customerName: order.customer?.name || '',
        totalPrice: order.totalPrice,
        currency: order.currency,
        createdAt: order.createdAt,
        items: order.lineItems?.map((item: any) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })) || [],
        shippingInfo: order.fulfillments?.[0] ? {
          trackingNumber: order.fulfillments[0].trackingNumber,
          trackingUrl: order.fulfillments[0].trackingUrl,
          carrier: order.fulfillments[0].carrier,
          status: order.fulfillments[0].status,
        } : undefined,
      };
    } catch (error) {
      console.error('İkas getOrderByNumber error:', error);
      return null;
    }
  }

  /**
   * Email adresine göre siparişleri getir
   */
  async getOrdersByEmail(email: string, limit: number = 10): Promise<IkasOrder[]> {
    console.log('📧 İkas: Querying orders by email:', email, 'Limit:', limit);

    // Email sadece @ öncesi kısmını al (isim ve < > kısmını atla)
    const emailAddress = email.includes('<')
      ? email.split('<')[1].split('>')[0].trim()
      : email.trim();

    console.log('📧 İkas: Cleaned email:', emailAddress);

    const query = `
      query GetOrdersByEmail($limit: Int!, $emailQuery: String!) {
        orders(first: $limit, query: $emailQuery) {
          edges {
            node {
              id
              orderNumber
              status
              customer {
                email
                name
              }
              totalPrice
              currency
              createdAt
              lineItems {
                id
                name
                quantity
                price
              }
            }
          }
        }
      }
    `;

    try {
      const data: any = await this.graphqlQuery(query, {
        limit,
        emailQuery: `email:${emailAddress}`
      });

      if (!data.orders?.edges) {
        console.log('⚠️ İkas: No orders found for email:', email);
        return [];
      }

      const orders = data.orders.edges;
      console.log(`✅ İkas: Found ${orders.length} order(s) for email:`, email);

      return orders.map((edge: any) => {
        const order = edge.node;
        return {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          customerEmail: order.customer?.email || '',
          customerName: order.customer?.name || '',
          totalPrice: order.totalPrice,
          currency: order.currency,
          createdAt: order.createdAt,
          items: order.lineItems?.map((item: any) => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
          })) || [],
        };
      });
    } catch (error) {
      console.error('İkas getOrdersByEmail error:', error);
      return [];
    }
  }

  /**
   * İade durumundaki siparişleri getir (son siparişlerden başlayarak)
   * @param maxReturns - Maksimum iade sayısı
   * @param pagesToScan - Taranacak sayfa sayısı (her sayfa 100 sipariş)
   */
  async getReturns(maxReturns: number = 50, pagesToScan: number = 10): Promise<IkasReturn[]> {
    console.log('🔄 İkas: Fetching returns from recent orders...');

    // Önce toplam sipariş sayısını al
    const countQuery = `{ listOrder(pagination: { page: 1, limit: 1 }) { count } }`;
    const countData: any = await this.graphqlQuery(countQuery, {});
    const totalOrders = countData.listOrder?.count || 0;
    const totalPages = Math.ceil(totalOrders / 100);

    console.log(`📊 İkas: Total orders: ${totalOrders}, pages: ${totalPages}`);

    const query = `
      query GetReturns($pagination: PaginationInput) {
        listOrder(pagination: $pagination) {
          data {
            id
            orderNumber
            status
            currencyCode
            orderedAt
            customer {
              id
              email
              firstName
              lastName
            }
            orderLineItems {
              id
              status
              statusUpdatedAt
              quantity
              finalPrice
              variant {
                name
                productId
              }
            }
          }
        }
      }
    `;

    const returns: IkasReturn[] = [];
    const REFUND_STATUSES = [
      'REFUND_REQUESTED',
      'REFUND_REQUEST_ACCEPTED',
      'REFUND_IN_TRANSIT',
      'REFUND_DELIVERED',
      'REFUNDED',
      'REFUND_REJECTED'
    ];

    // Son sayfalardan başlayarak tara
    for (let page = totalPages; page > Math.max(0, totalPages - pagesToScan) && returns.length < maxReturns; page--) {
      try {
        const data: any = await this.graphqlQuery(query, {
          pagination: { page, limit: 100 }
        });

        if (!data.listOrder?.data) continue;

        for (const order of data.listOrder.data) {
          const refundItems = order.orderLineItems?.filter(
            (item: any) => REFUND_STATUSES.includes(item.status)
          ) || [];

          if (refundItems.length > 0) {
            const totalRefund = refundItems.reduce(
              (sum: number, item: any) => sum + (item.finalPrice || 0),
              0
            );

            const statuses = refundItems.map((item: any) => item.status);
            let returnStatus = 'REQUESTED';
            if (statuses.includes('REFUNDED')) returnStatus = 'COMPLETED';
            else if (statuses.includes('REFUND_REJECTED')) returnStatus = 'REJECTED';
            else if (statuses.includes('REFUND_DELIVERED')) returnStatus = 'RECEIVED';
            else if (statuses.includes('REFUND_IN_TRANSIT')) returnStatus = 'IN_TRANSIT';
            else if (statuses.includes('REFUND_REQUEST_ACCEPTED')) returnStatus = 'APPROVED';

            returns.push({
              id: `${order.id}-return`,
              orderId: order.id,
              orderNumber: order.orderNumber,
              customerId: order.customer?.id || '',
              customerEmail: order.customer?.email || '',
              customerName: `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim(),
              status: returnStatus,
              lineItems: refundItems.map((item: any) => ({
                id: item.id,
                productName: item.variant?.name || 'Ürün',
                variantName: item.variant?.name,
                quantity: item.quantity,
                price: item.finalPrice,
                status: item.status,
              })),
              totalRefundAmount: totalRefund,
              currency: order.currencyCode || 'TRY',
              requestedAt: refundItems[0]?.statusUpdatedAt || order.orderedAt,
              updatedAt: order.orderedAt,
            });
          }
        }
      } catch (err) {
        console.error(`Error fetching page ${page}:`, err);
      }
    }

    // En yeni iade talebi önce
    returns.sort((a, b) => Number(b.requestedAt) - Number(a.requestedAt));

    console.log(`✅ İkas: Found ${returns.length} return(s)`);
    return returns.slice(0, maxReturns);
  }
}

/**
 * Sipariş numarasını mail içeriğinden çıkar
 */
export function extractOrderNumber(text: string): string | null {
  // Türkçe sipariş numarası formatları:
  // #12345, #XXXX, sipariş: 12345, sipariş no: 12345
  const patterns = [
    /#(\d{4,})/i,                    // #12345
    /sipariş\s*(?:no|numarası)?:?\s*#?(\d{4,})/i,  // sipariş no: 12345
    /order\s*(?:no|number)?:?\s*#?(\d{4,})/i,      // order no: 12345
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}
