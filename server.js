const username = process.env.WEB_USERNAME || "admin";
const password = process.env.WEB_PASSWORD || "password";
const url = process.env.RENDER_EXTERNAL_URL;
const port = process.env.PORT || 3000;
const express = require("express");
const app = express();
var exec = require("child_process").exec;
const os = require("os");
const { createProxyMiddleware } = require("http-proxy-middleware");
var request = require("request");
var fs = require("fs");
var path = require("path");
const auth = require("basic-auth");

app.get("/", (req, res) => {
  res.statusCode = 200;
  const msg = "No Parameters";
  res.end(msg);
});

// page access password
app.use((req, res, next) => {
  const user = auth(req);
  if (user && user.name === username && user.pass === password) {
    return next();
  }
  res.set("WWW-Authenticate", 'Basic realm="Node"');
  return res.status(401).send();
});

//Get the system process table
app.get("/status", function (req, res) {
  let cmdStr = "pm2 list; ps -ef";
  exec(cmdStr, function (err, stdout, stderr) {
    if (err) {
      res.type("html").send("<pre>command line execution error：\n" + err + "</pre>");
    } else {
      res.type("html").send("<pre>Get daemon and system process tables：\n" + stdout + "</pre>");
    }
  });
});

//Get the system listening port
app.get("/listen", function (req, res) {
    let cmdStr = "ss -nltp";
    exec(cmdStr, function (err, stdout, stderr) {
      if (err) {
        res.type("html").send("<pre>command line execution error：\n" + err + "</pre>");
      } else {
        res.type("html").send("<pre>Get the system listening port：\n" + stdout + "</pre>");
      }
    });
  });

//Get node data
app.get("/list", function (req, res) {
    let cmdStr = "bash argo.sh";
    exec(cmdStr, function (err, stdout, stderr) {
      if (err) {
        res.type("html").send("<pre>command line execution error：\n" + err + "</pre>");
      }
      else {
        res.type("html").send("<pre>node data：\n\n" + stdout + "</pre>");
      }
    });
  });

//Get system version, memory information
app.get("/info", function (req, res) {
  let cmdStr = "cat /etc/*release | grep -E ^NAME";
  exec(cmdStr, function (err, stdout, stderr) {
    if (err) {
      res.send("command line execution error：" + err);
    }
    else {
      res.send(
        "Command line execution result：\n" +
          "Linux System:" +
          stdout +
          "\nRAM:" +
          os.totalmem() / 1000 / 1000 +
          "MB"
      );
    }
  });
});

// keepalive begin
//web keep alive
function keep_web_alive() {
  // request homepage, stay awake
  exec("curl -m8 " + url, function (err, stdout, stderr) {
    if (err) {
      console.log("Keep-Alive-Request Off, Command Line Execution Error：" + err);
    }
    else {
      console.log("Keep-Alive-request On, response message:" + stdout);
    }
  });
}

setInterval(keep_web_alive, 10 * 1000);

app.use(
  "/",
  createProxyMiddleware({
    changeOrigin: true, // The default is false, whether to change the original host header to the target URL
    onProxyReq: function onProxyReq(proxyReq, req, res) {},
    pathRewrite: {
      // Remove / from the request
      "^/": "/"
    },
    target: "http://127.0.0.1:8080/", // The address of the request that needs to be processed across domains
    ws: true // Whether to proxy websockets
  })
);

//Start the core script to run the web, and argo
exec("bash entrypoint.sh", function (err, stdout, stderr) {
  if (err) {
    console.error(err);
    return;
  }
  console.log(stdout);
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));