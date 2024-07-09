const WebSocket = require('ws');
const axios = require('axios'); // Axios is a promise-based HTTP client
const port = 8080;
//8SwbDJ8KrtomSjB4
// Create a WebSocket server for Bot 1
const wss = new WebSocket.Server({ port });

console.log(`WebSocket server (Bot 1) is running on ws://localhost:${port}`);

// URL of Bot 2
const bot2Url = 'ws://localhost:8081'; // Replace with the actual URL of Bot 2

// Create a WebSocket client for Bot 2
let bot2Client;

const connectToBot2 = () => {
  bot2Client = new WebSocket(bot2Url);

  bot2Client.on('open', () => {
    console.log('Connected to Bot 2');
  });

  bot2Client.on('message', (message) => {
    // Handle messages from Bot 2
    console.log(`Received from Bot 2: ${message}`);
    // Forward the message to the user
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(`Bot 2 says: ${message}`);
      }
    });
  });

  bot2Client.on('error', (error) => {
    console.error(`Bot 2 error: ${error.message}`);
  });

  bot2Client.on('close', () => {
    console.log('Disconnected from Bot 2');
    // Reconnect to Bot 2 if needed
    setTimeout(connectToBot2, 5000);
  });
};

// Connect to Bot 2 initially
connectToBot2();

const taxiAgentBotUrl = 'ws://localhost:8089';

// Create a WebSocket client for taxiAgentBot
let taxiAgentBotClient;
const connectToTaxiAgentBot = () => {
  taxiAgentBotClient = new WebSocket(taxiAgentBotUrl);

  taxiAgentBotClient.on('open', () => {
    console.log('Connected to taxiAgentBot');
    // Send a message to request taxi assignments
    
  });

  taxiAgentBotClient.on('message', (message) => {
    // Handle messages from taxiAgentBot
    console.log(`Received from taxiAgentBot: ${message}`);
    // Forward the message to the user (Bot 1 clients)
  });
  taxiAgentBotClient.on('error', (error) => {
    console.error(`taxiAgentBot error: ${error.message}`);
  });

  taxiAgentBotClient.on('close', () => {
    console.log('Disconnected from taxiAgentBot');
    // Reconnect to taxiAgentBot if needed
    setTimeout(connectToTaxiAgentBot, 5000);
  });
};


// Connect to taxiAgentBot initially
connectToTaxiAgentBot();

const fetchLocationSuggestions = async (city, location) => {
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: `${location}, ${city}`,
        format: 'json',
        addressdetails: 1,
        limit: 5
      }
    });

    const results = response.data;
    if (results.length === 0) {
      return 'No locations found for the specified location. Please provide a different location.';
    }

    const suggestions = results.map((result, index) => {
      return `${index + 1}. ${result.display_name} (lat: ${result.lat}, lon: ${result.lon})`;
    }).join('\n');

    return `Here are some locations related to "${location}" in ${city}:\n${suggestions}`;
  } catch (error) {
    console.error('Error fetching location suggestions:', error);
    return 'Error fetching location suggestions. Please try again later.';
  }
};

wss.on('connection', (ws) => {
  console.log('A new client connected');
  let step = 0;
  let userDetails = {};
  let locationSuggestions = [];

  ws.on('message', async (message) => {
    let textMessage;

    if (Buffer.isBuffer(message)) {
      textMessage = message.toString();
    } else if (typeof message === 'string') {
      textMessage = message;
    } else {
      textMessage = 'Unsupported message type';
    }

    if (step === 0) {
      if (textMessage.trim().toLowerCase() === 'hi') {
        ws.send('Welcome to Taxi Booking Services! May I have your name, please?');
        step++;
      } else {
        ws.send('Please start by saying "hi".');
      }
    } else if (step === 1) {
      userDetails.name = textMessage;
      ws.send(`Thank you, ${userDetails.name}! Now, please provide your phone number.`);
      step++;
    } else if (step === 2) {
      userDetails.phoneNumber = textMessage;
      ws.send('Got it! What city will you be traveling from?');
      step++;
    } else if (step === 3) {
      userDetails.city = textMessage;
      ws.send('Thanks! Now, please tell me your source location.');
      step++;
    } else if (step === 4) {
      userDetails.source = textMessage;

      // Fetch location suggestions based on the source location and city
      const suggestions = await fetchLocationSuggestions(userDetails.city, userDetails.source);
      if (suggestions.startsWith('No locations found')) {
        // If no locations found, ask for source location again
        ws.send(suggestions + ' Please provide a different source location.');
      } else {
        locationSuggestions = suggestions.split('\n').slice(1); // Extract suggestion list
        ws.send(suggestions + '\nPlease select a source location by entering the corresponding number.');
        step++;
      }
    } else if (step === 5) {
      const selectedIndex = parseInt(textMessage.trim(), 10) - 1;
      if (selectedIndex >= 0 && selectedIndex < locationSuggestions.length) {
        userDetails.source = locationSuggestions[selectedIndex];
        ws.send(`You selected: ${userDetails.source}`);
        ws.send('Great! Now, please provide your destination.');
        step++;
      } else {
        ws.send('Invalid selection. Please enter a valid number corresponding to a location.');
      }
    } else if (step === 6) {
      userDetails.destination = textMessage;

      // Fetch location suggestions based on the destination location and city
      const suggestions = await fetchLocationSuggestions(userDetails.city, userDetails.destination);
      if (suggestions.startsWith('No locations found')) {
        // If no locations found, ask for destination location again
        ws.send(suggestions + ' Please provide a different destination location.');
      } else {
        locationSuggestions = suggestions.split('\n').slice(1); // Extract suggestion list
        ws.send(suggestions + '\nPlease select a destination location by entering the corresponding number.');
        step++;
      }
    } else if (step === 7) {
      const selectedIndex = parseInt(textMessage.trim(), 10) - 1;
      if (selectedIndex >= 0 && selectedIndex < locationSuggestions.length) {
        userDetails.destination = locationSuggestions[selectedIndex];
        ws.send(`You selected: ${userDetails.destination}`);
        ws.send('Connecting to taxi services...');
        if (bot2Client && bot2Client.readyState === WebSocket.OPEN) {
          bot2Client.send(`Book taxi: ${userDetails.city}, ${userDetails.source} to ${userDetails.destination}`);
          step++;
        } else {
          ws.send('Taxi services are currently unavailable.');
        }
      } else {
        ws.send('Invalid selection. Please enter a valid number corresponding to a location.');
      }
    }
  });

  // Send a welcome message when a new client connects
  ws.send('Welcome! Say "hi" to start the taxi booking process.');
});
