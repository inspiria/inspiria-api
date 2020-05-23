const util = require('util');
const request = require('request');

exports.getBooksList = async function getBooksList() {
  const requestSync = util.promisify(request);
  let result = await requestSync(`https://edtechbooks.org/api.php?action=search_books`);
  if (result.statusCode == 200) {
    var data = Object.values(JSON.parse(result.body)["books"]);
    data = await Promise.all(data.map(async row => {
      row["data"] = await getBook(row[`short_name`]);
      return row;
    }));
    return data;
  }
}

async function getBook(short_name) {
  const requestSync = util.promisify(request);
  let result = await requestSync(`https://edtechbooks.org/api.php?book=${short_name}`);
  if (result.statusCode == 200) {
    var data = JSON.parse(result.body)["book"];
    data = await Promise.all(data.map(async row => {
      row["chapter_briefs"] = await getBook(row[`short_name`]);
      return row;
    }));
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
