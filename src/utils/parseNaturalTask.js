import * as chrono from 'chrono-node'

/**
 * Parses natural language input to extract task metadata.
 * For Phase 1, it handles:
 * - Tags: #tagname
 * - Deadline: parsed via chrono-node
 * - Preposition cleanups: due, due on, by, on, at
 *
 * @param {string} input - Raw user input
 * @param {Date} [referenceDate] - Reference date for relative calculations
 * @returns {object} ParsedTask
 */
export function parseNaturalTask(input, referenceDate = new Date()) {
  const matchedTokens = []
  let workingText = input

  // Helper to replace matched token with spaces to preserve indices
  function registerMatch(type, value, startIdx, length, text) {
    matchedTokens.push({ type, value, text })
    workingText =
      workingText.slice(0, startIdx) +
      ' '.repeat(length) +
      workingText.slice(startIdx + length)
  }

  // 1. Parse tags: #tagname
  const tagRegex = /(?:^|\s)#(\w[\w-]*)\b/gi
  let match
  while ((match = tagRegex.exec(workingText)) !== null) {
    const text = match[0].trim()
    const value = match[1].toLowerCase()
    const startIdx = match.index + (match[0].length - match[0].trimStart().length)
    registerMatch('tag', value, startIdx, text.length, text)
  }

  // 2. Parse deadline using chrono-node on the remaining text
  const parsedDates = chrono.parse(workingText, referenceDate, { forwardDate: true })
  if (parsedDates.length > 0) {
    const dateMatch = parsedDates[0]
    let startIdx = dateMatch.index
    let text = dateMatch.text

    // Expand match to preceding prepositions: due on, due, by, on, at
    const preceding = workingText.slice(0, startIdx)
    const prepRegex = /\b(due\s+on|due|by|on|at)\s+$/i
    const prepMatch = prepRegex.exec(preceding)
    if (prepMatch) {
      const prepLength = prepMatch[0].length
      startIdx -= prepLength
      text = workingText.slice(startIdx, startIdx + prepLength + text.length)
    }

    registerMatch('deadline', dateMatch.start.date(), startIdx, text.length, text)
  }

  // Extract clean title by collapsing whitespace
  const title = workingText.replace(/\s+/g, ' ').trim()

  return {
    title,
    deadline: matchedTokens.find((t) => t.type === 'deadline')?.value || null,
    startDate: null,
    reminderMinutes: null,
    durationMinutes: null,
    recurrence: null,
    priority: null,
    energy: null,
    tags: matchedTokens.filter((t) => t.type === 'tag').map((t) => t.value),
    planForToday: false,
    matchedTokens,
  }
}
