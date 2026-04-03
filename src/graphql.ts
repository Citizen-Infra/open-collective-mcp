const OC_API_URL = 'https://api.opencollective.com/graphql/v2';

export class GraphQLError extends Error {
  constructor(
    message: string,
    public errors: Array<{ message: string; path?: string[] }>,
  ) {
    super(message);
    this.name = 'GraphQLError';
  }
}

export async function gql<T = unknown>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const token = process.env.OPEN_COLLECTIVE_TOKEN;
  if (!token) {
    throw new Error('OPEN_COLLECTIVE_TOKEN environment variable is not set');
  }

  const res = await fetch(OC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Personal-Token': token,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`Open Collective API error: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as { data?: T; errors?: Array<{ message: string; path?: string[] }> };

  if (json.errors?.length) {
    throw new GraphQLError(
      json.errors.map((e) => e.message).join('; '),
      json.errors,
    );
  }

  return json.data as T;
}
