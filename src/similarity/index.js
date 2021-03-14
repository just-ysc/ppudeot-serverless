'use strict';
const AWS = require('aws-sdk');
const parser = require('lambda-multipart-parser');
const mysql = require('mysql2');
const compareImages = require('resemblejs/compareImages');
const axios = require('axios').default;
const fs = require('fs');
const util = require('util');

const tableName = 'alarms';

async function getImgDiff(file1, file2) {
  //use readFile if you use file system for reading image data
  const readFile = util.promisify(fs.readFile);
  try {
    const options = {
      ignore: "antialiasing"
    }
    //file1, file2: image buffer
    const result = await compareImages(file1, file2, options);
    const similarity = 100 - result.rawMisMatchPercentage;
    return similarity;
  } catch(err) {
    console.log(err);
    throw err;
  }
}

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

module.exports.postCmpImg = async (event) => {
  try {
    const result = await parser.parse(event);
    if (!result || result.files.length === 0 || !result.files[0].content || !result.alarmId || !result.userId) {
      return createResponse(400, {
        message: "Malformed Body",
      })
    }
    const file1 = result.files[0].content;
    const alarmId = result.alarmId;
    const userId = result.userId;

    var connection = await promisePool.getConnection();
    const query = `SELECT image_url FROM ${tableName} WHERE id=${alarmId}`;
    var [rows, fields] = await connection.query(query);
    if (rows.length === 0) {
      return createResponse(404, {
        message: "No matching alarm with that alarmId",
      })
    }
    const regImgUrl = rows[0].image_url;

    const axiosResult = await axios.get(regImgUrl, {
      responseType: 'arraybuffer',
    });
    const file2 = axiosResult.data;

    var similarity = await getImgDiff(file1, file2);
        
  } catch(err) {
    console.log(err);
    console.log(event);
    return createResponse(400, err);
  } finally {
    if (connection) {
      connection.release();
    }
  }
  return createResponse(200, {
    similarity: similarity,
  })
};