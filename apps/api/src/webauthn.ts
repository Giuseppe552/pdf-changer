import type { VerifiedAuthenticationResponse, VerifiedRegistrationResponse } from "@simplewebauthn/server";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/types";
import type { Env } from "./env";
import { base64urlDecode, base64urlEncode, utf8 } from "./crypto";
import { getCredentialByCredentialId, insertCredential, updateCredentialCounter } from "./db";

export async function makeRegistrationOptions(env: Env, user: { id: string }): Promise<PublicKeyCredentialCreationOptionsJSON> {
  const userIdBytes = utf8(user.id);
  return generateRegistrationOptions({
    rpName: env.RP_NAME,
    rpID: env.RP_ID,
    userID: userIdBytes,
    userName: `user-${user.id.slice(0, 8)}`,
    attestationType: "none",
    authenticatorSelection: {
      userVerification: "preferred",
      residentKey: "preferred",
    },
    supportedAlgorithmIDs: [-7, -257],
  });
}

export async function verifyAndStoreRegistration(
  env: Env,
  db: D1Database,
  expectedChallenge: string,
  userId: string,
  body: RegistrationResponseJSON,
): Promise<VerifiedRegistrationResponse> {
  const verification = await verifyRegistrationResponse({
    response: body,
    expectedChallenge,
    expectedOrigin: env.RP_ORIGIN,
    expectedRPID: env.RP_ID,
  });

  if (verification.verified && verification.registrationInfo) {
    const { credentialID, credentialPublicKey, counter } =
      verification.registrationInfo;
    await insertCredential(db, {
      id: crypto.randomUUID(),
      user_id: userId,
      credential_id: credentialID,
      public_key: base64urlEncode(credentialPublicKey),
      counter,
      transports: JSON.stringify((body?.response?.transports ?? []) as string[]),
      created_at: new Date().toISOString(),
    });
  }

  return verification;
}

export async function makeAuthenticationOptions(env: Env): Promise<PublicKeyCredentialRequestOptionsJSON> {
  return generateAuthenticationOptions({
    rpID: env.RP_ID,
    userVerification: "preferred",
  });
}

export async function verifyAuthentication(
  env: Env,
  db: D1Database,
  expectedChallenge: string,
  body: AuthenticationResponseJSON,
): Promise<{ verified: boolean; userId?: string }> {
  const credentialId = body?.id as string | undefined;
  if (!credentialId) return { verified: false };

  const cred = await getCredentialByCredentialId(db, credentialId);
  if (!cred) return { verified: false };

  const verification: VerifiedAuthenticationResponse =
    await verifyAuthenticationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: env.RP_ORIGIN,
      expectedRPID: env.RP_ID,
      authenticator: {
        credentialID: cred.credential_id,
        credentialPublicKey: base64urlDecode(cred.public_key),
        counter: cred.counter,
      },
    });

  if (verification.verified && verification.authenticationInfo) {
    const newCounter = verification.authenticationInfo.newCounter;
    if (cred.counter > 0 && newCounter <= cred.counter) {
      return { verified: false };
    }
    await updateCredentialCounter(db, cred.credential_id, newCounter);
    return { verified: true, userId: cred.user_id };
  }
  return { verified: false };
}
