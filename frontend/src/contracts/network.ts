export type AcceptedConnection = { status: string; [key: string]: unknown };
export type PeopleResponse = { people?: { connections?: AcceptedConnection[] } };

export async function loadAcceptedConnections(request: (path: string) => Promise<PeopleResponse>): Promise<{ available: boolean; connections: AcceptedConnection[] }> {
  try {
    const { people } = await request('/api/people');
    return { available: true, connections: (people?.connections ?? []).filter(connection => connection.status === 'accepted') };
  } catch {
    return { available: false, connections: [] };
  }
}
