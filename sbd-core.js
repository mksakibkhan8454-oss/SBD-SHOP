// ===== SBD SHOP shared core (Shop + Seller + Admin সবাই এই ফাইল ব্যবহার করে) =====
const firebaseConfig = {
  apiKey: "AIzaSyCG8wmPSjyv6dsU8nY8Vgrln9T9GNtvrWM",
  authDomain: "sbd-shop.firebaseapp.com",
  projectId: "sbd-shop",
  storageBucket: "sbd-shop.firebasestorage.app",
  messagingSenderId: "371396255408",
  appId: "1:371396255408:web:07c289ebd2f109dfd66575",
  measurementId: "G-5ZPX4Q5VK9",
  databaseURL: "https://sbd-shop-default-rtdb.asia-southeast1.firebasedatabase.app"
};
const ADMIN_PASSWORD = "admin009@"; // <-- অবশ্যই বদলান
const FEE = 60;
const DEFAULT_CATEGORIES = ['Electronics','Fashion & Apparel','Home & Kitchen','Beauty & Health','Groceries'];
const STATUSES = ['PENDING','CONFIRMED','SHIPPED','DELIVERED','CANCELLED'];
firebase.initializeApp(firebaseConfig);
const db = firebase.database(), R = p => db.ref('sbd/' + p);
const toList = v => v ? (Array.isArray(v) ? v : Object.values(v)).filter(Boolean) : [];
const pinHash = s => { s = 'sbd:' + s; let a = 0xdeadbeef, b = 0x41c6ce57; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); a = Math.imul(a ^ c, 2654435761); b = Math.imul(b ^ c, 1597334677); } a = Math.imul(a ^ (a >>> 16), 2246822507) ^ Math.imul(b ^ (b >>> 13), 3266489909); b = Math.imul(b ^ (b >>> 16), 2246822507) ^ Math.imul(a ^ (a >>> 13), 3266489909); return (4294967296 * (2097151 & b) + (a >>> 0)).toString(36); };
const taka = n => '৳' + Number(n || 0).toLocaleString('en-US');
const price = p => p.discountPrice || p.price;

const SEED_PRODUCTS = [
  { id: 'PROD-101', name: 'Wireless Bluetooth Earbuds Gaming low latency', category: 'Electronics', price: 1850, discountPrice: 1250, stock: 45, rating: 4.8, status: 'active', image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&auto=format&fit=crop&q=60', description: 'Wireless earbuds with noise cancellation.' },
  { id: 'PROD-102', name: 'Men Slim Fit Denim Jacket Casual Wear', category: 'Fashion & Apparel', price: 2800, discountPrice: 2100, stock: 20, rating: 4.6, status: 'active', image: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=500&auto=format&fit=crop&q=60', description: 'Premium stretchable denim jacket.' },
  { id: 'PROD-103', name: 'Smart Fitness Watch Heart Rate Monitor', category: 'Electronics', price: 3500, discountPrice: 2650, stock: 12, rating: 4.9, status: 'active', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=60', description: 'AMOLED waterproof smartwatch.' }
];
// প্রথমবার ডাটাবেস ফাঁকা থাকলে একবারই demo data বসাবে
async function seedIfEmpty() {
  const u = {};
  const t = await R('meta/seeded').transaction(v => v ? undefined : true);
  if (t.committed) SEED_PRODUCTS.forEach(p => u['products/' + p.id] = p);
  const c = await R('meta/catSeeded').transaction(v => v ? undefined : true);
  if (c.committed) DEFAULT_CATEGORIES.forEach((n, i) => u['categories/C' + i] = { id: 'C' + i, name: n });
  if (Object.keys(u).length) await db.ref('sbd').update(u);
}
// Stock কমিয়ে order তৈরি (কোনো item না থাকলে rollback)
async function placeOrder(o) {
  const done = [], items = [];
  try {
    for (const it of o.items) {
      let prod = null;
      const t = await R('products/' + it.productId).transaction(p => {
        if (p === null) return p; // cache ফাঁকা থাকলে server থেকে আবার চেষ্টা হবে
        if (p.status === 'hidden' || (p.stock || 0) < it.qty) return;
        prod = p; return { ...p, stock: p.stock - it.qty };
      });
      if (!t.committed || !prod) throw new Error('Stock শেষ বা product নেই: ' + it.productId);
      done.push(it);
      items.push({ productId: prod.id, name: prod.name, quantity: it.qty, price: price(prod) });
    }
  } catch (e) {
    await Promise.all(done.map(it => R('products/' + it.productId + '/stock').transaction(s => (s || 0) + it.qty)));
    throw e;
  }
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const id = 'SBD-ORD-' + Date.now().toString(36).toUpperCase();
  const order = { id, date: new Date().toISOString().slice(0, 10), customerId: o.customerId, customerName: o.name, customerPhone: o.phone, division: o.division, district: o.district, upazila: o.upazila, address: o.address, items, subtotal, deliveryFee: FEE, totalAmount: subtotal + FEE, paymentMethod: o.paymentMethod, trxId: o.trxId || '', paymentStatus: o.paymentMethod === 'Cash on Delivery' ? 'COD' : 'VERIFY', orderStatus: 'PENDING', createdAt: firebase.database.ServerValue.TIMESTAMP };
  await R('orders/' + id).set(order);
  return order;
}
async function setOrderStatus(o, status) {
  if (o.orderStatus === 'CANCELLED') throw new Error('Cancelled order আর বদলানো যাবে না');
  if (status === 'CANCELLED') await Promise.all(toList(o.items).map(i => R('products/' + i.productId + '/stock').transaction(s => (s || 0) + i.quantity)));
  await R('orders/' + o.id + '/orderStatus').set(status);
}
// ----- React helpers -----
const h = React.createElement;
function fireErr(e) { // permission/network error হলে স্ক্রিনে দেখাবে
  console.error(e);
  if (document.getElementById('sbd-err')) return;
  const d = document.createElement('div'); d.id = 'sbd-err';
  d.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99;background:#dc2626;color:#fff;padding:8px;font:12px sans-serif;text-align:center';
  d.textContent = 'Firebase error: ' + (e && e.message || e) + ' — Realtime Database Rules Publish করেছেন কি?';
  document.body.appendChild(d);
}
function useLive(path) { // real-time listener
  const [d, setD] = React.useState(undefined); // undefined = loading, null = ফাঁকা
  React.useEffect(() => { setD(undefined); const r = R(path); const f = r.on('value', s => setD(s.val()), fireErr); return () => r.off('value', f); }, [path]);
  return d;
}
function useConnected() {
  const [c, setC] = React.useState(false);
  React.useEffect(() => { const r = db.ref('.info/connected'); const f = r.on('value', s => setC(!!s.val())); return () => r.off('value', f); }, []);
  return c;
}
function useToast() {
  const [t, setT] = React.useState(null);
  const show = (m, err) => { setT({ m, err }); setTimeout(() => setT(null), 3500); };
  const el = t ? h('div', { className: 'fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium text-white ' + (t.err ? 'bg-red-600' : 'bg-slate-900') }, t.m) : null;
  return [el, show];
}
const LiveBadge = ({ on }) => h('span', { className: 'inline-flex items-center gap-1 text-[10px] font-bold ' + (on ? 'text-emerald-500' : 'text-amber-400') }, h('span', { className: 'w-2 h-2 rounded-full ' + (on ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400') }), on ? 'LIVE SYNC' : 'CONNECTING');
const STATUS_COLOR = { PENDING: 'bg-amber-100 text-amber-700', CONFIRMED: 'bg-blue-100 text-blue-700', SHIPPED: 'bg-indigo-100 text-indigo-700', DELIVERED: 'bg-emerald-100 text-emerald-700', CANCELLED: 'bg-red-100 text-red-700' };
const Badge = ({ s }) => h('span', { className: 'px-2 py-0.5 rounded text-[10px] font-bold ' + (STATUS_COLOR[s] || 'bg-slate-100') }, s);
const inp = 'w-full p-2 text-xs border rounded-xl bg-white';
const card = 'bg-white p-4 rounded-2xl border';
// নতুন order এলে callback (প্রথম load বাদে)
function useNewOrderAlert(orders, cb) {
  const seen = React.useRef(null);
  React.useEffect(() => {
    if (orders === undefined) return;
    const ids = new Set(orders.map(o => o.id));
    if (seen.current) orders.filter(o => !seen.current.has(o.id)).forEach(cb);
    seen.current = ids;
  }, [orders]);
}

function useCategories() { const c = useLive('categories'); return c === undefined ? [] : toList(c); }
// ছবি ছোট করে (≈600px JPEG) base64 হিসেবে ডাটাবেসে রাখার জন্য
function compressImage(file, max = 600) {
  return new Promise((res, rej) => {
    const r = new FileReader(); r.onerror = rej;
    r.onload = () => { const im = new Image(); im.onerror = rej; im.onload = () => {
      const k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas');
      c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', 0.7));
    }; im.src = r.result; };
    r.readAsDataURL(file);
  });
}
