# Submission readiness

- Implemented: local review and change-order interface, OpenAI and PayPal sandbox adapters, persistence and duplicate-request safeguards.
- Verified: automated tests and browser sample-flow checks; the published source package also passed its ten original tests after fresh extraction. Automated provider tests simulate API responses.
- Real provider checks on 7 October 2026: PayPal sandbox OAuth, draft invoice creation, and draft retrieval passed. Activating a synthetic USD 1 draft was rejected with INR_FOREIGN_CURRENCY_BLOCKED because both test accounts were in India. No payment has been completed.
- Published: https://github.com/Akshit-Singh-00/scopepay (public, MIT license).
- Prepared: MIT license, setup instructions, project story, judge instructions, and a demo recording script.
- Verified on 7 October 2026: official ChatGPT sign-in, granted plan usage, account-specific model discovery, and completed inference with GPT-5.6-Luna. A real synthetic scope review returned three items with verified source quotations. No separately billed API-key fallback was used. Screenshots: `screenshots/scopepay-live-ai-review.png` and `screenshots/scopepay-live-ai-evidence.png`.
- Nineteen automated tests pass, including signed identity verification, OAuth state/consent handling, credential isolation, token refresh, and stream text reconstruction with a mandatory completion event. Live testing exposed a terminal response that omitted the streamed output text; the adapter now retains text events and validates them only after completion.
- Configured: an optional OpenAI API key is saved locally and excluded from Git. The app never switches to API-key billing automatically.
- Pending: cross-border sandbox buyer setup; sandbox invoice activation and test payment; a public YouTube demo; final submission fields; and entrant review.
- Devpost displayed planned maintenance during the 7 October submission-editing attempt. No final submission was made.
- Devpost project-details saving currently requires the missing YouTube URL. Do not insert placeholder links.

This project is not yet submission-ready. Sample screenshots are clearly identified and are not evidence of real AI or payment verification.
