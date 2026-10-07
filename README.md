# ScopePay

An AI assistant for freelancers that checks new client requests against an agreed brief, quotes its evidence, and creates PayPal sandbox invoices for reviewed extra work.

**Status:** local prototype. PayPal sandbox OAuth, draft creation, and draft retrieval have been verified against the real sandbox API. Activation exposed an India-to-India account restriction; a cross-border sandbox buyer is still needed. Real OpenAI analysis and end-to-end sandbox payment remain unverified. Prewritten sample results are explicitly labeled and cannot create invoices. This is not yet a completed hackathon submission.

## Run locally

Requires Node.js 22.17 or later. No third-party packages or install step are required.

```sh
npm start
```

Open <http://127.0.0.1:4317>. Select **Explore sample results** to try the interface without accounts. The example covers an included colour revision, an additional language, and an excluded online store. Enter prices to preview a change order.

## Enable the real integrations

1. Copy `.env.example` to `.env` in this directory. On PowerShell: `Copy-Item .env.example .env`.
2. Set `OPENAI_API_KEY` and an `OPENAI_MODEL` available to your account that supports Structured Outputs. API access and any billing must be enabled by the account owner. The sample model name is configurable.
3. In the [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/), create a **sandbox** REST app. Put its client ID and secret in `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET`.
4. Set `PAYPAL_INVOICER_EMAIL` to your sandbox business account email and `PAYPAL_TEST_RECIPIENT` to your sandbox personal test account email. These must be test accounts, not real customers. Use a USD-capable sandbox account for this first version. An India-based sandbox merchant needs a buyer outside India: domestic invoice activation is rejected by PayPal.
5. Restart `npm start`. Connection badges mean configuration is present; they do not assert successful authentication.
6. Load the example, select **Analyze the scope**, and review the model's output. This transmits the brief and client request to OpenAI. Begin with synthetic content.
7. Choose eligible extra-work items, edit descriptions, and set quantities and prices. Obtain client approval outside the app, then check the approval box and create the sandbox invoice. The app records your confirmation; it does not independently verify client consent.
8. Select **Activate sandbox payment link** in the saved invoice. This uses PayPal's send endpoint with both email-notification flags disabled. Open the returned sandbox invoice and complete a test payment with your sandbox buyer account.
9. Select **Refresh status**. Status comes from PayPal's authenticated invoice API; a browser redirect never marks an invoice paid.

Credentials belong in `.env`, never in chat, browser code, screenshots, or the public repository. The app can run in sample mode with no `.env` file. The server only permits PayPal sandbox API requests.

## Architecture and boundaries

- Plain JavaScript ES modules on Node's HTTP server; browser HTML/CSS/JavaScript. This avoids a dependency installation for the initial local prototype.
- OpenAI Responses API with a strict JSON schema, a bounded input, and server-side validation. Exact source quotations are verified; this does not prove the model's interpretation is correct. Unverifiable quotations are removed and the item is marked unclear.
- Humans set prices. Totals are calculated in integer cents. Only verified extra-work items may enter an invoice; ambiguous/included items must be clarified and reanalyzed first.
- Server-side OAuth and PayPal Invoicing v2 create, activate, and retrieve calls. The configured test recipient cannot be replaced from the browser. USD only; taxes, discounts, and fractional quantities are outside this version.
- Reviews, approved prices, invoice IDs, and activity history are saved in `data/scopepay.json`. This file contains project content in plaintext and is ignored by Git.
- One invoice attempt per analysis, serialized within one server process. State is saved before the external create call. An uncertain result is blocked from automatic retry, including after a restart. To reconcile, look up the saved `SP-…` invoice number in the PayPal sandbox dashboard before any manual action. A reconciliation UI remains to be built.
- Local access only, with Host/Origin checks, no CORS, a restrictive Content Security Policy, and no arbitrary file serving. **Do not deploy or tunnel this prototype publicly.** Authentication, authorization, a transactional database, concurrency across processes, and production operations are not implemented. Run only one server process against a data directory.
- Payment status currently uses manual refresh, not webhooks. Verified webhooks are a later hosted milestone.

## Verification

```sh
npm run check
npm test
```

Tests cover evidence validation, exact money arithmetic, prohibited invoice items, sandbox URL filtering, AI request/refusal handling, PayPal payloads, cross-origin rejection, secret-file isolation, duplicate requests, restart persistence, and ambiguous invoice outcomes. Provider tests use simulated responses; passing tests do not establish live API compatibility or payment success.

## Hackathon work remaining

See [submission/STATUS.md](submission/STATUS.md) for submission readiness. The [public source repository](https://github.com/Akshit-Singh-00/scopepay) and local judge instructions are available. Still required: real AI and complete sandbox verification, judge-flow rehearsal, demo video, final project-story updates, eligibility review, and entrant approval before final submission. Freelancer feedback is a future validation step. Do not claim the full integration has been demonstrated until the real flow is tested.

## API references

- [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses)
- [PayPal create draft invoice](https://developer.paypal.com/api/invoicing/v2/invoices-create/)
- [PayPal activate/send invoice](https://developer.paypal.com/api/invoicing/v2/invoices-send/)
- [PayPal retrieve invoice](https://developer.paypal.com/api/invoicing/v2/invoices-get/)

## License

MIT. See [LICENSE](LICENSE).
