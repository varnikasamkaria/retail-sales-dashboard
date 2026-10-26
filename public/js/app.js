// Shared helpers + page code. Everything is inside one function, so no global names clash.
(function () {
  'use strict';
  const page = document.body.dataset.page;
  const $ = (s, r) => (r || document).querySelector(s);
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const money = n => n >= 1e6 && n < 1e7 ? '₹' + (n / 1e5).toFixed(2) + ' L' : n >= 1e7 ? '₹' + (n / 1e7).toFixed(2) + ' Cr' : n >= 1e3 ? '₹' + (n / 1e3).toFixed(2) + 'K' : '₹' + Math.round(n);
  const pct = (n, d) => (n * 100).toFixed(d == null ? 1 : d) + '%';
  const num = n => Number(n).toLocaleString('en-IN');
  const getJSON = u => fetch(u).then(r => { if (!r.ok) throw new Error('Request failed'); return r.json(); });

  // mobile menu
  const tg = $('.toggle'); if (tg) tg.addEventListener('click', () => $('.menu').classList.toggle('open'));

  // fill any <span data-fill="..."> from /api/summary (used on several pages)
  function fills(s) {
    const r = s.rank, v = {
      rows: num(s.rows), columns: s.columns, customers: num(s.customers), products: num(s.products), stores: s.counts.stores, categories: s.counts.categories, memberships: s.counts.memberships,
      dateFrom: s.dateFrom, dateTo: s.dateTo, revenue: money(s.kpis.revenue), profit: money(s.kpis.profit), orders: num(s.kpis.orders), aov: money(s.kpis.avgOrderValue), margin: pct(s.kpis.profitMargin), missing: s.quality.missingRows, dupIds: s.quality.duplicateSaleIds, monthMismatch: s.quality.monthMismatch
    };
    document.querySelectorAll('[data-fill]').forEach(el => { if (v[el.dataset.fill] != null) el.textContent = v[el.dataset.fill]; });
  }
  if (page !== 'dashboard' && page !== 'contact' && document.querySelector('[data-fill]')) getJSON('/api/summary').then(fills).catch(() => { });

  // ---------- HOME ----------
  if (page === 'home') getJSON('/api/summary').then(s => {
    const k = s.kpis, items = [['Total Revenue', money(k.revenue)], ['Total Profit', money(k.profit)], ['Total Orders', num(k.orders)], ['Avg Order Value', money(k.avgOrderValue)], ['Profit Margin', pct(k.profitMargin)]];
    $('#kpis').innerHTML = items.map(i => `<div class="card kpi"><div class="label">${i[0]}</div><div class="val">${i[1]}</div></div>`).join('');
    $('#range').textContent = `${num(s.rows)} orders · ${s.dateFrom} to ${s.dateTo}`;
  }).catch(() => { $('#kpis').innerHTML = '<p class="err">Could not load data. Is the server running?</p>'; });

  // ---------- INSIGHTS ----------
  if (page === 'insights') getJSON('/api/summary').then(s => {
    const r = s.rank, T = r.totalRevenue, sh = x => pct(x.revenue / T), mg = x => x.profit / x.revenue;
    const spread = (r.topStore.revenue - r.lowStore.revenue) / r.lowStore.revenue;
    const mem = [...s.memberships].sort((a, b) => b.revenue - a.revenue);
    const top = s.topProducts[0];
    const cats = [...s.categories].sort((a, b) => mg(b) - mg(a)), cHi = cats[0], cLo = cats[cats.length - 1];
    const stM = [...s.stores].sort((a, b) => mg(b) - mg(a));
    const d = s.discounts, d0 = d[0], dN = d[d.length - 1];
    const ordMin = Math.min(...d.map(x => x.orders)), ordMax = Math.max(...d.map(x => x.orders));
    const memGap = (mem[0].revenue - mem[mem.length - 1].revenue) / mem[mem.length - 1].revenue;
    const facts = [
      `<b>${r.topStore.name}</b> is the top store with ${money(r.topStore.revenue)} revenue (${sh(r.topStore)} of the total).`,
      `<b>${r.lowStore.name}</b> is the lowest at ${money(r.lowStore.revenue)} (${sh(r.lowStore)}). The gap between the top and lowest store is only ${pct(spread)}, so revenue is spread very evenly across the ${s.counts.stores} stores.`,
      `Revenue peaks in <b>${FULL[r.peakMonth.month - 1]} 2025</b> at ${money(r.peakMonth.revenue)} and is lowest in <b>${FULL[r.lowMonth.month - 1]}</b> at ${money(r.lowMonth.revenue)}.`,
      `<b>${r.topCategory.name}</b> is the largest category with ${sh(r.topCategory)} of revenue; <b>${r.lowCategory.name}</b> is the smallest with ${sh(r.lowCategory)}.`,
      `<b>${mem[0].name}</b> members bring in the most revenue: ${money(mem[0].revenue)} (${sh(mem[0])}). The three tiers are all close (${mem.map(m => m.name + ' ' + sh(m)).join(', ')}).`,
      `Profit margin is <b>${pct(s.kpis.profitMargin)}</b>. The remaining ${pct(1 - s.kpis.profitMargin)} of revenue goes to product cost.`,
      `The most profitable single product is <b>${top.name}</b> with ${money(top.profit)} profit (${num(top.orders)} orders). The top 10 products together make only ${pct(s.topTenProfitShare)} of total profit.`,
      `Profit margin falls as the discount rises: <b>${pct(mg(d0))}</b> on orders with ${d0.name}% discount versus <b>${pct(mg(dN))}</b> with ${dN.name}% discount.`,
      `<b>${cHi.name}</b> has the highest profit margin (${pct(mg(cHi))}); <b>${cLo.name}</b> has the lowest (${pct(mg(cLo))}).`
    ];
    $('#facts').innerHTML = facts.map(f => `<li>${f}</li>`).join('');
    const recs = [
      ['Review deep discounts', `Order counts are almost the same at every discount level (${num(ordMin)} to ${num(ordMax)} orders), but margin drops from ${pct(mg(d0))} to ${pct(mg(dN))}. In this data, bigger discounts cost profit without bringing noticeably more orders. Consider limiting the ${dN.name}% and ${d[d.length - 2].name}% discounts, or testing them on selected products only.`],
      ['Protect and grow high-margin categories', `${cHi.name} earns the best margin (${pct(mg(cHi))}) but is not the biggest by revenue. ${cLo.name} has the lowest margin (${pct(mg(cLo))}); check its cost prices and discounts for room to improve. ${r.topCategory.name} is the biggest earner (${sh(r.topCategory)} of revenue), so even a small margin gain there matters.`],
      ['Plan around the seasonal pattern', `${FULL[r.peakMonth.month - 1]} is the strongest month and ${FULL[r.lowMonth.month - 1]} the weakest. Prepare staff, supplier orders and promotions for the peak, and look into why the low month is weak. (Only one year of data is available, so confirm the pattern with more years.)`],
      ['Compare stores on profit, not only revenue', `Stores are close in revenue (${pct(spread)} gap) and in margin (${pct(mg(stM[stM.length - 1]))} to ${pct(mg(stM[0]))}). ${stM[0].name} has the best margin and ${stM[stM.length - 1].name} the lowest, so use profit and margin as the main store scorecard.`],
      ['Revisit the membership programme', `The three tiers bring almost the same revenue (top tier is only ${pct(memGap)} above the lowest), so the tier does not seem to change how much customers spend. Consider whether tier benefits are working as intended.`],
      ['Do not depend on a few products', `The top 10 products out of ${num(s.products)} give only ${pct(s.topTenProfitShare)} of profit, so profit comes from a wide product range. Keep the range broad rather than cutting to a few best sellers.`]
    ];
    $('#recs').innerHTML = recs.map((x, i) => `<div class="card lift"><div class="ico">${['🏷️', '📦', '📅', '🏬', '🎖️', '🧺'][i]}</div><h3>${x[0]}</h3><p>${x[1]}</p></div>`).join('');
  }).catch(() => { $('#facts').innerHTML = '<li class="err">Could not load data. Is the server running?</li>'; });

  // ---------- DASHBOARD ----------
  if (page === 'dashboard') {
    const sel = { store: $('#f-store'), category: $('#f-category'), membership: $('#f-membership'), month: $('#f-month') };
    const charts = {}; let ready = false;
    const colors = { blue: '#4f46e5', navy: '#1e1b4b', teal: '#14b8a6', gold: '#f59e0b', orange: '#f97316' };
    const palette = ['#4f46e5', '#14b8a6', '#f59e0b', '#f43f5e', '#0ea5e9'];
    function draw(id, cfg) { if (charts[id]) charts[id].destroy(); charts[id] = new Chart(document.getElementById(id), cfg); }
    const axis = (t, cb) => ({ title: { display: !!t, text: t }, ticks: cb ? { callback: cb } : {}, beginAtZero: true });
    const tip = { callbacks: { label: c => ' ' + (c.dataset.label ? c.dataset.label + ': ' : '') + money(c.parsed.y != null && c.chart.options.indexAxis !== 'y' ? c.parsed.y : c.parsed.x != null ? c.parsed.x : c.parsed) } };
    const common = { responsive: true, maintainAspectRatio: false };
    function fillSelect(el, label, list, fmt) { el.innerHTML = `<option value="">${label}</option>` + list.map((o, i) => `<option value="${fmt ? i + 1 : o}">${fmt ? o : o}</option>`).join(''); }
    function render(d) {
      const k = d.kpis;
      $('#kpis').innerHTML = [['Total Revenue', money(k.revenue)], ['Total Profit', money(k.profit)], ['Total Orders', num(k.orders)], ['Avg Order Value', money(k.avgOrderValue)], ['Profit Margin %', pct(k.profitMargin)]].map(i => `<div class="card kpi"><div class="label">${i[0]}</div><div class="val">${i[1]}</div></div>`).join('');
      if (!k.orders) { $('#empty').style.display = 'block'; } else { $('#empty').style.display = 'none'; }
      const m = d.monthly;
      draw('c-month', { type: 'line', data: { labels: MONTHS, datasets: [{ label: 'Total Revenue', data: m.map(x => x.revenue), borderColor: colors.blue, backgroundColor: 'rgba(79,70,229,.25)', fill: true, tension: .35 }, { label: 'Total Profit', data: m.map(x => x.profit), borderColor: colors.navy, backgroundColor: 'rgba(30,27,75,.6)', fill: true, tension: .35 }] }, options: { ...common, scales: { x: { title: { display: true, text: 'Month (2025)' } }, y: axis('Rupees (₹)', v => money(v)) }, plugins: { tooltip: tip } } });
      draw('c-cat', { type: 'doughnut', data: { labels: d.categories.map(x => x.name), datasets: [{ data: d.categories.map(x => x.revenue), backgroundColor: palette }] }, options: { ...common, plugins: { tooltip: { callbacks: { label: c => ` ${c.label}: ${money(c.parsed)} (${pct(c.parsed / k.revenue)})` } }, legend: { position: 'bottom' } } } });
      draw('c-cost', { type: 'bar', data: { labels: MONTHS, datasets: [{ label: 'Total Profit', data: m.map(x => x.profit), backgroundColor: '#0ea5e9' }, { label: 'Total Cost', data: m.map(x => x.cost), backgroundColor: colors.gold }] }, options: { ...common, scales: { x: { stacked: true, title: { display: true, text: 'Month (2025)' } }, y: { ...axis('Rupees (₹)', v => money(v)), stacked: true } }, plugins: { tooltip: tip } } });
      const st = [...d.stores].sort((a, b) => b.revenue - a.revenue);
      draw('c-store', { type: 'bar', data: { labels: st.map(x => x.name), datasets: [{ label: 'Revenue', data: st.map(x => x.revenue), backgroundColor: colors.teal }] }, options: { ...common, indexAxis: 'y', scales: { x: axis('Revenue (₹)', v => money(v)) }, plugins: { legend: { display: false }, tooltip: tip } } });
      draw('c-mem', { type: 'bar', data: { labels: d.memberships.map(x => x.name), datasets: [{ label: 'Revenue', data: d.memberships.map(x => x.revenue), backgroundColor: colors.blue }] }, options: { ...common, scales: { x: { title: { display: true, text: 'Membership tier' } }, y: axis('Revenue (₹)', v => money(v)) }, plugins: { legend: { display: false }, tooltip: tip } } });
      draw('c-prod', { type: 'bar', data: { labels: d.topProducts.map(x => x.name), datasets: [{ label: 'Profit', data: d.topProducts.map(x => x.profit), backgroundColor: colors.orange }] }, options: { ...common, indexAxis: 'y', scales: { x: axis('Total profit (₹)', v => money(v)) }, plugins: { legend: { display: false }, tooltip: tip } } });
    }
    function load() {
      const p = new URLSearchParams(); Object.entries(sel).forEach(([k, el]) => { if (el.value) p.set(k, el.value); });
      $('#loading').style.display = 'block';
      getJSON('/api/data?' + p).then(d => {
        if (!ready) { fillSelect(sel.store, 'All stores', d.options.stores); fillSelect(sel.category, 'All categories', d.options.categories); fillSelect(sel.membership, 'All tiers', d.options.memberships); fillSelect(sel.month, 'All months', FULL, true); ready = true; }
        $('#loading').style.display = 'none'; render(d);
      }).catch(() => { $('#loading').innerHTML = '<span class="err">Could not load data. Is the server running? (Run npm start)</span>'; });
    }
    if (typeof Chart === 'undefined') { $('#loading').innerHTML = '<span class="err">Chart library could not load (internet needed for Chart.js). Screenshots below still work.</span>'; }
    else {
      Object.values(sel).forEach(el => el.addEventListener('change', load));
      $('#reset').addEventListener('click', () => { Object.values(sel).forEach(el => el.value = ''); load(); });
      load();
    }
  }

  // ---------- CONTACT ----------
  if (page === 'contact') {
    const f = $('#cf'), out = $('#result');
    const rules = { name: v => v.trim().length >= 2 && v.trim().length <= 60 ? '' : 'Name must be 2 to 60 characters.', email: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Please enter a valid email address.', message: v => v.trim().length >= 10 && v.trim().length <= 1000 ? '' : 'Message must be 10 to 1000 characters.' };
    const show = errs => Object.keys(rules).forEach(k => { $('#e-' + k).textContent = errs[k] || ''; });
    f.addEventListener('submit', ev => {
      ev.preventDefault(); out.textContent = ''; out.className = '';
      const data = { name: f.name.value, email: f.email.value, message: f.message.value }, errs = {};
      Object.keys(rules).forEach(k => { const m = rules[k](data[k]); if (m) errs[k] = m; });
      show(errs); if (Object.keys(errs).length) return;
      fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
        .then(r => r.json().then(j => ({ ok: r.ok, j })))
        .then(({ ok, j }) => { if (ok) { out.textContent = j.message; f.reset(); } else { show(j.errors || {}); out.className = 'err'; out.textContent = (j.errors && j.errors.form) || 'Please fix the errors above.'; } })
        .catch(() => { out.className = 'err'; out.textContent = 'Could not reach the server. Is it running?'; });
    });
  }
})();
