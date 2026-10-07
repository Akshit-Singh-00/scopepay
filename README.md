# ScopePay

An AI assistant for freelancers that checks new client requests against an agreed brief, quotes its evidence, and creates PayPal sandbox invoices for reviewed extra work.

**Status:** local prototype with a verified end-to-end sandbox flow. Real ChatGPT-plan scope analysis produced the reviewed additions; a $1.00 PayPal sandbox invoice was created, activated, and paid using a US test buyer. ScopePay's authenticated PayPal status refresh confirmed PAID on 7 October 2026. Prewritten sample results are explicitly labeled and cannot create invoices. Hackathon submission still awaits the public demo and entrant review.

## Run locally

Requires Node.js 22.17 or later. Install the locked dependency used to verify ChatGPT identity tokens.

```sh
npm ci
npm start
```

Open <http://127.0.0.1:4317>. Select **Explore sample results** to try the interface without accounts. The example covers an included colour revision, an additional language, and an excluded online store. Enter prices to preview a change order.

## Enable the real integrations

1. Copy `.env.example` to `.env` in this directory. On PowerShell: `Copy-Item .env.example .env`.
2. For eligible ChatGPT Plus/Pro accounts, leave **ChatGPT plan** selected and use **Continue with ChatGPT** in the local app. Review the OpenAI consent screen and authorize plan usage. Then choose a model from your account's catalog. A separate API credit purchase is not needed for this route. Requests count toward your existing plan and app limits; any credit-sharing settings are controlled in ChatGPT. ScopePay does not enable them. Alternatively, explicitly choose **OpenAI API key · separately billed**, set `OPENAI_API_KEY` and `OPENAI_MODEL`, and use separate API billing. ScopePay never falls back between these routes automatically.
3. In the [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/), create a **sandbox** REST app. Put its client ID and secret in `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET`.
4. Set `PAYPAL_INVOICER_EMAIL` to your sandbox business account email and `PAYPAL_TEST_RECIPIENT` to your sandbox personal test account email. These must be test accounts, not real customers. Use a USD-capable sandbox account for this first version. An India-based sandbox merchant needs a buyer outside India: domestic invoice activation is rejected by PayPal.
5. Restart `npm start` after editing `.env`, then reconnect ChatGPT if using your plan. The API-key and PayPal badges indicate configuration presence, not successful provider tests.
6. Load the example, select **Analyze the scope**, and review the model's output. This transmits the brief and client request to OpenAI. Begin with synthetic content.
7. Choose eligible extra-work items, edit descriptions, and set quantities and prices. Obtain client approval outside the app, then check the approval box and create the sandbox invoice. The app records your confirmation; it does not independently verify client consent.
8. Select **Activate sandbox payment link** in the saved invoice. This uses PayPal's send endpoint with both email-notification flags disabled. Open the returned sandbox invoice and complete a test payment with your sandbox buyer account.
9. Select **Refresh status**. Status comes from PayPal's authenticated invoice API; a browser redirect never marks an invoice paid.

API credentials belong in `.env`, never in chat, browser code, screenshots, or the public repository. ChatGPT access, refresh, and ID tokens remain only in server memory. Host IDs and account-registration metadata are saved in the ignored `data/chatgpt-registrations.json`; reconnect after each server restart. Use **Sign out** to revoke the renewable session, or disconnect ScopePay in ChatGPT settings. The app can run in sample mode with no `.env` file. The server only permits PayPal sandbox API requests.

## Architecture and boundaries

- Plain JavaScript ES modules on Node's HTTP server; browser HTML/CSS/JavaScript. The `jose` dependency verifies signed OpenID Connect identity tokens.
- Official Sign in with ChatGPT for the local open-source app: OAuth PKCE, browser-bound state, nonce and signed identity checks, reusable registration IDs, a current account-specific model catalog, and streamed Responses API calls. Partial or failed responses never produce a saved review. Credentials stay in process memory and cannot be returned through application APIs. This is optional ChatGPT plan usage, not API-key billing or access to ChatGPT conversation history.
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

See [submission/STATUS.md](submission/STATUS.md) for submission readiness. Real ChatGPT-plan sign-in, model discovery, and synthetic scope analysis passed on 7 October 2026. PayPal sandbox OAuth, invoice creation, activation with emails disabled, test-buyer payment, and authenticated PAID status retrieval also passed. See the [payment evidence](submission/screenshots/scopepay-sandbox-paid.png). The [public source repository](https://github.com/Akshit-Singh-00/scopepay) and local judge instructions are available. Still required: public demo video, final Devpost fields, eligibility review, and entrant approval before final submission. Freelancer feedback is a future validation step.

## API references

- [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses)
- [ChatGPT plan usage in open-source apps](https://developers.openai.com/siwc/token-sharing-open-source)
- [PayPal create draft invoice](https://developer.paypal.com/api/invoicing/v2/invoices-create/)
- [PayPal activate/send invoice](https://developer.paypal.com/api/invoicing/v2/invoices-send/)
- [PayPal retrieve invoice](https://developer.paypal.com/api/invoicing/v2/invoices-get/)

## License

MIT. See [LICENSE](LICENSE).
