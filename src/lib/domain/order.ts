/**
 * Order Domain Entity
 */

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface ShippingInfo {
  trackingNumber?: string;
  trackingUrl?: string;
  carrier?: string;
  status?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: string;
  customerEmail: string;
  customerName: string;
  totalPrice: number;
  shippingPrice: number;
  currency: string;
  createdAt: string;
  items: OrderItem[];
  shippingInfo?: ShippingInfo;
}

/**
 * Map İkas raw data to Order domain entity
 */
export function mapIkasOrderToEntity(ikasOrder: any): Order {
  const customerName = ikasOrder.customer?.firstName && ikasOrder.customer?.lastName
    ? `${ikasOrder.customer.firstName} ${ikasOrder.customer.lastName}`
    : ikasOrder.customer?.firstName || ikasOrder.customer?.lastName || '';

  return {
    id: ikasOrder.id,
    orderNumber: ikasOrder.orderNumber,
    status: ikasOrder.status,
    customerEmail: ikasOrder.customer?.email || '',
    customerName,
    totalPrice: ikasOrder.netTotalFinalPrice || ikasOrder.totalPrice || 0,
    shippingPrice: ikasOrder.shippingLines?.reduce((sum: number, line: any) => sum + (line.price || 0), 0) || 0,
    currency: ikasOrder.currencyCode || 'TRY',
    createdAt: ikasOrder.orderedAt || ikasOrder.createdAt,
    items: (ikasOrder.orderLineItems || []).map((item: any) => ({
      id: item.id,
      name: item.variant?.name || 'Ürün',
      quantity: item.quantity,
      price: item.finalUnitPrice || item.unitPrice || item.finalPrice || item.price || 0,
    })),
    shippingInfo: ikasOrder.orderPackages?.[0] ? {
      trackingNumber: ikasOrder.orderPackages[0].trackingInfo?.trackingNumber || 'Henüz atanmadı',
      trackingUrl: ikasOrder.orderPackages[0].trackingInfo?.trackingLink,
      carrier: ikasOrder.orderPackages[0].trackingInfo?.cargoCompany || 'Kargo şirketi',
      status: ikasOrder.orderPackages[0].orderPackageFulfillStatus || 'Hazırlanıyor',
    } : undefined,
  };
}
