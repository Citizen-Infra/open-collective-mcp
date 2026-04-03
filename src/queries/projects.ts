export const LIST_PROJECTS = `
  query ListProjects($slug: String!) {
    account(slug: $slug) {
      childrenAccounts(accountType: [PROJECT]) {
        totalCount
        nodes {
          id
          slug
          name
          description
          imageUrl
          tags
          socialLinks {
            type
            url
          }
          stats {
            balance {
              valueInCents
              currency
            }
          }
          createdAt
        }
      }
    }
  }
`;

export const GET_PROJECT = `
  query GetProject($slug: String!) {
    account(slug: $slug) {
      id
      slug
      name
      description
      longDescription
      imageUrl
      tags
      socialLinks {
        type
        url
      }
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

export const CREATE_PROJECT = `
  mutation CreateProject($parent: AccountReferenceInput!, $project: ProjectCreateInput!) {
    createProject(parent: $parent, project: $project) {
      id
      slug
      name
      description
    }
  }
`;

export const EDIT_PROJECT = `
  mutation EditProject($account: AccountUpdateInput!) {
    editAccount(account: $account) {
      id
      slug
      name
      description
      longDescription
      tags
    }
  }
`;
