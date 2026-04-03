export const LIST_MEMBERS = `
  query ListMembers($slug: String!, $limit: Int, $offset: Int, $role: [MemberRole]) {
    account(slug: $slug) {
      members(limit: $limit, offset: $offset, role: $role) {
        totalCount
        nodes {
          id
          role
          since
          account {
            slug
            name
            imageUrl
          }
        }
      }
    }
  }
`;
