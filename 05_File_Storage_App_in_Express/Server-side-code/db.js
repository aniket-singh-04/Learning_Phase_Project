import { MongoClient } from 'mongodb'


const client = new MongoClient("mongodb://127.0.0.1:27017/storageApp")

export async function connectDB(params) {
    await client.connect();
    const db = client.db();
    console.log("Database Connected");
    return db;
}
process.on("SIGINT", async() =>{
    await client.close();
    console.log("Client Disconnected");
    process.exit(0);
})