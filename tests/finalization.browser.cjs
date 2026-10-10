const assert = require('node:assert/strict');

// Uses the same externally supplied Playwright Page as the existing scenarios.
// All API traffic is intercepted; this never submits a real certificate.
module.exports = async function verifyFinalization(page, { only } = {}) {
  const checks = [];
  let posts = 0;
  let gets = 0;
  let postStatus = 200;
  let postNetworkError = false;
  let postGate;
  let releasePost;
  let lastPayload;
  let getStatus = 200;
  let getGate;
  let releaseGet;
  const block = route => route.abort();
  const handlePost = async route => {
    posts++;
    lastPayload = route.request().postDataJSON();
    if (postGate) await postGate;
    if (postNetworkError) return route.abort('failed');
    return route.fulfill({ status: postStatus, contentType: 'application/json',
      body: JSON.stringify(postStatus === 200 ? { responce: 'Ok' } : { error: 'Service request failed' }) });
  };
  const handleGet = async route => {
    gets++;
    if (getGate) await getGate;
    return route.fulfill({ status: getStatus, contentType: 'application/json', body: JSON.stringify(getStatus === 200 ? [] : { error: 'Service request failed' }) });
  };
  await page.route('http://localhost:3000/api/**', block);
  await page.route('https://zalexinc.azure-api.net/**', block);
  await page.route('http://localhost:3000/api/request-certificate', handlePost);
  await page.route('http://localhost:3000/api/request-list', handleGet);

  const purpose = () => page.getByRole('textbox', { name: 'Purpose', exact: true });
  const address = () => page.getByRole('textbox', { name: 'Address to', exact: true });
  const employee = () => page.getByRole('textbox', { name: 'Employee ID', exact: true });
  const submit = () => page.getByRole('button', { name: 'Submit Request', exact: true });
  const freshForm = async () => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:3000/requests/new');
    await address().fill('Example Bank');
    await purpose().fill('This certificate is needed to complete an administrative application.');
    await employee().fill('00123');
    const tomorrow = await page.evaluate(() => {
      const d = new Date(); d.setDate(d.getDate() + 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
    await page.getByRole('textbox', { name: 'Issued on', exact: true }).fill(tomorrow);
  };
  const expectNoPost = async (field, text) => {
    const before = posts;
    await submit().click();
    await page.getByText(text, { exact: true }).waitFor();
    assert.equal(posts, before);
    assert.equal(await field.getAttribute('aria-invalid'), 'true');
    const describedBy = await field.getAttribute('aria-describedby');
    assert.ok(describedBy);
    assert.ok(await page.locator(`[id="${describedBy.split(' ').at(-1)}"]`).getAttribute('role') === 'alert');
  };

  const scenarios = [
    ['limits', async () => {
      await freshForm();
      await address().fill('a'.repeat(501));
      await expectNoPost(address(), 'Address to must contain at most 500 characters');
      await address().fill('Example Bank');
      await employee().fill('1'.repeat(101));
      await expectNoPost(employee(), 'Employee ID must contain at most 100 digits');
      await employee().fill('00123');
      await purpose().fill('a'.repeat(23994));
      await expectNoPost(purpose(), 'Purpose HTML must contain at most 24,000 characters. Shorten the text or remove formatting.');
      await purpose().fill('😀'.repeat(9000));
      await expectNoPost(purpose(), 'Request exceeds 32 KiB. Shorten the Purpose text or recipient.');
      checks.push('field limits and UTF-8 payload limit prevent POST with accessible inline errors');
    }],
    ['payload-dependencies', async () => {
      const message = 'Request exceeds 32 KiB. Shorten the Purpose text or recipient.';
      const issuedOn = () => page.getByRole('textbox', { name: 'Issued on', exact: true });
      const expectPayloadError = async invalid => {
        await page.locator(`[role="textbox"][contenteditable][aria-invalid="${invalid}"]`).waitFor({ timeout: 5000 });
        assert.equal(await page.getByText(message, { exact: true }).count(), invalid ? 1 : 0);
        if (invalid) {
          const errorId = (await purpose().getAttribute('aria-describedby')).split(' ').at(-1);
          assert.equal(await page.locator(`[id="${errorId}"]`).getAttribute('role'), 'alert');
        }
      };
      await freshForm();
      const before = posts;
      await address().fill('é'.repeat(500));
      await purpose().fill('é'.repeat(15900));
      await expectNoPost(purpose(), message);
      await address().fill('Bank');
      await expectPayloadError(false);
      await address().fill('é'.repeat(500));
      await expectPayloadError(true);
      assert.equal(posts, before);
      await address().fill('Bank');
      await expectPayloadError(false);

      // Concurrent submit events must still produce only one POST.
      postGate = new Promise(resolve => { releasePost = resolve; });
      const receivedPost = page.waitForRequest(request => request.url() === 'http://localhost:3000/api/request-certificate' && request.method() === 'POST');
      await page.evaluate(() => { for (let i = 0; i < 3; i++) document.querySelector('form').requestSubmit(); });
      await receivedPost;
      await page.getByRole('button', { name: 'Submitting...', exact: true }).waitFor();
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
      assert.equal(posts, before + 1);
      releasePost(); releasePost = undefined; postGate = undefined;
      await page.getByText('Your certificate request was submitted successfully.', { exact: true }).waitFor();
      assert.equal(lastPayload.address_to, 'Bank');
      assert.equal(lastPayload.employee_id, '00123');
      assert.equal(lastPayload.purpose, `<p>${'é'.repeat(15900)}</p>`);

      // This fixed fixture is exactly 32,768 serialized bytes with Bank/00123/1/1/2099.
      await issuedOn().fill('2099-01-01');
      await purpose().fill('é'.repeat(15900) + 'a'.repeat(882));
      await expectPayloadError(false);
      await employee().fill('1'.repeat(100));
      await expectPayloadError(true);
      await expectNoPost(purpose(), message);
      await employee().fill('00123');
      await expectPayloadError(false);
      await issuedOn().fill('2099-10-10');
      await expectPayloadError(true);
      await expectNoPost(purpose(), message);
      await issuedOn().fill('2099-01-01');
      await expectPayloadError(false);
      assert.equal(posts, before + 1);

      await purpose().fill('a'.repeat(49));
      await page.getByText('Purpose must contain at least 50 visible characters', { exact: true }).waitFor();
      await address().fill('Another Bank');
      assert.equal(await purpose().getAttribute('aria-invalid'), 'true');
      assert.equal(await page.getByText('Purpose must contain at least 50 visible characters', { exact: true }).count(), 1);
      checks.push('recipient/employee/date edits refresh payload errors and ARIA in both directions; corrected form submits once');
    }],
    ['normalization', async () => {
      await freshForm();
      await address().fill(' Cafe\u0301 ');
      await submit().click();
      await page.getByText('Your certificate request was submitted successfully.', { exact: true }).waitFor();
      assert.equal(lastPayload.address_to, 'Café');
      assert.equal(lastPayload.employee_id, '00123');
      checks.push('NFC-normalized recipient is accepted and submitted without losing employee ID zeros');
    }],
    ['errors', async () => {
      for (const [status, message] of [
        [400, 'The service could not validate this request. Check all fields and the issue date, then submit again.'],
        [413, 'The request is too large. Shorten the Purpose text or recipient, then submit again.'],
        [429, 'Too many requests. Wait before submitting again.'],
        [504, 'The submission outcome is unknown. Your request may have been processed. Verify the outcome before submitting again.'],
      ]) {
        postStatus = status;
        await freshForm();
        const before = posts;
        await submit().click();
        await page.getByText(message, { exact: true }).waitFor();
        assert.equal(posts, before + 1);
        if (status === 504) {
          await employee().fill('00124');
          assert.equal(await page.getByText(message, { exact: true }).count(), 1);
        }
      }
      postNetworkError = true;
      await freshForm();
      const before = posts;
      await submit().click();
      await page.getByText('The submission outcome is unknown. Your request may have been processed. Verify the outcome before submitting again.', { exact: true }).waitFor();
      assert.equal(posts, before + 1);
      postNetworkError = false; postStatus = 200;
      checks.push('400/413/429 have actionable feedback; timeout and network outcomes remain unknown without retry');
    }],
    ['navigation', async () => {
      for (const status of [200, 504]) {
        postStatus = status;
        await freshForm();
        postGate = new Promise(resolve => { releasePost = resolve; });
        const before = posts;
        const receivedPost = page.waitForRequest(request => request.url() === 'http://localhost:3000/api/request-certificate' && request.method() === 'POST');
        await submit().click();
        await receivedPost;
        await page.getByRole('link', { name: 'Requests list', exact: true }).click();
        await page.getByText('No certificate requests found.', { exact: true }).waitFor();
        await page.getByText('Submitting your certificate request… You can navigate within the portal; the result will appear here.', { exact: true }).waitFor();
        assert.equal(await page.evaluate(() => {
          const event = new Event('beforeunload', { cancelable: true });
          window.dispatchEvent(event);
          return event.defaultPrevented;
        }), true);
        await page.getByRole('link', { name: 'Request certificate', exact: true }).click();
        assert.equal(await page.getByRole('button', { name: 'Submitting...', exact: true }).isDisabled(), true);
        assert.equal(await address().isDisabled(), true);
        releasePost(); releasePost = undefined; postGate = undefined;
        const message = status === 200 ? 'Your certificate request was submitted successfully.' : 'The submission outcome is unknown. Your request may have been processed. Verify the outcome before submitting again.';
        await page.getByText(message, { exact: true }).waitFor();
        await page.waitForFunction(() => {
          const event = new Event('beforeunload', { cancelable: true });
          window.dispatchEvent(event);
          return !event.defaultPrevented;
        });
        await page.getByRole('link', { name: 'Requests list', exact: true }).click();
        assert.equal(await page.getByText(message, { exact: true }).count(), 1);
        assert.equal(posts, before + 1);
        await page.getByRole('button', { name: 'Dismiss submission feedback', exact: true }).click();
        assert.equal(await page.getByText(message, { exact: true }).count(), 0);
      }
      postStatus = 200;
      checks.push('pending POST survives navigation; remounted form stays locked; success/unknown result survives navigation');
    }],
    ['retry', async () => {
      getStatus = 500;
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto('http://localhost:3000/requests');
      await page.getByRole('alert').waitFor();
      const retry = page.getByRole('button', { name: 'Retry loading requests', exact: true });
      for (const element of [retry, page.getByRole('alert')]) {
        const box = await element.boundingBox();
        assert.ok(box && box.x >= 0 && box.x + box.width <= 390, 'Retry feedback must fit without horizontal scrolling');
      }
      const before = gets;
      getStatus = 200;
      await retry.focus();
      await retry.press('Enter');
      await page.getByText('No certificate requests found.', { exact: true }).waitFor();
      assert.equal(page.url(), 'http://localhost:3000/requests');
      assert.ok(gets > before);
      await page.setViewportSize({ width: 1440, height: 900 });
      getStatus = 500;
      await page.goto('http://localhost:3000/requests');
      await page.getByRole('alert').waitFor();
      getStatus = 200;
      const beforeCancelledRetry = gets;
      getGate = new Promise(resolve => { releaseGet = resolve; });
      const receivedGet = page.waitForRequest(request => request.url() === 'http://localhost:3000/api/request-list');
      await page.getByRole('button', { name: 'Retry loading requests', exact: true }).click();
      await page.getByText('Loading certificate requests...', { exact: true }).waitFor();
      const retriedRequest = await receivedGet;
      assert.ok(gets > beforeCancelledRetry);
      assert.equal(page.url(), 'http://localhost:3000/requests');
      const cancelledGet = page.waitForEvent('requestfailed', { predicate: request => request === retriedRequest });
      await page.getByRole('link', { name: 'Request certificate', exact: true }).click();
      assert.match((await cancelledGet).failure().errorText, /abort/i);
      releaseGet(); releaseGet = undefined; getGate = undefined;
      assert.equal(await page.getByText('Failed to load certificate requests.', { exact: false }).count(), 0);
      await page.getByRole('link', { name: 'Requests list', exact: true }).click();
      await page.getByText('No certificate requests found.', { exact: true }).waitFor();
      assert.ok(gets > before);
      checks.push('Retry fits mobile, works with the keyboard, recovers on the same route, and cancels on navigation');
    }],
  ];

  try {
    for (const [name, run] of scenarios) if (!only || only.includes(name)) await run();
    return { checks, interceptedPosts: posts, realPosts: 0 };
  } finally {
    if (releasePost) releasePost();
    if (releaseGet) releaseGet();
    await page.unroute('http://localhost:3000/api/request-certificate', handlePost);
    await page.unroute('http://localhost:3000/api/request-list', handleGet);
    await page.unroute('http://localhost:3000/api/**', block);
    await page.unroute('https://zalexinc.azure-api.net/**', block);
  }
};
