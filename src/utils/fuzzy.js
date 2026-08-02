/**
 * Subsequence fuzzy match: every query character must appear in order.
 * Returns a score (higher is better) or -1 for no match. Consecutive hits
 * and word-start hits score higher so "ns" ranks "New task" above "Settings".
 */
export function fuzzyScore(text, query) {
  if (!query) {
    return 0
  }

  const haystack = text.toLowerCase()
  const needle = query.toLowerCase().replace(/\s+/g, '')
  let score = 0
  let cursor = 0
  let previousIndex = -1

  for (const char of needle) {
    const index = haystack.indexOf(char, cursor)

    if (index === -1) {
      return -1
    }

    if (index === previousIndex + 1) {
      score += 3
    }

    if (index === 0 || haystack[index - 1] === ' ') {
      score += 2
    }

    score += 1
    previousIndex = index
    cursor = index + 1
  }

  // Shorter labels win ties.
  return score - haystack.length * 0.01
}

export function fuzzyFilter(items, query, getText) {
  return items
    .map((item) => ({ item, score: fuzzyScore(getText(item), query) }))
    .filter((entry) => entry.score >= 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.item)
}
