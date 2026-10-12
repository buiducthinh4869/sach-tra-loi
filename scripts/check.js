#!/usr/bin/env node
/* Kiểm tra kho câu trả lời trong answers.js.
   Chạy: node scripts/check.js
   Thoát với mã 1 nếu còn lỗi. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const file = path.join(__dirname, "..", "answers.js");
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(file, "utf8"), sandbox, { filename: "answers.js" });
const { VERDICTS, BANK, GENERAL, GRUMPY } = sandbox.window.SACH_DATA;

const MAX = { solo: 30, GENERAL: 30, GRUMPY: 30, advice: 20, VERDICTS: 6 };
const SHORT = 12;          // dưới 12 từ là câu ngắn
const LONG = 15;           // từ 15 từ trở lên là câu dài
const SIMILAR = 0.7;       // tỉ lệ chữ chung (Jaccard) để coi là gần trùng
const MIN_WORDS_SIM = 5;   // chỉ so độ giống với câu từ 5 từ trở lên

// Các cặp câu có từ bản đầu tiên, cố ý đối nhau hoặc dùng chung, không tính là trùng.
const ALLOW = [
  ["Nghe giảng rồi mới đọc sách.", "Đọc sách rồi mới nghe giảng."],
  ["Bạn bè sẽ giữ bí mật.", "Giữ bí mật của bạn bè."],
  ["Bắt đầu từ việc dễ nhất.", "Bắt đầu từ việc khó nhất."],
  ["Buổi sáng là thời điểm của bạn.", "Buổi tối là thời điểm của bạn."],
  ["Tiền không giải quyết được chuyện này.", "Tiền sẽ giải quyết được chuyện này."],
  ["Đó chỉ là hiểu lầm.", "Đó không chỉ là hiểu lầm."],
  ["Nó quan trọng hơn bạn tưởng.", "Nó ít quan trọng hơn bạn tưởng."],
  ["Bạn đang làm tốt hơn bạn nghĩ.", "Bạn đang làm tốt hơn bạn nghĩ."], // có ở cả Tiền bạc và Bản thân
];

const errors = [];
const warns = [];
const words = s => s.trim().split(/\s+/).length;
const norm = s => s.toLowerCase().normalize("NFC").replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
const allowed = new Set(ALLOW.flatMap(([a, b]) => [norm(a) + "|" + norm(b), norm(b) + "|" + norm(a)]));
const OK_CHARS = /^[A-Za-z0-9À-ÃÈ-ÊÌÍÒ-ÕÙÚÝà-ãè-êìíò-õùúýĂăĐđĨĩŨũƠơƯưẠ-ỹ .,!?:;'"“”‘’()\-–%/]+$/;

/* ---------- Từng mảng: độ dài, dấu câu, ký tự ---------- */
const arrays = [["VERDICTS", VERDICTS, "VERDICTS"], ["GENERAL", GENERAL, "GENERAL"], ["GRUMPY", GRUMPY, "GRUMPY"]];
for (const k in BANK) {
  arrays.push([k + ".solo", BANK[k].solo, "solo"], [k + ".advice", BANK[k].advice, "advice"]);
}
for (const [name, arr, kind] of arrays) {
  if (!Array.isArray(arr)) { errors.push(`${name}: không phải mảng`); continue; }
  arr.forEach((s, i) => {
    const at = `${name}[${i}] "${s}"`;
    if (typeof s !== "string" || !s.trim()) { errors.push(`${name}[${i}]: câu rỗng`); return; }
    if (s !== s.trim() || /\s{2,}/.test(s)) errors.push(`${at}: thừa khoảng trắng`);
    if (s !== s.normalize("NFC")) errors.push(`${at}: dấu tiếng Việt chưa chuẩn NFC`);
    if (!/[.?!]$/.test(s)) errors.push(`${at}: không kết thúc bằng . ? !`);
    if (!OK_CHARS.test(s)) {
      const bad = [...s].filter(c => !OK_CHARS.test(c)).map(c => `${c} (U+${c.codePointAt(0).toString(16).toUpperCase()})`);
      errors.push(`${at}: ký tự lạ ${bad.join(", ")}`);
    }
    if (words(s) > MAX[kind]) errors.push(`${at}: ${words(s)} từ, quá ${MAX[kind]}`);
  });
}

/* ---------- Trùng và gần trùng trong từng nhóm trang ---------- */
function dupes(pool, label) {
  const seen = new Map();
  pool.forEach(s => {
    const n = norm(s);
    if (seen.has(n)) {
      const t = seen.get(n);
      if (allowed.has(n + "|" + n)) return;
      errors.push(`${label}: ${t === s ? "trùng" : "gần trùng"}: "${t}" / "${s}"`);
    } else seen.set(n, s);
  });
  const items = [...seen.entries()].map(([n, s]) => ({ n, s, set: new Set(n.split(" ")) }))
    .filter(x => x.n.split(" ").length >= MIN_WORDS_SIM)
    .sort((a, b) => a.set.size - b.set.size);
  for (let i = 0; i < items.length; i++) {
    const A = items[i];
    for (let j = i + 1; j < items.length; j++) {
      const B = items[j];
      if (A.set.size < SIMILAR * B.set.size) break;
      let inter = 0;
      for (const w of A.set) if (B.set.has(w)) inter++;
      const jac = inter / (A.set.size + B.set.size - inter);
      if (jac >= SIMILAR && !allowed.has(A.n + "|" + B.n)) {
        errors.push(`${label}: gần trùng (${Math.round(jac * 100)}% chữ chung): "${A.s}" / "${B.s}"`);
      }
    }
  }
}
dupes(VERDICTS, "VERDICTS");
dupes(GRUMPY, "GRUMPY");
for (const k in BANK) dupes([...BANK[k].solo, ...BANK[k].advice], "Chương " + BANK[k].name);
const chung = [...GENERAL];
for (const k in BANK) chung.push(...BANK[k].solo);
dupes(chung, "Chương Tổng hợp");

/* ---------- Số trang: dựng giống hệt index.html ---------- */
const pages = {};
for (const k in BANK) {
  const b = BANK[k], list = [...b.solo, ...b.advice];
  for (const v of VERDICTS) for (const a of b.advice) list.push(v + " " + a);
  pages[k] = new Set(list).size;
}
pages.chung = new Set(chung).size;

/* ---------- Báo cáo ---------- */
function mix(arr) {
  const n = arr.length || 1;
  const s = arr.filter(x => words(x) < SHORT).length;
  const l = arr.filter(x => words(x) >= LONG).length;
  return { s, m: arr.length - s - l, l, pct: Math.round((s / n) * 100) };
}
const pad = (x, w) => String(x).padStart(w);
const padE = (x, w) => String(x).padEnd(w);
console.log("Kho câu trả lời (answers.js)\n");
console.log(`VERDICTS: ${VERDICTS.length} câu · GRUMPY: ${GRUMPY.length} câu`);
const maxCombo = Math.max(...Object.values(BANK).flatMap(b => b.advice.map(a => Math.max(...VERDICTS.map(v => words(v + " " + a))))));
console.log(`Câu ghép verdict + advice dài nhất: ${maxCombo} từ\n`);
console.log(padE("Chương", 20) + pad("solo", 6) + pad("advice", 8) + pad("số trang", 10) + "   ngắn/vừa/dài (solo)   ngắn/vừa/dài (advice)");
for (const k in BANK) {
  const b = BANK[k], ms = mix(b.solo), ma = mix(b.advice);
  console.log(padE(b.name, 20) + pad(b.solo.length, 6) + pad(b.advice.length, 8) + pad(pages[k], 10) +
    `   ${pad(ms.s, 3)}/${pad(ms.m, 3)}/${pad(ms.l, 3)} = ${pad(ms.pct, 2)}% ngắn` +
    `   ${pad(ma.s, 3)}/${pad(ma.m, 3)}/${pad(ma.l, 3)} = ${pad(ma.pct, 2)}% ngắn`);
  for (const [nm, m] of [["solo", ms], ["advice", ma]]) {
    if (m.pct < 50 || m.pct > 70) warns.push(`${b.name}.${nm}: ${m.pct}% câu ngắn, lệch mục tiêu khoảng 60%`);
  }
}
const mg = mix(GENERAL);
console.log(padE("Tổng hợp", 20) + pad(GENERAL.length, 6) + pad("-", 8) + pad(pages.chung, 10) +
  `   ${pad(mg.s, 3)}/${pad(mg.m, 3)}/${pad(mg.l, 3)} = ${pad(mg.pct, 2)}% ngắn (GENERAL)`);
if (mg.pct < 50 || mg.pct > 70) warns.push(`GENERAL: ${mg.pct}% câu ngắn, lệch mục tiêu khoảng 60%`);
console.log("(ngắn: dưới 12 từ · vừa: 12 đến 14 từ · dài: từ 15 từ)\n");

if (warns.length) console.log("Lưu ý:\n" + warns.map(w => "  - " + w).join("\n") + "\n");
if (errors.length) {
  console.log(`Có ${errors.length} lỗi:\n` + errors.map(e => "  - " + e).join("\n"));
  process.exit(1);
}
console.log("Sạch: không có lỗi.");
