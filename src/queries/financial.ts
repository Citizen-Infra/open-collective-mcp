export const GET_BALANCE = `
  query GetBalance($slug: String!) {
    account(slug: $slug) {
      name
      currency
      stats {
        balance {
          valueInCents
          currency
        }
        totalAmountReceived {
          valueInCents
          currency
        }
        totalAmountSpent {
          valueInCents
          currency
        }
        totalPaidExpenses {
          valueInCents
          currency
        }
      }
    }
  }
`;

export const LIST_TRANSACTIONS = `
  query ListTransactions($account: [AccountReferenceInput!], $limit: Int, $offset: Int, $type: TransactionType, $dateFrom: DateTime, $dateTo: DateTime) {
    transactions(account: $account, limit: $limit, offset: $offset, type: $type, dateFrom: $dateFrom, dateTo: $dateTo) {
      totalCount
      nodes {
        id
        type
        description
        amount {
          valueInCents
          currency
        }
        createdAt
        fromAccount {
          slug
          name
        }
        toAccount {
          slug
          name
        }
      }
    }
  }
`;

export const LIST_EXPENSES = `
  query ListExpenses($account: [AccountReferenceInput!], $limit: Int, $offset: Int, $status: ExpenseStatusFilter, $dateFrom: DateTime, $dateTo: DateTime) {
    expenses(account: $account, limit: $limit, offset: $offset, status: $status, dateFrom: $dateFrom, dateTo: $dateTo) {
      totalCount
      nodes {
        id
        description
        status
        amount
        currency
        createdAt
        payee {
          slug
          name
        }
      }
    }
  }
`;
