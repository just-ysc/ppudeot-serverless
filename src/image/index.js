'use strict';
const AWS = require('aws-sdk');
const parser = require('lambda-multipart-parser');
const mysql = require('mysql2');

const tableName = 'alarms';

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

module.exports.postRegImg = async (event) => {
  try {
    const result = await parser.parse(event);
    if (!result || result.files.length === 0 || !result.files[0].content || !result.alarmId || !result.userId) {
      return createResponse(400, {
        message: "Malformed Body",
        result: result,
      })
    }
    const imageBody = result.files[0].content;
    const alarmId = result.alarmId;
    const userId = result.userId;

    const s3 = new AWS.S3({
      credentials: {
        accessKeyId: process.env.ACCESS_KEY,
        secretAccessKey: process.env.SECRET_ACCESS_KEY
      },
      params: {
        Bucket: 'null-project-image',
      }
    });
    const data = {
      Key: `register/${userId}/${alarmId}.jpg`,
      Body: imageBody,
      ContentEncoding: 'base64',
    };

    const s3Response = await s3.putObject(data).promise();
    const s3url = await s3.getSignedUrl('getObject', {Key: data.Key});
    var urlWithoutCredentials = s3url.split("?")[0];    // Later, if we give credit to the front end and make the bucket non-public, this variable would not be needed(maybe)

    var connection = await promisePool.getConnection();
    const query = `UPDATE ${tableName} SET image_url="${urlWithoutCredentials}" WHERE id=${alarmId}`;
    var [rows, fields] = await connection.query(query);
  } catch(err) {
    err = (err && err !== {}) ? err : { message: "Internal Server Error(Error has No Body)" }
    console.log(err);
    return createResponse(400, {
      err: err,
      request: event,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }

  var isChanged = rows.affectedRows === 0 ? false : true;
  return createResponse(201, {
    isChanged: isChanged,
    url: urlWithoutCredentials,
  });
};

module.exports.getRegImg = async (event) => {
  const userId = event.pathParameters.userId;
  const alarmId = event.pathParameters.alarmId;
  
  try {
    var connection = await promisePool.getConnection();
    const query = `SELECT image_url from ${tableName} WHERE id=${alarmId}`;
    var [rows, fields] = await connection.query(query);
    if (rows.length === 0) {
      return createResponse(400, {
        message: "There's no alarm with that alarmId",
      });
    }
    //validation for 404 Error
    //Example code for now
    if(!rows[0].image_url) {
      return createResponse(404, {
        message: "There's no imageUrl in that alarm record",
      });
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
    image_url: rows[0].image_url,
  });
};

module.exports.getRegImgList = async (event) => {
  const userId = event.pathParameters.userId;

  try {
    var connection = await promisePool.getConnection();
    const query = `SELECT DISTINCT image_url FROM ${tableName} WHERE user_id=${userId} AND image_url IS NOT NULL ORDER BY id DESC LIMIT 5`;  //THINK ABOUT 'ORDER BY' AND 'LIMIT'
    var [rows, fields] = await connection.query(query);

    var imageUrlList = rows.filter(elem => {
      return elem.image_url !== null;
    })
    .map(elem => {
      return elem.image_url;
    });

    return createResponse(200, {
      image_url_list: imageUrlList,
    });
  } catch(err) {
    console.log(err);
    return createResponse(500, err);
  } finally {
    if(connection) {
      connection.release();
    }
  }
};