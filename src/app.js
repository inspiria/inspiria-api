const express = require('express');
const path = require('path');
const books = require('./etb_books');
const book = require('./etb_book');

const app = express();
const port = 8080;

app.get('/', async function (req, res) {
  res.send('OK');
})

app.get('/books', async function (req, res) {
  try {
    let list = await books.getBooksList();
    res.json(list);
  } catch (e) {
    return res.status(404).send(e);
  }
})

app.get('/book/:bookId', async function (req, res) {
  try {
    const id = req.params.bookId;
    const bookPath = book.getBook(id);
    let filePath = path.join(__dirname, bookPath);
    return res.sendFile(filePath);
  } catch (e) {
    return res.status(404).send(e);
  }
})

//generate all the books
app.get('/generate', async function (req, res) {
  try {
    let result = { "download": [], "failed": [] };
    await books.generate();
    let list = await books.getBooksList();
    list.forEach(element => {
      try {
        result.download.push(element.id);
        book.generateBook(element);
      } catch (e) {
        result.failed.push({ "id": element.id, "reason": e.toString() });
      }
    });

    res.json(result);
  } catch (e) {
    return res.status(404).send(e);
  }
})

app.get('/status', async function (req, res) {
  let list = await books.getBooksList();
  var result = [];
  list.forEach(element => {
    const id = element["id"];
    const title = element["title"];
    const status = book.getBookStatus(id);
    result.push(
      Object.assign({
        "id": id,
        "title": title
      }, status));
  });

  return res.json(result);
})

app.listen(port, () => console.log(`Example app listening on port ${port}!`))