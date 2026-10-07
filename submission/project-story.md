## Inspiration

A fixed-price website can grow through a series of small client requests. ScopePay explores a practical question: can AI help a freelancer explain what changed, show the original agreement, and turn approved additions into an invoice?

The intended users are independent web designers and developers. This is a problem hypothesis; we have not yet validated demand or measured time or revenue savings.

## What it does

ScopePay compares an agreed project brief with a new client request. It separates the request into items and proposes three classifications: included, extra work, or needs clarification. Each assessment includes supporting quotations where available. The server checks that those quotations actually appear in the supplied text.

The freelancer reviews the evidence, selects extra work, edits item descriptions, and sets quantities and prices. ScopePay generates a client-facing change-order preview. The freelancer records that client approval was obtained outside the app before creating a PayPal sandbox invoice. The application does not independently verify client consent.

The PayPal adapter implements draft invoice creation, payment-link activation with email notifications disabled, and authenticated invoice-status retrieval. A browser return URL cannot mark an invoice paid.

**Current verification status:** the local interface and automated tests work. Real OpenAI calls and end-to-end PayPal sandbox payments remain unverified while account setup is in progress. The prewritten sample is clearly labeled and cannot create invoices. This status must be updated with actual verification evidence before final submission.

## How we built it

The application uses JavaScript ES modules, Node.js, HTML, and CSS, with no third-party runtime packages. The OpenAI Responses API is configured for structured JSON output, followed by server-side evidence and field validation. PayPal OAuth and Invoicing v2 calls run on the server and are restricted to sandbox endpoints.

Prices come from the freelancer, not the model. Totals use integer cents. Reviews, approved invoice items, PayPal invoice IDs, and an activity history are saved locally. One invoice attempt is permitted per analysis; an uncertain creation response is retained for reconciliation rather than retried automatically.

Development was assisted by OpenAI Codex. The current design, implementation, tests, and documentation were created during the hackathon period.

## Challenges

An exact quotation does not guarantee a correct interpretation. ScopePay separates quotation verification from human review and marks unverifiable evidence as unclear. Another challenge is distinguishing a failed network response from a failed invoice creation: the system saves the attempt before making the external request to reduce accidental duplicates.

## Accomplishments

We implemented the local review and pricing flow and provider adapters, and passed ten automated tests covering evidence validation, money arithmetic, sandbox restrictions, duplicate requests, restart persistence, and uncertain invoice outcomes. These tests use simulated provider responses and do not establish live payment success.

## What we learned

Human review needs to be part of the workflow. A useful scope assistant should make uncertainty visible and preserve a traceable connection between the client request, the original brief, the reviewed price, and the invoice.

## What's next

Complete real API and sandbox payment verification, validate the problem with freelancers, and record a demonstration of the verified flow. Before any public deployment, add authentication, authorization, a transactional database, and verified webhooks. The current build is a local, single-user prototype using USD and sandbox accounts.
