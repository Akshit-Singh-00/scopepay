# Judge testing instructions

This build runs locally on Node.js 22.17 or newer. A hosted service is not required. All source files and the MIT license are included in the source package.

1. Download or clone the public repository when available.
2. Run `npm start`. No package installation is needed.
3. Open `http://127.0.0.1:4317` and choose **Explore sample results** to inspect the interface. This is explicitly prewritten sample output, not a real AI demonstration.
4. For the real flow, copy `.env.example` to `.env` and configure an OpenAI API key/model and PayPal sandbox app credentials, plus the test business and personal account emails. The README describes each field. Never publish secrets in the repository.
5. Restart the server and choose **Load example**, then **Analyze the scope**. Review the quotations and classifications.
6. Select verified extra-work items and enter prices. In this synthetic scenario, record that test client approval has been obtained, then create the sandbox invoice.
7. Activate the sandbox payment link, open it, and use the configured personal sandbox account to complete a test payment. Refresh the status in ScopePay.
8. Run `npm run check` and `npm test` for local verification.

Current limitation: live-provider verification is not complete. Judge access must be rehearsed after account setup; the sample alone does not meet the hackathon's functional-demo requirement. If judges cannot use their own provider access, arrange restricted testing access through the submission's private testing-instructions field before the deadline.
