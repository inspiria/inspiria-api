const express = require('express')
const books = require('./books');

const app = express()
const port = 3000

app.get('/', async function (req, res) {
  res.send('OK');
})

app.get('/books.js', async function (req, res) {
  let list = await books.createList();
  let json = JSON.stringify(list);
  res.send(json);
})

app.listen(port, () => console.log(`Example app listening on port ${port}!`))