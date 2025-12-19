/**
 * Get Order Details by Order Number
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOrderService } from '@/lib/services';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const { orderNumber } = await params;

    if (!orderNumber) {
      return NextResponse.json(
        { error: 'Order number is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Fetching order details for:', orderNumber);

    const orderService = await getOrderService();
    const order = await orderService.getOrderByNumber(orderNumber);

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    console.log('✅ Order details fetched:', order.orderNumber);
    return NextResponse.json(order);

  } catch (error) {
    console.error('❌ Error fetching order:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
