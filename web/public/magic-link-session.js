export async function restoreMagicLinkSession({ auth, isCallback, onAuthenticated, onCallbackFailure }) {
  const { data: { session }, error } = await auth.getSession();
  if (session) { await onAuthenticated(); return { authenticated: true }; }
  if (isCallback) {
    onCallbackFailure(error ? 'This sign-in link is invalid or expired. Request a new link and try again.' : 'We could not complete that sign-in link. Request a new link and try again.');
  }
  return { authenticated: false };
}
