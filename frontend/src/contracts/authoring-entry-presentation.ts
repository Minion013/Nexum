export type CounterpartyConnection = {
  other_profile_id: string;
  display_name: string | null;
  email?: string | null;
  status: string;
  direction: string;
};

export function normalizeExactEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export function acceptedCounterparties(connections: CounterpartyConnection[]): CounterpartyConnection[] {
  return connections.filter(connection => connection.status === 'accepted' && Boolean(normalizeExactEmail(connection.email ?? '')));
}
