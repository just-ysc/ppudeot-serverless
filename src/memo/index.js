'use strict';
const mysql = require('mysql2');

const tableName = 'memos';
const VISIBLE_STATUS = 0;
const INVISIBLE_STATUS = 1;

const createResponse = (status, body) => ({
  statusCode: status,
  body: JSON.stringify(body),
});

const mysqlPool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  connectionLimit: 60
});
const promisePool = mysqlPool.promise();

module.exports.createMemo = async (event) => {
  const body = JSON.parse(Buffer.from(event.body, 'base64').toString());
  if (!body || !body.userId || !body.title || !body.dueDate) {
    return createResponse(400, {
      message: "Some Data of Request Body is Missing(Or There's no request body at all)"
    })
  }
  const userId = body.userId;
  const title = body.title;
  const dueDate = body.dueDate;

  try {
    var connection = await promisePool.getConnection();
    const query = `INSERT INTO ${tableName} (user_id, title, due_date) VALUES (${userId}, "${title}", "${dueDate}")`;
    var [rows, fields] = await connection.query(query);
  } catch(err) {
    console.log(err);
    return createResponse(500, err);
  } finally {
    if (connection) {
      connection.release();
    }
  }

  return createResponse(201, {
    memoId: rows.insertId,
  });
}

module.exports.getMemo = async (event) => {
  const userId = event.pathParameters.userId;
  const memoId = event.pathParameters.memoId;

  try {
    var connection = await promisePool.getConnection();
    const query = `SELECT * FROM ${tableName} WHERE id=${memoId} AND status=${VISIBLE_STATUS}`;
    var [rows, fields] = await connection.query(query);
  } catch(err) {
    console.log(err);
    return createResponse(500, err);
  } finally {
    if (connection) {
      connection.release();
    }
  }
  ///////////////////////////////////////////
  if (rows.length === 0) {
    return createResponse(404, {
      message: "There are no memos with that memoId",
    })
  }
  //This part should be applied to getAlarm, too!
  ///////////////////////////////////////////
  return createResponse(200, {
    memo: rows[0],
  });
}

module.exports.getUserMemos = async (event) => {
  const userId = event.pathParameters.userId;

  try {
    var connection = await promisePool.getConnection();
    const query = `SELECT * FROM ${tableName} WHERE user_id=${userId} AND status=${VISIBLE_STATUS}`;
    var [rows, fields] = await connection.query(query);
  } catch(err) {
    console.log(err);
    return createResponse(500, err);
  } finally {
    if (connection) {
      connection.release();
    }
  }

  return createResponse(200, {
    memos: rows,
  });
}

module.exports.getMemos = async (event) => {
  try {
    var connection = await promisePool.getConnection();
    const query = `SELECT * FROM ${tableName} WHERE status=${VISIBLE_STATUS}`;
    var [rows, fields] = await connection.query(query);
  } catch(err) {
    console.log(err);
    return createResponse(500, err);
  } finally {
    if (connection) {
      connection.release();
    }
  }
  
  return createResponse(200, {
    memos: rows,
  });
}

module.exports.updateMemoStatus = async (event) => {
  const body = JSON.parse(Buffer.from(event.body, 'base64').toString());
  const userId = event.pathParameters.userId;
  const memoId = event.pathParameters.memoId;

  if (!body || body.status === null || body.status === undefined) {
    return createResponse(400, {
      message: "Malformed body data",
    });
  }
  const status = body.status;
  if (body.status !== 0 && body.status !== 1) {
    return createResponse(400, {
      message: "status should be 0 or 1",
    });
  }
  try {
    var connection = await promisePool.getConnection();
    const query = `UPDATE ${tableName} SET status=${status} WHERE id=${memoId}`;
    var [rows, fields] = await connection.query(query);
  } catch(err) {
    console.log(err);
    return createResponse(500, err);
  } finally {
    if (connection) {
      connection.release();
    }
  }

  var isChanged = rows.affectedRows > 0 ? true : false;
  return createResponse(200, {
    isChanged: isChanged,
  });
}

module.exports.deleteMemo = async (event) => {
  return createResponse(200, {
    message: "This Endpoint is not implemented yet. If you have any idea with this, feel free to talk to highball:)",
  });
}