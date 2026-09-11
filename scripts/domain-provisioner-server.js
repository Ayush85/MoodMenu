#!/usr/bin/env node

const http = require("node:http");
const crypto = require("node:crypto");
const { spawn } = require("node:child_process");

const port = Number(process.env.DOMAIN_PROVISIONER_PORT || 3031);
const secret = process.env.DOMAIN_PROVISIONER_SECRET;
const script = process.env.DOMAIN_PROVISIONER_SCRIPT || "/opt/menuor/provision-domains.sh";

if (!secret) {
  console.error("DOMAIN_PROVISIONER_SECRET must be set");
  process.exit(1);
}

function isAuthorized(request) {
  const value = request.headers.authorization || "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(value);
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}

const server = http.createServer((request, response) => {
  if (request.method !== "POST" || request.url !== "/provision" || !isAuthorized(request)) {
    response.writeHead(404);
    response.end();
    return;
  }

  const child = spawn(script, [], { stdio: "inherit", env: process.env });
  child.on("error", (error) => {
    console.error("Could not start domain provisioning:", error);
    response.writeHead(500, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ ok: false }));
  });
  child.on("exit", (code) => {
    response.writeHead(code === 0 ? 202 : 500, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ ok: code === 0 }));
  });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Domain provisioner listening on port ${port}`);
});
