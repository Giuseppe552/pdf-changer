PDF Changer Donation Proof Bundle (v1)

Goal:
- Let anyone verify donation addresses before sending funds.

Files:
- addresses.txt          (human-readable canonical statement)
- addresses.txt.asc      (OpenPGP detached signature)
- signing-key.asc        (pinned current signing key)
- manifest.v1.json       (machine-readable metadata + hashes)

Quick verify:
1) Download addresses.txt and addresses.txt.asc.
2) Import signing-key.asc into GPG.
3) Run: gpg --verify addresses.txt.asc addresses.txt
4) Confirm the key fingerprint shown by GPG equals the fingerprint in manifest.v1.json.

If verification fails:
- STOP and do not send funds.
- Re-open /donate/proof from the official domain.
- Check /donate/proof/archive for rotation/revocation notes.
