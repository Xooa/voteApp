var express = require('express');
var router = express.Router();
var rp = require("request-promise");
var QRCode = require('qrcode');
var log4js = require("log4js");
var logger = log4js.getLogger();
logger.level = "debug";
const baseURL = "https://voting.xooa.com?token="

enrollVoter = async (token, i) => {
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
    logger.debug("Making API call to: ", uri);
    const response = await rp(requestObj);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      logger.debug("Error occured while logging to Xooa");
      return response;
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
          return response2;
        } else if (response2.statusCode == 202) {
          i++;
          logger.debug(
            "Going to call results API again to check for transaction status"
          );
          continue;
        } else {
          logger.debug("Failed to POST into Xooa chaincode.");
          return response2;
        }
      }
      var res = {
        error:
          "Error occured while accessing " +
          functionToCall +
          " from xooa. 202 after 5 attempts ",
        statusCode: 500,
      };
      return res;
    } else {
      // Smoothly logged to xooa blockchain
      logger.debug("Smoothly POST to xooa blockchain");
      // logger.debug(response.body);
      return response;
    }
  } catch (err) {
    // Unable to log to Xooa blockchain
    logger.debug("Error occured while POSTing to xooa: " + err);
    var res = {
      error: "Error occured while POSTing to xooa: " + err,
      statusCode: err.statusCode,
    };
    return res;
  }
}

/* GET users listing. */
router.get('/', async (req, res, next) => {
  if(req.query.token && req.query.users) {
    var result = []
    for(let i=0; i<req.query.users; i++) {
      let voter = await enrollVoter(req.query.token, i);
      if(voter.body && voter.body.ApiToken) {
        console.log(voter.body.ApiToken);
        let url = baseURL + voter.body.ApiToken;
        let err, qr = await QRCode.toDataURL(url);
          let row = { url: url, qr: qr };
          result.push(row);
        // });
      }
    }
    res.render("user", {
      title: "Xooa Blockchain",
      rows: result,
    });
    // res.send(result[0]);
  } else {
    res.send("Token or number of users missing");
  }
});

module.exports = router;
