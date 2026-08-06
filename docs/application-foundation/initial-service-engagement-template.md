# Initial service-engagement Contract Template

## Decision

The first PactFlow Contract Template is **Service Engagement**. It is a guided, versioned structure for a custom digital-service project; it is not a jurisdiction-specific legal form and makes no claim of legal enforceability. It creates one Contract Version composed of the typed sections below. A section is canonical data, rendered for editing and review; free-form notes cannot replace a required field.

## Sections and shareability validation

| Section | Required content before sharing | Conditional content | Validation |
| --- | --- | --- | --- |
| Parties | Initiating Contract Party, proposed counterparty, contracting capacity (individual or Workspace), and named party responsibility (`buyer` or `service_provider`) | A Workspace party names the active delegated Profile that is preparing the Version. | Exactly two distinct Contract Parties: exactly one buyer and one service provider. The actor must be authorised for the initiating party. A contact or invitee is never silently converted into a party. |
| Engagement scope | Service title, plain-language outcome, included deliverables, excluded work, and project start date | Client-supplied materials and dependencies are required when the provider needs them to perform the scope. | Every list has at least one meaningful item; start date is ISO-8601 UTC and cannot precede the Version's proposed-at time. |
| Milestone schedule | Exactly 2 or 3 ordered milestones, each with title, measurable delivery outcome, gross allocation, canonical UTC deadline, evidence requirement, and a review window of 24, 72, or 168 hours | A milestone may name an external handoff location only as a private evidence reference, never as public contract text. | Titles and outcomes are non-empty; deadlines strictly increase; all allocations are positive integer token minor units and sum exactly to the payment total. |
| Payment and funding | Settlement token/network label, total amount, buyer funding deadline, fee recipient label, and disclosed success-fee basis points | A success fee of zero is allowed; any non-zero fee must name the recipient and be included in the displayed gross-to-net calculation. | Base Sepolia is the only MVP network label. Fee is 0–1,000 bps; funding opens when the second acceptance of the exact Version is recorded, lasts 48 hours, and ends before the first delivery deadline. This section has no payment authority until the future vault is funded on chain. |
| Evidence and review | What evidence each milestone must reference and what counts as a review decision | A contract may require acknowledgement of a client-provided dependency before a milestone starts. | Evidence requirements cannot contain credentials, private keys, or a raw private file URL. The actual private reference lives separately under Contract access control. |
| Intellectual-property and confidentiality | One IP outcome: `client_owns_project_deliverables_on_final_settlement` or `provider_retains_ownership_with_client_license`; confidentiality choice: `not_requested` or `mutual_confidentiality` | A licence scope is required for the retention/licence outcome; a confidentiality duration is required when confidentiality is selected. | The UI must describe the selected outcome in plain language and never imply a legal result beyond the Version record. |
| Change control | Change-request process, including who may propose and the rule that only a bilateral amendment can alter future uncompleted milestones | None. | The text must preserve settled, refunded, disputed, and funded-outcome immutability. |
| Dispute resolution | Published Resolution Authority, jurisdiction label, and ruleset version selected from the Authority Registry | None. | The Version stores an immutable authority snapshot. A Profile acting as a Case Officer cannot be chosen as a party or directly as a resolver. |
| Notices and version acknowledgement | Contact method for each party and the acknowledgement that acceptance applies to this exact Version | None. | Each party supplies one notification address; version hash and all required sections must be present before the Version can be shared or accepted. |

## Draft and review behaviour

1. An authorised party creates a private editable draft in its own Workspace or as an individual Contract Party.
2. **Share version** runs the validation above, creates an immutable Version, and sends a specific expiring invitation. It never grants workspace membership.
3. The counterparty sees a read-only review surface with the rendered sections, local-time deadline presentation beside canonical UTC values, allocation/fee breakdown, authority snapshot, and a clear “not funded / no on-chain payment authority” state.
4. A correction creates a new immutable Version; it never mutates a shared Version or carries an acceptance forward.
5. Each Contract Party records an acceptance for one Version. For a Workspace Party, the active delegated Profile is retained alongside the Party record.

## Validation feedback

The editable Draft retains all entered values when validation fails. Each failed share attempt returns a blocking validation result containing the `section_type`, field path, stable error code, and plain-language correction. The builder shows that result both beside the field and in a section summary linked to the invalid control; it also identifies incomplete sections in the review outline. There are no soft warnings at the share boundary: a missing required term, invalid lifecycle relationship, or non-conserving allocation prevents Version creation and invitation delivery.

## Field model for the first durable builder

The durable write path should store `section_type`, a versioned structured payload, display order, and a generated review summary. The initial section-type set is:

`parties`, `scope`, `milestones`, `payment`, `evidence_review`, `intellectual_property`, `change_control`, `dispute_resolution`, and `notices`.

This is deliberately a narrow service-engagement template. Employment, subscriptions, goods, deposits, multi-party splits, tax calculations, and jurisdiction-specific clauses require a later template rather than expanding this one with unvalidated arbitrary text.

## Consequences

- Ticket 04's old demo-only form must be replaced by a participant-scoped typed Version builder; `AgreementEngine.replaceDraft` is not a durable write seam.
- The existing schema can hold typed section records, but migrations/RLS tests are still needed for field-shape validation, lifecycle-safe immutability, and client write procedures.
- Review and acceptance should consume the same section model. A separate “approval form” would risk accepting data other than the Version the counterparty read.
