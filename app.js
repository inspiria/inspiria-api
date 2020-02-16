const express = require('express')
const books = require('./booksList');
const book = require('./book');

const app = express()
const port = 3000

app.get('/', async function (req, res) {
  res.send('OK');
})

app.get('/books', async function (req, res) {
  let list = await books.getList();
  res.json(list);
})

app.get('/book/:bookId', async function (req, res) {
  try {
    const id = req.params.bookId;
    const result = await book.get(id);
    return res.send(result);
  } catch(e) {
    return res.status(404).send(e);
  }
})

app.listen(port, () => console.log(`Example app listening on port ${port}!`))