const admZip = require('adm-zip');
const fs = require('fs');
const db = require('./db');
const books = require('./booksList');
const util = require('util');

exports.jsonBook = async function jsonBook(bookId, full = true) {
  const book = {};
  const list = await books.get(bookId);
  const info = list[0];
  
  const q = `SELECT \
  chapter_id,\
  title,\
  language_id,\
  short_name,\
  order_number,\
  text,\
  text_processed,\
  citation,\
  section_header,\
  show_number,\
  section_headers\
  FROM chapters WHERE book_id = ${bookId};`

  const chaptersRows = await db.query(q);

  if (chaptersRows.length == 0 && info == undefined) {
    throw "Book not found";
  }

  book["info"] = info;
  book["chapters"] = chaptersRows.map(row => {
    let chapter = {}
    chapter["id"]             = row.chapter_id;
    chapter["title"]          = row.title;
    chapter["language"]       = row.language_id;
    chapter["shortName"]      = row.short_name;
    chapter["order"]          = row.order_number;
    chapter["citation"]       = row.citation;
    chapter["sectionHeader"]  = row.section_header;
    chapter["showNumber"]     = row.show_number;
    chapter["text"]           = full ? row.text : undefined;
    chapter["textProcessed"]  = full ? row.text_processed : undefined;
    chapter["sectionHeaders"] = full ? row.section_headers : undefined;
    return chapter;
  });

  book["chapters"].sort(function (a, b) {
    if (a.order < b.order) { return -1; }
    if (a.order > b.order) { return 1; }
    if (a.short_name < b.short_name) { return -1; }
    if (a.short_name > b.short_name) { return 1; }
    return 0;
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
