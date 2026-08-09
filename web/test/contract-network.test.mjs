import test from 'node:test';
import assert from 'node:assert/strict';
import { loadAcceptedConnections } from '../public/contract-network.js';

test('Contracts remains usable when its optional connection lookup fails', async () => {
  const result = await loadAcceptedConnections(async path => {
    assert.equal(path, '/api/people');
    throw new Error('Request failed.');
  });

  assert.deepEqual(result, { available: false, connections: [] });
});

test('Contracts exposes only accepted connections as counterparty shortcuts', async () => {
  const result = await loadAcceptedConnections(async () => ({
    people: {
      connections: [
        { other_profile_id: 'accepted', status: 'accepted' },
        { other_profile_id: 'pending', status: 'pending' }
      ]
    }
  }));

  assert.deepEqual(result, { available: true, connections: [{ other_profile_id: 'accepted', status: 'accepted' }] });
});
