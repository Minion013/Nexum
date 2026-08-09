export async function loadAcceptedConnections(request) {
  try {
    const { people } = await request('/api/people');
    return {
      available: true,
      connections: (people?.connections ?? []).filter(connection => connection.status === 'accepted')
    };
  } catch {
    return { available: false, connections: [] };
  }
}
