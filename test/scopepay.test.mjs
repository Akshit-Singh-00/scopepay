import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sample, validateAnalysis, minorUnits, reviewItems, safeSandboxUrl } from '../lib/domain.mjs';
import { analyze, PayPal } from '../lib/providers.mjs';
import { createApp } from '../server.mjs';

test('invented evidence is removed and downgraded to unclear', () => {
  const items = validateAnalysis({ items: [{ ...sample.items[1], briefQuote: 'French is excluded.' }] }, sample.brief, sample.request);
  assert.equal(items[0].classification, 'unclear'); assert.equal(items[0].evidenceVerified, false); assert.equal(items[0].briefQuote, '');
});
test('verified source quotations preserve the assessment', () => {
  assert.deepEqual(validateAnalysis(sample, sample.brief, sample.request).map(row => row.classification), ['included', 'extra', 'extra']);
});
test('prices use exact cents and reject malformed or excessive inputs', () => {
  assert.equal(minorUnits('0.29'), 29); assert.equal(minorUnits('19.9'), 1990);
  for (const invalid of ['1.001', '-2', 'NaN', '1e3', '0', '100000.01', 5]) assert.throws(() => minorUnits(invalid));
});
test('included items, duplicates and invalid quantities cannot enter invoices', () => {
  const analysis = { items: validateAnalysis(sample, sample.brief, sample.request) };
  const row = { id: '2', title: 'French version', quantity: 2, price: '0.29' };
  assert.equal(reviewItems([row], analysis).totalMinor, 58);
  assert.throws(() => reviewItems([{ ...row, id: '1' }], analysis));
  assert.throws(() => reviewItems([row, row], analysis));
  assert.throws(() => reviewItems([{ ...row, quantity: 1.5 }], analysis));
});
test('payment links cannot point at live PayPal or arbitrary domains', () => {
  assert.equal(safeSandboxUrl('https://www.sandbox.paypal.com/invoice/p/test'), 'https://www.sandbox.paypal.com/invoice/p/test');
  for (const url of ['https://www.paypal.com/invoice/p/test', 'javascript:alert(1)', 'https://www.sandbox.paypal.com.attacker.test/']) assert.equal(safeSandboxUrl(url), null);
});
test('AI adapter requests a strict schema and handles refusal', async () => {
  let sent;
  const fetcher = async (url, options) => { sent = JSON.parse(options.body); return Response.json({ status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify(sample) }] }] }); };
  const items = await analyze(sample.brief, sample.request, { OPENAI_API_KEY: 'test', OPENAI_MODEL: 'test-model' }, fetcher);
  assert.equal(items.length, 3); assert.equal(sent.store, false); assert.equal(sent.text.format.strict, true);
  await assert.rejects(analyze('brief', 'request', { OPENAI_API_KEY: 'test', OPENAI_MODEL: 'test-model' }, async () => Response.json({ status: 'completed', output: [{ content: [{ type: 'refusal', refusal: 'No' }] }] })), /structured scope/);
});
test('PayPal adapter locks sandbox and suppresses emails on activation', async () => {
  const calls = [];
  const fetcher = async (url, options) => { calls.push({ url, body: options.body ? JSON.parse(options.body.startsWith('{') ? options.body : '{}') : null }); if (url.endsWith('/token')) return Response.json({ access_token: 'test' }); if (url.endsWith('/send')) return new Response(null, { status: 204 }); return Response.json({ id: 'INV2-TEST-1234' }); };
  const paypal = new PayPal({ PAYPAL_CLIENT_ID: 'test', PAYPAL_CLIENT_SECRET: 'test', PAYPAL_INVOICER_EMAIL: 'seller@example.test', PAYPAL_TEST_RECIPIENT: 'buyer@example.test' }, fetcher);
  const id = await paypal.create({ number: 'SP-TEST', items: [{ title: 'Extra', quantity: 2, unitMinor: 29 }] }, 'token');
  assert.equal(id, 'INV2-TEST-1234'); await paypal.activate(id);
  assert.ok(calls.every(call => call.url.startsWith('https://api-m.sandbox.paypal.com/')));
  assert.equal(calls[0].body.items[0].unit_amount.value, '0.29');
  assert.deepEqual(calls.at(-1).body, { send_to_recipient: false, send_to_invoicer: false });
});
test('PayPal explains the India domestic invoice restriction without exposing response data', async () => {
  const paypal = new PayPal({}, async () => Response.json({
    name: 'MEDIA_TYPE_NOT_ACCEPTABLE', message: 'private provider payload',
    details: [{ issue: 'INR_FOREIGN_CURRENCY_BLOCKED' }]
  }, { status: 406 }));
  await assert.rejects(paypal.call('/INV2-TEST-1234/send', 'POST', {}, 'test-token'), error => {
    assert.match(error.message, /sandbox buyer outside India/);
    assert.ok(!error.message.includes('private provider payload'));
    return true;
  });
});
async function fixture(t, overrides = {}) {
  const dataDir = await mkdtemp(join(tmpdir(), 'scopepay-test-'));
  let creates = 0;
  const options = { env: {}, dataDir, analyzeFn: async () => validateAnalysis(sample, sample.brief, sample.request), paypal: {
    token: async () => 'test', create: async () => { creates++; return 'INV2-TEST-1234'; },
    details: async () => ({ paypalStatus: 'PAID', paymentUrl: null, checkedAt: new Date().toISOString() }),
    activate: async () => {}
  }, ...overrides };
  let server = await createApp(options);
  const listen = () => new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  await listen();
  const close = () => new Promise(resolve => server.close(resolve));
  t.after(async () => { await close(); await rm(dataDir, { recursive: true, force: true }); });
  return { get creates() { return creates; },
    request: async (path, value, headers = {}) => fetch(`http://127.0.0.1:${server.address().port}${path}`, { method: value === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: value === undefined ? undefined : JSON.stringify(value) }),
    restart: async () => { await close(); server = await createApp(options); await listen(); }
  };
}
test('API rejects cross-origin writes, secret file access and sample invoices', async t => {
  const app = await fixture(t);
  assert.equal((await app.request('/api/sample', {}, { Origin: 'https://attacker.test' })).status, 403);
  assert.equal((await app.request('/.env')).status, 404);
  assert.equal((await app.request('/api/analyze', { brief: sample.brief, request: sample.request })).status, 400);
  assert.equal((await app.request('/api/chatgpt/sign-in', {}, { Origin: 'https://attacker.test' })).status, 403);
  assert.equal((await app.request('/api/orders', { analysisId: 'sample', approved: true })).status, 400);
  assert.equal(app.creates, 0);
});
test('concurrent invoice requests and restart replays create only one invoice', async t => {
  const app = await fixture(t);
  const analysis = await (await app.request('/api/analyze', { brief: sample.brief, request: sample.request, source: 'api' })).json();
  const payload = { analysisId: analysis.id, approved: true, items: [{ id: '2', title: 'French version', price: '500.25', quantity: 1 }] };
  assert.equal((await app.request('/api/orders', { ...payload, approved: false })).status, 400);
  const [a, b] = await Promise.all([app.request('/api/orders', payload), app.request('/api/orders', payload)]);
  assert.equal(a.status, 200); assert.equal(b.status, 200); assert.equal(app.creates, 1);
  const order = await a.json(); assert.equal(order.totalMinor, 50025);
  assert.equal(order.paypalStatus, undefined);
  await app.restart(); await app.request('/api/orders', payload); assert.equal(app.creates, 1);
  const refreshed = await (await app.request(`/api/orders/${order.id}/refresh`, {})).json(); assert.equal(refreshed.paypalStatus, 'PAID');
});
test('unknown create outcomes are persisted and never automatically retried', async t => {
  let calls = 0;
  const app = await fixture(t, { paypal: { token: async () => 'test', create: async () => { calls++; throw new Error('network timeout'); } } });
  const analysis = await (await app.request('/api/analyze', { brief: sample.brief, request: sample.request, source: 'api' })).json();
  const payload = { analysisId: analysis.id, approved: true, items: [{ id: '2', title: 'French version', price: '100', quantity: 1 }] };
  assert.equal((await app.request('/api/orders', payload)).status, 500);
  await app.restart();
  const order = await (await app.request('/api/orders', payload)).json();
  assert.equal(order.state, 'needs-reconciliation'); assert.equal(calls, 1);
});
