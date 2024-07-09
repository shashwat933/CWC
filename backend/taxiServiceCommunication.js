const WebSocket = require('ws');
const port = 8081;

const wss = new WebSocket.Server({ port });

console.log(`WebSocket server (Bot 2) is running on ws://localhost:${port}`);

// URLs of the two taxi service bots
const taxiService1Url = 'ws://localhost:8082';
const taxiService2Url = 'ws://localhost:8085';

let taxiService1Client;
let taxiService2Client;

const connectToTaxiService1 = () => {
  taxiService1Client = new WebSocket(taxiService1Url);

  taxiService1Client.on('open', () => {
    console.log('Connected to Taxi Service 1');
  });

  taxiService1Client.on('error', (error) => {
    console.error(`Taxi Service 1 error: ${error.message}`);
  });

  taxiService1Client.on('close', () => {
    console.log('Disconnected from Taxi Service 1');
    setTimeout(connectToTaxiService1, 5000);
  });
};

const connectToTaxiService2 = () => {
  taxiService2Client = new WebSocket(taxiService2Url);

  taxiService2Client.on('open', () => {
    console.log('Connected to Taxi Service 2');
  });

  taxiService2Client.on('error', (error) => {
    console.error(`Taxi Service 2 error: ${error.message}`);
  });

  taxiService2Client.on('close', () => {
    console.log('Disconnected from Taxi Service 2');
    setTimeout(connectToTaxiService2, 5000);
  });
};

// Connect to both taxi service bots initially
connectToTaxiService1();
connectToTaxiService2();

wss.on('connection', (ws) => {
  console.log('A new client connected to Bot 2');

  ws.on('message', (message) => {
    let textResponse;

    if (Buffer.isBuffer(message)) {
      textResponse = message.toString();
    } else if (typeof message === 'string') {
      textResponse = message;
    } else {
      textResponse = 'Unsupported message type';
    }

    // Process the booking request
    if (textResponse.startsWith('Book taxi:')) {
      // Extract source and destination from the message

      const startIndex = textResponse.indexOf(':') + 1; // Find the position after ':'
      const commaIndex = textResponse.indexOf(',');  
      const details = textResponse.substring(startIndex, commaIndex).trim();
      const details1 = textResponse.substring('Book taxi:'.length).trim();// Check availability from both taxi service bots
      
      let taxiAvailable = false;

      const checkAvailability = (serviceClient, serviceNumber) => {
        return new Promise((resolve, reject) => {
          if (serviceClient && serviceClient.readyState === WebSocket.OPEN) {
            serviceClient.send(details, (err) => {
              if (err) {
                reject(err);
              } else {
                serviceClient.on('message', (response) => {
                  
                  let textResponse;
                  if (Buffer.isBuffer(response)) {
                    textResponse = response.toString();
                  } else if (typeof response === 'string') {
                    textResponse = response;
                  } else {
                    textResponse = 'Unsupported response type';
                  }
                  console.log(textResponse);
                  if (textResponse === 'Taxi available') {
                    resolve(serviceNumber);
                  } else {
                    resolve(null);
                  }
                });
              }
            });
          } else {
            resolve(null);
          }
        });
      };

      Promise.all([checkAvailability(taxiService1Client, 1), checkAvailability(taxiService2Client, 2)])
        .then((results) => {
          const availableService = results.find(result => result !== null);
          if (availableService) {
            ws.send(`Taxi is available from Taxi Service ${availableService} for your request: ${details1}`);
          } else {
            ws.send('Request denied: No taxis available.');
          }
        })
        .catch((error) => {
          console.error('Error checking taxi availability:', error);
          ws.send('Error checking taxi availability. Please try again later.');
        });
    } else {
      ws.send('I only respond to booking requests in the format "Book taxi: [source] to [destination]"');
    }
  });

  ws.send('Welcome! Please send a booking request in the format "Book taxi: [source] to [destination]" to check taxi availability.');
});
