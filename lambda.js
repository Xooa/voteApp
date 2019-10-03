var ApiBuilder = require("claudia-api-builder"),
  rp = require("request-promise"),
  api = new ApiBuilder(),
  path = require("path"),
  fs = require("fs"),
  renderPage = async (statement, options, apiToken) => {
    "use strict";
    return (
      '<link \
      href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css" \
      rel="stylesheet" \
      integrity="sha384-ggOyR0iXCbMQv3Xipma34MD+dH/1fQ784/j6cY/iJTQUOhcWr7x9JvoRxT2MZw1T" \
      crossorigin="anonymous" \
    /><div style="border-radius:5px;background-color:#f2f2f2;padding:10px 20px">' +
      '<form id="votingForm" method="POST" action="https://widget1.xooa.com/vote">' +
      `<input type="text" name="apiToken" value="${apiToken}" hidden>` +
      `<h4>${statement}</h4>` +
      options +
      "<br />" +
      '<input style="background-color:#ff5722;color:#fff;border:none;border-radius:4px;cursor:pointer;" class="btn btn-md" onClick="this.disabled=true; this.value=\'Submitting...\';"  type="submit" value="Vote">' +
      "</form>" +
      "<br />" +
      "</div>" +
      '<a style="cursor:pointer;float:left" href="https://xooa.com" target="_blank">' +
      "<small>Powered by Xooa</small>" +
      "</a>"
    );
  };

const { promisify } = require("util");
const readFileAsync = promisify(fs.readFile);

createForm = async apiToken => {
  var options = {
    method: "GET",
    uri:
      "https://api.xooa.com/api/v1/query/getDetails?Async=false&Timeout=15000",
    json: true,
    headers: { Authorization: `Bearer ${apiToken}` }
  };
  try {
    const body = await rp(options);
    const parsedBody = body.payload;
    let statement = parsedBody.statement;
    let optionsArr = parsedBody.options.split(",");
    let optionsHtml = "";
    optionsArr.forEach(option => {
      option = option.trim();
      optionsHtml += `
        <div class="radio">
            <label style="text-transform: capitalize"> <input type="radio" name="option" value="${option}" required> ${option} </label>
        </div>
`;
    });
    return renderPage(statement, optionsHtml, apiToken);
  } catch (e) {
    return (
      '<link \
      href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css" \
      rel="stylesheet" \
      integrity="sha384-ggOyR0iXCbMQv3Xipma34MD+dH/1fQ784/j6cY/iJTQUOhcWr7x9JvoRxT2MZw1T" \
      crossorigin="anonymous" \
    /><div style="border-radius:5px;background-color:#f2f2f2;padding:10px 20px">' +
      '<form id = "votingForm" action = "https://widget1.xooa.com/embedVote" method = "POST" >' +
      '<label style="padding:12px 12px 12px 0;display:inline-block">' +
      "Enter your Xooa API token to vote:" +
      "</label>" +
      "<br />" +
      '<textarea style="width:100%;padding:12px;border:1px solid #ccc;border-radius:4px;box-sizing:border-box;resize:vertical" name="api" required=""></textarea>' +
      "<br />" +
      '<small style="color:red">API token is invalid</small>' +
      "<br /><br />" +
      '<input style="background-color:#ff5722;color:#fff;border:none;border-radius:4px;cursor:pointer;" class="btn btn-md" type="submit" value="Next" />' +
      "</form >" +
      "<br />" +
      "</div >" +
      '<a style="cursor:pointer;float:left" href="https://xooa.com" target="_blank">' +
      "<small>Powered by Xooa</small>" +
      "</a>"
    );
  }
};

api.get(
  "/embed",
  async request => {
    if (
      request.queryString &&
      request.queryString.apiToken &&
      request.queryString.apiToken != ""
    ) {
      apiToken = request.queryString.apiToken;
      return await createForm(apiToken);
    } else {
      return (
        '<link \
      href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css" \
      rel="stylesheet" \
      integrity="sha384-ggOyR0iXCbMQv3Xipma34MD+dH/1fQ784/j6cY/iJTQUOhcWr7x9JvoRxT2MZw1T" \
      crossorigin="anonymous" \
    /><div style="border-radius:5px;background-color:#f2f2f2;padding:10px 20px">' +
        '<form id = "votingForm" action = "https://widget1.xooa.com/embedVote" method = "POST" >' +
        '<label style="padding:12px 12px 12px 0;display:inline-block">' +
        "Enter your Xooa API token to vote:" +
        "</label>" +
        "<br />" +
        '<textarea style="width:100%;padding:12px;border:1px solid #ccc;border-radius:4px;box-sizing:border-box;resize:vertical" name="api" required=""></textarea>' +
        "<br /><br />" +
        '<input style="background-color:#ff5722;color:#fff;border:none;border-radius:4px;cursor:pointer;" type="submit" class="btn btn-md" value="Next" />' +
        "</form >" +
        "<br />" +
        "</div >" +
        '<a style="cursor:pointer;float:left" href="https://xooa.com" target="_blank">' +
        "<small>Powered by Xooa</small>" +
        "</a>"
      );
    }
  },
  { success: { contentType: "text/html" } }
);

api.get(
  "/platform",
  async () => {
    let fileName = "./platform.js";
    if (process.env.LAMBDA_TASK_ROOT) {
      var resolved = path.resolve(process.env.LAMBDA_TASK_ROOT, fileName);
    } else {
      var resolved = path.resolve(__dirname, fileName);
    }
    data = await readFileAsync(resolved, "utf-8");
    return data;
  },
  { success: { contentType: "text/html" } }
);

api.post(
  "/embedVote",
  async req => {
    "use strict";
    if (req.post && req.post.api && req.post.api != "") {
      let apiToken = req.post.api;
      return await createForm(apiToken);
    } else {
      return "API token not provided.";
    }
  },
  { success: { contentType: "text/html" } }
);

api.post(
  "/vote",
  async req => {
    if (req.post && req.post.option && req.post.apiToken) {
      apiToken = req.post.apiToken;
      option = req.post.option;
      var options = {
        method: "POST",
        uri:
          "https://api.xooa.com/api/v1/invoke/vote?Async=false&Timeout=15000",
        headers: { Authorization: `Bearer ${apiToken}` },
        body: [option],
        json: true
      };
      try {
        var result = await rp(options);
        
        if (result.txId) {
          return (
            '<link \
      href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css" \
      rel="stylesheet" \
      integrity="sha384-ggOyR0iXCbMQv3Xipma34MD+dH/1fQ784/j6cY/iJTQUOhcWr7x9JvoRxT2MZw1T" \
      crossorigin="anonymous" \
    /><div style="border-radius:5px;background-color:#f2f2f2;padding:10px 20px">' +
            result.payload +
            " with transaction Id: " +
            result.txId +
            "<br /><br /><br />" +
            "</div >" +
            '<a style="cursor:pointer;float:left" href="https://xooa.com" target="_blank">' +
            "<small>Powered by Xooa</small>" +
            "</a>"
          );
        } else {
          return (
            '<link \
            href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css" \
            rel="stylesheet" \
            integrity="sha384-ggOyR0iXCbMQv3Xipma34MD+dH/1fQ784/j6cY/iJTQUOhcWr7x9JvoRxT2MZw1T" \
            crossorigin="anonymous" \
          /><div style="border-radius:5px;background-color:#f2f2f2;padding:10px 20px">' +
            " Your voting request has been submitted, if you have already voted then your vote will not be counted " +
            "<br /><br /><br />" +
            "</div >" +
            '<a style="cursor:pointer;float:left" href="https://xooa.com" target="_blank">' +
            "<small>Powered by Xooa</small>" +
            "</a>"
          );
        }
      } catch (e) {
        if (e.error && e.error.error) {
          return (
            '<link \
      href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css" \
      rel="stylesheet" \
      integrity="sha384-ggOyR0iXCbMQv3Xipma34MD+dH/1fQ784/j6cY/iJTQUOhcWr7x9JvoRxT2MZw1T" \
      crossorigin="anonymous" \
    /><div style="border-radius:5px;background-color:#f2f2f2;padding:10px 20px">' +
            e.error.error +
            "<br /><br /><br />" +
            "</div >" +
            '<a style="cursor:pointer;float:left" href="https://xooa.com" target="_blank">' +
            "<small>Powered by Xooa</small>" +
            "</a>"
          );
        } else {
          return (
            '<link \
      href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css" \
      rel="stylesheet" \
      integrity="sha384-ggOyR0iXCbMQv3Xipma34MD+dH/1fQ784/j6cY/iJTQUOhcWr7x9JvoRxT2MZw1T" \
      crossorigin="anonymous" \
    /><div style="border-radius:5px;background-color:#f2f2f2;padding:10px 20px">' +
            "An error occured. Please try again." +
            "<br /><br /><br />" +
            "</div >" +
            '<a style="cursor:pointer;float:left" href="https://xooa.com"> target="_blank"' +
            "<small>Powered by Xooa</small>" +
            "</a>"
          );
        }
      }
    }
  },
  { success: { contentType: "text/html" } }
);

module.exports = api;
