// HTML for the mock hosted payment page and the debug dashboard.

const styles = `
  :root {
    --ink: #111827; --muted: #6b7280; --line: #d1d5db; --soft: #e5e7eb; --bg: #f9fafb;
    --orange: #d4572f; --purple: #8e86bc; --error: #b91c1c;
  }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: var(--ink); background: var(--bg); }
  .test-banner { background: #fef3c7; color: #92400e; text-align: center; font-size: 13px; font-weight: 600; padding: 8px 16px; letter-spacing: .02em; }
  .wrap { max-width: 560px; margin: 32px auto; padding: 0 16px; }
  .card { border-radius: 16px; padding: 2px; background: linear-gradient(135deg, var(--purple), var(--orange) 50%, var(--purple)); box-shadow: 0 20px 40px rgba(17,24,39,.08); }
  .card-inner { background: #fff; border-radius: 14px; }
  .card-head { display: flex; justify-content: space-between; align-items: center; padding: 22px 28px; border-bottom: 1px solid var(--soft); }
  .card-head h1 { font-size: 20px; margin: 0; }
  .card-head .amount { font-size: 20px; font-weight: 600; color: #374151; }
  .card-body { padding: 24px 28px 28px; }
  .divider { display: flex; align-items: center; gap: 16px; color: var(--muted); font-size: 12px; font-weight: 600; letter-spacing: .12em; margin: 0 0 20px; }
  .divider::before, .divider::after { content: ""; flex: 1; height: 1px; background: var(--soft); }
  label { display: block; font-weight: 500; font-size: 15px; margin-bottom: 8px; }
  input { width: 100%; font-size: 16px; padding: 14px 16px; border: 1px solid var(--line); border-radius: 8px; color: var(--ink); }
  input:focus { outline: 2px solid var(--purple); outline-offset: 1px; border-color: var(--purple); }
  input.invalid { border-color: var(--error); }
  .field { margin-bottom: 20px; }
  .row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .hint { color: var(--muted); font-size: 13px; margin-top: 6px; }
  .err { color: var(--error); font-size: 13px; margin-top: 6px; }
  .brands { display: flex; gap: 8px; margin-top: 8px; font-size: 11px; font-weight: 700; }
  .brands span { border: 1px solid var(--soft); border-radius: 4px; padding: 2px 6px; color: #1e3a8a; }
  .pay { width: 100%; border: 0; border-radius: 8px; padding: 16px; font-size: 17px; font-weight: 600; color: #fff; cursor: pointer; background: linear-gradient(90deg, var(--orange), var(--purple) 60%); }
  .pay:hover { filter: brightness(1.05); }
  .back { display: block; margin: 20px auto 0; background: none; border: 0; color: var(--muted); font-size: 15px; cursor: pointer; }
  details { margin-top: 24px; font-size: 14px; }
  summary { cursor: pointer; color: var(--muted); }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--soft); vertical-align: top; }
  code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12.5px; }
  @media (max-width: 480px) { .row { grid-template-columns: 1fr; } .card-head, .card-body { padding-left: 18px; padding-right: 18px; } }
`;

function layout(title, body) {
  return `<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>${styles}</style>
</head>
<body>
  <div class="test-banner">TEST MODE: no real payments are taken. Only the test cards below are accepted.</div>
  ${body}
</body>
</html>`;
}

export function formatMoney(amount, currency) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(amount / 100);
}

function testCardTable(testCards) {
  const rows = Object.entries(testCards)
    .map(([number, card]) => `<tr><td><code>${number.replace(/(\d{4})(?=\d)/g, '$1 ')}</code></td><td>${escapeHtml(card.label)}</td></tr>`)
    .join('');
  return `<table><thead><tr><th>Card number</th><th>Behaviour</th></tr></thead><tbody>${rows}</tbody></table>
    <p class="hint">Any future expiry date and any 3 digit security code.</p>`;
}

export function renderCheckoutPage({ session, testCards, errors = {}, values = {} }) {
  const amount = formatMoney(session.amount, session.currency);
  const field = (name) => (errors[name] ? `<div class="err">${escapeHtml(errors[name])}</div>` : '');
  const cls = (name) => (errors[name] ? 'invalid' : '');

  return layout('Secure checkout', `
  <div class="wrap">
    <div class="card"><div class="card-inner">
      <div class="card-head">
        <h1>Secure checkout</h1>
        <div class="amount">${amount}</div>
      </div>
      <div class="card-body">
        <div class="divider">PAY BY CARD</div>
        <form method="post" action="/pay/${encodeURIComponent(session.id)}" novalidate>
          <div class="field">
            <label for="cardNumber">Card number</label>
            <input id="cardNumber" name="cardNumber" inputmode="numeric" autocomplete="off" placeholder="1234 5678 9012 3456" value="${escapeHtml(values.cardNumber ?? '')}" class="${cls('cardNumber')}">
            ${field('cardNumber')}
            <div class="brands"><span>AMEX</span><span>MC</span><span>VISA</span></div>
          </div>
          <div class="row">
            <div class="field">
              <label for="expiry">Expiry date</label>
              <input id="expiry" name="expiry" inputmode="numeric" autocomplete="off" placeholder="MM / YY" value="${escapeHtml(values.expiry ?? '')}" class="${cls('expiry')}">
              ${errors.expiry ? field('expiry') : '<div class="hint">Front of card in MM/YY format</div>'}
            </div>
            <div class="field">
              <label for="cvc">Security code</label>
              <input id="cvc" name="cvc" inputmode="numeric" autocomplete="off" maxlength="4" class="${cls('cvc')}">
              ${errors.cvc ? field('cvc') : '<div class="hint">3 digits on back of card</div>'}
            </div>
          </div>
          <button class="pay" type="submit">&#128274; Pay ${amount}</button>
        </form>
        <form method="post" action="/pay/${encodeURIComponent(session.id)}/cancel">
          <button class="back" type="submit">&larr; Go back</button>
        </form>
        <details>
          <summary>Test cards</summary>
          ${testCardTable(testCards)}
        </details>
      </div>
    </div></div>
  </div>`);
}

export function renderClosedPage(message) {
  return layout('Secure checkout', `
  <div class="wrap">
    <div class="card"><div class="card-inner">
      <div class="card-head"><h1>Secure checkout</h1></div>
      <div class="card-body"><p>${escapeHtml(message)}.</p></div>
    </div></div>
  </div>`);
}

export function renderDashboard({ sessions, deliveries, testCards, webhookUrl }) {
  const sessionRows = sessions.length
    ? sessions.map((s) => `<tr>
        <td><code>${escapeHtml(s.id)}</code></td>
        <td>${escapeHtml(s.reference)}</td>
        <td>${formatMoney(s.amount, s.currency)}</td>
        <td>${escapeHtml(s.status)}</td>
        <td>${escapeHtml(s.updatedAt)}</td>
      </tr>`).join('')
    : '<tr><td colspan="5">No payment sessions yet</td></tr>';

  const deliveryRows = deliveries.length
    ? deliveries.map((d) => `<tr>
        <td>${escapeHtml(d.at)}</td>
        <td><code>${escapeHtml(d.eventId)}</code></td>
        <td>${escapeHtml(d.type)}</td>
        <td><code>${escapeHtml(d.sessionId)}</code></td>
        <td>${d.attempt}</td>
        <td>${escapeHtml(String(d.status ?? d.error))}</td>
      </tr>`).join('')
    : '<tr><td colspan="6">No webhooks sent yet</td></tr>';

  return layout('Mock Tapp Checkout', `
  <div class="wrap" style="max-width: 960px">
    <h1>Mock Tapp Checkout</h1>
    <p class="hint">${webhookUrl ? `Webhooks are sent to <code>${escapeHtml(webhookUrl)}</code>.` : 'Webhooks are switched off.'} Refresh to update.</p>
    <h2>Payment sessions</h2>
    <table><thead><tr><th>ID</th><th>Reference</th><th>Amount</th><th>Status</th><th>Updated</th></tr></thead><tbody>${sessionRows}</tbody></table>
    <h2>Webhook deliveries</h2>
    <table><thead><tr><th>Sent</th><th>Event</th><th>Type</th><th>Session</th><th>Attempt</th><th>Response</th></tr></thead><tbody>${deliveryRows}</tbody></table>
    <h2>Test cards</h2>
    ${testCardTable(testCards)}
  </div>`);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
