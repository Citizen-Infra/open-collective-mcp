export const LIST_UPDATES = `
  query ListUpdates($slug: String!, $limit: Int, $offset: Int) {
    account(slug: $slug) {
      updates(limit: $limit, offset: $offset, orderBy: { field: CREATED_AT, direction: DESC }) {
        totalCount
        nodes {
          id
          slug
          title
          isPrivate
          isChangelog
          publishedAt
          createdAt
          fromAccount {
            slug
            name
          }
        }
      }
    }
  }
`;

export const GET_UPDATE = `
  query GetUpdate($slug: String!) {
    account(slug: $slug) {
      updates(limit: 100) {
        nodes {
          id
          slug
          title
          html
          isPrivate
          isChangelog
          publishedAt
          createdAt
          fromAccount {
            slug
            name
          }
        }
      }
    }
  }
`;

export const CREATE_UPDATE = `
  mutation CreateUpdate($update: UpdateCreateInput!) {
    createUpdate(update: $update) {
      id
      slug
      title
      publishedAt
      createdAt
    }
  }
`;

export const EDIT_UPDATE = `
  mutation EditUpdate($update: UpdateUpdateInput!) {
    editUpdate(update: $update) {
      id
      slug
      title
      html
      publishedAt
    }
  }
`;

export const PUBLISH_UPDATE = `
  mutation PublishUpdate($id: String!, $notificationAudience: UpdateAudience) {
    publishUpdate(id: $id, notificationAudience: $notificationAudience) {
      id
      slug
      title
      publishedAt
    }
  }
`;
