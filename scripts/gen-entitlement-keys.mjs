import { webcrypto } from "node:crypto";

const { subtle } = webcrypto;

const keyPair = await subtle.generateKey(
  { name: "ECDSA", namedCurve: "P-256" },
  true,
  ["sign", "verify"],
);

const priv = await subtle.exportKey("jwk", keyPair.privateKey);
const pub = await subtle.exportKey("jwk", keyPair.publicKey);

console.log("ENTITLEMENT_PRIVATE_JWK=" + JSON.stringify(priv));
console.log("VITE_ENTITLEMENT_PUBLIC_JWK=" + JSON.stringify(pub));

