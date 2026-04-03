export const GET_COLLECTIVE = `
  query GetCollective($slug: String!) {
    account(slug: $slug) {
      id
      slug
      name
      description
      longDescription
      imageUrl
      backgroundImageUrl
      currency
      socialLinks {
        type
        url
      }
      tags
      stats {
        balance {
          valueInCents
          currency
        }
        totalAmountReceived {
          valueInCents
          currency
        }
      }
      settings
      createdAt
    }
  }
`;

export const EDIT_ACCOUNT = `
  mutation EditAccount($account: AccountUpdateInput!) {
    editAccount(account: $account) {
      id
      slug
      name
      description
      longDescription
      imageUrl
      tags
    }
  }
`;

export const UPDATE_SOCIAL_LINKS = `
  mutation UpdateSocialLinks($account: AccountReferenceInput!, $socialLinks: [SocialLinkInput!]!) {
    updateSocialLinks(account: $account, socialLinks: $socialLinks) {
      id
      socialLinks {
        type
        url
      }
    }
  }
`;
