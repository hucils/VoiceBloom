/**
 * Copy checks for Romanian text. VoiceBloom addresses the reader in the
 * feminine, so a masculine adjective right after a verb addressed to the
 * reader ("ești pregătit", "devii mai atent") is a translation bug.
 *
 * Boundaries use Unicode letter classes: JavaScript's \b treats "ă" as a
 * non-letter, which would make the correct "pregătită" look like "pregătit".
 */
const MASCULINE_ADDRESS =
  /(?<!\p{L})(ești|fii|devii|te simți|rămâi|ai fost)\s+(?:(?:mai|foarte|puțin|prea)\s+)?(pregătit|obosit|atent|curios|mândru|relaxat|amețit|concentrat|binevenit|sigur|blând|liniștit|singur|încordat|emoționat|entuziasmat|fericit|mulțumit)(?!\p{L})/giu;

export function findMasculineAddress(text: string): string[] {
  return [...text.matchAll(MASCULINE_ADDRESS)].map((match) => match[0]);
}

/** Cedilla look-alikes of ș/ț (ş ţ Ş Ţ), a common Romanian typesetting error. */
export const CEDILLA_FORMS = /[şţŞŢ]/;
