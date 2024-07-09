const WebSocket = require('ws');
const axios = require('axios');
const port = 8080;

const wss = new WebSocket.Server({ port });
console.log(`WebSocket server (Bot 1) is running on ws://localhost:${port}`);

const bot2Url = 'ws://localhost:8081';
let bot2Client;

const connectToBot2 = () => {
  bot2Client = new WebSocket(bot2Url);

  bot2Client.on('open', () => {
    console.log('Connected to Bot 2');
  });

  bot2Client.on('message', (message) => {
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
    setTimeout(connectToBot2, 5000);
  });
};

connectToBot2();

const taxiAgentBotUrl = 'ws://localhost:8089';
let taxiAgentBotClient;

const connectToTaxiAgentBot = () => {
  taxiAgentBotClient = new WebSocket(taxiAgentBotUrl);

  taxiAgentBotClient.on('open', () => {
    console.log('Connected to taxiAgentBot');
  });

  taxiAgentBotClient.on('message', (message) => {
    // Forward messages to Bot 1 clients if needed
  });

  taxiAgentBotClient.on('error', (error) => {
    console.error(`taxiAgentBot error: ${error.message}`);
  });

  taxiAgentBotClient.on('close', () => {
    console.log('Disconnected from taxiAgentBot');
    setTimeout(connectToTaxiAgentBot, 5000);
  });
};

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
      return `${index + 1}. ${result.display_name} \n`;
    }).join('\n');

    return `Here are some locations related to "${location}" in ${city}:\n${suggestions}`;
  } catch (error) {
    console.error('Error fetching location suggestions:', error);
    return 'Error fetching location suggestions. Please try again later.';
  }
};

wss.on('connection', (ws) => {
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
      // userDetails.phoneNumber = textMessage;
      // ws.send('Got it! What city will you be traveling from?');
      // step++;
      if (/^\d{10}$/.test(textMessage) && !/^0+$/.test(textMessage)) {
        userDetails.phoneNumber = textMessage;
        ws.send('Got it! What city will you be traveling from?');
        step++;
      } else {
        ws.send('Invalid phone number. Please enter a 10-digit number that is not all zeros.');
      }
    } else if (step === 3) {
      userDetails.city = textMessage;
      ws.send('Thanks! Now, please tell me your source location.');
      step++;
    } else if (step === 4) {
      userDetails.source = textMessage;

      const suggestions = await fetchLocationSuggestions(userDetails.city, userDetails.source);
      if (suggestions.startsWith('No locations found')) {
        ws.send(suggestions + ' Please provide a different source location.');
      } else {
        locationSuggestions = suggestions.split('\n').slice(1);
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

      const suggestions = await fetchLocationSuggestions(userDetails.city, userDetails.destination);
      if (suggestions.startsWith('No locations found')) {
        ws.send(suggestions + ' Please provide a different destination location.');
      } else {
        locationSuggestions = suggestions.split('\n').slice(1);
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
    } else if (step === 8) {
      ws.send('Thank you for booking with us. We will confirm your taxi availability soon.');
    }
  });

  ws.send('Welcome! Say "hi" to start the taxi booking process.');
});
