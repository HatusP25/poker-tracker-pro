/**
 * Helpers for the "replace" restore confirmation.
 *
 * A replace deletes real poker history, so the UI must state exactly which groups
 * it will delete and make the user type that back. Before 2026-07-30 the server
 * wiped every group regardless of the file's contents; it is now scoped to the
 * groups the backup covers, and this is the UI half of that promise.
 */

export interface ReplaceScope {
  /** Human-readable names of the groups this restore will delete and rebuild. */
  groupNames: string[];
  /** Exactly what the user must type to proceed. */
  confirmPhrase: string;
  /** v1 files cannot restore what a replace would delete; the server refuses them. */
  isLegacy: boolean;
}

/** Phrase used when a backup covers zero or several groups — no single name to echo. */
const MULTI_GROUP_PHRASE = 'REPLACE ALL';

export function describeReplaceScope(backup: any): ReplaceScope {
  const groups: any[] = Array.isArray(backup?.data?.groups) ? backup.data.groups : [];
  const groupNames = groups.map((g) => (g?.name ? String(g.name) : String(g?.id ?? '')));

  return {
    groupNames,
    // A single group is echoed by name: it proves the user read *which* group they
    // are about to overwrite. Anything else falls back to a fixed phrase.
    confirmPhrase: groupNames.length === 1 ? groupNames[0] : MULTI_GROUP_PHRASE,
    isLegacy: typeof backup?.version === 'string' && backup.version.startsWith('1.'),
  };
}

/**
 * Case-sensitive exact match, whitespace-trimmed. Empty input never confirms, even
 * against an empty phrase — confirmation has to be a deliberate act.
 */
export function isReplaceConfirmed(typed: string, expectedPhrase: string): boolean {
  const value = typed.trim();
  if (value.length === 0) return false;
  return value === expectedPhrase.trim();
}
