# Submission readiness

- Implemented: local review and change-order interface, OpenAI and PayPal sandbox adapters, persistence and duplicate-request safeguards.
- Verified: automated tests and browser sample-flow checks; the published source package also passed its ten original tests after fresh extraction. Automated provider tests simulate API responses.
- Real provider checks on 7 October 2026: PayPal sandbox OAuth, invoice creation, activation, and retrieval passed. An initial India-to-India activation restriction was resolved by using a US personal sandbox buyer.
- Published: https://github.com/Akshit-Singh-00/scopepay (public, MIT license).
- Prepared: MIT license, setup instructions, project story, judge instructions, and a demo recording script.
- Verified on 7 October 2026: official ChatGPT sign-in, granted plan usage, account-specific model discovery, and completed inference with GPT-5.6-Luna. A real synthetic scope review returned three items with verified source quotations. No separately billed API-key fallback was used. Screenshots: `screenshots/scopepay-live-ai-review.png` and `screenshots/scopepay-live-ai-evidence.png`.
- Nineteen automated tests pass, including signed identity verification, OAuth state/consent handling, credential isolation, token refresh, and stream text reconstruction with a mandatory completion event. Live testing exposed a terminal response that omitted the streamed output text; the adapter now retains text events and validates them only after completion.
- Configured: an optional OpenAI API key is saved locally and excluded from Git. The app never switches to API-key billing automatically.
- Verified end to end: the approved synthetic $1.00 invoice SP-324e0fd1b70640b9a372 was activated with both email-notification flags disabled. The user completed checkout using the US sandbox buyer. ScopePay's authenticated PayPal refresh returned PAID on 7 October 2026 at 12:44 IST. Evidence: `screenshots/scopepay-sandbox-invoice.png` and `screenshots/scopepay-sandbox-paid.png`.
- The in-app browser could not open PayPal's checkout popup; the user completed that step in their regular browser.
- Prepared: a captioned screenshot walkthrough showing actual AI output, reviewed prices, the active invoice, and the authenticated PAID result. This is a walkthrough of captured states, not a continuous screen recording. It is not uploaded yet.
- Pending: a public YouTube demo; final submission fields; and entrant review.
- Devpost displayed planned maintenance during the 7 October submission-editing attempt. No final submission was made.
- Devpost project-details saving currently requires the missing YouTube URL. Do not insert placeholder links.

This project is not yet submission-ready. Sample screenshots are clearly identified and are not evidence of real AI or payment verification.
