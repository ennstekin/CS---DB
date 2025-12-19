/**
 * Domain Value Objects
 */

/**
 * OrderNumber value object
 * Encapsulates order number extraction logic
 */
export class OrderNumber {
  private constructor(private readonly value: string) {}

  static fromText(text: string): OrderNumber | null {
    const patterns = [
      /#(\d{4,})/i,                                          // #12345
      /(\d{4,})\s*numaralı\s*sipariş/i,                     // 12345 numaralı sipariş
      /sipariş\s*(?:no|numarası)?:?\s*#?(\d{4,})/i,        // sipariş no: 12345
      /(\d{4,})\s*(?:nolu|numaralı)\s*order/i,             // 12345 numaralı order
      /order\s*(?:no|number)?:?\s*#?(\d{4,})/i,            // order no: 12345
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) {
        return new OrderNumber(match[1]);
      }
    }

    return null;
  }

  getValue(): string {
    return this.value;
  }

  toString(): string {
    return this.value;
  }
}

/**
 * Check if text contains order-related keywords
 */
export function isOrderRelated(text: string): boolean {
  const keywords = /sipariş|order|kargo|cargo|takip|tracking/i;
  return keywords.test(text);
}
