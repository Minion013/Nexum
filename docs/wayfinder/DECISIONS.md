# PactFlow decision log

This is the canonical record of resolved Wayfinder decisions. Maps link here for decision detail; resolved decisions do not remain as ticket files.

## Initial product boundary

PactFlow is a Singapore-to-Southeast-Asia, digital-service escrow prototype. It uses one temporary, self-custodial testnet Escrow Vault per agreement, mock token settlement, 2–3 funded milestones, rules-first release/refund/dispute handling, versioned mutual amendments, AI drafting without payment or adjudication authority, and no claim of live custody, fiat conversion, cash-out, KYC, or regulated operation.

## Competitive landscape and differentiated wedge

PactFlow is a portable, off-marketplace agreement and rules layer for custom bilateral service work. Marketplace, cross-border-payout, contractor-operations, and decentralised-arbitration products solve adjacent jobs rather than this combined workflow.

## Testnet prototype rails

The viable prototype route is Base Sepolia, a clearly valueless demo ERC-20, user-owned embedded or external wallets, and an OpenZeppelin-cloned Escrow Vault per agreement.

## Golden demo narrative

The product is custom-agreement first. Demo fixtures may demonstrate a disputed final handoff, review-window auto-release, and a missed-deadline refund, but do not prescribe users' contract terms.

## Supporting materials for the product brief

Use the Trust flow as the concise pitch view and the Rules workspace agreement-detail view to demonstrate objective release, refund, and dispute conditions. The Deal cockpit is deferred.

## Agreement lifecycle and initiation

Either participant may propose; only the Buyer funds. The lifecycle is registration, custom drafting, versioned double approval, a funding window, one funded Escrow Vault, evidence/review, eligible release or missed-deadline refund, bound-resolver dispute handling, and mutual amendments.

## MVP build boundary

The testnet MVP must execute the agreement and payment state machine for real. AI drafting, notifications, fiat/FX, KYC, cash-out, and production dispute operations are simulations or later integrations.

## Vault state machine and interface

Each agreement has a minimal-clone, non-administered Vault whose Buyer, Service Provider, resolver, token, terms hash, fee configuration, and milestone rules are fixed at initialization. Buyer and Service Provider EIP-712 approvals authorize deployment; the Buyer alone funds the exact allocation within a defined window. Milestones are sequential and settle only through contract-enforced acceptance, review-window expiry, missed-deadline refund, or the bound resolver’s allocation-preserving outcome. The Vault has no owner, upgrade, pause, rescue, or platform-withdrawal capability; all lifecycle transitions emit events and the off-chain application retains human-readable history.

## Profile identity, onboarding, and discovery

Each user has one shared Profile with an editable display name and immutable lowercase username. Photo, biography, locale, time zone, preferences, and skill tags are optional. Photos use private storage with an initials fallback; discoverability is opt-in and never exposes email or preferences.

## Professional connection lifecycle

Discoverable users may request a connection with an optional note. The recipient accepts or declines through an in-app inbox; requests can be withdrawn, connections removed, and blocks prevent future requests and agreement invitations. Connections never grant access and direct messaging is excluded.

## Verified-user profile recovery

An authenticated user without a Profile receives an incomplete Profile and first-time setup route; only a failed provisioning operation is an error. Local profile migrations must be applied before end-to-end verification.

## Contract assurance and scope boundary

The first release demonstrates Base Sepolia testnet settlement and version-specific acceptance records, without claiming legal enforceability. External Authority case-system integration is deferred; the MVP uses PactFlow’s own Authority Registry and restricted in-app case access.

## Durable access graph

Contract access belongs only to Contract Parties and explicit per-Contract delegated access. Invitations and Contacts grant no access until exact authenticated acceptance. Every verified user receives a sole-owner personal Workspace; collaboration is opt-in. Case Officers access only assigned Authority cases and never become Contract Parties.

## Contract lifecycle

An authorised Party creates a private draft and explicitly shares a Version. New Versions invalidate earlier acceptances; the Contract activates only when all required Parties accept the same Version. Buyer funding follows separately. Only bilateral amendments alter future uncompleted work, and disputes freeze only the affected milestone.

## Initial Service Engagement Template

The builder validates typed Parties, Scope, Milestone Schedule, Payment and Funding, Evidence and Review, Intellectual Property and Confidentiality, Change Control, Dispute Resolution, and Notices sections before an immutable Version can be shared. See the [initial Service Engagement Template](../application-foundation/initial-service-engagement-template.md).

## Authority Registry operations

A platform-controlled operation creates, verifies, updates, and retires registry entries. The MVP starts with one clearly labelled simulated Authority. Each Contract Version snapshots its Authority, jurisdiction label, and ruleset; operations assigns each dispute to one Case Officer, who cannot self-assign or access other cases.

## Application structure

Home is an action board across Workspaces with visible context. A Contract-led detail page owns Versions, Parties, milestones, evidence, and Authority state. Workspace context remains available but never becomes a global role mode.

## Demo migration inventory

The process-local demo agreement, global roles, invitations, simulated evidence, approvals, and payment outcomes are non-migratable fixtures. Durable replacements retain only reusable session-verification, Profile-provisioning, RLS-test, contract-foundation, and validation inputs. See the [local-demo migration inventory](../application-foundation/demo-migration-inventory.md).
