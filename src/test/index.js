'use strict';
// const AWS = require('aws-sdk');
const mysql = require('mysql2');

const mysqlPool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  connectionLimit: 60,
})

const promisePool = mysqlPool.promise();

const createResponse = (status, body) => ({
  statusCode: status,
  body: JSON.stringify(body),
});

module.exports.testHandler = async event => {
  const body = JSON.parse(Buffer.from(event.body, 'base64').toString());
  let nickname = body.nickname;
  return createResponse(200, {
    nickname: nickname,
  });
}