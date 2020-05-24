const util = require('util');
const request = require('request');
const fs = require('fs');

const books_path = `generated_books/`;
const books_file = `${books_path}books_list.json`;

exports.generate = async function generate() {
  const requestSync = util.promisify(request);
  let result = await requestSync(`https://edtechbooks.org/api.php?action=search_books`);
  if (result.statusCode != 200) { throw "Failed to connect to edtechbooks.org API" }
  let data = Object.values(JSON.parse(result.body)["books"]);
  let list = await Promise.all(data.map(async row => {
    var book = {};
    book.id = row.book_id;
    book.title = row.title;
    book.subtitle = row.subtitle;
    book.version = `${row.major_version}.` + `${row.minor_version}`
    book.coverImageUrl = "https://edtechbooks.org/book_cover_images/" + row.cover_image_md;
    return book;
  }));

  let str = JSON.stringify(list);
  fs.mkdirSync(books_path, { recursive: true });
  fs.writeFileSync(books_file, str, 'utf8');
}

exports.getBooksList = async function getBooksList() {
  let data = fs.readFileSync(books_file);
  let list = JSON.parse(data);
  return list;
}

async function getBook(short_name) {
  const requestSync = util.promisify(request);
  let result = await requestSync(`https://edtechbooks.org/api.php?book=${short_name}`);
  if (result.statusCode == 200) {
    var data = JSON.parse(result.body)["book"];
    // data = await Promise.all(data.map(async row => {
    //   row["chapter_briefs"] = await getBook(row[`short_name`]);
    //   return row;
    // }));
    return data;
  }
}

async function getChapter(book, chapter) {
  const requestSync = util.promisify(request);
  let result = await requestSync(`https://edtechbooks.org/api.php?book=${short_name}&chapter=${chapter}`);
  if (result.statusCode == 200) {
    var data = JSON.parse(result.body)["chapter"];
    console.log(data)
    return data;
  }
}
