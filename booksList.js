const db = require('./db');
const authors = require('./authors');

exports.get = async function get(bookId) {
  var q = `SELECT book_id, title, subtitle, published_year, cover_image_md, major_version, minor_version FROM books WHERE (major_version > 0 or minor_version > 0) AND book_id = 2`
  if (bookId != undefined) {
    q += ` AND book_id = ${bookId};`
  } else {
    q += `;`
  }
  const rows = await db.query(q);
  const books = await Promise.all(rows.map(async row  => {
    let bookId = row.book_id;
    let list = await authors.getAuthors(bookId)
    let author = list.map(a => { return a["name"] }).join(" & ");
    
    let book = {}
    book["id"]            = bookId;
    book["title"]         = row.title;
    book["author"]        = author;
    book["subtitle"]      = row.subtitle;
    book["year"]          = row.published_year;
    book["version"]       = `${row.major_version}.` + `${row.minor_version}`
    book["coverImageUrl"] = "https://edtechbooks.org/book_cover_images/" + row.cover_image_md;
    return book;
  }));
  return books;
}
