/**
 * # Tokenizers — the declared, versioned counting method
 *
 * A View's budget is meaningless without saying what counted the tokens: which glyphs are cheap
 * is an empirical, per-model fact. So a {@link Rendering} always names the tokenizer its
 * accounting was done under, and the tokenizer carries a versioned id.
 *
 * The one shipped here is an approximation and says so in its id. Callers with a real BPE
 * tokenizer pass their own; this package never imports one, because a types-only contract does
 * not get to drag a model's vocabulary into every consumer's bundle.
 *
 * @packageDocumentation
 */

/** A counting method with a versioned id, named in every Rendering's token account. */
export interface Tokenizer {
  /** A stable, versioned id — it is recorded in the Rendering and is part of the accounting. */
  readonly id: string
  count(text: string): number
}

/**
 * The default: `ceil(chars / 4)`. An APPROXIMATION, and its id says so. It is close enough to
 * make a budget bite on English prose and GFM tables, and wrong enough that anyone measuring
 * real spend should pass a real tokenizer.
 *
 * ## Where it is wrong, and in which direction
 * `text.length` counts **UTF-16 code units**, and the 4:1 ratio is an English-prose ratio. On CJK
 * text a real BPE tokenizer spends roughly 1–1.5 tokens per character, so this counter reports
 * about a **third to a fifth** of the true spend — and it therefore fails OPEN: a Frame of
 * Japanese supplier names passes a budget it actually blows, and the budget stops biting exactly
 * where token economy matters most. Emoji and other astral-plane characters go the other way
 * (two code units each), so it over-counts them.
 *
 * This is not a bug to fix here. Making the shipped counter model-accurate means importing a
 * model's vocabulary, and a types-only contract does not get to drag a BPE table into every
 * consumer's bundle. It is a caveat to KNOW: if a View's values are not mostly Latin script,
 * pass a real tokenizer.
 */
export const approxCharsPerToken: Tokenizer = {
  id: 'approx-chars/4@1',
  count(text: string): number {
    return Math.ceil(text.length / 4)
  },
}

/** Budget accounting for one Rendering — what was allowed, what was spent, and by what method. */
export interface TokenAccount {
  readonly tokenizer: string
  readonly budget: number
  readonly spent: number
}
