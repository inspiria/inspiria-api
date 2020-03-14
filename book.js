const admZip = require('adm-zip');
const fs = require('fs');
const db = require('./db');
const books = require('./booksList');
const util = require('util');

exports.jsonBook = async function jsonBook(bookId, full = true) {
  const book = {};
  const list = await books.get(bookId);
  const info = list[0];
  
  //        `SELECT chapter_id, book_id, short_name, title, order_number, section_header, show_number, show_pdf, last_updated, copyright_override, published, synchronize, IF(pw="",0,1) AS pw_exists, IF(editor_notes="",0,1) AS editor_notes_exist  FROM chapters WHERE book_id = ? '`
  const q = `SELECT chapter_id, book_id, short_name, title, order_number, section_header, show_number, show_headings, last_updated, copyright_override, published, synchronize, parent_id, language_id, text, citation, section_headers
  FROM chapters WHERE book_id = ${bookId} AND published = 1 ORDER BY order_number ASC, section_header DESC, title ASC`;

  const chaptersRows = await db.query(q);

  if (chaptersRows.length == 0 && info == undefined) {
    throw "Book not found";
  }

  book["info"] = info;
  book["chapters"] = chaptersRows.map(row => {
    let chapter = {}
    chapter["id"]                = row.chapter_id;
    chapter["bookId"]           = row.book_id;
    chapter["shortName"]         = row.short_name;
    chapter["title"]             = row.title;
    chapter["orderNumber"]       = row.order_number;
    chapter["isSectionHeader"]   = Boolean(row.section_header);
    chapter["showNumber"]        = Boolean(row.show_number);
    chapter["showHeadings"]      = Boolean(row.show_headings);
    chapter["lastUpdated"]       = row.last_updated;
    chapter["parentId"]          = row.synchronize == 1 ? row.parent_id : null;
    chapter["copyrightOverride"] = row.copyright_override === "" ? null : row.copyright_override;
    chapter["language"]          = row.language_id;
    chapter["citation"]          = full ? row.citation        : (row.citation == null        ? null : "citation goes here");
    chapter["text"]              = full ? row.text            : (row.text == null            ? null : "text goes here");
    chapter["sectionHeaders"]    = full ? row.section_headers : (row.section_headers == null ? null : "section_headers goes here");
    return chapter;
  });

  return book;
}

async function exportBook(book, path) {
  let data = JSON.stringify(book);
  let filePath = `${path}/book.json`;
  let zipPath = `${path}/book.zip`;

  fs.mkdirSync(path, { recursive: true });
  fs.writeFileSync(filePath, data);

  var zip = new admZip();
  zip.addLocalFile(filePath)
  let writeZip = util.promisify(zip.writeZip).bind(zip)
  await writeZip(zipPath);

  return zipPath;
}

exports.get = async function get(bookId) {
  fs.mkdirSync(`./tmp/`, { recursive: true });
  let path = `.tmp/${bookId}`;
  let book = await this.jsonBook(bookId);
  let result = await exportBook(book, path);
  return result;
}
