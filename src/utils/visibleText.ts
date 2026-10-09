const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

export function countVisibleTextCharacters(value: string): number {
  const text = value
    .replace(/\s+/gu, ' ')
    // Keep joiners and emoji tags for segmentation; they never count on their own.
    .replace(/[\p{Cc}\p{Cf}]/gu, (character) =>
      character === '\u200c' || character === '\u200d' || /[\u{E0020}-\u{E007F}]/u.test(character)
        ? character : '')
    .replace(/\s+/gu, ' ')
    .trim()
    .normalize('NFC');

  let count = 0;
  for (const { segment } of graphemes.segment(text)) {
    // Combining marks, variation selectors and invisible-only clusters add nothing.
    if (segment === ' ' || /[^\p{C}\p{M}\p{Z}\p{Default_Ignorable_Code_Point}]/u.test(segment)) {
      count += 1;
    }
  }
  return count;
}
