const express = require('express');
const path = require('path');
const books = require('./booksList');
const book = require('./book');

const app = express();
const port = 8080;

app.get('/', async function (req, res) {
  res.send('OK');
})

app.get('/books', async function (req, res) {
  let list = await books.get();
  res.json(list);
})

app.get('/book/:bookId', async function (req, res) {
  try {
    const id = req.params.bookId;
    const bookPath = book.getBook(id);
    let filePath = path.join(__dirname, bookPath);
    return res.sendFile(filePath);
  } catch(e) {
    return res.status(404).send(e);
  }
})

//generate all the books
app.get('/generate', async function (req, res) {
    let list = await books.get();
    let result = {
      "download": [],
      "failed": []
    };

    list.forEach(element =>  {
      const id = element["id"];
      console.log(id);
      try {
        result["download"].push(id);
        book.generateBook(id);
      } catch(e) {
        result["failed"].push({"id": id, "reason": e.toString()});
      }
    });

    return res.json(result);
})

app.get('/status', async function (req, res) {
  let list = await books.get();
  var result = [];
  list.forEach(element =>  {
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

//for testing purposes only
app.get('/book-json/:bookId', async function (req, res) {
  try {
    const id = req.params.bookId;
    const result = await book.jsonBook(id, false);
    return res.json(result);
  } catch(e) {
    return res.status(404).send(e);
  }
})

app.listen(port, () => console.log(`Example app listening on port ${port}!`))