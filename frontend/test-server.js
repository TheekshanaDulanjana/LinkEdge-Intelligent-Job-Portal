const http = require("http");

const server = http.createServer((req, res) => {
  res.end("Server works");
});

server.listen(3010, "127.0.0.1", () => {
  console.log("Running on 3010");
});