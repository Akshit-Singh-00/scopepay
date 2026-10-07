# Submission status

**Submitted to the PayPal AI Hackathon.** The user completed final submission on 7 October 2026. Devpost displayed “Project submitted!” and the project page lists the hackathon under “Submitted to” and in its submission history.

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
- Published: [public YouTube demo](https://youtu.be/x0UYXrd_9oM), under two minutes. YouTube confirmed publication on 7 October 2026 with public visibility and no issues found by its upload checks. This captioned walkthrough shows actual captured AI output, reviewed prices, the active invoice, and authenticated PAID status; it is not a continuous screen recording.
- Saved to Devpost: project story, JavaScript/Node.js/PayPal tags, repository link, public YouTube demo, inline AI and payment screenshots, and all required additional information. The screenshots were verified to render on the project page.
- The submitter confirmed the team's eligibility, completed the rules/terms checkbox, and clicked the final submission button. Successful submission was independently verified in Devpost.
- Project page: https://devpost.com/software/scopepay

No further submission action is required. Keep the public repository and demo available for judging. Sample screenshots are clearly identified and are separate from the verified AI and payment evidence.
