/**
 * How well a profile's skills cover what a posting asks for.
 *
 * Deliberately simple and explainable — it is shown to the user as "you have 7
 * of the 9 things this asks for", not as an opaque score. Matching is
 * case-insensitive on exact skill names.
 */
export function skillMatch(jobSkills: string[], profileSkills: string[]) {
  const have = new Set(profileSkills.map((s) => s.toLowerCase().trim()));

  const matched: string[] = [];
  const missing: string[] = [];

  for (const skill of jobSkills) {
    if (have.has(skill.toLowerCase().trim())) matched.push(skill);
    else missing.push(skill);
  }

  return {
    matched,
    missing,
    percent: jobSkills.length
      ? Math.round((matched.length / jobSkills.length) * 100)
      : 0,
  };
}
