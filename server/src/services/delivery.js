/**
 * Delivery metrics.
 *
 * Deliberately limited to things that can be counted from the transcript and
 * the timings: filler rate, speaking pace, sentence length, talk time. These
 * are verifiable facts about what was said.
 *
 * What this does NOT do, on purpose: score facial expression, "confidence",
 * enthusiasm or personality. Inferring internal states from expressions is not
 * scientifically reliable (Barrett et al. 2019), it is culturally biased
 * against a candidate interviewing outside his own region, and emotion
 * recognition in an employment context is prohibited or high-risk under the EU
 * AI Act — which is one of the markets being targeted. The recording exists so
 * he can watch himself, which is the mechanism that actually works; the machine
 * sticks to arithmetic.
 */

const FILLERS = [
  'um', 'uh', 'erm', 'ah', 'hmm',
  'like', 'basically', 'actually', 'literally', 'honestly',
  'you know', 'i mean', 'sort of', 'kind of', 'kinda', 'sorta',
  'so yeah', 'right so', 'i think so',
];

// Hedges weaken a claim rather than pad it; counted separately.
const HEDGES = [
  'i think', 'i guess', 'maybe', 'probably', 'sort of', 'a bit',
  'i would say', 'more or less', 'roughly', 'something like',
];

const words = (text) => String(text || '').trim().split(/\s+/).filter(Boolean);

const countPhrase = (lower, phrase) => {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`, 'g');
  return (lower.match(re) || []).length;
};

/** Longest run of words with no sentence-ending punctuation. */
function longestUnbrokenRun(text) {
  const chunks = String(text || '').split(/[.!?]+/);
  return chunks.reduce((max, c) => Math.max(max, words(c).length), 0);
}

export function analyseAnswer(text, durationMs) {
  const wordList = words(text);
  const wordCount = wordList.length;
  const lower = ` ${String(text || '').toLowerCase()} `;

  const fillerHits = {};
  let fillerTotal = 0;
  for (const f of FILLERS) {
    const n = countPhrase(lower, f);
    if (n) { fillerHits[f] = n; fillerTotal += n; }
  }

  let hedgeTotal = 0;
  for (const h of HEDGES) hedgeTotal += countPhrase(lower, h);

  const seconds = durationMs ? durationMs / 1000 : null;

  return {
    wordCount,
    durationSec: seconds ? Math.round(seconds) : null,
    wordsPerMinute: seconds && seconds > 5 ? Math.round((wordCount / seconds) * 60) : null,
    fillerCount: fillerTotal,
    fillerPer100Words: wordCount ? Number(((fillerTotal / wordCount) * 100).toFixed(1)) : 0,
    fillerBreakdown: fillerHits,
    hedgeCount: hedgeTotal,
    longestUnbrokenRun: longestUnbrokenRun(text),
  };
}

/**
 * Roll the per-answer numbers into a session summary, with plain-language
 * flags. Thresholds are conventional public-speaking guidance, not a model's
 * opinion, and each flag states the number it is based on.
 */
export function analyseSession(turns) {
  const answers = turns.filter((t) => t.speaker === 'candidate' && t.text?.trim());
  if (!answers.length) return null;

  const per = answers.map((t) => ({
    text: t.text,
    ...analyseAnswer(t.text, t.answer_ms),
  }));

  const totalWords = per.reduce((n, a) => n + a.wordCount, 0);
  const totalFillers = per.reduce((n, a) => n + a.fillerCount, 0);
  const totalHedges = per.reduce((n, a) => n + a.hedgeCount, 0);
  const timed = per.filter((a) => a.wordsPerMinute);
  const avgWpm = timed.length
    ? Math.round(timed.reduce((n, a) => n + a.wordsPerMinute, 0) / timed.length)
    : null;

  const interviewerWords = turns
    .filter((t) => t.speaker === 'interviewer')
    .reduce((n, t) => n + words(t.text).length, 0);

  const fillerRate = totalWords ? Number(((totalFillers / totalWords) * 100).toFixed(1)) : 0;
  const longestRun = Math.max(...per.map((a) => a.longestUnbrokenRun));
  const longestAnswer = Math.max(...per.map((a) => a.wordCount));

  const flags = [];
  if (fillerRate > 3) {
    flags.push({
      metric: 'Filler words',
      value: `${totalFillers} in ${totalWords} words (${fillerRate}%)`,
      note: 'Above about 3% starts to read as unprepared. Pausing silently beats filling the gap.',
      severity: fillerRate > 6 ? 'high' : 'medium',
    });
  }
  if (avgWpm && avgWpm > 175) {
    flags.push({
      metric: 'Speaking pace',
      value: `${avgWpm} words per minute`,
      note: 'Fast. 130–160 is the comfortable range for a listener on a call, especially across accents.',
      severity: avgWpm > 200 ? 'high' : 'medium',
    });
  }
  if (avgWpm && avgWpm < 110) {
    flags.push({
      metric: 'Speaking pace',
      value: `${avgWpm} words per minute`,
      note: 'Slow enough that an interviewer may start filling the silence for you.',
      severity: 'medium',
    });
  }
  if (longestRun > 60) {
    flags.push({
      metric: 'Longest unbroken run',
      value: `${longestRun} words without a full stop`,
      note: 'Long run-on sentences are hard to follow and bury the point. Land a sentence, then continue.',
      severity: longestRun > 90 ? 'high' : 'medium',
    });
  }
  if (longestAnswer > 320) {
    flags.push({
      metric: 'Longest answer',
      value: `${longestAnswer} words`,
      note: 'Past roughly two minutes of talking, an interviewer stops absorbing. Answer, then offer to go deeper.',
      severity: 'medium',
    });
  }
  if (totalHedges >= 6) {
    flags.push({
      metric: 'Hedging',
      value: `${totalHedges} hedges ("I think", "maybe", "sort of")`,
      note: 'Hedging a real achievement makes a true claim sound uncertain. State the fact, then qualify if needed.',
      severity: 'medium',
    });
  }

  const topFillers = Object.entries(
    per.reduce((acc, a) => {
      for (const [k, v] of Object.entries(a.fillerBreakdown)) acc[k] = (acc[k] || 0) + v;
      return acc;
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word, count]) => ({ word, count }));

  return {
    answers: answers.length,
    totalWords,
    avgWordsPerAnswer: Math.round(totalWords / answers.length),
    avgWordsPerMinute: avgWpm,
    fillerCount: totalFillers,
    fillerRatePercent: fillerRate,
    topFillers,
    hedgeCount: totalHedges,
    longestUnbrokenRun: longestRun,
    longestAnswerWords: longestAnswer,
    // Listening 80% / talking 20% is the stated goal for validation calls; for
    // an interview the ratio is inverted, so it is reported, not judged.
    talkShare: totalWords + interviewerWords
      ? Math.round((totalWords / (totalWords + interviewerWords)) * 100)
      : null,
    flags,
    note: 'Counted from the transcript and answer timings. Nothing here is inferred from video, expression or tone.',
  };
}
