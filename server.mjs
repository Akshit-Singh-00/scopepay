import http from 'node:http';
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { AppError, assert, text, sample, validateAnalysis, reviewItems } from './lib/domain.mjs';
import { analyze, analyzeWithChatGPT, PayPal } from './lib/providers.mjs';
import { ChatGPTConnection } from './lib/chatgpt.mjs';

const root = fileURLToPath(new URL('.', import.meta.url));
export async function createApp({ env = process.env, dataDir = resolve(root, 'data'), analyzeFn = analyze, paypal = new PayPal(env), chatgpt } = {}) {
  await mkdir(dataDir, { recursive: true });
  chatgpt ||= await new ChatGPTConnection(dataDir).init();
  const dbFile = resolve(dataDir, 'scopepay.json');
  let db;
  try { db = JSON.parse(await readFile(dbFile, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; db = { analyses: [], orders: [] }; }
  let queue = Promise.resolve();
  const save = async () => { await writeFile(`${dbFile}.tmp`, JSON.stringify(db, null, 2)); await rename(`${dbFile}.tmp`, dbFile); };
  const serial = task => { const run = queue.then(task); queue = run.catch(() => {}); return run; };
  const config = () => ({ ai: Boolean(env.OPENAI_API_KEY && env.OPENAI_MODEL), paypal: Boolean(env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET && env.PAYPAL_INVOICER_EMAIL && env.PAYPAL_TEST_RECIPIENT), environment: 'sandbox' });
  function event(order, message) { order.history.push({ at: new Date().toISOString(), message }); }
  async function body(req) {
    assert(req.headers['content-type']?.startsWith('application/json'), 'JSON is required.', 415);
    const chunks = []; let bytes = 0;
    for await (const chunk of req) { bytes += chunk.length; assert(bytes <= 64000, 'Request too large.', 413); chunks.push(chunk); }
    try { return JSON.parse(Buffer.concat(chunks).toString()); } catch { throw new AppError('Invalid JSON.'); }
  }
  async function api(req, res, path) {
    if (req.method === 'GET' && path === '/api/state') return { config: config(), chatgpt: chatgpt.state(), sample, analyses: db.analyses, orders: db.orders };
    if (req.method === 'GET' && path === '/api/chatgpt/models') return { models: await chatgpt.models() };
    assert(req.method === 'POST', 'Not found.', 404);
    const input = await body(req);
    if (path === '/api/chatgpt/sign-in') return serial(async () => {
      const result = await chatgpt.begin(res.socket.localPort, input.profileId);
      res.setHeader('Set-Cookie', `scopepay_oauth=${result.cookie}; HttpOnly; SameSite=Lax; Path=/auth/callback; Max-Age=600`);
      return { url: result.url };
    });
    if (path === '/api/chatgpt/sign-out') return serial(() => chatgpt.signOut());
    if (path === '/api/analyze') {
      const brief = text(input.brief, 'Agreed brief'), request = text(input.request, 'Client request');
      const source = input.source;
      assert(['api', 'chatgpt'].includes(source), 'Choose an AI connection.');
      let items;
      if (source === 'chatgpt') {
        const models = await chatgpt.models();
        assert(models.some(model => model.slug === input.model), 'Select an available ChatGPT model.');
        items = await analyzeWithChatGPT(brief, request, input.model, await chatgpt.accessToken());
      } else items = await analyzeFn(brief, request, env);
      return serial(async () => {
        const result = { id: randomUUID(), mode: 'ai', source, model: source === 'chatgpt' ? input.model : env.OPENAI_MODEL, brief, request, items, createdAt: new Date().toISOString() };
        db.analyses.push(result); await save(); return result;
      });
    }
    if (path === '/api/sample') {
      return { id: 'sample', mode: 'sample', brief: sample.brief, request: sample.request, items: validateAnalysis(sample, sample.brief, sample.request) };
    }
    return serial(async () => {
      if (path === '/api/orders') {
        assert(input.approved === true, 'Confirm that you have reviewed the change order and obtained client approval.');
        const analysis = db.analyses.find(row => row.id === input.analysisId);
        assert(analysis?.mode === 'ai', 'Run real AI analysis before creating a sandbox invoice. Sample output cannot be invoiced.');
        // One invoice per assessment. Every replay returns the existing order, including uncertain attempts.
        const existing = db.orders.find(row => row.analysisId === analysis.id);
        if (existing) return existing;
        const reviewed = reviewItems(input.items, analysis);
        const token = await paypal.token(); // Configuration/OAuth failure is safe to retry before creation.
        const id = randomUUID();
        const order = { id, analysisId: analysis.id, number: `SP-${id.replaceAll('-', '').slice(0,20)}`, ...reviewed,
          state: 'creating', approvedAt: new Date().toISOString(), history: [] };
        event(order, 'Freelancer recorded client approval of the reviewed scope and prices.');
        db.orders.push(order); await save();
        try {
          order.paypalId = await paypal.create(order, token);
          order.state = 'created'; event(order, 'PayPal sandbox draft created.'); await save();
        } catch (error) {
          order.state = 'needs-reconciliation';
          event(order, 'Creation outcome is uncertain. Check the sandbox dashboard for this invoice number before taking any further action.');
          await save(); throw error;
        }
        return order;
      }
      const match = path.match(/^\/api\/orders\/([a-f0-9-]+)\/(refresh|activate)$/);
      assert(match, 'Not found.', 404);
      const order = db.orders.find(row => row.id === match[1]);
      assert(order?.paypalId, 'No saved PayPal invoice is available.', 404);
      if (match[2] === 'activate') {
        assert(input.approved === true, 'Approve creating the sandbox payment link.');
        const current = await paypal.details(order.paypalId);
        if (current.paypalStatus === 'DRAFT') {
          await paypal.activate(order.paypalId);
          event(order, 'Sandbox payment link activated; recipient and merchant emails suppressed.');
        }
      }
      Object.assign(order, await paypal.details(order.paypalId));
      event(order, `Status retrieved from PayPal: ${order.paypalStatus}.`); await save(); return order;
    });
  }
  return http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; form-action 'self'");
    res.setHeader('Cache-Control', 'no-store');
    const send = (status, value) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(value)); };
    try {
      const address = res.socket.localAddress;
      assert(address === '127.0.0.1' || address === '::1', 'Local access only.', 403);
      const allowedHosts = [`127.0.0.1:${res.socket.localPort}`, `localhost:${res.socket.localPort}`];
      assert(allowedHosts.includes(req.headers.host), 'Unexpected host.', 403);
      const url = new URL(req.url, 'http://localhost');
      const path = url.pathname;
      if (path === '/auth/callback' && req.method === 'GET') {
        const cookie = req.headers.cookie?.split(';').map(value => value.trim()).find(value => value.startsWith('scopepay_oauth='))?.slice('scopepay_oauth='.length);
        await serial(() => chatgpt.callback(url.searchParams, cookie));
        res.setHeader('Set-Cookie', 'scopepay_oauth=; HttpOnly; SameSite=Lax; Path=/auth/callback; Max-Age=0');
        res.writeHead(303, { Location: '/?chatgpt=connected' }); res.end(); return;
      }
      if (req.headers.origin) assert(allowedHosts.some(host => req.headers.origin === `http://${host}`), 'Cross-origin requests are blocked.', 403);
      assert(!req.headers['sec-fetch-site'] || ['same-origin', 'none'].includes(req.headers['sec-fetch-site']), 'Cross-site requests are blocked.', 403);
      if (path.startsWith('/api/')) return send(200, await api(req, res, path));
      const files = { '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/style.css': ['style.css', 'text/css'] };
      assert(req.method === 'GET' && files[path], 'Not found.', 404);
      const [file, type] = files[path];
      res.writeHead(200, { 'Content-Type': `${type}; charset=utf-8` }); res.end(await readFile(resolve(root, 'public', file)));
    } catch (error) { send(error.status || 500, { error: error instanceof AppError ? error.message : 'An internal error occurred. Check local setup and try again.' }); }
  });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = await createApp();
  const port = Number(process.env.PORT || 4317);
  server.listen(port, '127.0.0.1', () => console.log(`ScopePay is running at http://127.0.0.1:${port} (sandbox only)`));
}
