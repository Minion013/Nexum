export type NotificationEntry = {
  id: string;
  category: string;
  title: string;
  body: string;
  href: string;
  createdAt: string;
  readAt: string | null;
};

export type NotificationsData = { unreadCount: number; entries: NotificationEntry[] };

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Time unavailable';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function NotificationsLoading() {
  return <section className="app-panel notification-inbox" aria-live="polite" aria-busy="true"><p className="eyebrow">Private inbox</p><h1>Notifications</h1><p className="page-intro">Loading your private inbox...</p><p className="empty">Loading notifications...</p></section>;
}

export function NotificationsError({ message }: { message: string }) {
  return <><p className="notification-error" role="alert">{message}</p><section className="app-panel notification-inbox" aria-labelledby="notifications-error-title"><p className="eyebrow">Private inbox</p><h1 id="notifications-error-title">Notifications could not be loaded.</h1><p className="page-intro">Your private inbox is unavailable right now. Please check your sign-in and try again.</p><p><a className="button primary" href="/home">Return to Dashboard</a></p></section></>;
}

function NotificationItem({ notification, markingId, onMarkRead }: { notification: NotificationEntry; markingId: string | null; onMarkRead: (notification: NotificationEntry) => void }) {
  const unread = !notification.readAt;
  return <article className={`notification-item${unread ? ' is-unread' : ' is-read'}`} aria-label={unread ? 'Unread notification' : 'Read notification'}>
    <div className="notification-copy"><strong>{notification.title}</strong><p>{notification.body}</p><time dateTime={notification.createdAt}>{formatTime(notification.createdAt)}</time></div>
    <div className="notification-actions"><a className="button" href={notification.href}>Open</a>{unread && <button type="button" onClick={() => onMarkRead(notification)} disabled={markingId === notification.id}>{markingId === notification.id ? 'Marking read...' : 'Mark read'}</button>}</div>
  </article>;
}

export function NotificationsContent({ data, markingId, actionError, onMarkRead }: { data: NotificationsData; markingId: string | null; actionError: string; onMarkRead: (notification: NotificationEntry) => void }) {
  return <>
    <section className="notification-heading"><p className="eyebrow">Private inbox</p><h1>Notifications</h1><p className="page-intro">Only activity relevant to your Profile, Contract Parties, and exact-email invitations appears here.</p></section>
    {actionError && <p className="notification-error" role="alert">{actionError}</p>}
    <section className="app-panel notification-inbox" aria-label="Notification inbox">
      <div className="notification-summary"><h2>Recent activity</h2><span aria-label={`${data.unreadCount} unread notifications`}>{data.unreadCount} unread</span></div>
      {!data.entries.length ? <p className="empty" aria-live="polite">You have no notifications yet.</p> : <div className="notification-list" aria-live="polite">{data.entries.map(notification => <NotificationItem key={notification.id} notification={notification} markingId={markingId} onMarkRead={onMarkRead} />)}</div>}
    </section>
  </>;
}
