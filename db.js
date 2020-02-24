const mysql = require('mysql');
const util = require('util');

const con = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root1234',
  database: 'books'
});

exports.query = async function query(q) {
  const query = util.promisify(con.query).bind(con);
  const result = await query(q);
  return result;
}