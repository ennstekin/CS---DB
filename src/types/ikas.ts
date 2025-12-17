// Ikas API Types

export interface IkasOrder {
  id: string;
  orderNumber: string;
  status: string;
  financialStatus: string;
  fulfillmentStatus: string;
  customer: IkasCustomer;
  shippingAddress: IkasAddress;
  billingAddress: IkasAddress;
  lineItems: IkasLineItem[];
  totalPrice: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface IkasCustomer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface IkasAddress {
  firstName: string;
  lastName: string;
  address1: string;
  address2?: string;
  city: string;
  province: string;
  country: string;
  zip: string;
  phone: string;
}

export interface IkasLineItem {
  id: string;
  productId: string;
  variantId: string;
  name: string;
  variantName?: string;
  sku: string;
  quantity: number;
  price: string;
  totalPrice: string;
  image?: {
    url: string;
  };
}

export interface IkasProduct {
  id: string;
  name: string;
  description: string;
  variants: IkasVariant[];
  images: IkasImage[];
}

export interface IkasVariant {
  id: string;
  name: string;
  sku: string;
  price: string;
  inventoryQuantity: number;
}

export interface IkasImage {
  id: string;
  url: string;
  alt?: string;
}

// GraphQL Response Types
export interface IkasGraphQLResponse<T> {
  data: T;
  errors?: Array<{
    message: string;
    path?: string[];
  }>;
}

export interface IkasOrdersResponse {
  orders: {
    edges: Array<{
      node: IkasOrder;
    }>;
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string;
    };
  };
}
