var express = require('express');
var router = express.Router();
var rp = require("request-promise");
var QRCode = require('qrcode');
var log4js = require("log4js");
var logger = log4js.getLogger();
logger.level = "debug";
const baseURL = "https://voting.xooa.com?token=";


const createQr = async (voter) => {
  if(voter.body && voter.body.ApiToken) {
    let url = baseURL + voter.body.ApiToken;
    let err, qr = await QRCode.toDataURL(url);
    let row = { url: url, qr: qr };
    return row;
  } else {
    return 0;
  }
}

const enrollVoter = async (token, i) => {
  return new Promise(async (resolve, reject) => {
    let uri = `https://api.xooa.com/api/v2/votes/voter?voter-name=${
      "user " + i
    }&async=false&timeout=5000`;
    var requestObj = {
      uri: uri,
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/json",
      },
      json: true,
      resolveWithFullResponse: true,
    };
    try {
      // logger.debug("Making API call to: ", uri);
      const response = await rp(requestObj);
      if (response.statusCode < 200 || response.statusCode >= 300) {
        logger.debug("Error occured while logging to Xooa");
        let resp = await createQr(response);
        resolve(resp);
      } else if (response.statusCode == 202) {
        let requestCount = 5;
        let sleepTime = 3000;
        let i = 0;
        let statusCode = 202;
        while (i < requestCount && statusCode == 202) {
          await sleep(sleepTime);
          // Making a get request to results api to get the latest status of transaction
          let options = {
            uri: config.get("xooa_api") + "results/" + response.body.resultId,
            method: "GET",
            headers: {
              Authorization: "Bearer " + token,
              Accept: "application/json",
            },
            json: true,
            resolveWithFullResponse: true,
          };
          logger.debug(
            "Making API call to: ",
            config.get("xooa_api") + "results/" + response.body.resultId
          );
          const response2 = await rp(options);
          statusCode = response2.statusCode;
          if (response2.statusCode == 200) {
            // Successfully logged to xooa blockchain after returning 202 initially
            // logger.debug(response2.body);
            response2.body = response2.body.result;
            let resp = await createQr(response2);
            resolve(resp);
          } else if (response2.statusCode == 202) {
            i++;
            logger.debug(
              "Going to call results API again to check for transaction status"
            );
            continue;
          } else {
            logger.debug("Failed to POST into Xooa chaincode.");
            let resp = await createQr(response2);
            resolve(resp);
          }
        }
        var res = {
          error:
            "Error occured while accessing " +
            functionToCall +
            " from xooa. 202 after 5 attempts ",
          statusCode: 500,
        };
        let resp = await createQr(res);
        resolve(resp);
      } else {
        // Smoothly logged to xooa blockchain
        logger.debug("Smoothly POST1 to xooa blockchain");
        // logger.debug(response.body);
        logger.debug(response.body.ApiToken);
        let createdQr = await createQr(response);
        logger.debug(createdQr.url);
        resolve(createdQr);
      }
    } catch (err) {
      // Unable to log to Xooa blockchain
      logger.debug("Error occured while POSTing to xooa: " + err);
      var res = {
        error: "Error occured while POSTing to xooa: " + err,
        statusCode: err.statusCode,
      };
      let resp = await createQr(response);
      resolve(resp);
    }
  })
}

/* GET users listing. */
router.get('/', async (req, res, next) => {
  if(req.query.token && req.query.users) {
    var listOfArguments = [];
    for(let i=0; i<req.query.users; i++) {
      listOfArguments.push(req.query.token);
    }

    const concurrencyLimit = 10;
    let results = [];
    const batchesCount = Math.ceil(req.query.users / concurrencyLimit);

    // Running Promises in parallel in batches
    for (let i = 0; i < batchesCount; i++) {
      const batchStart = i * concurrencyLimit;
      const batchArguments = listOfArguments.slice(batchStart, batchStart + concurrencyLimit);
      const batchPromises = batchArguments.map((token, index) => enrollVoter(token, index));
      // Harvesting
      const batchResults = await Promise.all(batchPromises);
      results = results.concat(batchResults);
    }
    logger.debug("results",results);
    res.render("user", {
      title: "Xooa Blockchain",
      rows: results,
    });
    // res.send(result[0]);
  } else {
    res.send("Token or number of users missing");
  }
});

module.exports = router;
