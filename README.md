# SBD SHOP — Shop / Seller / Admin (Real-time)

| ফাইল | কাজ |
|---|---|
| `index.html` | Customer Shop (বিভাগ → জেলা → উপজেলা → ঠিকানা) |
| `admin.html` | Admin Panel — Product add/edit/delete, Category, Sales ও Stock হিসাব, Orders (password login) |
| `bd-locations.js` | ৮ বিভাগ, ৬৪ জেলা, উপজেলা তালিকা |
| `sbd-core.js` | Firebase config + shared logic |
| `database.rules.json` | Realtime Database rules |

## চালানোর নিয়ম
1. Firebase Console → Realtime Database → Rules এ `database.rules.json` এর কন্টেন্ট paste করে **Publish** করুন (না করলে ৩০ দিন পর test mode শেষ হয়ে sync বন্ধ হবে)।
2. তিনটা পেজ আলাদা ট্যাব/ডিভাইসে খুলুন। `index.html` প্রথমবার খুললে demo data নিজে থেকে বসবে।
3. Admin password: `admin009@` (`sbd-core.js` এ বদলান)।

## Real-time কী কী
- Admin product/stock বদলালে Shop-এ সাথে সাথে দেখায়; Cart-এর দাম ও stock-ও live।
- Customer order দিলে Admin-এ সাথে সাথে 🔔 আসে; Stock transaction দিয়ে কমে (overselling হয় না)।
- Admin status বদলালে Customer-এর "My Orders"-এ live আপডেট হয়।
- Order Cancel করলে stock ফেরত আসে।

## নিরাপত্তা সতর্কতা
Firebase Auth ছাড়া password শুধু ক্লায়েন্ট-সাইড লগইন — কেউ source দেখলে বা ডাটাবেস URL দিয়ে সরাসরি লিখতে পারে। Live করার আগে Firebase Authentication যোগ করে rules-এ `auth.uid` চেক বসানো উচিত।
পুরনো merged ফাইলের ডাটা `sbdShop/` পাথে আছে; নতুন কোড `sbd/` ব্যবহার করে, তাই চাইলে `sbdShop` ডিলিট করতে পারেন।
