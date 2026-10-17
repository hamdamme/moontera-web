const DRAFT_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

/** Keep a retained draft's original deadline across replacement invitations. */
export function draftRetentionDeadline(
  existingDeadline: number | undefined,
  invitationExpiresAt: number,
  now = Date.now(),
) {
  if (typeof existingDeadline === "number" && existingDeadline > now)
    return existingDeadline;
  return invitationExpiresAt + DRAFT_RETENTION_MS;
}
