const { Client, Account } = require("node-appwrite");

module.exports = async function createAppwriteClient(role = "user") {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT || "http://localhost/v1") // adjust if needed
    .setProject(process.env.APPWRITE_PROJECT || "your_project_id");

  // optionally set API key for admin operations
  if (process.env.APPWRITE_KEY || role === "admin") {
    client.setKey(process.env.APPWRITE_KEY || "your_admin_key");
  }

  const account = new Account(client);
  return { client, account };
}