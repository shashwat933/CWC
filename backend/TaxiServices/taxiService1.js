const WebSocket = require('ws');
const { MongoClient } = require('mongodb');

const port = 8082;
const mongoUrl = 'mongodb+srv://code:8SwbDJ8KrtomSjB4@cluster0.fs3bvvp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const dbName = 'taxiServiceDB';
const collectionName = 'assignedTaxis';

const wss = new WebSocket.Server({ port });

console.log(`WebSocket server (Taxi Service 1) is running on ws://localhost:${port}`);

let assignedTaxis = [];

// MongoDB client
let client;

// Connect to MongoDB
const connectToMongoDB = async () => {
  try {
    client = new MongoClient(mongoUrl);
    await client.connect();
    console.log("Connected to MongoDB server");
  } catch (err) {
    console.error("Error connecting to MongoDB:", err);
  }
};

connectToMongoDB();

// Function to fetch assigned taxis from MongoDB
const fetchAssignedTaxis = async () => {
  const db = client.db(dbName);
  const collection = db.collection(collectionName);

  try {
    const result = await collection.findOne({ service: 'taxiService1' });
    assignedTaxis = result ? result.taxis : [];
    console.log('Assigned taxis fetched from MongoDB:', assignedTaxis.length);
  } catch (err) {
    console.error('Error fetching assigned taxis from MongoDB:', err);
  }
};

// Initial fetch of assigned taxis
fetchAssignedTaxis();

wss.on('connection', (ws) => {
  console.log('A new client connected to Taxi Service 1');

  ws.on('message', async (message) => {
    let textMessage;

    if (Buffer.isBuffer(message)) {
      textMessage = message.toString();
    } else if (typeof message === 'string') {
      textMessage = message;
    } else {
      textMessage = 'Unsupported message type';
    }
    
    textMessage=textMessage.charAt(0).toUpperCase() + textMessage.slice(1);
    console.log(textMessage);
    // Check for available taxis
    const availableTaxiIndex = assignedTaxis.findIndex(taxi => taxi.isAvailable && !taxi.isAssigned && textMessage===taxi.taxiLocation);
    if (availableTaxiIndex !== -1) {
      // Update MongoDB to mark taxi as assigned
      const db = client.db(dbName);
      const collection = db.collection(collectionName);

      const updatedTaxi = { ...assignedTaxis[availableTaxiIndex], isAssigned: true };
      try {
        await collection.updateOne(
          { id: updatedTaxi.id },
          { $set: { isAssigned: true } }
        );
        assignedTaxis[availableTaxiIndex].isAssigned = true;
        console.log(`Taxi ${updatedTaxi.id} assigned and updated in MongoDB`);
        ws.send('Taxi available');
      } catch (err) {
        console.error('Error updating taxi assignment in MongoDB:', err);
        ws.send('Error assigning taxi');
      }
    } else {
      ws.send('Taxi not available');
    }
  });

  ws.send('Welcome to Taxi Service 1!');
});
