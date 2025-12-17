import { GraphQLClient } from "graphql-request";
import type { IkasGraphQLResponse, IkasOrdersResponse, IkasOrder } from "@/types/ikas";

const IKAS_API_URL = process.env.IKAS_API_URL || "https://api.myikas.com/api/v1/admin/graphql";
const IKAS_ACCESS_TOKEN = process.env.IKAS_ACCESS_TOKEN || "";

class IkasClient {
  private client: GraphQLClient;

  constructor() {
    this.client = new GraphQLClient(IKAS_API_URL, {
      headers: {
        Authorization: `Bearer ${IKAS_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Fetch all orders with pagination
   */
  async getOrders(limit: number = 50, cursor?: string): Promise<IkasOrdersResponse> {
    const query = `
      query GetOrders($first: Int!, $after: String) {
        orders(first: $first, after: $after) {
          edges {
            node {
              id
              orderNumber
              status
              financialStatus
              fulfillmentStatus
              totalPrice
              currency
              createdAt
              updatedAt
              customer {
                id
                firstName
                lastName
                email
                phone
              }
              shippingAddress {
                firstName
                lastName
                address1
                address2
                city
                province
                country
                zip
                phone
              }
              billingAddress {
                firstName
                lastName
                address1
                address2
                city
                province
                country
                zip
                phone
              }
              lineItems {
                edges {
                  node {
                    id
                    productId
                    variantId
                    name
                    variantName
                    sku
                    quantity
                    price
                    totalPrice
                    image {
                      url
                    }
                  }
                }
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    const variables = {
      first: limit,
      ...(cursor && { after: cursor }),
    };

    try {
      const response = await this.client.request<IkasOrdersResponse>(query, variables);
      return response;
    } catch (error) {
      console.error("Ikas API Error:", error);
      throw new Error("Failed to fetch orders from Ikas");
    }
  }

  /**
   * Get a single order by ID
   */
  async getOrderById(orderId: string): Promise<IkasOrder | null> {
    const query = `
      query GetOrder($id: ID!) {
        order(id: $id) {
          id
          orderNumber
          status
          financialStatus
          fulfillmentStatus
          totalPrice
          currency
          createdAt
          updatedAt
          customer {
            id
            firstName
            lastName
            email
            phone
          }
          shippingAddress {
            firstName
            lastName
            address1
            address2
            city
            province
            country
            zip
            phone
          }
          billingAddress {
            firstName
            lastName
            address1
            address2
            city
            province
            country
            zip
            phone
          }
          lineItems {
            edges {
              node {
                id
                productId
                variantId
                name
                variantName
                sku
                quantity
                price
                totalPrice
                image {
                  url
                }
              }
            }
          }
        }
      }
    `;

    try {
      const response = await this.client.request<{ order: IkasOrder }>(query, { id: orderId });
      return response.order;
    } catch (error) {
      console.error("Ikas API Error:", error);
      return null;
    }
  }

  /**
   * Search orders by order number
   */
  async searchOrderByNumber(orderNumber: string): Promise<IkasOrder | null> {
    const query = `
      query SearchOrder($query: String!) {
        orders(first: 1, query: $query) {
          edges {
            node {
              id
              orderNumber
              status
              financialStatus
              fulfillmentStatus
              totalPrice
              currency
              createdAt
              updatedAt
              customer {
                id
                firstName
                lastName
                email
                phone
              }
              lineItems {
                edges {
                  node {
                    id
                    name
                    quantity
                    price
                  }
                }
              }
            }
          }
        }
      }
    `;

    try {
      const response = await this.client.request<IkasOrdersResponse>(query, {
        query: `orderNumber:${orderNumber}`,
      });

      if (response.orders.edges.length > 0) {
        return response.orders.edges[0].node;
      }
      return null;
    } catch (error) {
      console.error("Ikas API Error:", error);
      return null;
    }
  }

  /**
   * Get orders by customer email
   */
  async getOrdersByCustomerEmail(email: string): Promise<IkasOrder[]> {
    const query = `
      query GetCustomerOrders($query: String!) {
        orders(first: 50, query: $query) {
          edges {
            node {
              id
              orderNumber
              status
              totalPrice
              currency
              createdAt
              customer {
                id
                firstName
                lastName
                email
              }
            }
          }
        }
      }
    `;

    try {
      const response = await this.client.request<IkasOrdersResponse>(query, {
        query: `email:${email}`,
      });

      return response.orders.edges.map((edge) => edge.node);
    } catch (error) {
      console.error("Ikas API Error:", error);
      return [];
    }
  }
}

// Export singleton instance
export const ikasClient = new IkasClient();
