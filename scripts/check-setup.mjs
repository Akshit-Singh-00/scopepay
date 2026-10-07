// Prints configuration presence only. Never prints credential values.
const names = ['OPENAI_API_KEY', 'OPENAI_MODEL', 'PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'PAYPAL_INVOICER_EMAIL', 'PAYPAL_TEST_RECIPIENT'];
let ready = true;
for (const name of names) {
  const present = Boolean(process.env[name]?.trim());
  console.log(`${name}: ${present ? 'configured' : 'missing'}`);
  ready &&= present;
}
console.log(ready ? 'Configuration is present. Real provider verification is still required.' : 'Complete the missing values in .env, then restart ScopePay.');
process.exitCode = ready ? 0 : 1;
