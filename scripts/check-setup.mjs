// Prints configuration presence only. Never prints credential values.
console.log('AI: use Continue with ChatGPT in the app, or explicitly select the separately billed API-key option.');
console.log(`Optional OpenAI API key: ${process.env.OPENAI_API_KEY?.trim() && process.env.OPENAI_MODEL?.trim() ? 'configured' : 'not configured'}`);
const names = ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'PAYPAL_INVOICER_EMAIL', 'PAYPAL_TEST_RECIPIENT'];
let ready = true;
for (const name of names) {
  const present = Boolean(process.env[name]?.trim());
  console.log(`${name}: ${present ? 'configured' : 'missing'}`);
  ready &&= present;
}
console.log(ready ? 'Configuration is present. Real provider verification is still required.' : 'Complete the missing values in .env, then restart ScopePay.');
process.exitCode = ready ? 0 : 1;
