const assert = require('node:assert/strict');

// Run against the production preview so these checks exercise generated chunks.
// Each scenario uses a fresh context; all API requests are intercepted.
module.exports = async function verifyRoutes(page, { baseURL = 'http://localhost:4173', only } = {}) {
  const checks = [];
  const initialScripts = [];
  const browser = page.context().browser();
  const run = async (name, test) => {
    if (only && !only.includes(name)) return;
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const target = await context.newPage();
    await context.route('**/api/**', route => route.fulfill({ status: 200,
      contentType: 'application/json', body: '[]' }));
    await context.route('https://zalexinc.azure-api.net/**', route => route.abort());
    try { await test(target); } finally { await context.close(); }
  };

  await run('list', async target => {
    target.on('request', request => {
      if (request.resourceType() === 'script') initialScripts.push(new URL(request.url()).pathname);
    });
    await target.goto(`${baseURL}/requests`);
    await target.getByText('No certificate requests found.', { exact: true }).waitFor();
    assert.ok(initialScripts.some(path => path.includes('RequestsListPage-')));
    assert.ok(!initialScripts.some(path => path.includes('NewRequestPage-')));
    checks.push('requests list loads its route chunk without downloading the editor route chunk');
  });

  await run('loading', async target => {
    let releaseChunk;
    const chunkGate = new Promise(resolve => { releaseChunk = resolve; });
    await target.route('**/assets/NewRequestPage-*.js', async route => {
      await chunkGate;
      await route.continue();
    });
    try {
      await target.goto(`${baseURL}/requests`);
      await target.getByText('No certificate requests found.', { exact: true }).waitFor();
      await target.getByRole('link', { name: 'Request certificate', exact: true }).click();
      const loading = target.getByText('Loading page…', { exact: true });
      await loading.waitFor();
      assert.equal(await loading.getAttribute('aria-live'), 'polite');
      assert.equal(await target.getByRole('navigation', { name: 'Main navigation' }).count(), 1);
      releaseChunk();
      await target.getByRole('textbox', { name: 'Purpose', exact: true }).waitFor();
      checks.push('a delayed editor chunk exposes an accessible fallback and mounts successfully');
    } finally { releaseChunk(); }
  });

  await run('failure', async target => {
    let releasePost;
    const postGate = new Promise(resolve => { releasePost = resolve; });
    await target.route('**/api/request-certificate', async route => {
      await postGate;
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"responce":"Ok"}' });
    });
    await target.route('**/assets/RequestsListPage-*.js', route => route.abort('failed'));
    try {
      await target.goto(`${baseURL}/requests/new`);
      await target.getByRole('textbox', { name: 'Address to', exact: true }).fill('Example Bank');
      await target.getByRole('textbox', { name: 'Purpose', exact: true }).fill('This certificate is needed to complete an administrative application.');
      await target.getByRole('textbox', { name: 'Employee ID', exact: true }).fill('00123');
      const tomorrow = await target.evaluate(() => {
        const date = new Date(); date.setDate(date.getDate() + 1);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      });
      await target.getByRole('textbox', { name: 'Issued on', exact: true }).fill(tomorrow);
      const receivedPost = target.waitForRequest(request => request.method() === 'POST');
      await target.getByRole('button', { name: 'Submit Request', exact: true }).click();
      await receivedPost;
      await target.getByRole('link', { name: 'Requests list', exact: true }).click();
      await target.getByRole('alert').filter({ hasText: 'This page could not be loaded.' }).waitFor();
      assert.equal(await target.getByRole('button', { name: 'Reload page', exact: true }).count(), 1);
      assert.equal(await target.getByRole('navigation', { name: 'Main navigation' }).count(), 1);
      assert.equal(await target.getByText('Submitting your certificate request… You can navigate within the portal; the result will appear here.', { exact: true }).count(), 1);
      releasePost();
      await target.getByText('Your certificate request was submitted successfully.', { exact: true }).waitFor();
      await target.getByRole('link', { name: 'Request certificate', exact: true }).click();
      await target.getByRole('textbox', { name: 'Purpose', exact: true }).waitFor();
      assert.equal(await target.getByText('This page could not be loaded.', { exact: false }).count(), 0);
      assert.equal(await target.getByText('Your certificate request was submitted successfully.', { exact: true }).count(), 1);
      checks.push('a failed route chunk preserves pending POST feedback, completion, and recovery navigation');
    } finally { releasePost(); }
  });
  return { checks, initialScripts, realPosts: 0 };
};
