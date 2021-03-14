'use strict';
const mysql = require('mysql2');

const tableName = 'users';

const createResponse = (status, body) => ({
  statusCode: status,
  body: JSON.stringify(body),
})

const mysqlPool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  connectionLimit: 60
})

const promisePool = mysqlPool.promise();

module.exports.createUser = async event => {
  const body = JSON.parse(Buffer.from(event.body, 'base64').toString());
  const phoneNumber = body.phoneNumber;
  const nickname = body.nickname;

  const phoneNumRegex = new RegExp(/^[0-9]{3}[-]+[0-9]{4}[-]+[0-9]{4}$/);
  var customError = {
    message: "",
  };

  if (!phoneNumber || !phoneNumRegex.test(phoneNumber)) {
    customError.message = "The phoneNumber is malformed.";
    return createResponse(403, customError);
  }
  if (!nickname) {
    customError.message = "The nickname is malformed.";
    return createResponse(403, customError);
  }
  try {
    const connection = await promisePool.getConnection();
    const query = `INSERT INTO ${tableName} (nickname, phone_number) VALUES ("${nickname}", "${phoneNumber}")`;
    try {
      var [rows, fields] = await connection.query(query);
    } catch (err) {
      console.log(err);
      // throw err;
      //inform that there's problem when processing the query
      return createResponse(400, {
        message: err.message,
      });
    } finally {
      connection.release();
    }
  } catch (err) {
    console.log(err);
    // throw err;
    return createResponse(500, err);
  }
  return createResponse(201, {
    userId: rows.insertId,
  });
}

module.exports.getUsers = async event => {
  try {
    const connection = await promisePool.getConnection();
    const query = `SELECT * FROM ${tableName}`;
    try {
      var [rows, fields] = await connection.query(query);
    } catch(err) {
      console.log(err);
      return createResponse(500, err);
    } finally {
      connection.release();
    }
  } catch(err) {
    console.log(err);
    return createResponse(500, err);
  }
  return createResponse(200, {
    users: rows,
  });
}

module.exports.getUserById = async event => {
  const userId = event.pathParameters.userId;
  try {
    const connection = await promisePool.getConnection();
    const query = `SELECT * FROM ${tableName} WHERE id=${userId}`;
    try {
      var [rows, fields] = await connection.query(query);
    } catch(err) {
      console.log(err);
      return createResponse(500, err);
      // error code validation
    } finally {
      connection.release();
    }
  } catch(err) {
    console.log(err);
    return createResponse(500, err);
  }
  if (rows.length === 0) {
    return createResponse(404, {
      message: "There's no user with that userId",
    })
  }
  return createResponse(200, {
    user: rows,
  });
}

module.exports.getUserByNickname = async event => {
  // const nickname = event.pathParameters.nickname;
  const nickname = decodeURIComponent(event.pathParameters.nickname);
  try {
    const connection = await promisePool.getConnection();
    const query = `SELECT * FROM ${tableName} WHERE nickname="${nickname}"`;
    try {
      var [rows, fields] = await connection.query(query);
    } catch(err) {
      console.log(err);
      return createResponse(500, err);
    } finally {
      connection.release();
    }
  } catch(err) {
    console.log(err);
    createResponse(500, err);
  }
  if (rows.length === 0) {
    return createResponse(404, {
      message: `There's no user with that nickname(${nickname})`,
    });
  }
  return createResponse(200, {
    user: rows,
  });
}

module.exports.updateUser = async event => {
  return createResponse(400, {
    message: "This API has not been implemented yet because this was about to support update points of a user",
  });
}

module.exports.deleteUser = async event => {
  const userId = event.pathParameters.userId;
  try {
    const connection = await promisePool.getConnection();
    const query = `DELETE FROM ${tableName} WHERE id=${userId}`;
    try {
      var [rows, fields] = await connection.query(query);
    } catch(err) {
      console.log(err);
      return createResponse(500, err);
    } finally {
      connection.release();
    }
  } catch(err) {
    console.log(err);
    return createResponse(500, err);
  }
  var isDeleted = false;
  if (rows.affectedRows > 0) {
    isDeleted = true;
  }
  return createResponse(200, {
    isDeleted: isDeleted,
  })
}