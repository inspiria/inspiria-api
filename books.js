const mysql = require('mysql');
const util = require('util');

const con = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root1234',
  database: 'books'
});

exports.createList = async function createList() {

  const query = util.promisify(con.query).bind(con);

  con.connect((err) => { if (err) { console.log('Error connecting to DB'); } });

  const rows = await query('SELECT book_id, title, subtitle, published_year, cover_image_md FROM books');
  const books = rows.map(row => {
    let book = {}
    book["id"] = row.book_id;
    book["title"] = row.title;
    book["subtitle"] = row.subtitle;
    book["year"] = row.published_year;
    book["coverImageUrl"] = "https://edtechbooks.org/book_cover_images/" + row.cover_image_md;
    return book;
  });
  // con.end();
  return books;
}
