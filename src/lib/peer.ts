/** Sends between two DavoChain customers, and payment usernames (28 Oct 2026). */

export interface PeerSide {
  userId: string;
  name: string;
  username: string | null;
}

/** "Sent to Bob Eze (@bob_eze_1)" / "Received from …"; null when not a send between customers. */
export function peerLine(row: { type: string; peer?: PeerSide | null }): string | null {
  if (!row.peer) return null;
  const who = row.peer.username ? `${row.peer.name} (@${row.peer.username})` : row.peer.name;
  return row.type === 'DEPOSIT' ? `Received from ${who}` : `Sent to ${who}`;
}

/** The payment username on a customer's profile. */
export function payUsernameLabel(username: string | null | undefined): string {
  return username ? `@${username}` : 'Not chosen';
}
