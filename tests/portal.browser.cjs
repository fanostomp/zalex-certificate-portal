const assert = require('node:assert/strict');

// Run with a Playwright Page against the dev server. Every API request is mocked.
module.exports = async function verifyPortal(page) {
  const checks = [];
  let postCount = 0;
  let finishPost;
  let responseBody = { responce: 'Ok' };
  let responseStatus = 200;
  let payload;
  const records = [
    { reference_no: 50, address_to: 'Bank of Mars', purpose: 'A', issued_on: '12/31/2025', status: 'Pending' },
    { reference_no: 50, address_to: 'Bank of Mars', purpose: 'B', issued_on: '1/1/2026', status: 'Pending' },
    { reference_no: 50, address_to: 'Bank of Mars', purpose: 'B', issued_on: '1/1/2026', status: 'Pending' },
    { reference_no: 50, address_to: 'Bank of Venus', purpose: 'C', issued_on: '2/29/2024', status: 'Approved' },
    { reference_no: 5, address_to: 'Mars Bank', purpose: 'D', issued_on: '06/16/2023', status: 'Rejected' },
  ];
  let getRecords = records;
  let getStatus = 200;
  let getGate = Promise.resolve();
  let releaseGet;
  const waitForPost = async () => {
    for (let attempt = 0; !finishPost && attempt < 100; attempt += 1) {
      await page.waitForTimeout(20);
    }
    assert.ok(finishPost, 'Expected an intercepted POST request');
  };

  const handlePost = async (route) => {
    assert.equal(route.request().headers()['x-client-timezone'],
      await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone));
    postCount += 1;
    payload = route.request().postDataJSON();
    await new Promise((resolve) => { finishPost = resolve; });
    await route.fulfill({ status: responseStatus, contentType: 'application/json',
      body: JSON.stringify(responseBody) });
  };
  const handleGet = async (route) => {
    await getGate;
    await route.fulfill({ status: getStatus, contentType: 'application/json', body: JSON.stringify(getRecords) });
  };
  // Fail closed if the frontend regresses to an unmocked API URL.
  const blockUnexpectedApi = (route) => route.abort();
  await page.route('http://localhost:3000/api/**', blockUnexpectedApi);
  await page.route('https://zalexinc.azure-api.net/**', blockUnexpectedApi);
  await page.route('http://localhost:3000/api/request-certificate', handlePost);
  await page.route('http://localhost:3000/api/request-list', handleGet);

  try {
    await page.goto('http://localhost:3000/requests/new');
    const address = page.getByRole('textbox', { name: 'Address to', exact: true });
    const purpose = page.getByRole('textbox', { name: 'Purpose', exact: true });
    const date = page.getByRole('textbox', { name: 'Issued on', exact: true });
    const employee = page.getByRole('textbox', { name: 'Employee ID', exact: true });
    const submit = page.getByRole('button', { name: 'Submit Request', exact: true });
    const bold = page.getByRole('button', { name: 'Bold', exact: true });
    const italic = page.getByRole('button', { name: 'Italic', exact: true });

    await submit.click();
    await page.getByText('Address to is required', { exact: true }).waitFor();
    await page.getByText('Purpose is required', { exact: true }).waitFor();
    await page.getByText('Issued on is required', { exact: true }).waitFor();
    await page.getByText('Employee ID is required', { exact: true }).waitFor();
    assert.equal(postCount, 0);
    checks.push('required inline validation prevents POST');

    await address.fill('Invalid!');
    await page.getByText('Only letters, numbers and spaces are allowed', { exact: true }).waitFor();
    await employee.fill('ABC');
    await page.getByText('Employee ID must contain digits only', { exact: true }).waitFor();
    const dates = await page.evaluate(() => {
      const today = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const iso = (value) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
      return { today: iso(today), tomorrow: iso(tomorrow),
        api: `${tomorrow.getMonth() + 1}/${tomorrow.getDate()}/${tomorrow.getFullYear()}` };
    });
    await date.fill(dates.today);
    await page.getByText('Issued on must be a future date', { exact: true }).waitFor();
    checks.push('recipient, employee ID and future-date validation remain intact');

    const isoDate = dates.tomorrow;
    await address.fill('Example Recipient');
    await date.fill(isoDate);
    await employee.fill('00123');
    await submit.click();
    await page.waitForFunction(() => document.activeElement?.getAttribute('role') === 'textbox'
      && document.activeElement?.getAttribute('contenteditable') === 'true');
    assert.equal(await purpose.getAttribute('aria-invalid'), 'true');
    checks.push('RHF focuses the invalid Purpose editor');

    await purpose.fill('Short');
    await page.getByText('Purpose must contain at least 50 visible characters', { exact: true }).waitFor();
    for (const [value, count] of [['\u200b'.repeat(50), 0], ['a'.repeat(49), 49], ['e\u0301'.repeat(50), 50], ['👨‍👩‍👧‍👦'.repeat(50), 50]]) {
      await purpose.fill(value);
      await page.getByText(`${count} visible characters. Minimum 50 characters.`, { exact: true }).waitFor();
      if (count < 50) {
        await submit.click();
        assert.equal(postCount, 0);
        assert.equal(await purpose.getAttribute('aria-invalid'), 'true');
      } else {
        await page.waitForFunction(() => document.querySelector('[aria-multiline="true"]')?.getAttribute('aria-invalid') === 'false');
      }
    }
    checks.push('zero-width input is rejected; Unicode counter and validation agree at 49/50');
    const text = 'This certificate is needed to complete an administrative application.';
    await purpose.fill(text);
    await page.getByText(`${text.length} visible characters. Minimum 50 characters.`, { exact: true }).waitFor();
    checks.push('visible character count and minimum validation');

    await purpose.press('ControlOrMeta+a');
    await bold.click();
    await page.waitForFunction(() => document.querySelector('button[aria-label="Bold"]')?.getAttribute('aria-pressed') === 'true');
    await italic.click();
    await page.waitForFunction(() => document.querySelector('button[aria-label="Italic"]')?.getAttribute('aria-pressed') === 'true');
    checks.push('Bold/Italic formatting and active accessible states');

    await submit.click();
    await page.waitForFunction(() => document.querySelector('form')?.getAttribute('aria-busy') === 'true');
    assert.equal(await address.isDisabled(), true);
    assert.equal(await employee.isDisabled(), true);
    assert.equal(await bold.isDisabled(), true);
    await page.waitForFunction(() => document.querySelector('[role="textbox"][aria-multiline]')?.getAttribute('contenteditable') === 'false');
    await waitForPost();
    assert.equal(postCount, 1);
    assert.equal(payload.employee_id, '00123');
    assert.equal(payload.issued_on, dates.api);
    assert.ok(payload.purpose.includes('<strong>') && payload.purpose.includes('<em>'));
    finishPost();
    finishPost = undefined;
    await page.getByText('Your certificate request was submitted successfully.', { exact: true }).waitFor();
    assert.equal(await address.inputValue(), 'Example Recipient');
    assert.equal(await employee.inputValue(), '00123');
    checks.push('pending locks all inputs; successful POST preserves values and formatting');

    await purpose.fill(`${text} Updated`);
    assert.equal(await page.getByText('Your certificate request was submitted successfully.', { exact: true }).count(), 0);
    checks.push('editor edits clear stale success feedback');

    responseStatus = 500;
    await submit.click();
    await waitForPost();
    finishPost();
    finishPost = undefined;
    await page.getByText('Something went wrong. Please try again.', { exact: true }).waitFor();
    await employee.fill('00124');
    assert.equal(await page.getByText('Something went wrong. Please try again.', { exact: true }).count(), 0);
    checks.push('POST errors appear and native input edits clear stale feedback');

    responseStatus = 200;
    responseBody = { responce: 'Unexpected' };
    await submit.click();
    await waitForPost();
    finishPost();
    finishPost = undefined;
    await page.getByText('The submission outcome is unknown. Your request may have been processed. Verify the outcome before submitting again.', { exact: true }).waitFor();
    checks.push('POST rejects unexpected success responses');
    await page.getByRole('button', { name: 'Dismiss submission feedback', exact: true }).click();

    getRecords = [];
    getGate = new Promise(resolve => { releaseGet = resolve; });
    await page.goto('http://localhost:3000/requests');
    await page.getByText('Loading certificate requests...', { exact: true }).waitFor();
    assert.equal(await page.getByRole('status').innerText(), 'Loading...');
    assert.equal(await page.locator('table').getAttribute('aria-busy'), 'true');
    releaseGet();
    releaseGet = undefined;
    await page.getByText('No certificate requests found.', { exact: true }).waitFor();
    assert.equal(await page.getByRole('status').innerText(), '0 of 0 requests');
    assert.equal(await page.locator('table').getAttribute('aria-busy'), 'false');
    checks.push('accessible loading announcement and empty GET response');

    getRecords = [{ ...records[0], issued_on: '2/30/2026' }];
    await page.goto('http://localhost:3000/requests');
    await page.getByRole('alert').waitFor();
    assert.equal(await page.locator('tbody time').count(), 0);
    checks.push('invalid GET calendar dates show an accessible error');

    getStatus = 500;
    await page.reload();
    await page.getByRole('alert').waitFor();
    assert.equal(await page.getByRole('status').innerText(), 'Unable to load');
    checks.push('failed GET shows an accessible error');

    getStatus = 200;
    getRecords = records;
    await page.reload();
    await page.getByText('5 of 5 requests', { exact: true }).waitFor();
    assert.equal(await page.locator('tbody tr').count(), 5);
    assert.equal(await page.locator('tbody time').count(), 5);
    assert.equal(await page.locator('tbody tr').filter({ has: page.locator('td:first-child', { hasText: /^50$/ }) }).count(), 4);
    checks.push('mocked GET preserves duplicate references and identical records');

    const expectPurposes = async (expected) => assert.deepEqual(await page.locator('tbody td:nth-child(3)').allTextContents(), expected);
    const clearFilters = page.getByRole('button', { name: 'Clear filters', exact: true });
    const reference = page.getByRole('textbox', { name: 'Reference No.', exact: true });
    const addressFilter = page.getByRole('searchbox', { name: 'Address to', exact: true });
    const statusFilter = page.getByRole('combobox', { name: 'Status', exact: true });
    const issuedSort = page.getByRole('button', { name: 'Issued on', exact: true });
    const statusSort = page.getByRole('button', { name: 'Status', exact: true });
    await expectPurposes(['B', 'B', 'A', 'C', 'D']);
    assert.equal(await page.locator('th[aria-sort]').getAttribute('aria-sort'), 'descending');
    const rowHandles = await page.locator('tbody tr').elementHandles();
    await issuedSort.focus();
    await page.keyboard.press('Enter');
    await expectPurposes(['D', 'C', 'A', 'B', 'B']);
    assert.equal(await page.locator('th[aria-sort]').getAttribute('aria-sort'), 'ascending');
    for (const handle of rowHandles) assert.ok(await handle.evaluate(row => row.isConnected));
    checks.push('chronological sorting in both directions, stable row keys and keyboard Enter');

    await reference.fill('5');
    await expectPurposes(['D']);
    await reference.fill(' 50 ');
    await expectPurposes(['C', 'A', 'B', 'B']);
    await clearFilters.click();
    await addressFilter.fill(' MARS   bank ');
    await expectPurposes(['D', 'A', 'B', 'B']);
    await clearFilters.click();
    await statusFilter.selectOption('Approved');
    await expectPurposes(['C']);
    await clearFilters.click();
    await expectPurposes(['D', 'C', 'A', 'B', 'B']);
    checks.push('individual labeled filters and Clear filters');

    await reference.fill('50');
    await addressFilter.fill('bank mars');
    await statusFilter.selectOption('Pending');
    await expectPurposes(['A', 'B', 'B']);
    assert.equal(await page.getByRole('status').innerText(), '3 of 5 requests');
    await issuedSort.click();
    await expectPurposes(['B', 'B', 'A']);
    await statusSort.click();
    await expectPurposes(['A', 'B', 'B']);
    await statusSort.click();
    await expectPurposes(['A', 'B', 'B']);
    await statusFilter.selectOption('Approved');
    await page.getByText('No matching requests. Try adjusting or clearing your filters.', { exact: true }).waitFor();
    assert.equal(await page.getByRole('status').innerText(), '0 of 5 requests');
    await clearFilters.click();
    await expectPurposes(['D', 'A', 'B', 'B', 'C']);
    checks.push('combined filters, sorting while filtered, no matches and clear restores duplicates');

    // Keep multiple statuses visible while an address filter remains active.
    await addressFilter.fill('bank of');
    await statusSort.focus();
    await page.keyboard.press('Space');
    await expectPurposes(['C', 'A', 'B', 'B']);
    assert.equal(await page.locator('th[aria-sort]').getAttribute('aria-sort'), 'ascending');
    await page.keyboard.press('Enter');
    await expectPurposes(['A', 'B', 'B', 'C']);
    assert.equal(await page.locator('th[aria-sort]').getAttribute('aria-sort'), 'descending');
    assert.equal(await page.locator('th[aria-sort]').count(), 1);
    await clearFilters.click();
    checks.push('alphabetical status sorting in both directions with filters, keyboard Space and aria-sort');

    await page.setViewportSize({ width: 390, height: 844 });
    const scrollButton = page.getByRole('button', { name: 'Scroll requests table right', exact: true });
    await scrollButton.focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.getElementById('requests-table-scroll').scrollLeft > 0);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    checks.push('mobile table scroll works with the keyboard without page overflow');

    await page.goto('http://localhost:3000/requests/new');
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const fits = await page.locator('form').evaluate(form => {
        const bounds = form.getBoundingClientRect();
        return document.documentElement.scrollWidth <= window.innerWidth
          && [...form.querySelectorAll('textarea,input,[role="textbox"]')].every(element => {
            const field = element.getBoundingClientRect();
            return field.left >= bounds.left - 1 && field.right <= bounds.right + 1;
          });
      });
      assert.ok(fits);
    }
    checks.push('all four form fields fit mobile and desktop layouts');

    return { checks, interceptedPostCount: postCount, realPosts: 0 };
  } finally {
    if (finishPost) finishPost();
    if (releaseGet) releaseGet();
    await page.unroute('http://localhost:3000/api/request-certificate', handlePost);
    await page.unroute('http://localhost:3000/api/request-list', handleGet);
    await page.unroute('http://localhost:3000/api/**', blockUnexpectedApi);
    await page.unroute('https://zalexinc.azure-api.net/**', blockUnexpectedApi);
  }
};
