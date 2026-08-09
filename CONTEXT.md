# PactFlow

PactFlow is the workspace where people structure and govern custom-service projects through shared contracts, milestones, evidence, and decisions.

## Identity and access

**User Profile**:
The durable PactFlow identity belonging to one authenticated person. It can belong to multiple workspaces and hold different project responsibilities.
_Avoid_: buyer account, creator account, resolver account

**Profile Settings**:
The private settings area for a User Profile, including profile details, personal preferences, notifications, security, and connected wallet. It is separate from Workspace Settings.
_Avoid_: workspace profile

**Workspace**:
A durable container for a person's or team's projects, members, and shared operating context. A user may create or join multiple workspaces.
_Avoid_: account, project

**Collaboration**:
The optional multi-member operating mode of a workspace. It is introduced only when a workspace needs shared membership management; it is not required for a one-to-one project.
_Avoid_: team requirement

**One-to-One Project**:
A project governed by a contract between two individual parties, created from a personal workspace without first creating a collaboration.
_Avoid_: single-user project

## Contracting

**Contract**:
The durable, versioned agreement that governs one project and grants the participating parties access to its records. Every Contract has an owning Workspace: a Personal Workspace for solo engagements or a shared Workspace for team engagements. It can link independent workspaces without making either party a member of the other workspace; an unshared Contract Draft remains private to its initiating Workspace.
_Avoid_: demo agreement, project record

**Contract Party**:
The person or workspace that accepts a named responsibility in a contract. A profile or workspace may be a party to multiple contracts simultaneously.
_Avoid_: local role, account type

**Buyer**:
The Contract Party that engages and funds the Service Provider for a Service Engagement. It is selected for each Contract during creation and is never a permanent Profile or Workspace role.
_Avoid_: buyer account

**Service Provider**:
The Contract Party that provides the contracted service. It is selected for each Contract during creation and is never a permanent Profile or Workspace role.
_Avoid_: seller, provider account

**Delegated Project Access**:
The authority a workspace gives one of its members to act for that workspace on a particular project. It never comes from an onboarding choice.
_Avoid_: global role

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
A private, editable contract version initiated by an authorised workspace representative. It gains a counterparty only when shared by invitation.
_Avoid_: pending contract

**Proposal**:
The user-facing label for a Contract Draft. A Proposal belongs to its initiating Workspace and remains visible only to authorised members there until the initiator explicitly shares it with a named counterparty.
_Avoid_: private contract, private draft

**Contract Acceptance**:
A representative's recorded acceptance of one exact contract version on behalf of a Contract Party. A contract becomes binding only when every required party has accepted that same version.
_Avoid_: approval

## Relationships

**Contact**:
A reusable record for an individual or organisation that a user may invite to a contract. A Contact is not an authenticated profile, workspace member, or Contract Party until an invitation is accepted.
_Avoid_: counterparty account

**People Directory**:
The signed-in social discovery experience for Profiles. It has Discover, My Network, and Requests views; it helps users find and establish professional connections without granting workspace or Contract access.
_Avoid_: contacts page, member directory

**Onboarding Guidance**:
The non-binding indication of why a person is starting with PactFlow, such as hiring a creator, providing a service, or resolving disputes. It shapes the initial experience but never determines authorization.
_Avoid_: role, account type
