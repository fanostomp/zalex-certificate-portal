import { countVisibleTextCharacters } from '../../utils/visibleText.ts';
export { countVisibleTextCharacters } from '../../utils/visibleText.ts';

export function getPurposeCharacterCount(html: string): number {
  // Parse in an inert document; never insert the supplied HTML into the page.
  const document = new DOMParser().parseFromString(html, 'text/html');
  document.querySelectorAll('script, style, template').forEach((element) => element.remove());
  document.querySelectorAll('br').forEach((element) => element.replaceWith('\n'));
  document.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6, li, blockquote, pre')
    .forEach((element) => element.append('\n'));

  return countVisibleTextCharacters(document.body.textContent ?? '');
}
