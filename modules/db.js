require('dotenv').config();

const sql = require("mssql");

const server = process.env.AZURE_SQL_SERVER;
const database = process.env.AZURE_SQL_DATABASE;
const port = parseInt(process.env.AZURE_SQL_PORT);
const user = process.env.AZURE_SQL_USER;
const password = process.env.AZURE_SQL_PASSWORD;

const config = {
  server,
  port,
  database,
  user,
  password,
  authentication: {
    type: 'default'
  },

  options: {
    encrypt: true
  }
};

const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log('Connected to MSSQL');
    return pool;
  })
  .catch(err => console.log('Database Connection Failed! Bad Config: ', err));

const query = async (queryString, params) => {
  try {
    const pool = await poolPromise;
    const request = pool.request();

    if (params) {
      for (const key in params) {
        request.input(key, params[key]);
      }
    }

    const result = await request.query(queryString);
    return result.recordset;
  } catch (err) {
    throw new Error(`Error executing query: ${err}`);
  }
};

module.exports = { query };
