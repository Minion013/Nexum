# PactFlow

PactFlow is where two people structure and govern custom-service projects through contracts, milestones, evidence, and decisions.

## Identity and access

**User Profile**:
The durable PactFlow identity belonging to one authenticated person. It may be a party to multiple Contracts and hold a different Contract-scoped responsibility in each.
_Avoid_: buyer account, creator account, resolver account

**Profile Settings**:
The private settings area for a User Profile, including profile details, personal preferences, notifications, security, and connected wallet. It is reached from the signed-in avatar menu rather than primary navigation.
_Avoid_: workspace profile, workspace settings

**Wallet**:
A User Profile's externally controlled Base Sepolia test wallet or explicitly disposable browser test wallet. Its available test-token balance is personal and is never combined with funds locked in a Contract Escrow Vault.
_Avoid_: payment account, escrow balance

## Contracting

**Contract**:
The durable, versioned, one-to-one record that governs one project and grants its two participating User Profiles access to its records. A Contract begins as an editable draft, then becomes binding only after both parties accept the same version.
_Avoid_: agreement, proposal, demo agreement, project record

**Contract Party**:
One of the two User Profiles that accepts a named responsibility in a Contract. A profile may be a party to multiple Contracts simultaneously.
_Avoid_: workspace, local role, account type

**Buyer**:
The Contract Party that engages and funds the Service Provider for a Service Engagement. It is selected for each Contract during creation and is never a permanent Profile role.
_Avoid_: buyer account

**Service Provider**:
The Contract Party that provides the contracted service. It is selected for each Contract during creation and is never a permanent Profile role.
_Avoid_: seller, provider account

**Resolution Authority**:
A recognised regulatory or dispute-resolution body that may be named in a contract's dispute-resolution terms. It is an organisation, not a user profile or a contract party.
_Avoid_: resolver profile, resolver role

**Case Officer**:
An authorised representative who acts on a dispute case for a Resolution Authority. Their authority is restricted to the cases assigned to them.
_Avoid_: resolver

**Authority Registry**:
The platform-managed catalogue of Resolution Authorities, their jurisdictions, and the rulesets available for contract selection.
_Avoid_: resolver list

**Dispute-Resolution Terms**:
The contract terms that select an Authority Registry entry, jurisdiction, and ruleset. They are immutable in a signed contract version and change only through a bilateral amendment.
_Avoid_: resolver setting

**Contract Template**:
A reusable starting structure that determines the typed sections available when drafting a contract. Templates share the same versioned Contract model.
_Avoid_: separate contract type

**Service Engagement Template**:
The initial Contract Template for a custom digital-service project. It has a fixed set of typed sections and is not a claim of legal enforceability in a particular jurisdiction.
_Avoid_: payment-agreement form

**Contract Section**:
A typed, validated group of contract terms, such as parties, scope, milestones, payment, intellectual property, evidence, change control, or dispute resolution.
_Avoid_: arbitrary form field

**Milestone Schedule**:
The ordered Contract Section that defines each measurable delivery outcome, allocation, canonical UTC deadline, evidence requirement, and review window for a Service Engagement.
_Avoid_: payment instalments

**Change Control**:
The Contract Section that states how either Contract Party may propose a change and that only a bilateral amendment may alter future uncompleted work.
_Avoid_: edit history

**Contract Draft**:
A private, editable contract version initiated by one User Profile. It gains a counterparty only when shared by invitation.
_Avoid_: pending contract

**Contract Acceptance**:
A Contract Party's recorded acceptance of one exact Contract Version. A Contract becomes binding only when both parties have accepted that same version.
_Avoid_: approval

## Relationships

**Contact**:
A reusable record for an individual or organisation that a user may invite to a Contract. A Contact is not an authenticated profile or Contract Party until an invitation is accepted.
_Avoid_: workspace member, counterparty account

**People Directory**:
The signed-in social discovery experience for Profiles. It has Discover, My Network, and Requests views; it helps users find and establish professional connections without granting Contract access.
_Avoid_: contacts page, member directory

**Onboarding Guidance**:
The non-binding indication of why a person is starting with PactFlow, such as hiring a creator, providing a service, or resolving disputes. It shapes the initial experience but never determines authorization.
_Avoid_: role, account type
