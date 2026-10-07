// Build script: merges data/prices.json and data/gallery.json into src/index.html
// and copies everything to dist/ for Netlify to publish. No external dependencies.
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');
const DATA = path.join(ROOT, 'data');

const prices = JSON.parse(fs.readFileSync(path.join(DATA, 'prices.json'), 'utf8'));
// gallery.json is a { items: [...] } object (not a bare array) — Pages CMS edits
// a "file" content type with one repeatable ("list") field, which needs a root key.
const gallery = JSON.parse(fs.readFileSync(path.join(DATA, 'gallery.json'), 'utf8')).items;

let html = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');

// ---------- small helpers ----------

// Replace the text between <!--BUILD:NAME--> ... <!--/BUILD:NAME--> with a plain
// value. The markers themselves are dropped from the output — they only need to
// survive in src/index.html (which build.js reads fresh every run, and never writes to).
function replaceHtmlMarker(str, name, value) {
  const re = new RegExp('<!--BUILD:' + name + '-->[\\s\\S]*?<!--\\/BUILD:' + name + '-->');
  if (!re.test(str)) throw new Error('Marker not found: ' + name);
  return str.replace(re, value);
}

// Same, for /*BUILD:NAME*/ ... /*/BUILD:NAME*/ (CSS comment markers)
function replaceCssMarker(str, name, value) {
  const re = new RegExp('/\\*BUILD:' + name + '\\*/[\\s\\S]*?/\\*\\/BUILD:' + name + '\\*/');
  if (!re.test(str)) throw new Error('CSS marker not found: ' + name);
  return str.replace(re, value);
}

// Replace the content of a whole block between its own start/end markers (markers dropped from output)
function replaceBlockMarker(str, name, newInnerHtml) {
  const re = new RegExp('<!--BUILD:' + name + '_START-->[\\s\\S]*?<!--BUILD:' + name + '_END-->');
  if (!re.test(str)) throw new Error('Block marker not found: ' + name);
  return str.replace(re, newInnerHtml);
}

function replaceCssBlockMarker(str, name, newInnerCss) {
  const re = new RegExp('/\\*BUILD:' + name + '_START\\*/[\\s\\S]*?/\\*BUILD:' + name + '_END\\*/');
  if (!re.test(str)) throw new Error('CSS block marker not found: ' + name);
  return str.replace(re, newInnerCss);
}

// Replace text content of the first element whose opening tag contains id="ID"
function setTextById(str, id, text) {
  const re = new RegExp('(<[^>]+id="' + id + '"[^>]*>)([^<]*)(<)');
  if (!re.test(str)) throw new Error('Element id not found: ' + id);
  return str.replace(re, '$1' + text + '$3');
}

// Replace an attribute's value on the element whose opening tag contains id="ID"
function setAttrById(str, id, attr, value) {
  const re = new RegExp('(<[^>]*id="' + id + '"[^>]*' + attr + '=")[^"]*(")');
  if (!re.test(str)) throw new Error('Attribute not found for id ' + id + ': ' + attr);
  return str.replace(re, '$1' + value + '$2');
}

// Replace the single-quoted argument inside onclick="selectPlan('...')" on the element with id="ID"
function setSelectPlanArgById(str, id, value) {
  const re = new RegExp("(<[^>]*id=\"" + id + "\"[^>]*onclick=\"selectPlan\\(')[^']*('\\))");
  if (!re.test(str)) throw new Error('selectPlan button not found for id: ' + id);
  return str.replace(re, '$1' + value + '$2');
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ---------- 1. Prices ----------

const PRICE_META = [
  { id: 'standard', kind: 'plan', ampSpanId: 'price-standard-amount', nameSpanId: 'tl-pr-std', descSpanId: 'tl-pr-std-note', cbId: 'plan-cb-standard', btnId: 'btn-order-standard', tKeyName: 'pr_std', tKeyDesc: 'pr_std_note', formPlanIndex: 1 },
  { id: 'pro', kind: 'plan', ampSpanId: 'price-pro-amount', nameSpanId: 'tl-pr-pro', descSpanId: 'tl-pr-pro-note', cbId: 'plan-cb-pro', btnId: 'btn-order-pro', tKeyName: 'pr_pro', tKeyDesc: 'pr_pro_note', formPlanIndex: 2 },
  { id: 'seo', kind: 'addon', ampSpanId: 'price-seo-amount', nameSpanId: 'tl-sup1-t', descSpanId: null, cbId: 'plan-cb-seo', btnId: 'btn-addon-seo', tKeyName: 'sup1_t', tKeyDesc: null, formPlanIndex: 3 },
  { id: 'speed', kind: 'addon', ampSpanId: 'price-speed-amount', nameSpanId: 'tl-sup2-t', descSpanId: null, cbId: 'plan-cb-speed', btnId: 'btn-addon-speed', tKeyName: 'sup2_t', tKeyDesc: null, formPlanIndex: 4 },
  { id: 'support', kind: 'addon', ampSpanId: 'price-support-amount', nameSpanId: 'tl-sup3-t', descSpanId: null, cbId: 'plan-cb-support', btnId: 'btn-addon-support', tKeyName: 'sup3_t', tKeyDesc: null, formPlanIndex: 5 },
  { id: 'bundle', kind: 'bundle', ampSpanId: 'price-bundle-amount', nameSpanId: 'tl-sup4-t', descSpanId: 'tl-sup4-save', cbId: 'plan-cb-bundle', btnId: 'btn-order-bundle', tKeyName: 'sup4_t', tKeyDesc: 'sup4_save', formPlanIndex: 6 }
];

function composeLabel(meta, item, lang) {
  const name = lang === 'uk' ? item.name_uk : item.name_en;
  const price = item.price;
  if (meta.kind === 'addon') {
    const prefix = lang === 'uk' ? 'Опція: ' : 'Option: ';
    return prefix + name + ' — ' + price + '€';
  }
  return name + ' — ' + price + '€';
}

// 1a. meta description + og:description ("Тарифи від 100€") and Schema.org offers
html = html.replace(/Тарифи від \d+€/g, 'Тарифи від ' + prices.standard.price + '€');
html = replaceHtmlMarker(html, 'SCHEMA_PRICE_STANDARD', prices.standard.price);
html = replaceHtmlMarker(html, 'SCHEMA_PRICE_PRO', prices.pro.price);

// 1b. static (Ukrainian, default-rendered) amounts / names / descriptions + checkbox values + onclick args
for (const meta of PRICE_META) {
  const item = prices[meta.id];
  html = setTextById(html, meta.ampSpanId, item.price + '€');
  html = setTextById(html, meta.nameSpanId, item.name_uk);
  if (meta.descSpanId && item.description_uk) {
    html = setTextById(html, meta.descSpanId, item.description_uk);
  }
  const labelUk = composeLabel(meta, item, 'uk');
  html = setAttrById(html, meta.cbId, 'value', labelUk);
  html = setSelectPlanArgById(html, meta.btnId, labelUk);
}

// 1c. the bilingual T.uk / T.en translation object (scoped, so same key names
//     in both languages don't clash with each other's values)
function updateI18nSlice(str, startMarker, endMarker, lang) {
  const re = new RegExp('(' + startMarker + ')([\\s\\S]*?)(' + endMarker + ')');
  const m = str.match(re);
  if (!m) throw new Error('i18n slice not found: ' + startMarker);
  let slice = m[2]; // markers (m[1]/m[3]) are intentionally dropped from the output below
  for (const meta of PRICE_META) {
    const item = prices[meta.id];
    const nameVal = lang === 'uk' ? item.name_uk : item.name_en;
    slice = slice.replace(new RegExp(meta.tKeyName + ":'[^']*'"), meta.tKeyName + ":'" + nameVal.replace(/'/g, "\\'") + "'");
    if (meta.tKeyDesc) {
      const descVal = lang === 'uk' ? item.description_uk : item.description_en;
      slice = slice.replace(new RegExp(meta.tKeyDesc + ":'[^']*'"), meta.tKeyDesc + ":'" + descVal.replace(/'/g, "\\'") + "'");
    }
    const label = composeLabel(meta, item, lang);
    const formKey = 'form_plan_' + meta.formPlanIndex;
    slice = slice.replace(new RegExp(formKey + ":'[^']*'"), formKey + ":'" + label.replace(/'/g, "\\'") + "'");
  }
  return str.replace(re, slice);
}

html = updateI18nSlice(html, '/\\*BUILD:I18N_UK_START\\*/', '/\\*BUILD:I18N_UK_END\\*/', 'uk');
html = updateI18nSlice(html, '/\\*BUILD:I18N_EN_START\\*/', '/\\*BUILD:I18N_EN_END\\*/', 'en');

// ---------- 2. Gallery / portfolio ----------

const n = gallery.length;

function galleryItemHtml(item, index) {
  const num = index + 1;
  const numPad = String(num).padStart(2, '0');
  const totalPad = String(n).padStart(2, '0');
  const dots = Array.from({ length: n }, (_, i) => i === index ? '<span class="pdn-active"></span>' : '<span></span>').join('');
  const loading = index === 0 ? 'eager' : 'lazy';
  return (
    '<!-- Stack ' + num + ' — ' + escapeHtml(item.title_uk) + ' -->\n' +
    '<div class="port-stack-item">\n' +
    '<div class="port-stack-card">\n' +
    '<div class="port-split-info">\n' +
    '<div class="port-deco-num">' + numPad + '</div>\n' +
    '<div class="port-info-content">\n' +
    '<span class="port-info-num">' + numPad + ' / ' + totalPad + '</span>\n' +
    '<span class="port-info-cat" data-uk="' + escapeHtml(item.category_uk) + '" data-en="' + escapeHtml(item.category_en) + '">' + escapeHtml(item.category_uk) + '</span>\n' +
    '<p class="port-info-title" data-uk="' + escapeHtml(item.title_uk) + '" data-en="' + escapeHtml(item.title_en) + '">' + escapeHtml(item.title_uk) + '</p>\n' +
    '<a href="' + escapeHtml(item.link) + '" target="_blank" rel="noopener" class="port-info-visit"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg><span class="port-visit-text">Відкрити сайт</span></a>\n' +
    '</div>\n' +
    '</div>\n' +
    '<div class="port-split-photo"><img src="' + escapeHtml(item.image) + '" alt="' + escapeHtml(item.alt_uk) + '" data-alt-uk="' + escapeHtml(item.alt_uk) + '" data-alt-en="' + escapeHtml(item.alt_en) + '" loading="' + loading + '"></div>\n' +
    '<div class="port-dots-nav">' + dots + '</div>\n' +
    '</div>\n' +
    '</div>\n'
  );
}

const galleryHtml = gallery.map(galleryItemHtml).join('\n');
html = replaceBlockMarker(html, 'GALLERY_ITEMS', galleryHtml);
html = replaceCssMarker(html, 'GALLERY_COUNT', n);

const zIndexCss = Array.from({ length: n }, (_, i) => '.port-stack-item:nth-child(' + (i + 1) + '){z-index:' + (i + 1) + ';}').join('\n');
html = replaceCssBlockMarker(html, 'GALLERY_ZINDEX', zIndexCss);

// ---------- 3. Reviews ----------
// Entirely optional: if there are no review photos yet, the whole section
// and its nav links are removed from the page rather than shown empty.

const reviews = JSON.parse(fs.readFileSync(path.join(DATA, 'reviews.json'), 'utf8')).photos || [];

function reviewItemHtml(src, index) {
  const altUk = 'Відгук клієнта ' + (index + 1);
  const altEn = 'Client review ' + (index + 1);
  return '<a href="javascript:void(0)" class="reviews-item" onclick="openLightbox(\'' + escapeHtml(src) + '\',\'' + altUk.replace(/'/g, "\\'") + '\')"><img src="' + escapeHtml(src) + '" alt="' + escapeHtml(altUk) + '" data-alt-uk="' + escapeHtml(altUk) + '" data-alt-en="' + escapeHtml(altEn) + '" loading="lazy"></a>';
}

if (reviews.length > 0) {
  const reviewsHtml = reviews.map(reviewItemHtml).join('\n');
  html = replaceBlockMarker(html, 'REVIEWS_SECTION', '<!-- REVIEWS -->\n<section id="reviews" class="py-24 md:py-32 px-6 max-w-6xl mx-auto">\n<div class="text-center mb-16">\n<p class="section-label reveal"><span id="tl-rev-label">— Відгуки</span></p>\n<h2 class="font-display text-4xl md:text-5xl font-semibold leading-tight reveal reveal-delay-1"><span id="tl-rev-h2">Що кажуть клієнти</span></h2>\n</div>\n<div class="reviews-grid reveal">\n' + reviewsHtml + '\n</div>\n</section>\n<hr class="divider max-w-6xl mx-auto" />');
  html = replaceBlockMarker(html, 'REVIEWS_NAV_DESKTOP', '<a href="#reviews" class="nav-link"><span id="tl-nav-reviews">Відгуки</span></a>');
  html = replaceBlockMarker(html, 'REVIEWS_NAV_MOBILE', '<a href="#reviews" onclick="toggleMenu()" class="text-2xl font-display font-medium py-3 border-b border-ink/10 block"><span id="tl-mob-reviews">Відгуки</span></a>');
  html = replaceBlockMarker(html, 'REVIEWS_NAV_FOOTER', '<a href="#reviews" class="nav-link text-sm"><span id="tl-foot-link-reviews">Відгуки</span></a>');
} else {
  html = replaceBlockMarker(html, 'REVIEWS_SECTION', '');
  html = replaceBlockMarker(html, 'REVIEWS_NAV_DESKTOP', '');
  html = replaceBlockMarker(html, 'REVIEWS_NAV_MOBILE', '');
  html = replaceBlockMarker(html, 'REVIEWS_NAV_FOOTER', '');
}

// ---------- 4. Write dist/ ----------

function copyRecursive(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const s = path.join(srcDir, entry.name);
    const d = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

fs.mkdirSync(DIST, { recursive: true });

// copy every file from src/ as-is (images, CSS, robots.txt, sitemap.xml, CNAME, etc.)
copyRecursive(SRC, DIST);

// overwrite index.html with the merged version
fs.writeFileSync(path.join(DIST, 'index.html'), html, 'utf8');

console.log('Build complete: dist/ written (' + n + ' gallery items, ' + Object.keys(prices).length + ' price entries, ' + reviews.length + ' review photos).');
