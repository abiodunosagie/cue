// Extracts plain text from a resume/job-description file (PDF or DOCX) so it can be
// dropped into the existing Settings textareas. No OCR — text layer only.
const fs = require('fs');
const path = require('path');

// A gap wider than this share of the font size between two pieces of text on
// one line is a word break. LaTeX and many CV builders place each word (or the
// first and last name) as separate pieces with no space character between them.
const WORD_GAP_RATIO = 0.15;

// Join one line's text pieces, adding a space wherever the PDF left a visible gap.
// items: pdf.js TextItems ({ str, width, transform: [a, b, c, d, x, y] }).
function joinTextItems(items) {
  let text = '';
  let lastY = null;
  let lastEnd = null;
  for (const item of items) {
    const [a, b, , , x, y] = item.transform;
    const fontSize = Math.hypot(a, b) || 10;
    if (lastY !== null && y !== lastY) {
      text += '\n';
    } else if (lastEnd !== null && x - lastEnd > fontSize * WORD_GAP_RATIO && !/\s$/.test(text) && !/^\s/.test(item.str)) {
      text += ' ';
    }
    text += item.str;
    lastY = y;
    lastEnd = x + (item.width || 0);
  }
  return text;
}

// Icon-font bullets land in the Unicode private use area and show as boxes.
function cleanPdfText(text) {
  return text.replace(/^[ \t]*[\uE000-\uF8FF][ \t]*/gm, '- ').replace(/[\uE000-\uF8FF]/g, '').trim();
}

function renderPage(pageData) {
  return pageData.getTextContent({ normalizeWhitespace: false, disableCombineTextItems: false })
    .then((content) => joinTextItems(content.items));
}

async function parseDocumentFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const buf = fs.readFileSync(filePath);
  if (ext === '.pdf') {
    const pdfParse = require('pdf-parse');
    const res = await pdfParse(buf, { pagerender: renderPage });
    return cleanPdfText(res.text || '');
  }
  if (ext === '.docx') {
    const mammoth = require('mammoth');
    const res = await mammoth.extractRawText({ buffer: buf });
    return (res.value || '').trim();
  }
  if (ext === '.txt' || ext === '.md') return buf.toString('utf8').trim();
  throw new Error('Unsupported file type: ' + (ext || '(none)') + '. Use a PDF, DOCX or TXT file.');
}

module.exports = { parseDocumentFile, joinTextItems, cleanPdfText };
