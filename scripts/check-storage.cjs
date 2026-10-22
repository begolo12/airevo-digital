// Menguji Object Storage Neon secara langsung: unggah, unduh, hapus.
const fs = require("node:fs");
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} = require("@aws-sdk/client-s3");

const env = fs.readFileSync(".env.local", "utf8");
function read(name) {
  const match = env.match(new RegExp(`^${name}=(.*)$`, "m"));
  return match ? match[1].trim().replace(/^["']|["']$/g, "") : null;
}

const endpoint = read("AWS_ENDPOINT_URL_S3");
const region = read("AWS_REGION");
const bucket = read("NEON_OBJECT_STORAGE_BUCKET") || "assets";
const accessKeyId = read("AWS_ACCESS_KEY_ID");
const secretAccessKey = read("AWS_SECRET_ACCESS_KEY");

console.log("endpoint :", endpoint);
console.log("region   :", region);
console.log("bucket   :", bucket);
console.log("akses    :", accessKeyId ? `ada (${accessKeyId.slice(0, 6)}…)` : "TIDAK ADA");

if (!endpoint || !accessKeyId || !secretAccessKey) {
  console.error("Variabel object storage tidak lengkap");
  process.exit(1);
}

const client = new S3Client({
  region,
  endpoint,
  credentials: { accessKeyId, secretAccessKey },
  forcePathStyle: true,
});

const key = `uji/${Date.now()}.txt`;
const body = `Uji object storage ${new Date().toISOString()}`;

(async () => {
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: "text/plain" }));
  console.log("UNGGAH   : ok ->", key);

  const got = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const text = await got.Body.transformToString();
  console.log("UNDUH    :", text === body ? "isi sama" : "ISI BERBEDA");

  const list = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: "uji/" }));
  console.log("DAFTAR   :", list.KeyCount, "objek");

  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  console.log("HAPUS    : ok");
  console.log("OBJECT STORAGE OK");
})().catch((error) => {
  console.error("GAGAL:", error.name, error.message);
  process.exit(1);
});
