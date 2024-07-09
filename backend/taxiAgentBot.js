const WebSocket = require('ws');
const axios = require('axios');
const { MongoClient, ObjectID } = require('mongodb');

const port = 8089;
const mongoUrl = 'mongodb+srv://Shashwat:Shashwat@shashwat.l2xydbe.mongodb.net/';
const dbName = 'taxiServiceDB';
const collectionName = 'assignedTaxis';

const wss = new WebSocket.Server({ port });

console.log(`WebSocket server (Taxi Agent Bot) is running on ws://localhost:${port}`);

const cities = ['Bangalore', 'Gwalior', 'Varanasi', 'Delhi', 'Gurgaon', 'Hyderabad'];

let client;

const connectToMongoDB = async () => {
  try {
    client = new MongoClient(mongoUrl);
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    await collection.deleteMany({});
    console.log("Connected to MongoDB server and cleared collection");
  } catch (err) {
    console.error("Error connecting to MongoDB:", err);
  }
};

connectToMongoDB();

const generateRandomTaxi = async (id, city) => {
  try {
    const locationResponse = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: city,
        format: 'json',
        limit: 1
      }
    });

    const location = locationResponse.data[0];

    return {
      id,
      isAssigned: false,
      isAvailable: Math.random() > 0.5,
      taxiLocation: city,
      locationDetails: `${location.display_name} \n`
    };
  } catch (error) {
    console.error('Error generating random taxi:', error);
    return null;
  }
};

const initializeTaxis = async () => {
  const taxis = [];
  let id = 1;

  for (const city of cities) {
    for (let i = 0; i < 20; i++) {
      const taxi = await generateRandomTaxi(id, city);
      console.log(taxi);
      if (taxi) {
        taxis.push(taxi);
        id++;
      }
    }
  }

  return taxis;
};

const assignTaxisToClient = async (ws) => {
  const taxis = await initializeTaxis();
  const db = client.db(dbName);
  const collection = db.collection(collectionName);

  try {
    await collection.insertMany([
      { service: 'taxiService1', taxis: taxis.filter((_, index) => index % 2 === 0) },
      { service: 'taxiService2', taxis: taxis.filter((_, index) => index % 2 !== 0) }
    ]);
    console.log('Initial taxi assignments stored in MongoDB');
  } catch (err) {
    console.error('Error storing initial taxi assignments in MongoDB:', err);
  }

  ws.send(JSON.stringify({
    taxiService1Taxis: taxis.filter((_, index) => index % 2 === 0),
    taxiService2Taxis: taxis.filter((_, index) => index % 2 !== 0)
  }));
};

wss.on('connection', (ws) => {
  console.log('A new client connected to the Taxi Agent Bot');
  assignTaxisToClient(ws);
});

wss.on('close', () => {
  if (client) {
    client.close().then(() => {
      console.log('MongoDB connection closed');
    }).catch(err => {
      console.error('Error closing MongoDB connection:', err);
    });
  }
});
