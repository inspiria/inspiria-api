const mysql = require('mysql');
const util = require('util');
const admZip = require('adm-zip');
const fs = require('fs');
const { promisify } = require('util');


const con = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root1234',
  database: 'books_full'
});

exports.jsonBook = async function jsonBook(bookId, full = true) {
  const query = util.promisify(con.query).bind(con);

  con.connect((err) => { if (err) { console.log('Error connecting to DB'); } });

  const rows = await query(`SELECT chapter_id, book_id, title, language_id, short_name, order_number, text, text_processed, citation, section_header, show_number, section_headers FROM chapters WHERE book_id = ${bookId};`);

  if (rows.length == 0) {
    throw "Book not found";
  }
  
  const chapters = rows.map(row => {
    let chapter = {}
    chapter["id"] = row.chapter_id;
    chapter["bookId"] = row.book_id;
    chapter["title"] = row.title;
    chapter["language"] = row.language_id;
    chapter["shortName"] = row.short_name;
    chapter["order"] = row.order_number;
    chapter["citation"] = row.citation;
    chapter["sectionHeader"] = row.section_header;
    chapter["showNumber"] = row.show_number;
    chapter["text"] = full ? row.text : "Text";
    chapter["textProcessed"] = full ? row.text_processed : "Text processed";
    chapter["sectionHeaders"] = row.section_headers;
    return chapter;
  });

  chapters.sort(function(a, b) {
    if (a.order < b.order) { return -1; }
    if (a.order > b.order) { return 1; }

    if (a.short_name < b.short_name) { return -1; }
    if (a.short_name > b.short_name) { return 1; }
    return 0;
  });
  return chapters;
}

async function exportBook(book, path) {
  let data = JSON.stringify(book);
  let filePath = `${path}/book.json`;
  let zipPath = `${path}/book.zip`;
  
  fs.mkdirSync(path, { recursive: true });
  fs.writeFileSync(filePath, data);

  var zip = new admZip();
  zip.addLocalFile(filePath)
  let writeZip = promisify(zip.writeZip).bind(zip)
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
