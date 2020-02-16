const mysql = require('mysql');
const util = require('util');

const con = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root1234',
  database: 'books'
});

exports.get = async function get(bookId) {

  console.log(`book/${bookId}`);

  const query = util.promisify(con.query).bind(con);

  con.connect((err) => { if (err) { console.log('Error connecting to DB'); } });

  const rows = await query(`SELECT chapter_id, book_id, title, language_id, short_name, order_number, text, text_processed, citation, section_headers FROM chapters WHERE book_id = ${bookId};`);

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
    chapter["text"] = row.text;
    chapter["textProcessed"] = row.text_processed;
    chapter["citation"] = row.citation;
    chapter["sectionHeaders"] = row.section_headers;
    return chapter;
  });
  // con.end();
  return chapters;
}
