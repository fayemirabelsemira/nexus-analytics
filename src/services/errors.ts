/** Turn raw Supabase/Postgres errors into messages a business owner can act on. */
export function friendlyError(e: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const msg = e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String((e as { message: unknown }).message) : '';
  if (!msg) return fallback;
  if (/row-level security|permission denied|not authorized/i.test(msg)) return 'You do not have permission to do that. Please sign in again.';
  if (/does not exist|schema cache|relation/i.test(msg)) return 'The database is not set up yet. Run the SQL setup scripts in Supabase first.';
  if (/Failed to fetch|NetworkError|network/i.test(msg)) return 'Network problem. Check your connection and try again.';
  if (/mime type|not supported/i.test(msg)) return 'This file type is not allowed for storage.';
  if (/exceeded the maximum allowed size|too large|payload/i.test(msg)) return 'The file is too large to save (limit 25 MB).';
  if (/duplicate key/i.test(msg)) return 'That item already exists.';
  return msg;
}
