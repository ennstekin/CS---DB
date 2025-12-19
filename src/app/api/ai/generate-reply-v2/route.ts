/**
 * AI Reply Generation (Clean Architecture)
 * Version 2: Simplified, no queue complexity
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateMailResponse, type MailResponseRequest } from '@/lib/ai/mail-responder';
import { getOrderService } from '@/lib/services';
import { OrderNumber } from '@/lib/domain/value-objects';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body: MailResponseRequest = await request.json();

    // Validation
    if (!body.from || !body.subject || !body.body) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 1. Get OpenAI settings and AI knowledge base
    const { data: settings } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', [
        'openai_api_key',
        'openai_model',
        'ai_kb_shipping',
        'ai_kb_campaigns',
        'ai_kb_return_policy',
        'ai_kb_general',
        'ai_kb_store_info'
      ]);

    const settingsMap: Record<string, string> = {};
    settings?.forEach((row) => {
      settingsMap[row.key] = row.value;
    });

    const apiKey = settingsMap.openai_api_key?.trim().replace(/\s+/g, '');
    const model = settingsMap.openai_model || 'gpt-4o-mini';

    // Prepare knowledge base for AI
    const knowledgeBase = {
      storeInfo: settingsMap.ai_kb_store_info || '',
      shipping: settingsMap.ai_kb_shipping || '',
      campaigns: settingsMap.ai_kb_campaigns || '',
      returnPolicy: settingsMap.ai_kb_return_policy || '',
      general: settingsMap.ai_kb_general || '',
    };

    // 2. Try to get order data (if order number found)
    let orderData = null;

    try {
      const fullText = `${body.subject} ${body.body}`;
      console.log('🔍 Searching for order number in text:', {
        subject: body.subject,
        bodyPreview: body.body.substring(0, 100),
        fullTextLength: fullText.length
      });

      const orderNumber = OrderNumber.fromText(fullText);
      console.log('🔍 OrderNumber.fromText result:', orderNumber ? orderNumber.getValue() : 'null');

      if (orderNumber) {
        console.log('📦 Order number detected:', orderNumber.getValue());

        const orderService = await getOrderService();
        orderData = await orderService.getOrderByNumber(orderNumber.getValue());

        if (orderData) {
          console.log('✅ Order data fetched:', orderData.orderNumber);
        } else {
          console.log('⚠️ Order not found in İkas');
        }
      }
    } catch (error) {
      // İkas failure shouldn't break AI response
      console.error('⚠️ İkas query failed (continuing without order data):', error);
    }

    // 3. Generate AI response (with or without order data)
    const response = await generateMailResponse(
      body,
      model,
      apiKey,
      orderData,
      knowledgeBase
    );

    return NextResponse.json(response);

  } catch (error) {
    console.error('AI Reply Generation Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
