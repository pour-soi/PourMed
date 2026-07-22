import { createHash, generateKeyPairSync, randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
const b = (x) => Buffer.from(x).toString("base64url");
const token = b(randomBytes(32)),
  hash = createHash("sha256").update(token).digest("base64url");
const { publicKey, privateKey } = generateKeyPairSync("ec", {
  namedCurve: "prime256v1",
});
const pub = publicKey.export({ format: "jwk" }),
  priv = privateKey.export({ format: "jwk" });
await mkdir("secrets", { recursive: true });
await writeFile("secrets/access-token.txt", `${token}\n`, { mode: 0o600 });
await writeFile(
  "secrets/wrangler-secrets.env",
  `ACCESS_TOKEN_HASH=${hash}\nACCESS_TOKEN_LENGTH=${token.length}\nVAPID_PUBLIC_KEY=${Buffer.concat([Buffer.from([4]), Buffer.from(pub.x, "base64url"), Buffer.from(pub.y, "base64url")]).toString("base64url")}\nVAPID_PRIVATE_KEY=${priv.d}\n`,
  { mode: 0o600 },
);
console.log(
  "Credentials created in ignored mode-600 files under secrets/. The private values were not printed.",
);
