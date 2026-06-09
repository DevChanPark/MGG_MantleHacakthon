export function moderateEntryContent(content) {
  // MVP hook: replace this with provider-based moderation before public launch.
  if (content.length === 0) {
    return { allowed: false, reason: "Empty content" };
  }
  return { allowed: true, reason: null };
}
