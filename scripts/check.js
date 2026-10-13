#!/usr/bin/env node
/* Kiểm tra kho câu trả lời trong answers.js và món ăn trong dishes.js.
   Chạy: node scripts/check.js
   Thoát với mã 1 nếu còn lỗi. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const file = path.join(__dirname, "..", "answers.js");
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(file, "utf8"), sandbox, { filename: "answers.js" });
const { VERDICTS, BANK, GENERAL, GRUMPY, GRUMPY_AN = [] } = sandbox.window.SACH_DATA;

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
const arrays = [["VERDICTS", VERDICTS, "VERDICTS"], ["GENERAL", GENERAL, "GENERAL"], ["GRUMPY", GRUMPY, "GRUMPY"], ["GRUMPY_AN", GRUMPY_AN, "GRUMPY"]];
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
dupes([...GRUMPY, ...GRUMPY_AN], "GRUMPY");
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
console.log(`VERDICTS: ${VERDICTS.length} câu · GRUMPY: ${GRUMPY.length} câu · GRUMPY_AN (câu cáu riêng của chương Ẩm thực): ${GRUMPY_AN.length} câu`);
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

checkDishes();

if (warns.length) console.log("Lưu ý:\n" + warns.map(w => "  - " + w).join("\n") + "\n");
if (errors.length) {
  console.log(`Có ${errors.length} lỗi:\n` + errors.map(e => "  - " + e).join("\n"));
  process.exit(1);
}
console.log("Sạch: không có lỗi.");

/* ---------- Món ăn: dishes.js ---------- */
function checkDishes() {
  const file = path.join(__dirname, "..", "dishes.js");
  if (!fs.existsSync(file)) { errors.push("Không tìm thấy dishes.js"); return; }
  const sb = { window: {} };
  vm.runInNewContext(fs.readFileSync(file, "utf8"), sb, { filename: "dishes.js" });
  const D = sb.window.SACH_DISHES;
  if (!Array.isArray(D)) { errors.push("dishes.js: window.SACH_DISHES không phải mảng"); return; }

  // Mã, tên hiển thị và số món tối thiểu của từng nền ẩm thực
  const AM_THUC = {
    viet: ["Việt Nam", 320], trung: ["Trung Hoa", 100], nhat: ["Nhật Bản", 80], han: ["Hàn Quốc", 80],
    thai: ["Thái Lan", 60], dna: ["Đông Nam Á khác", 70], an: ["Ấn Độ và Nam Á", 50],
    trungdong: ["Trung Đông và Bắc Phi", 40], au: ["Châu Âu", 130], my: ["Châu Mỹ", 70],
  };
  const BUA = ["sang", "trua", "toi", "khuya"];
  const LOAI = ["nuoc", "kho", "nuong", "anvat", "trangmieng", "douong"];
  // Miền của món Việt, suy từ trường vung
  const MIEN = {
    "Bắc": ["Miền Bắc", "Hà Nội", "Hải Phòng", "Nam Định", "Thái Bình", "Hải Dương", "Bắc Ninh", "Bắc Giang", "Hưng Yên", "Hà Nam", "Ninh Bình", "Quảng Ninh", "Vĩnh Phúc", "Phú Thọ", "Thái Nguyên", "Tuyên Quang", "Lạng Sơn", "Cao Bằng", "Bắc Kạn", "Hà Giang", "Lào Cai", "Sa Pa", "Yên Bái", "Sơn La", "Điện Biên", "Lai Châu", "Hòa Bình", "Tây Bắc"],
    "Trung": ["Miền Trung", "Thanh Hóa", "Nghệ An", "Hà Tĩnh", "Quảng Bình", "Quảng Trị", "Huế", "Đà Nẵng", "Quảng Nam", "Hội An", "Quảng Ngãi", "Bình Định", "Quy Nhơn", "Phú Yên", "Khánh Hòa", "Nha Trang", "Ninh Thuận", "Phan Rang", "Bình Thuận", "Phan Thiết", "Tây Nguyên", "Đà Lạt", "Lâm Đồng", "Gia Lai", "Pleiku", "Đắk Lắk", "Buôn Ma Thuột", "Kon Tum"],
    "Nam": ["Miền Nam", "Sài Gòn", "Miền Tây", "Cần Thơ", "Sóc Trăng", "Bạc Liêu", "Cà Mau", "An Giang", "Châu Đốc", "Kiên Giang", "Phú Quốc", "Rạch Giá", "Bến Tre", "Tiền Giang", "Mỹ Tho", "Vĩnh Long", "Trà Vinh", "Đồng Tháp", "Sa Đéc", "Long An", "Tây Ninh", "Trảng Bàng", "Bình Dương", "Đồng Nai", "Biên Hòa", "Vũng Tàu", "Bà Rịa", "Hậu Giang", "Củ Chi", "Côn Đảo"],
    "Cả nước": ["Cả nước"],
  };
  const mienOf = v => Object.keys(MIEN).find(m => MIEN[m].includes(v));

  const byAm = {}, byBua = {}, byLoai = {}, byMien = {}, names = new Map();
  D.forEach((d, i) => {
    if (!d || typeof d !== "object") { errors.push(`dishes[${i}]: không phải object`); return; }
    const at = `dishes[${i}] "${d.ten}"`;
    for (const f of ["ten", "goc", "am_thuc", "vung", "loai", "mo_ta"]) {
      if (typeof d[f] !== "string") errors.push(`${at}: thiếu trường ${f}`);
      else if (d[f] !== d[f].trim() || /\s{2,}/.test(d[f])) errors.push(`${at}: trường ${f} thừa khoảng trắng`);
      else if (d[f] !== d[f].normalize("NFC")) errors.push(`${at}: trường ${f} chưa chuẩn NFC`);
      else if (f !== "goc" && !d[f]) errors.push(`${at}: trường ${f} để trống`);
    }
    if (d.goc && norm(d.goc) === norm(d.ten || "")) errors.push(`${at}: goc giống ten, hãy để trống`);
    if (!(d.am_thuc in AM_THUC)) errors.push(`${at}: mã am_thuc sai "${d.am_thuc}"`);
    if (!LOAI.includes(d.loai)) errors.push(`${at}: mã loai sai "${d.loai}"`);
    if (!Array.isArray(d.bua) || !d.bua.length) errors.push(`${at}: bua phải là mảng có ít nhất một bữa`);
    else {
      d.bua.forEach(b => { if (!BUA.includes(b)) errors.push(`${at}: mã bua sai "${b}"`); });
      if (new Set(d.bua).size !== d.bua.length) errors.push(`${at}: bua bị lặp`);
    }
    if (typeof d.mo_ta === "string" && d.mo_ta) {
      const w = words(d.mo_ta);
      if (w > 25) errors.push(`${at}: mo_ta ${w} từ, quá 25`);
      if (w < 12) errors.push(`${at}: mo_ta ${w} từ, dưới 12`);
      if (!/\.$/.test(d.mo_ta)) errors.push(`${at}: mo_ta không kết thúc bằng dấu chấm`);
    }
    if (typeof d.ten === "string") {
      const k = norm(d.ten);
      if (names.has(k)) errors.push(`Món trùng tên: "${names.get(k)}" / "${d.ten}" (dishes[${i}])`);
      else names.set(k, d.ten);
    }
    byAm[d.am_thuc] = (byAm[d.am_thuc] || 0) + 1;
    byLoai[d.loai] = (byLoai[d.loai] || 0) + 1;
    (Array.isArray(d.bua) ? d.bua : []).forEach(b => { byBua[b] = (byBua[b] || 0) + 1; });
    if (d.am_thuc === "viet") {
      const m = mienOf(d.vung);
      if (!m) warns.push(`${at}: vùng "${d.vung}" chưa xếp vào miền nào`);
      byMien[m || "?"] = (byMien[m || "?"] || 0) + 1;
    }
  });

  console.log(`Món ăn (dishes.js): ${D.length} món\n`);
  console.log(padE("Nền ẩm thực", 32) + pad("số món", 7) + pad("tối thiểu", 11));
  for (const c in AM_THUC) {
    const [n, min] = AM_THUC[c], have = byAm[c] || 0;
    console.log(padE(`${n} (${c})`, 32) + pad(have, 7) + pad(min, 11) + (have < min ? "   CHƯA ĐẠT" : ""));
    if (have < min) errors.push(`${n}: có ${have} món, cần ít nhất ${min}`);
  }
  console.log("\nTheo bữa: " + BUA.map(b => `${b} ${byBua[b] || 0}`).join(" · "));
  console.log("Theo loại: " + LOAI.map(l => `${l} ${byLoai[l] || 0}`).join(" · "));
  if (byAm.viet) {
    console.log("Món Việt theo miền: " + Object.keys(byMien).map(m => `${m} ${byMien[m]}`).join(" · "));
    for (const m of ["Bắc", "Trung", "Nam"]) {
      if ((byMien[m] || 0) < byAm.viet * 0.28) warns.push(`Món Việt miền ${m}: ${byMien[m] || 0} món, chưa chia đều ba miền`);
    }
  }
  console.log("");
}
