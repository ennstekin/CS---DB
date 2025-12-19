/**
 * İkas GraphQL Queries
 * Centralized query definitions
 */

export const GET_ORDER_BY_NUMBER_QUERY = `
  query GetOrder($orderNumber: String!) {
    listOrder(orderNumber: { eq: $orderNumber }, pagination: { page: 1, limit: 1 }) {
      data {
        id
        orderNumber
        status
        customer {
          email
          firstName
          lastName
        }
        totalPrice
        netTotalFinalPrice
        shippingLines {
          price
          title
        }
        currencyCode
        orderedAt
        orderLineItems {
          id
          quantity
          price
          unitPrice
          finalPrice
          finalUnitPrice
          variant {
            name
          }
        }
        orderPackages {
          trackingInfo {
            trackingNumber
            trackingLink
            cargoCompany
          }
          orderPackageFulfillStatus
        }
      }
    }
  }
`;

export const GET_ORDERS_BY_EMAIL_QUERY = `
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
