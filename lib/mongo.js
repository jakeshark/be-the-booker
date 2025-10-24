import { MongoClient } from 'mongodb';
let client = null;
export async function getClient(){
  if(client && client.topology && client.topology.isConnected) return client;
  const uri = process.env.MONGODB_URI;
  if(!uri) throw new Error('Missing MONGODB_URI');
  client = new MongoClient(uri, { appName: 'ewr-sim' });
  await client.connect();
  return client;
}
export async function getCollection(){
  const dbName = process.env.MONGODB_DB || 'ewr';
  const collName = process.env.MONGODB_COLLECTION || 'cards';
  const cli = await getClient();
  return cli.db(dbName).collection(collName);
}