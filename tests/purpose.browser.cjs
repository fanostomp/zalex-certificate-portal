const assert = require('node:assert/strict');

// Uses the browser's real DOMParser and Intl.Segmenter, without a DOM dependency.
module.exports = async function verifyPurpose(page) {
  const { purposeHtmlCases: cases } = await import('./purposeHtml.fixtures.mjs');
  const actual = await page.evaluate(async (fixtures) => {
    const { getPurposeCharacterCount } = await import('/src/components/certificates/purposeText.ts');
    return fixtures.map(([, html]) => getPurposeCharacterCount(html));
  }, cases);
  cases.forEach(([name, , expected], index) => assert.equal(actual[index], expected, name));
  return { checks: cases.map(([name]) => name) };
};
