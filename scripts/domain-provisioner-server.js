#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const http = require("node:http");
const crypto = require("node:crypto");
const { spawn } = require("node:child_process");

const port = Number(process.env.DOMAIN_PROVISIONER_PORT || 3031);
const bindAddress = process.env.DOMAIN_PROVISIONER_BIND || "127.0.0.1";
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

let running = false;
let lastStartedAt = 0;

const server = http.createServer((request, response) => {
  if (request.method !== "POST" || request.url !== "/provision" || !isAuthorized(request)) {
    response.writeHead(404);
    response.end();
    return;
  }

  if (running) {
    response.writeHead(409, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ ok: false, error: "Provisioning is already running" }));
    return;
  }

  if (Date.now() - lastStartedAt < 15_000) {
    response.writeHead(429, { "Content-Type": "application/json", "Retry-After": "15" });
    response.end(JSON.stringify({ ok: false, error: "Please wait before triggering provisioning again" }));
    return;
  }

  const contentLength = Number(request.headers["content-length"] || 0);
  if (!Number.isFinite(contentLength) || contentLength > 64 * 1024) {
    response.writeHead(413, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ ok: false, error: "Request body is too large" }));
    return;
  }

  running = true;
  lastStartedAt = Date.now();
  request.resume();
  const child = spawn(script, [], { stdio: "inherit", env: process.env });
  child.on("error", (error) => {
    running = false;
    console.error("Could not start domain provisioning:", error);
    response.writeHead(500, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ ok: false }));
  });
  child.on("exit", (code) => {
    running = false;
    response.writeHead(code === 0 ? 202 : 500, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ ok: code === 0 }));
  });
});

server.listen(port, bindAddress, () => {
  console.log(`Domain provisioner listening on ${bindAddress}:${port}`);
});
