const WebSocket = require('ws');
const { MongoClient } = require('mongodb');
const axios = require('axios');

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

const extractDetails = (textMessage) => {
  const regex = /^Book taxi: (.+?), (.+?) to (.+)$/;
  const matches = textMessage.match(regex);

  if (matches) {
    const [, city, source, destination] = matches;
    return { city, source, destination };
  } else {
    throw new Error('Invalid message format');
  }
};

const extractLatLon = (source) => {
  // Regex pattern to match lat and lon values
  const regex = /\(lat:\s*(-?\d+\.\d+),\s*lon:\s*(-?\d+\.\d+)\)/;
  const match = source.match(regex);

  if (match) {
    const lat = parseFloat(match[1]); // Convert lat string to float
    const lon = parseFloat(match[2]); // Convert lon string to float
    return { lat, lon };
  } else {
    throw new Error('Latitude and longitude not found in source string');
  }
};
// Function to get coordinates from OpenStreetMap
const getCoordinates = async (location) => {
  const { lat, lon } = extractLatLon(location);
};

// Function to calculate the distance between two coordinates
const calculateDistance = (coord1, coord2) => {
  const R = 6371; // Radius of the Earth in km
  const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
  const dLon = (coord2.lon - coord1.lon) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
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
    console.log(textMessage);
    textMessage = JSON.parse(textMessage);
    const city = textMessage.city;
    const source = textMessage.source;
    const destination = textMessage.destination;
    console.log({city,source,destination});
    // const { city, source, destination } = extractDetails(textMessage);
    const formattedCity = city.charAt(0).toUpperCase() + city.slice(1);

    try {
      // Get coordinates for the source location
      const sourceCoords = await getCoordinates(`${formattedCity}, ${source}`);

      // Check for available taxis
      const availableTaxiIndex = assignedTaxis.findIndex(taxi => taxi.isAvailable && !taxi.isAssigned && formattedCity === taxi.taxiLocation);
      if (availableTaxiIndex !== -1) {
        let availableTaxi = assignedTaxis[availableTaxiIndex];
        availableTaxi.locationDetails = availableTaxi.locationDetails.replace(/\s*\(lat:.*\)$/, '');
        // Get coordinates for the taxi's current location
        const taxiCoords = await getCoordinates(availableTaxi.locationDetails);

        // Calculate the distance and ETA
        const distance = calculateDistance(sourceCoords, taxiCoords);
        const speed = 40; // km/h
        const eta = distance / speed; // hours

        // Update MongoDB to mark taxi as assigned
        const db = client.db(dbName);
        const collection = db.collection(collectionName);

        const updatedTaxi = { ...availableTaxi, isAssigned: true };
        await collection.updateOne(
          { id: updatedTaxi.id },
          { $set: { isAssigned: true } }
        );
        assignedTaxis[availableTaxiIndex].isAssigned = true;
        console.log(`Taxi ${updatedTaxi.id} assigned and updated in MongoDB`);

        // Send taxi details and ETA to the client
        ws.send(JSON.stringify({
          id: updatedTaxi.id,
          source,
          destination,
          eta: `${eta.toFixed(2)} hours`,
          locationDetails: availableTaxi.locationDetails
        }));
      } else {
        ws.send(JSON.stringify({}));
      }
    } catch (error) {
      console.error('Error handling taxi request:', error);
      ws.send('Error processing request');
    }
  });

  ws.send('Welcome to Taxi Service 1!');
});
