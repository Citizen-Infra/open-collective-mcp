export const LIST_TIERS = `
  query ListTiers($slug: String!) {
    account(slug: $slug) {
      ... on AccountWithContributions {
        tiers {
          totalCount
          nodes {
            id
            slug
            name
            description
            longDescription
            type
            amountType
            amount {
              valueInCents
              currency
            }
            frequency
            goal {
              valueInCents
              currency
            }
            maxQuantity
          }
        }
      }
    }
  }
`;

export const CREATE_TIER = `
  mutation CreateTier($account: AccountReferenceInput!, $tier: TierCreateInput!) {
    createTier(account: $account, tier: $tier) {
      id
      slug
      name
      description
      longDescription
      type
      amountType
      amount {
        valueInCents
        currency
      }
      frequency
    }
  }
`;

export const EDIT_TIER = `
  mutation EditTier($tier: TierUpdateInput!) {
    editTier(tier: $tier) {
      id
      slug
      name
      description
      longDescription
      type
      amountType
      amount {
        valueInCents
        currency
      }
      frequency
    }
  }
`;
