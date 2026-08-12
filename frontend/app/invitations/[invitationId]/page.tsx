import InvitationAcceptance from '../../../src/invitations/acceptance';

export default async function InvitationPage({ params }: { params: Promise<{ invitationId: string }> }) {
  const { invitationId } = await params;
  return <InvitationAcceptance invitationId={invitationId} />;
}
