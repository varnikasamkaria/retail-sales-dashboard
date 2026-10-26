// Simple backend using only built-in Node.js modules (no npm install needed).
const http = require('http'), fs = require('fs'), path = require('path');
const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, '..', 'public');
const DATA_FILE = path.join(__dirname, 'data', 'clean_data.csv');
const MSG_FILE = path.join(__dirname, 'messages.json');
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.ico': 'image/x-icon' };

// ---- Load the CSV once at start ----
const lines = fs.readFileSync(DATA_FILE, 'utf8').split(/\r?\n/).filter(Boolean);
const head = lines[0].split(',');
const col = n => head.indexOf(n);
const C = { store: col('Store_Name'), cat: col('Category'), mem: col('Membership'), month: col('Month'), rev: col('Calc_Revenue'), profit: col('Calc_Profit'), prod: col('Product_Name'), cust: col('Customer_ID'), date: col('Sale_Date'), disc: col('Discount_Percent') };
const rows = lines.slice(1).map(l => { const p = l.split(','); return { store: p[C.store], cat: p[C.cat], mem: p[C.mem], month: +p[C.month], rev: +p[C.rev], profit: +p[C.profit], prod: p[C.prod], cust: p[C.cust], date: p[C.date], disc: +p[C.disc], empty: p.some(x => x === '') }; });
const uniq = k => [...new Set(rows.map(r => r[k]))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
const OPTIONS = { stores: uniq('store'), categories: uniq('cat'), memberships: uniq('mem') };

function sumBy(list, key) { const o = {}; list.forEach(r => { const k = r[key]; o[k] = o[k] || { revenue: 0, profit: 0, orders: 0 }; o[k].revenue += r.rev; o[k].profit += r.profit; o[k].orders++; }); return o; }
function aggregate(list) {
  const revenue = list.reduce((s, r) => s + r.rev, 0), profit = list.reduce((s, r) => s + r.profit, 0), orders = list.length;
  const m = sumBy(list, 'month');
  const monthly = Array.from({ length: 12 }, (_, i) => { const x = m[i + 1] || { revenue: 0, profit: 0, orders: 0 }; return { month: i + 1, revenue: x.revenue, profit: x.profit, cost: x.revenue - x.profit, orders: x.orders }; });
  const toList = o => Object.entries(o).map(([name, v]) => ({ name, ...v }));
  const products = toList(sumBy(list, 'prod')).sort((a, b) => b.profit - a.profit).slice(0, 10);
  return { kpis: { revenue, profit, orders, avgOrderValue: orders ? revenue / orders : 0, profitMargin: revenue ? profit / revenue : 0 }, monthly, categories: toList(sumBy(list, 'cat')), stores: toList(sumBy(list, 'store')), memberships: toList(sumBy(list, 'mem')), topProducts: products };
}
function summary() {
  const a = aggregate(rows), t = a.kpis.revenue;
  const byRev = arr => [...arr].sort((x, y) => y.revenue - x.revenue);
  const st = byRev(a.stores), ca = byRev(a.categories), me = byRev(a.memberships), mo = byRev(a.monthly);
  return { ...a, rows: rows.length, columns: head.length, customers: new Set(rows.map(r => r.cust)).size, products: new Set(rows.map(r => r.prod)).size,
    dateFrom: rows.reduce((m, r) => r.date < m ? r.date : m, rows[0].date), dateTo: rows.reduce((m, r) => r.date > m ? r.date : m, rows[0].date),
    counts: { stores: OPTIONS.stores.length, categories: OPTIONS.categories.length, memberships: OPTIONS.memberships.length },
    rank: { topStore: st[0], lowStore: st[st.length - 1], topCategory: ca[0], lowCategory: ca[ca.length - 1], topMembership: me[0], peakMonth: mo[0], lowMonth: mo[mo.length - 1], totalRevenue: t } };
}
const SUMMARY = summary();
// Data-quality checks and extra aggregates used by the Insights / Method pages
SUMMARY.discounts = Object.entries(sumBy(rows, 'disc')).map(([name, v]) => ({ name: +name, ...v })).sort((a, b) => a.name - b.name);
SUMMARY.quality = { missingRows: rows.filter(r => r.empty).length, duplicateSaleIds: lines.length - 1 - new Set(lines.slice(1).map(l => l.split(',')[0])).size, monthMismatch: rows.filter(r => +r.date.slice(5, 7) !== r.month).length };
const allProd = Object.values(sumBy(rows, 'prod')).map(v => v.profit).sort((a, b) => b - a);
SUMMARY.topTenProfitShare = allProd.slice(0, 10).reduce((a, b) => a + b, 0) / SUMMARY.kpis.profit;

// ---- Helpers ----
const send = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
function validate(b) {
  const e = {};
  const name = String(b.name || '').trim(), email = String(b.email || '').trim(), message = String(b.message || '').trim();
  if (name.length < 2 || name.length > 60) e.name = 'Name must be 2 to 60 characters.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 100) e.email = 'Please enter a valid email address.';
  if (message.length < 10 || message.length > 1000) e.message = 'Message must be 10 to 1000 characters.';
  return { e, clean: { name, email, message } };
}
function handleContact(req, res) {
  let body = '';
  req.on('data', c => { body += c; if (body.length > 10000) req.destroy(); });
  req.on('end', () => {
    let data; try { data = JSON.parse(body); } catch { return send(res, 400, { ok: false, errors: { form: 'Invalid request.' } }); }
    const { e, clean } = validate(data || {});
    if (Object.keys(e).length) return send(res, 400, { ok: false, errors: e });
    let list = []; try { list = JSON.parse(fs.readFileSync(MSG_FILE, 'utf8')); } catch { }
    list.push({ id: Date.now(), receivedAt: new Date().toISOString(), ...clean });
    fs.writeFileSync(MSG_FILE, JSON.stringify(list, null, 2));
    send(res, 200, { ok: true, message: 'Thank you! Your message was saved.' });
  });
}

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/summary' && req.method === 'GET') return send(res, 200, SUMMARY);
  if (url.pathname === '/api/data' && req.method === 'GET') {
    const q = url.searchParams, store = q.get('store'), cat = q.get('category'), mem = q.get('membership'), mon = q.get('month');
    const list = rows.filter(r => (!store || r.store === store) && (!cat || r.cat === cat) && (!mem || r.mem === mem) && (!mon || r.month === +mon));
    return send(res, 200, { options: OPTIONS, filters: { store, category: cat, membership: mem, month: mon }, ...aggregate(list) });
  }
  if (url.pathname === '/api/contact' && req.method === 'POST') return handleContact(req, res);
  if (url.pathname.startsWith('/api/')) return send(res, 404, { error: 'Not found' });
  let p; try { p = decodeURIComponent(url.pathname); } catch { res.writeHead(400); return res.end('Bad request'); }
  if (p === '/') p = '/index.html';
  const file = path.normalize(path.join(PUBLIC, p));
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Page not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' }); res.end(buf);
  });
}).listen(PORT, '0.0.0.0', () => console.log(`Website running: http://localhost:${PORT}  (loaded ${rows.length} rows)`));
