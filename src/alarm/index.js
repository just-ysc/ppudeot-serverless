'use strict';
const mysql = require('mysql2');

const tableName = 'alarms';
const VISIBLE_STATUS = 0;
const INVISIBLE_STATUS = 1;

const mysqlPool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  connectionLimit: 60
});
const promisePool = mysqlPool.promise();

const createResponse = (status, body) => ({
  statusCode: status,
  body: JSON.stringify(body),
});

module.exports.createAlarm = async (event) => {
  const body = JSON.parse(Buffer.from(event.body, 'base64').toString());
  if (!body) {
    return createResponse(400, {
      message: "No Body in your Request",
    })
  }

  if(!body.userId || !body.title || body.authByImage === null || body.authByImage === undefined || !body.dueDateTime) {
    return createResponse(400, {
      message: "Some Data of Request Body is Missing",
    });
  }
  const userId = body.userId;
  const title = body.title;
  const authByImage = body.authByImage;
  const dueDateTime = body.dueDateTime;

  try {
    var connection = await promisePool.getConnection();
    const query = `INSERT INTO ${tableName}(user_id, title, auth_by_image, due_datetime) VALUES (${userId}, "${title}", ${authByImage}, "${dueDateTime}")`;
    var [rows, fields] = await connection.query(query);
  } catch(err) {
    console.log(err);
    return createResponse(500, err);
  } finally {
    if(connection) {
      connection.release();
    }
  }

  return createResponse(201, {
    alarmId: rows.insertId,
  });
}

module.exports.getAlarm = async event => {
  const userId = event.pathParameters.userId;
  const alarmId = event.pathParameters.alarmId;

  try {
    var connection = await promisePool.getConnection();
    const query = `SELECT * FROM ${tableName} WHERE id=${alarmId} AND status=${VISIBLE_STATUS}`;
    var [rows, fields] = await connection.query(query);
    if (rows.length === 0) {
      return createResponse(404, {
        message: 'There are no alarms with that alarmId',
      })
    }
  } catch(err) {
    console.log(err);
    return createResponse(500, err);
  } finally {
    if (connection) {
      connection.release();
    }
  }

  return createResponse(200, {
    alarm: rows[0],
  });
}

module.exports.getUserAlarms = async (event) => {
  const userId = event.pathParameters.userId;
  const dueDate = event.queryStringParameters.dueDate;
  
  try {
    var connection = await promisePool.getConnection();
    const query = `SELECT * FROM ${tableName} WHERE user_id=${userId} AND status=${VISIBLE_STATUS} AND DATE_FORMAT(due_datetime, '%Y-%m-%d')="${dueDate}"`;
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
    alarms: rows,
  });
}

module.exports.getAlarms = async event => {
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
    alarms: rows,
  });
}

module.exports.updateAlarm = async event => {
  return createResponse(200, {
    message: "This Endpoint is not implemented yet. If you have any idea with this, feel free to talk to highball:)",
  });
}

module.exports.updateAlarmStatus = async (event) => {
  const body = JSON.parse(Buffer.from(event.body, 'base64').toString());
  const userId = event.pathParameters.userId;
  const alarmId = event.pathParameters.alarmId;
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
    const query = `UPDATE ${tableName} SET status=${status} WHERE id=${alarmId}`;
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

module.exports.postponeAlarm = async (event) => {
  const body = JSON.parse(Buffer.from(event.body, 'base64').toString());
  const alarmId = event.pathParameters.alarmId;
  if (!body || !body.dueDateTime) {
    return createResponse(400, {
      message: "Malformed body data",
    });
  }
  const dueDateTime = body.dueDateTime;

  try {
    var connection = await promisePool.getConnection();
    const query = `UPDATE ${tableName} SET due_datetime="${dueDateTime}" WHERE id=${alarmId}`;
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

module.exports.toggleAlarm = async event => {
  return createResponse(200, {
    message: "This Endpoint is not implemented yet. If you have any idea with this, feel free to talk to highball:)",
  });
}

module.exports.deleteAlarm = async event => {
  return createResponse(200, {
    message: "This Endpoint is replaced by updateAlarmStatus Endpoint. Use that. This works nothing.",
  });
}