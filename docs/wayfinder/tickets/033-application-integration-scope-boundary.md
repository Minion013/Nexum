---
parent: ../application-foundation-map.md
status: closed
type: grilling
assignee: Codex
blocked_by:
  - application-foundation/01-define-contract-assurance-and-scope.md
  - application-foundation/03-define-contract-lifecycle.md
---

# Application integration scope boundary

## Question

Which payment-settlement and digital-signature behaviours must be durable PactFlow product capabilities in this application effort, and which external Authority integrations remain deferred beyond the MVP boundary?

## Resolution

The MVP durably supports canonical, versioned Contract terms; explicit party acceptance of one exact version; and an auditable acceptance record tied to the signer’s Profile and Base Sepolia test wallet. An EIP-712 signature over the exact Version hash is required before funding, alongside on-chain Vault transactions for faucet funding, evidence, release, refund, and bounded dispute settlement. Supabase persists product and audit context while Base Sepolia proves the payment and event lifecycle; neither is represented as legal enforceability or a regulated payment service. The Authority Registry and its assigned simulated Case Officer remain entirely inside PactFlow. No external Authority case system, credential exchange, webhook, filing, or decision synchronisation is in MVP scope.
