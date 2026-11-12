// smartSearch.js
// Fast in-browser search that tolerates spoken / misspelled input.
// "3.00-18 ezeeride", "3 18 easy ride" and "three hundred eighteen ezee ride"
// all find "3.00-18 EZEERIDE N6 TT SET".

const SKIP_FIELDS = new Set(["_id", "__v", "brand", "dp", "cp", "mrp", "dealerPrice", "createdAt", "updatedAt"]);

const NUMBER_WORDS = {
  zero: "0", oh: "0", one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7",
  eight: "8", nine: "9", ten: "10", eleven: "11", twelve: "12", thirteen: "13", fourteen: "14",
  fifteen: "15", sixteen: "16", seventeen: "17", eighteen: "18", nineteen: "19", twenty: "20",
  thirty: "30", forty: "40", fifty: "50", sixty: "60", seventy: "70", eighty: "80", ninety: "90",
  hundred: "100",
};

const SYMBOL_WORDS = {
  point: ".", dot: ".", dash: "-", hyphen: "-", minus: "-", by: "/", slash: "/", upon: "/",
};

// Turn spoken words into the symbols used in price lists.
export function normalizeQuery(text) {
  const out = [];
  let spoken = null; // number being built from spoken words, e.g. "three hundred eighteen"
  const flush = () => {
    if (spoken !== null) out.push(String(spoken));
    spoken = null;
  };
  for (const w of String(text ?? "").toLowerCase().replace(/[–—]/g, "-").split(/\s+/)) {
    const n = NUMBER_WORDS[w];
    if (n === undefined) {
      flush();
      out.push(SYMBOL_WORDS[w] ?? w);
    } else if (n === "100") {
      spoken = (spoken || 1) * 100; // "three hundred" -> 300
    } else if (
      spoken !== null &&
      ((spoken >= 100 && spoken % 100 === 0) || (spoken % 100 >= 20 && spoken % 10 === 0 && +n < 10))
    ) {
      spoken += +n; // "three hundred" + "eighteen", "twenty" + "five"
    } else {
      flush();
      spoken = +n;
    }
  }
  flush();
  return out.join(" ").replace(/\s*([./-])\s*/g, "$1").trim();
}

const digitsOf = (s) => s.replace(/\D/g, "");
const lettersOf = (s) => s.replace(/[^a-z]/g, "");
const stripZeros = (s) => s.replace(/0/g, "");
const wordsOf = (s) => s.split(/[^a-z]+/).filter(Boolean);

// Rough "sounds like" key: ezeeride / easyride / ezyride -> asrd
function phonetic(word) {
  let s = word
    .replace(/ph/g, "f")
    .replace(/ck/g, "k")
    .replace(/c(?=[eiy])/g, "s")
    .replace(/[cq]/g, "k")
    .replace(/x/g, "ks")
    .replace(/z/g, "s")
    .replace(/w/g, "v")
    .replace(/y/g, "i")
    .replace(/h/g, "");
  if (!s) return "";
  const first = /[aeiou]/.test(s[0]) ? "a" : s[0];
  const rest = s.slice(1).replace(/[aeiou]/g, "");
  return (first + rest).replace(/(.)\1+/g, "$1");
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

const ratio = (a, b) => 1 - levenshtein(a, b) / Math.max(a.length, b.length, 1);

// A word together with its "sounds like" key, worked out once.
const keyed = (w) => ({ w, p: w.length >= 3 ? phonetic(w) : "" });

function wordSimilarity(q, c) {
  if (q.w === c.w) return 1;
  if (q.w.length >= 3 && c.w.startsWith(q.w)) return 0.95; // still typing / speaking
  let score = ratio(q.w, c.w);
  if (q.p.length >= 2 && c.p) score = Math.max(score, 0.9 * ratio(q.p, c.p));
  return score;
}

function longestCommonRun(a, b) {
  let best = 0;
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      let k = 0;
      while (a[i + k] && a[i + k] === b[j + k]) k++;
      if (k > best) best = k;
    }
  }
  return best;
}

function digitScore(q, entry) {
  if (entry.modelDigits.includes(q.digits)) return 1;
  if (entry.allDigits.includes(q.digits)) return 0.95;
  if (q.digitsNoZeros && entry.modelDigitsNoZeros.includes(q.digitsNoZeros)) return 0.85; // "3 18" vs "3.00-18"
  // Partly matching size (e.g. 3.00-17 for 3.00-18): useful as a "close" result
  return (0.6 * longestCommonRun(q.digits, entry.modelDigits)) / q.digits.length;
}

function lettersScore(q, entry) {
  if (!entry.candidates.length) return 0;
  const best = (qw) => {
    if (qw.w.length >= 2 && entry.letters.includes(qw.w)) return 1;
    let top = 0;
    for (const c of entry.candidates) {
      const s = wordSimilarity(qw, c);
      if (s > top) top = s;
      if (top === 1) break;
    }
    return top;
  };
  const separate = q.words.reduce((sum, qw) => sum + best(qw), 0) / q.words.length;
  // "easy ride" spoken as two words vs "EZEERIDE" written as one
  const joined = q.joined ? best(q.joined) : 0;
  return Math.max(separate, joined);
}

// Pre-compute search keys for one product (do this once per product).
export function indexItem(item) {
  const model = String(item.model ?? "").toLowerCase();
  const other = Object.entries(item)
    .filter(([k, v]) => k !== "model" && !SKIP_FIELDS.has(k) && typeof v === "string")
    .map(([, v]) => v.toLowerCase())
    .join(" ");
  const all = `${model} ${other}`;
  const words = wordsOf(all);
  const modelDigits = digitsOf(model);
  return {
    item,
    text: all,
    compact: all.replace(/[^a-z0-9]/g, ""),
    modelDigits,
    modelDigitsNoZeros: stripZeros(modelDigits),
    allDigits: digitsOf(all),
    letters: lettersOf(all),
    // single words plus neighbouring pairs ("ezee ride" -> "ezeeride")
    candidates: words.concat(words.slice(1).map((w, i) => words[i] + w)).map(keyed),
  };
}

// Work out the query's search keys once, then score every product against them.
export function prepareQuery(query) {
  const q = normalizeQuery(query);
  const words = wordsOf(q);
  const digits = digitsOf(q);
  return {
    text: q,
    compact: q.replace(/[^a-z0-9]/g, ""),
    digits,
    digitsNoZeros: stripZeros(digits),
    words: words.map(keyed),
    joined: words.length > 1 ? keyed(words.join("")) : null,
  };
}

// Score 0..1 for how well a prepared query matches an indexed product.
export function scoreEntry(q, entry) {
  if (!q.text) return 0;
  if (entry.text.includes(q.text)) return 1;
  if (q.compact && entry.compact.includes(q.compact)) return 1;

  const d = q.digits ? digitScore(q, entry) : null;
  const w = q.words.length ? lettersScore(q, entry) : null;
  if (d !== null && w !== null) return 0.55 * d + 0.45 * w;
  return d ?? w ?? 0;
}

export const EXACT_SCORE = 0.85;
export const CLOSE_SCORE = 0.4;

// Returns { exact: [...items], close: [...items] }, best first.
export function searchItems(query, entries, maxClose = 30) {
  const q = prepareQuery(query);
  const exact = [];
  const close = [];
  for (const entry of entries) {
    const score = scoreEntry(q, entry);
    if (score >= EXACT_SCORE) exact.push({ entry, score });
    else if (score >= CLOSE_SCORE) close.push({ entry, score });
  }
  const order = (a, b) => b.score - a.score || a.entry.text.length - b.entry.text.length;
  exact.sort(order);
  close.sort(order);
  return {
    exact: exact.map((r) => r.entry.item),
    close: close.slice(0, maxClose).map((r) => r.entry.item),
    bestScore: Math.max(exact[0]?.score ?? 0, close[0]?.score ?? 0),
  };
}

// Brand names without their date, e.g. "mrf 29-10-26" -> "mrf"
export function brandLabel(brand) {
  return String(brand)
    .replace(/\s*(dt[-\s]*)?\d{1,2}\s*[.\-–/\s]\s*\d{1,2}\s*[.\-–/\s]\s*\d{2,4}\s*$/i, "")
    .trim();
}

// Pick the brand that best matches what was said. Returns null if nothing is close.
export function matchBrand(spoken, brands) {
  const text = normalizeQuery(spoken);
  if (/^(all|all brands?|global|everything|sab)$/.test(text)) return "";
  // Spoken letters like "m r f" -> "mrf"
  const queries = [prepareQuery(text), prepareQuery(text.replace(/\b([a-z]) (?=[a-z]\b)/g, "$1"))];
  let best = null;
  let bestScore = 0;
  for (const brand of brands) {
    const entry = indexItem({ model: brandLabel(brand) });
    const score = Math.max(...queries.map((q) => scoreEntry(q, entry)));
    if (score > bestScore) {
      best = brand;
      bestScore = score;
    }
  }
  return bestScore >= 0.6 ? best : null;
}
