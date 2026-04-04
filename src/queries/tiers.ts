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
            videoUrl
            button
            type
            amountType
            amount {
              valueInCents
              currency
            }
            minimumAmount {
              valueInCents
              currency
            }
            frequency
            presets
            goal {
              valueInCents
              currency
            }
            maxQuantity
            availableQuantity
            endsAt
            useStandalonePage
            singleTicket
            invoiceTemplate
            requireAddress
            stats {
              totalDonated {
                valueInCents
                currency
              }
              totalRecurringDonations {
                valueInCents
                currency
              }
              contributors {
                all
                recurring
                oneTime
              }
            }
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
      videoUrl
      button
      type
      amountType
      amount {
        valueInCents
        currency
      }
      minimumAmount {
        valueInCents
        currency
      }
      frequency
      presets
      goal {
        valueInCents
        currency
      }
      maxQuantity
      availableQuantity
      useStandalonePage
      singleTicket
      invoiceTemplate
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
      videoUrl
      button
      type
      amountType
      amount {
        valueInCents
        currency
      }
      minimumAmount {
        valueInCents
        currency
      }
      frequency
      presets
      goal {
        valueInCents
        currency
      }
      maxQuantity
      availableQuantity
      useStandalonePage
      singleTicket
      invoiceTemplate
    }
  }
`;
