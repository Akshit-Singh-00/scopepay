export class AppError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
export function assert(condition, message, status = 400) {
  if (!condition) throw new AppError(message, status);
}
export function text(value, name, max = 12000) {
  assert(typeof value === 'string' && value.trim().length > 0 && value.length <= max,
    `${name} must contain between 1 and ${max} characters.`);
  return value.trim();
}
export const sample = {
  brief: 'Build a five-page brochure website in English only, with one contact form and two revision rounds. E-commerce is excluded. One revision round remains.',
  request: 'Please change the hero colour to blue, add a French version, and add a store selling ten products.',
  items: [
    { title: 'Change the hero colour', classification: 'included', briefQuote: 'One revision round remains.', requestQuote: 'change the hero colour to blue', rationale: 'A visual revision appears to fit the remaining revision round. Confirm that this request will use that round.', clarification: '' },
    { title: 'Add a French version', classification: 'extra', briefQuote: 'in English only', requestQuote: 'add a French version', rationale: 'A second language extends the agreed single-language website.', clarification: '' },
    { title: 'Add a ten-product store', classification: 'extra', briefQuote: 'E-commerce is excluded.', requestQuote: 'add a store selling ten products', rationale: 'A store introduces functionality explicitly excluded from the brief.', clarification: '' }
  ]
};
export const schema = {
  type: 'object', additionalProperties: false, required: ['items'],
  properties: { items: { type: 'array', items: {
    type: 'object', additionalProperties: false,
    required: ['title', 'classification', 'briefQuote', 'requestQuote', 'rationale', 'clarification'],
    properties: Object.fromEntries([
      ['title', { type: 'string' }],
      ['classification', { type: 'string', enum: ['included', 'extra', 'unclear'] }],
      ...['briefQuote', 'requestQuote', 'rationale', 'clarification'].map(k => [k, { type: 'string' }])
    ])
  } } }
};
export function validateAnalysis(result, brief, request) {
  assert(Array.isArray(result?.items) && result.items.length > 0 && result.items.length <= 20,
    'The model did not return a usable set of request items.', 502);
  return result.items.map((item, index) => {
    assert(item && ['included', 'extra', 'unclear'].includes(item.classification), 'Invalid scope classification.', 502);
    for (const key of ['title', 'briefQuote', 'requestQuote', 'rationale', 'clarification']) {
      assert(typeof item[key] === 'string' && item[key].length <= 2500, 'Invalid analysis text.', 502);
    }
    assert(item.title.trim() && item.title.length <= 200 && item.rationale.trim(), 'Missing analysis explanation.', 502);
    const verified = Boolean(item.briefQuote.trim() && item.requestQuote.trim() &&
      brief.includes(item.briefQuote) && request.includes(item.requestQuote));
    return { ...item, id: String(index + 1), evidenceVerified: verified,
      classification: verified ? item.classification : 'unclear',
      clarification: verified ? item.clarification : 'The supporting quotations could not be verified. Clarify the agreed scope before billing.',
      ...(verified ? {} : { briefQuote: '', requestQuote: '' }) };
  });
}
export function minorUnits(value) {
  assert(typeof value === 'string' && /^(0|[1-9]\d{0,5})(\.\d{1,2})?$/.test(value), 'Enter a price with at most two decimal places.');
  const [whole, decimal = ''] = value.split('.');
  const result = Number(whole) * 100 + Number(decimal.padEnd(2, '0'));
  assert(result > 0 && result <= 10000000, 'Each unit price must be between $0.01 and $100,000.00.');
  return result;
}
export function reviewItems(input, analysis) {
  assert(Array.isArray(input) && input.length > 0 && input.length <= 20, 'Select at least one extra-work item.');
  const seen = new Set();
  const items = input.map(row => {
    assert(row && !seen.has(row.id), 'Duplicate or invalid item.'); seen.add(row.id);
    const original = analysis.items.find(i => i.id === row.id);
    assert(original?.classification === 'extra' && original.evidenceVerified, 'Only extra work with verified quotations can be invoiced.');
    const title = text(row.title, 'Item description', 200);
    assert(Number.isInteger(row.quantity) && row.quantity > 0 && row.quantity <= 100, 'Quantity must be a whole number between 1 and 100.');
    return { id: row.id, title, quantity: row.quantity, unitMinor: minorUnits(row.price), evidence: original };
  });
  const totalMinor = items.reduce((sum, row) => sum + row.quantity * row.unitMinor, 0);
  assert(totalMinor <= 10000000, 'The sandbox change order is limited to $100,000.00.');
  return { items, totalMinor, currency: 'USD' };
}
export function money(value) { return (value / 100).toFixed(2); }
export function safeSandboxUrl(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && url.hostname === 'www.sandbox.paypal.com' ? url.href : null; }
  catch { return null; }
}
