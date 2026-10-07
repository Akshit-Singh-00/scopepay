const $ = id => document.getElementById(id);
const state = { data: null, analysis: null, busy: false };
const money = minor => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(minor / 100);
function el(tag, text, className) { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; }
function message(text, error = false) {
  const dismiss = el('button', '×', 'dismiss'); dismiss.type = 'button'; dismiss.setAttribute('aria-label', 'Dismiss notification'); dismiss.addEventListener('click', () => { $('message').hidden = true; });
  $('message').replaceChildren(el('span', text), dismiss); $('message').className = `message${error ? ' error' : ''}`; $('message').hidden = false;
}
async function api(path, value) {
  const response = await fetch(path, value === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) });
  const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Request failed.'); return data;
}
async function work(fn) {
  if (state.busy) return;
  state.busy = true; $('message').hidden = true;
  document.querySelectorAll('button').forEach(button => { button.disabled = true; });
  try { await fn(); } catch (error) { message(error.message, true); }
  finally { state.busy = false; document.querySelectorAll('button').forEach(button => { button.disabled = false; }); syncControls(); }
}
function syncControls() {
  const usePlan = $('ai-source').value === 'chatgpt';
  $('chatgpt-controls').hidden = !usePlan; $('api-billing-note').hidden = usePlan;
  $('analyze').disabled = state.busy || (usePlan ? !state.data?.chatgpt.sharing || !$('chatgpt-model').value : !state.data?.config.ai);
  $('chatgpt-signout').hidden = !state.data?.chatgpt.connected;
  const existing = state.data?.orders.find(order => order.analysisId === state.analysis?.id);
  $('create-invoice').disabled = state.busy || !state.data?.config.paypal || state.analysis?.mode !== 'ai' || !$('approval').checked || !!existing;
  $('invoice-help').textContent = existing ? 'This review already has an invoice attempt. Use the saved invoice below.' : state.analysis?.mode === 'sample' ? 'Sample results cannot create invoices. Configure AI access and run a real analysis first.' : !state.data?.config.paypal ? 'Add PayPal sandbox credentials and test account emails to .env, then restart.' : 'The recipient is restricted to the sandbox test account configured in .env. No email will be sent.';
}
async function refresh() {
  state.data = await api('/api/state');
  $('connections').replaceChildren();
  for (const [key, name] of [['ai', 'API key (optional)'], ['paypal', 'PayPal sandbox']]) {
    const node = el('span', undefined, 'connection'); node.append(el('strong', name), document.createTextNode(state.data.config[key] ? ' · Configured (not yet verified)' : ' · Setup needed in .env')); $('connections').append(node);
  }
  const connection = state.data.chatgpt;
  const previous = $('chatgpt-profile').value;
  $('chatgpt-profile').replaceChildren(new Option('Add account', ''));
  for (const profile of connection.profiles) $('chatgpt-profile').append(new Option(profile.label, profile.id));
  $('chatgpt-profile').value = connection.profileId || previous || connection.profiles[0]?.id || '';
  $('chatgpt-status').textContent = connection.sharing ? 'Connected · Using ChatGPT plan' : connection.connected ? 'Signed in, but plan usage was not granted. Review your connection in ChatGPT.' : 'Connect your ChatGPT account to start. No API credit purchase is needed for this connection.';
  if (connection.sharing) {
    try {
      const current = $('chatgpt-model').value;
      const { models } = await api('/api/chatgpt/models');
      $('chatgpt-model').replaceChildren(new Option('Choose a model', ''));
      for (const model of models) $('chatgpt-model').append(new Option(model.name, model.slug));
      if (models.some(model => model.slug === current)) $('chatgpt-model').value = current;
      $('chatgpt-model').disabled = false;
    } catch (error) { $('chatgpt-model').value = ''; $('chatgpt-status').textContent = error.message; }
    if (!localStorage.getItem(`scopepay-plan-welcome-${connection.profileId}`) && !$('chatgpt-welcome').open) $('chatgpt-welcome').showModal();
  } else { $('chatgpt-model').replaceChildren(new Option('Connect to load models', '')); $('chatgpt-model').disabled = true; }
  renderHistory(); syncControls();
}
function renderAnalysis(analysis) {
  state.analysis = analysis; $('brief').value = analysis.brief; $('request').value = analysis.request;
  $('result-count').textContent = analysis.items.length; $('results').replaceChildren();
  if (analysis.mode === 'sample') $('results').append(el('p', 'SAMPLE OUTPUT · Prewritten results for the example brief. No AI call was made.', 'sample-notice'));
  $('results').append(el('p', 'Quotations are checked against your text. Their meaning and classification still need your review.', 'small muted'));
  for (const item of analysis.items) {
    const card = el('article', undefined, 'result-card'); const title = el('div', undefined, 'result-title');
    const labels = { included: 'Included', extra: 'Extra work', unclear: 'Needs clarity' };
    title.append(el('h3', item.title), el('span', labels[item.classification], `badge ${item.classification}`)); card.append(title, el('p', item.rationale));
    if (item.evidenceVerified) {
      for (const [name, quote] of [['Agreed brief', item.briefQuote], ['Client request', item.requestQuote]]) { const block = el('blockquote'); block.append(el('small', name), document.createTextNode(`“${quote}”`)); card.append(block); }
    }
    if (item.clarification) card.append(el('p', `Clarify: ${item.clarification}`));
    $('results').append(card);
  }
  $('pricing').replaceChildren(); $('approval').checked = false;
  const extras = analysis.items.filter(item => item.classification === 'extra' && item.evidenceVerified);
  $('order-panel').hidden = extras.length === 0;
  for (const item of extras) {
    const row = el('div', undefined, 'price-row'); row.dataset.id = item.id;
    const checked = document.createElement('input'); checked.type = 'checkbox'; checked.checked = true; checked.setAttribute('aria-label', `Include ${item.title}`); checked.className = 'include';
    const titleLabel = el('label', 'Description'); const title = document.createElement('input'); title.type = 'text'; title.value = item.title; title.maxLength = 200; title.className = 'item-title'; titleLabel.append(title);
    const qtyLabel = el('label', 'Quantity'); const qty = document.createElement('input'); qty.type = 'number'; qty.value = '1'; qty.min = '1'; qty.max = '100'; qty.step = '1'; qty.className = 'quantity'; qtyLabel.append(qty);
    const priceLabel = el('label', 'Unit price · USD'); const price = document.createElement('input'); price.type = 'text'; price.inputMode = 'decimal'; price.placeholder = '0.00'; price.className = 'price'; priceLabel.append(price);
    row.append(checked, titleLabel, qtyLabel, priceLabel); $('pricing').append(row);
  }
  updateTotal(); syncControls();
}
function rows() { return [...$('pricing').querySelectorAll('.price-row')].filter(row => row.querySelector('.include').checked).map(row => ({ id: row.dataset.id, title: row.querySelector('.item-title').value.trim(), quantity: Number(row.querySelector('.quantity').value), price: row.querySelector('.price').value.trim() })); }
function cents(price) { if (!/^(0|[1-9]\d{0,5})(\.\d{1,2})?$/.test(price)) return null; const [whole, decimal = ''] = price.split('.'); return Number(whole) * 100 + Number(decimal.padEnd(2, '0')); }
function updateTotal() {
  const items = rows(); let total = 0, valid = items.length > 0;
  const lines = items.map(item => { const amount = cents(item.price); const ok = amount !== null && amount > 0 && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 100 && item.title; if (ok) total += amount * item.quantity; else valid = false; return `• ${item.title || '[Description needed]'} — ${item.quantity} × ${amount === null || amount === 0 ? '[Set price]' : money(amount)}`; });
  $('total').textContent = valid ? money(total) : 'Set prices';
  $('change-order').value = `Proposed change order\n\nThe following additions extend our original project scope:\n${lines.join('\n')}\n\nTotal: ${valid ? money(total) + ' USD' : '[Complete the prices above]'}\nPlease confirm the deliverables, price, and any timeline changes before work begins.`;
}
function renderHistory() {
  $('history').replaceChildren();
  if (!state.data.analyses.length) { $('history').append(el('p', 'Your saved AI reviews and sandbox invoices will appear here.', 'small muted')); return; }
  for (const analysis of [...state.data.analyses].reverse()) {
    const order = state.data.orders.find(row => row.analysisId === analysis.id);
    const wrapper = el('div'); const row = el('div', undefined, 'history-item'); const info = el('div');
    info.append(el('h3', analysis.request.slice(0, 85) + (analysis.request.length > 85 ? '…' : '')),
      el('p', `${new Date(analysis.createdAt).toLocaleString()} · ${analysis.items.length} request items`, 'muted'));
    if (order) {
      info.append(el('p', `${order.number} · ${money(order.totalMinor)} · ${order.paypalStatus || order.state}`));
      if (order.state === 'needs-reconciliation' || order.state === 'creating') info.append(el('p', 'Check this invoice number in the PayPal sandbox dashboard. Creation will not be retried automatically.', 'sample-notice'));
      if (order.checkedAt) info.append(el('p', `PayPal status last checked: ${new Date(order.checkedAt).toLocaleString()}`, 'small muted'));
    }
    const actions = el('div', undefined, 'history-actions'); const review = el('button', 'Review'); review.addEventListener('click', () => renderAnalysis(analysis)); actions.append(review);
    if (order?.paypalId) {
      const check = el('button', 'Refresh status'); check.addEventListener('click', () => work(async () => { await api(`/api/orders/${order.id}/refresh`, {}); await refresh(); message('Invoice status retrieved from PayPal.'); })); actions.append(check);
      if (!order.paypalStatus || order.paypalStatus === 'DRAFT') { const activate = el('button', 'Activate sandbox payment link'); activate.addEventListener('click', () => work(async () => { await api(`/api/orders/${order.id}/activate`, { approved: true }); await refresh(); message('Sandbox payment link activated. No email was sent.'); })); actions.append(activate); }
      if (order.paymentUrl) { const link = el('a', 'Open sandbox invoice ↗'); link.href = order.paymentUrl; link.target = '_blank'; link.rel = 'noopener noreferrer'; actions.append(link); }
    }
    row.append(info, actions); wrapper.append(row);
    if (order) { const details = el('details', undefined, 'invoice-details'); details.append(el('summary', 'Activity history')); const list = el('ul'); for (const event of order.history) list.append(el('li', `${new Date(event.at).toLocaleString()} — ${event.message}`)); details.append(list); wrapper.append(details); }
    $('history').append(wrapper);
  }
}
function invalidateReview() {
  if (!state.analysis) return;
  state.analysis = null; $('order-panel').hidden = true; $('approval').checked = false;
  $('result-count').textContent = '—'; $('results').replaceChildren(el('p', 'The context changed. Run analysis again to review the updated request.', 'small muted')); syncControls();
}
$('brief').addEventListener('input', invalidateReview);
$('request').addEventListener('input', invalidateReview);
$('load-example').addEventListener('click', () => { invalidateReview(); $('brief').value = state.data.sample.brief; $('request').value = state.data.sample.request; message('Example text loaded. Analyze it with AI or explore the prewritten sample.'); });
$('sample').addEventListener('click', () => work(async () => { renderAnalysis(await api('/api/sample', {})); message('Showing prewritten sample results. No AI call or PayPal action occurred.'); }));
$('analysis-form').addEventListener('submit', event => { event.preventDefault(); work(async () => { message('Comparing the request with your agreed scope…'); const result = await api('/api/analyze', { brief: $('brief').value, request: $('request').value, source: $('ai-source').value, model: $('chatgpt-model').value }); await refresh(); renderAnalysis(result); message('Analysis ready. Review the evidence and clarify any uncertainty before pricing.'); }); });
$('ai-source').addEventListener('change', syncControls);
$('chatgpt-model').addEventListener('change', syncControls);
$('chatgpt-connect').addEventListener('click', () => work(async () => {
  if (location.hostname !== '127.0.0.1') { location.href = `http://127.0.0.1:${location.port}/`; return; }
  const { url } = await api('/api/chatgpt/sign-in', { profileId: $('chatgpt-profile').value || undefined });
  location.assign(url);
}));
$('chatgpt-signout').addEventListener('click', () => work(async () => {
  const result = await api('/api/chatgpt/sign-out', {}); await refresh();
  message(result.revoked ? 'Signed out of ChatGPT.' : 'Signed out locally. Remote revocation could not be confirmed; disconnect ScopePay in ChatGPT settings.', !result.revoked);
}));
$('chatgpt-welcome-close').addEventListener('click', () => { localStorage.setItem(`scopepay-plan-welcome-${state.data.chatgpt.profileId}`, '1'); $('chatgpt-welcome').close(); });
$('pricing').addEventListener('input', () => { $('approval').checked = false; updateTotal(); syncControls(); });
$('approval').addEventListener('change', syncControls);
$('create-invoice').addEventListener('click', () => work(async () => { try { const order = await api('/api/orders', { analysisId: state.analysis.id, items: rows(), approved: $('approval').checked }); message(`Sandbox invoice saved: ${order.number}.`); } finally { await refresh(); } }));
refresh().catch(error => message(error.message, true));
