/**
 * Text-quality heuristics used to reject low-value contact submissions —
 * keyboard mashing ("asdfgh"), repeated characters, placeholder text ("test
 * test") and link spam — while letting genuine reports through.
 *
 * Design constraints:
 * - No framework or DOM dependency, so the same code runs in the browser, in the
 *   Cloudflare Worker and under `node --test`.
 * - Every check is individually exported and individually tested. `looksLikeGibberish`
 *   is a layered combination: a single weak signal never rejects on its own.
 * - Latin-script assumptions (vowel ratios, consonant clusters) are skipped when
 *   the text is mostly non-Latin, so names and messages in other scripts are not
 *   penalised.
 */

const LATIN_LETTER = /[a-z]/i;
const VOWEL = /[aeiouy]/i;

/** Keyboard rows, used to spot runs like "asdf" or "qwer". Digits are excluded
 *  on purpose: strings like "error 1234" are legitimate in a bug report. */
const KEYBOARD_ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

/** Words that carry no information on their own. A submission made up entirely
 *  of these is placeholder text, but their mere presence is fine. */
const PLACEHOLDER_WORDS = new Set([
  "test", "tests", "testing", "tested", "asdf", "asdfg", "asdfgh", "qwerty", "qwer",
  "lorem", "ipsum", "dolor", "amet", "dummy", "sample", "example", "placeholder",
  "foo", "bar", "baz", "qux", "abc", "abcd", "xyz", "blah", "bla", "aaa", "aaaa",
  "hello", "hi", "hey", "yo", "na", "none", "nothing", "nil", "null", "undefined",
  "idk", "whatever", "anything", "something", "stuff", "things", "etc",
]);

/** Mail domains that cannot be replied to, so a submission using one is a dead end. */
const UNREACHABLE_EMAIL_DOMAINS = new Set([
  "example.com", "example.org", "example.net", "test.com", "test.net", "test.test",
  "domain.com", "email.com", "mail.com", "sample.com", "localhost", "invalid",
  "mailinator.com", "tempmail.com", "temp-mail.org", "10minutemail.com",
  "guerrillamail.com", "yopmail.com", "trashmail.com", "sharklasers.com",
  "dispostable.com", "throwawaymail.com", "fakeinbox.com", "getnada.com",
  "maildrop.cc", "mailnesia.com", "spam4.me", "discard.email",
]);

export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** Splits into word-ish tokens, keeping intra-word apostrophes and hyphens. */
export function words(value: string): string[] {
  return normalizeWhitespace(value)
    .split(/[^\p{L}\p{N}'’-]+/u)
    .filter(Boolean);
}

export function distinctWordCount(value: string): number {
  return new Set(words(value).map((w) => w.toLowerCase())).size;
}

/** True when letters are mostly outside the Latin alphabet. */
export function isMostlyNonLatin(value: string): boolean {
  const letters = [...value].filter((c) => /\p{L}/u.test(c));
  if (letters.length === 0) return false;
  return letters.filter((c) => LATIN_LETTER.test(c)).length / letters.length < 0.6;
}

/**
 * "Is there enough here to act on?", expressed so it holds across writing systems.
 *
 * Counting whitespace-separated words silently rejects Chinese, Japanese and Thai,
 * which do not put spaces between words — a perfectly detailed Japanese bug report
 * counts as one or two "words". For those scripts, count meaningful characters
 * instead, which carry far more information each.
 */
export function hasEnoughDistinctContent(value: string, minWords: number): boolean {
  if (isMostlyNonLatin(value)) {
    const chars = [...normalizeWhitespace(value)].filter((c) => /\p{L}|\p{N}/u.test(c)).length;
    return chars >= minWords * 2;
  }
  return distinctWordCount(value) >= minWords;
}

/** True when any character repeats more than `max` times in a row ("aaaa", "!!!!"). */
export function hasLongCharRun(value: string, max = 3): boolean {
  let run = 1;
  for (let i = 1; i < value.length; i++) {
    if (value[i] === value[i - 1] && value[i] !== " ") {
      run++;
      if (run > max) return true;
    } else {
      run = 1;
    }
  }
  return false;
}

/** True when the text contains a straight run along a keyboard row, forwards or
 *  backwards, of at least `min` characters. */
export function hasKeyboardRun(value: string, min = 4): boolean {
  const lower = value.toLowerCase();
  for (const row of KEYBOARD_ROWS) {
    const reversed = [...row].reverse().join("");
    for (const source of [row, reversed]) {
      for (let i = 0; i + min <= source.length; i++) {
        if (lower.includes(source.slice(i, i + min))) return true;
      }
    }
  }
  return false;
}

/** Share of letters that are Latin. Low values mean another script is in use and
 *  the Latin-specific heuristics below should not be applied. */
export function latinLetterRatio(value: string): number {
  const letters = [...value].filter((c) => /\p{L}/u.test(c));
  if (letters.length === 0) return 0;
  return letters.filter((c) => LATIN_LETTER.test(c)).length / letters.length;
}

/** Share of Latin letters that are vowels. English prose sits around 0.35-0.45;
 *  mashed keys sit near 0. */
export function vowelRatio(value: string): number {
  const letters = [...value].filter((c) => LATIN_LETTER.test(c));
  if (letters.length === 0) return 0;
  return letters.filter((c) => VOWEL.test(c)).length / letters.length;
}

/** A token is word-like if it is short (initialisms such as "PDF", "500", "UI"),
 *  or contains a vowel. */
export function isWordLike(word: string): boolean {
  const letters = word.replace(/[^\p{L}]/gu, "");
  if (letters.length === 0) return true;
  if (latinLetterRatio(letters) < 0.5) return true;
  if (letters.length <= 3) return true;
  return VOWEL.test(letters);
}

export function wordLikeRatio(value: string): number {
  const list = words(value);
  if (list.length === 0) return 0;
  return list.filter(isWordLike).length / list.length;
}

/** Long consonant-only stretches rarely occur in real prose.
 *  "y" is deliberately excluded, matching VOWEL above — counting it as a
 *  consonant flagged ordinary words such as "rhythms". */
export function hasLongConsonantCluster(value: string, max = 5): boolean {
  return new RegExp(`[bcdfghjklmnpqrstvwxz]{${max + 1},}`, "i").test(value);
}

export function uppercaseRatio(value: string): number {
  const letters = [...value].filter((c) => /\p{L}/u.test(c));
  if (letters.length === 0) return 0;
  return letters.filter((c) => c === c.toUpperCase() && c !== c.toLowerCase()).length / letters.length;
}

export function countUrls(value: string): number {
  return (value.match(/\b(?:https?:\/\/|www\.)\S+/gi) ?? []).length;
}

/** True when every token is a filler word, i.e. the text says nothing. */
export function isPlaceholderText(value: string): boolean {
  const list = words(value).map((w) => w.toLowerCase());
  if (list.length === 0) return true;
  return list.every((w) => PLACEHOLDER_WORDS.has(w) || /^\d+$/.test(w));
}

/** True when the text is one word (or one short phrase) repeated. */
export function isRepeatedSingleWord(value: string): boolean {
  const list = words(value).map((w) => w.toLowerCase());
  return list.length >= 3 && new Set(list).size === 1;
}

export function isUnreachableEmailDomain(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase().trim();
  if (!domain) return true;
  if (UNREACHABLE_EMAIL_DOMAINS.has(domain)) return true;
  // Subdomains of a blocked domain, e.g. "mail.mailinator.com".
  return [...UNREACHABLE_EMAIL_DOMAINS].some((blocked) => domain.endsWith(`.${blocked}`));
}

/**
 * Layered gibberish check. Returns true only on a clear signal, so that ordinary
 * prose — including terse, technical bug reports — is never rejected.
 */
export function looksLikeGibberish(value: string): boolean {
  const text = normalizeWhitespace(value);
  const latinLetters = [...text].filter((c) => LATIN_LETTER.test(c)).length;

  // Too short, or predominantly another script: the length and format rules in
  // the schema are the right tool, not these heuristics.
  if (latinLetters < 8 || latinLetterRatio(text) < 0.6) return false;

  if (hasLongCharRun(text, 3)) return true;
  if (hasKeyboardRun(text, 4)) return true;
  if (hasLongConsonantCluster(text, 5)) return true;

  const vr = vowelRatio(text);
  if (vr < 0.2 || vr > 0.8) return true;

  if (wordLikeRatio(text) < 0.6) return true;
  if (text.length > 20 && uppercaseRatio(text) > 0.7) return true;

  return false;
}
