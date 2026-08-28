const zlib = require("zlib");
const fs = require("fs");
const { StringDecoder } = require("string_decoder");

function colIndex(letters) {
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function formatNumericText(s) {
  const m = s.match(/^(-?\d+)\.0+$/);
  return m ? m[1] : s;
}

function unescapeXml(s) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function listEntries(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) return [];
  const count = buf.readUInt16LE(eocd + 10);
  const offset = buf.readUInt32LE(eocd + 16);
  const entries = [];
  let p = offset;
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const nlen = buf.readUInt16LE(p + 28);
    const elen = buf.readUInt16LE(p + 30);
    const clen = buf.readUInt16LE(p + 32);
    const name = buf.toString("utf8", p + 46, p + 46 + nlen);
    const lho = buf.readUInt32LE(p + 42);
    const lnlen = buf.readUInt16LE(lho + 26);
    const lelen = buf.readUInt16LE(lho + 28);
    entries.push({ name, method, csize, dataStart: lho + 30 + lnlen + lelen });
    p += 46 + nlen + elen + clen;
  }
  return entries;
}

function parseWorkbook(buf) {
  const entries = listEntries(buf);
  const byName = new Map(entries.map((e) => [e.name, e]));
  const get = (entry) => inflateEntry(buf, byName.get(entry));
  let wb = "";
  let rels = "";
  try { wb = get("xl/workbook.xml") || ""; } catch { wb = ""; }
  try { rels = get("xl/_rels/workbook.xml.rels") || ""; } catch { rels = ""; }
  const rIdToFile = {};
  for (const m of rels.matchAll(/<Relationship[^>]*Id="(rId\d+)"[^>]*Target="([^"]+)"/g)) {
    let t = m[2];
    if (!t.startsWith("/") && !t.startsWith("xl/")) t = "xl/" + t;
    if (!t.startsWith("/") && t.startsWith("xl/")) { /* ok */ }
    if (t.startsWith("/")) t = t.slice(1);
    rIdToFile[m[1]] = t;
  }
  const sheetToFile = {};
  for (const m of wb.matchAll(/<sheet[^>]*name="([^"]+)"[^>]*r:id="(rId\d+)"/g)) {
    const f = rIdToFile[m[2]];
    if (f) sheetToFile[m[1]] = f;
  }
  return { sheetToFile, entries };
}

function inflateEntry(buf, entry) {
  if (!entry) return null;
  const data = buf.slice(entry.dataStart, entry.dataStart + entry.csize);
  if (entry.method === 0) return data.toString("utf8");
  if (entry.method === 8) return zlib.inflateRawSync(data).toString("utf8");
  return null;
}

function parseRowSegment(segment) {
  const rm = segment.match(/\br="(\d+)"/);
  const rowNum = rm ? parseInt(rm[1], 10) : null;
  const cells = [];
  const cellRe = /<c\s+r="([A-Z]{1,3})\d+"[^>]*?(?:\/>|>([\s\S]*?)<\/c>)/g;
  let m;
  while ((m = cellRe.exec(segment))) {
    cells.push({ col: m[1], inner: m[2] || "" });
  }
  return { rowNum, cells };
}

function cellValue(inner) {
  if (!inner) return "";
  if (/<is>/i.test(inner)) {
    const t = inner.match(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/);
    return t ? unescapeXml(t[1]) : "";
  }
  const v = inner.match(/<v>([\s\S]*?)<\/v>/);
  return v ? formatNumericText(unescapeXml(v[1])) : "";
}

async function streamRowsToObject(buf, entry, keyCol) {
  const data = buf.slice(entry.dataStart, entry.dataStart + entry.csize);
  const rows = [];
  let pending = "";
  let headerRow = -1;
  let colMap = null; // letter -> header name
  let headerLetters = [];
  let resolved = false;

  const consume = (text, isLast) => {
    pending += text;
    let start;
    while ((start = pending.indexOf("<row")) !== -1) {
      const endTag = pending.indexOf("</row>", start);
      if (endTag === -1) break;
      const segment = pending.slice(start, endTag);
      pending = pending.slice(endTag + 6);
      handle(segment);
    }
  };

  const handle = (segment) => {
    const { rowNum, cells } = parseRowSegment(segment);
    if (rowNum == null || cells.length === 0) return;
    if (!resolved) {
      const names = {};
      let hasKey = false;
      for (const c of cells) {
        const name = cellValue(c.inner);
        names[c.col] = name;
        if (name === keyCol) hasKey = true;
      }
      if (hasKey) {
        resolved = true;
        headerRow = rowNum;
        colMap = names;
        headerLetters = cells.map((c) => c.col).sort((a, b) => colIndex(a) - colIndex(b));
        return;
      }
      return;
    }
    if (rowNum === headerRow) return;
    const obj = {};
    for (const letter of headerLetters) obj[colMap[letter]] = "";
    for (const c of cells) {
      if (colMap[c.col] !== undefined) obj[colMap[c.col]] = cellValue(c.inner);
    }
    rows.push(obj);
  };

  await new Promise((resolve, reject) => {
    if (entry.method === 0) {
      consume(data.toString("utf8"), true);
      resolve();
    } else if (entry.method === 8) {
      const decoder = new StringDecoder("utf8");
      const inflate = zlib.createInflateRaw();
      inflate.on("data", (chunk) => consume(decoder.write(chunk), false));
      inflate.on("end", () => { consume(decoder.end(), true); resolve(); });
      inflate.on("error", reject);
      inflate.end(data);
    } else {
      reject(new Error("unsupported zip method " + entry.method));
    }
  });

  if (!resolved) return null;
  return { rows, cols: headerLetters.map((l) => colMap[l]), headerRow };
}

async function extractRowsByColumn(filePath, keyCol) {
  const buf = fs.readFileSync(filePath);
  const { entries } = parseWorkbook(buf);
  const worksheets = entries.filter((e) => /^xl\/worksheets\/sheet\d+\.xml$/.test(e.name))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  for (const entry of worksheets) {
    const ext = await streamRowsToObject(buf, entry, keyCol);
    if (ext) {
      return { rows: ext.rows, cols: ext.cols, sheetFile: entry.name };
    }
  }
  return { rows: [], cols: [], sheetFile: null };
}

module.exports = { extractRowsByColumn, listEntries, parseRowSegment, cellValue, colIndex };