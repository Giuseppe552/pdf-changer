/* eslint-disable no-console */
const dns = require("node:dns");

const HOSTS = {
  "registry.npmjs.org": [
    "104.16.1.34",
    "104.16.2.34",
    "104.16.5.34",
    "104.16.7.34",
    "104.16.8.34",
    "104.16.10.34",
  ],
  "registry.npmjs.org.": [
    "104.16.1.34",
    "104.16.2.34",
    "104.16.5.34",
    "104.16.7.34",
    "104.16.8.34",
    "104.16.10.34",
  ],
};

const originalLookup = dns.lookup.bind(dns);

function chooseIp(hostname) {
  const ips = HOSTS[hostname];
  if (!ips || ips.length === 0) return null;
  return ips[Math.floor(Math.random() * ips.length)];
}

function patchedLookup(hostname, options, callback) {
  if (typeof options === "function") {
    callback = options;
    options = undefined;
  }
  const cb = callback;
  const opts =
    typeof options === "number"
      ? { family: options }
      : options && typeof options === "object"
        ? options
        : {};

  const requestedFamily = opts.family ?? 0;
  const all = !!opts.all;
  const ip = chooseIp(hostname);
  if (ip) {
    const family = 4;
    if (requestedFamily === 6) {
      return process.nextTick(() =>
        cb(Object.assign(new Error("No IPv6 address"), { code: "ENOTFOUND" })),
      );
    }
    if (all) {
      return process.nextTick(() => cb(null, [{ address: ip, family }]));
    }
    return process.nextTick(() => cb(null, ip, family));
  }
  return originalLookup(hostname, options, cb);
}

dns.lookup = patchedLookup;

// Patch promises API if present.
if (dns.promises?.lookup) {
  dns.promises.lookup = (hostname, options) =>
    new Promise((resolve, reject) => {
      patchedLookup(hostname, options, (err, address, family) => {
        if (err) return reject(err);
        if (Array.isArray(address)) return resolve(address);
        resolve({ address, family });
      });
    });
}

console.error(
  "[dns-patch] enabled fixed host mapping for: " + Object.keys(HOSTS).join(", "),
);
