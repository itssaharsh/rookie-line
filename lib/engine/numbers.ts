// Turn what the trainee said into digit strings, so read-backs are checked by code.
// Handles "417", "4-1-7", "4 1 7", "four one seven", "four seventeen",
// "four hundred seventeen", "four hundred and seventeen", "oh" for zero, and the Spanish words.

const UNITS: Record<string, number> = {
  zero: 0, oh: 0, o: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  cero: 0, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9,
};
const TEENS: Record<string, number> = {
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19,
  diez: 10, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17,
  dieciocho: 18, diecinueve: 19,
};
const TENS: Record<string, number> = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
  veinte: 20, treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90,
};
const HUNDRED = new Set(["hundred", "cien", "ciento"]);
const JOINERS = new Set(["and", "y"]);

function isNumberWord(w: string): boolean {
  return w in UNITS || w in TEENS || w in TENS || HUNDRED.has(w) || /^\d+$/.test(w);
}

/** Convert one run of number words/digits to a digit string. */
function runToDigits(words: string[]): string {
  if (words.some((w) => HUNDRED.has(w))) {
    // arithmetic reading: "four hundred (and) seventeen"
    let total = 0;
    let cur = 0;
    for (const w of words) {
      if (JOINERS.has(w)) continue;
      if (/^\d+$/.test(w)) cur += Number(w);
      else if (w in UNITS) cur += UNITS[w];
      else if (w in TEENS) cur += TEENS[w];
      else if (w in TENS) cur += TENS[w];
      else if (HUNDRED.has(w)) cur = (cur || 1) * 100;
    }
    total += cur;
    return String(total);
  }
  // digit-by-digit or grouped reading: concatenate, combining "twenty one" -> "21"
  let out = "";
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (JOINERS.has(w)) continue;
    if (/^\d+$/.test(w)) out += w;
    else if (w in UNITS) out += String(UNITS[w]);
    else if (w in TEENS) out += String(TEENS[w]);
    else if (w in TENS) {
      const next = words[i + 1];
      if (next && next in UNITS && UNITS[next] > 0) {
        out += String(TENS[w] + UNITS[next]);
        i++;
      } else out += String(TENS[w]);
    }
  }
  return out;
}

/** Every digit run in the text, with words converted. "Is that 4-1-7 Maple?" -> ["417"]. */
export function digitRuns(text: string): string[] {
  const norm = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    // join digit groups written with dashes, dots or single spaces: 4-1-7, 555-0142, 4 1 7
    .replace(/(\d)[\s.\-–]+(?=\d)/g, "$1")
    .replace(/[^a-z0-9\s]/g, " ");
  const words = norm.split(/\s+/).filter(Boolean);
  const runs: string[] = [];
  let cur: string[] = [];
  const flush = () => {
    // a lone "o"/"oh"/"one" etc. inside ordinary speech is not a number run unless it sits beside others
    if (cur.length) {
      const d = runToDigits(cur);
      const onlyAmbiguous = cur.length === 1 && ["o", "oh", "one", "una", "uno"].includes(cur[0]);
      if (d && !onlyAmbiguous) runs.push(d);
    }
    cur = [];
  };
  for (const w of words) {
    // "and"/"y" only joins inside "four hundred and seventeen"; elsewhere it separates two numbers
    if (isNumberWord(w) || (JOINERS.has(w) && cur.length && HUNDRED.has(cur[cur.length - 1]))) cur.push(w);
    else flush();
  }
  flush();
  return runs.map((r) => r.replace(/^0+(?=\d{3})/, "")).filter((r) => r.length > 0);
}

/** Strip every digit and number written in the text (the model may not invent facts). */
export function hasDigits(text: string): boolean {
  return /\d/.test(text);
}
