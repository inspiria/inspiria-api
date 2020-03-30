const db = require('./db');

exports.getAuthors = async function getAuthors(bookId) {
  const q = `SELECT * FROM book_authorship a1 INNER JOIN authors a2 ON a1.author_id = a2.author_id WHERE book_id = ${bookId} AND shadow_author = 0 ORDER BY cardinality ASC`;
  const rows = await db.query(q);

  if (rows.length == 0) { return []; }

  let authors = rows.map(row => {
    const author = {};
    author["id"]           = row.author_id;
    author["name"]         = row.name;
    author["nameSortable"] = row.name_sortable;
    author["degree"]       = row.degree;
    author["affiliation"]  = row.affiliation;
    author["pictureUrl"]   = row.bio_pic !== null ? `https://edtechbooks.org/author_images/${row.bio_pic}` : null;
    author["pictureName"]  = row.bio_pic;
    author["bio"]          = row.bio;
    return author;
  });

  return authors;
}
