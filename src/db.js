const mysql = require('mysql');
const util = require('util');

const con = mysql.createConnection({
  host: process.env.TREADER_API_MYSQL_HOST,
  user: process.env.TREADER_API_MYSQL_USER,
  password: process.env.TREADER_API_MYSQL_PASSWORD,
  database: process.env.TREADER_API_MYSQL_DATABASE,
});

exports.query = async function query(q) {
  const query = util.promisify(con.query).bind(con);
  const result = await query(q);
  return result;
}