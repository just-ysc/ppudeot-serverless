//LAST MODIFIED: 2020-01-27 21:20

const mysql = require('mysql');
const config = require('./config.json');

const mysqlPool = mysql.createPool({
  host: config.rds.host,
  user: config.rds.user,
  password: config.rds.password,
  database: config.rds.database,
  connectionLimit: 60
});

const createResponse = (status, body) => ({
  statusCode: status,
  body: JSON.stringify(body),
});

exports.handler = function(event, context, callback) {
  context.callbackWaitsForEmptyEventLoop = false;
  // const body = JSON.parse(Buffer.from(event.body, 'base64').toString());
  let body = JSON.parse(event.body);
  /////////////////////////////////////
  //body validator zone;
  const operation = event.httpMethod;
  if (operation !== 'POST') {
    callback(null, createResponse(502, {
      message: "HTTP Request Method is not POST"
    }))
  }
  
  if (!body) {
    callback(null, createResponse(500, {
      message: "Request Has No Body"
    }))
  }
  //callback(null, createResponse(500, JSON.parse(body)));
  //////////////////////////////////////
  // PHONE NUMBER VALIDATION
  // const phoneNumRegex = new RegExp(/^[0-9]{3}[-]+[0-9]{4}[-]+[0-9]{4}$/);
  // if (body.phoneNum === null || body.phoneNum === "") {
  //   callback(null, createResponse(500, {
  //     message: "Body Has No phoneNum"
  //   }))
  // }
  
  // if (!phoneNumRegex.test(body.phoneNum)) {
  //   callback(null, createResponse(500, {
  //     message: "Malformed JSON data: phoneNum "
  //   }))
  // }
  //////////////////////////////////////
  if (!body.eventCode) {
    callback(null, createResponse(500, {
      message: "Malformed JSON data: eventCode"
    }))
  }

  if (!body.nickName) {
    callback(null, createResponse(500, {
      message: "Malformed JSON data: nickName"
    }))
  }

  if (!body.apkVersion) {
    callback(null, createResponse(500, {
      message: "Malformed JSON data: apkVersion"
    }))
  }
  /////////////////////////////////////

  mysqlPool.getConnection(function(err, connection) {
    if (err) {
      return console.log(createResponse(500, { message: err }));
    }
    let tableName = 'log';
    let query;

    if (!body.eventContent) {
      query = `INSERT INTO ${tableName} (nickname, event_code, apk_version) VALUES ("${body.nickName}", "${body.eventCode}", "${body.apkVersion}")`;
    } else {
      query = `INSERT INTO ${tableName} (nickname, event_code, apk_version, event_content) VALUES ("${body.nickName}", "${body.eventCode}", "${body.apkVersion}", "${body.eventContent}")`;
    }

    connection.query(query, function(err, results, field) {
      connection.release();
      if (err) {
        return callback(null, createResponse(500, { message: err }));
      }
      callback(null, createResponse(200, {
        message: 'DB Creation Success',
        result: results,
      }));
    })
  })
}