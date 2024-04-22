const express = require('express');
const { DynamoDBClient, ScanCommand } = require('@aws-sdk/client-dynamodb');
const dotenv = require('dotenv');

dotenv.config({ path: ".env"});
const app = express();
const port = 8080;

const awsConfig = {
  region: 'us-east-1',  
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,    
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN
  }
};

console.log("AWS_ACCESS_KEY: ", process.env.AWS_ACCESS_KEY)
const dynamoDBClient = new DynamoDBClient(awsConfig);
const tableName = 'sensor';

app.get('/', async (req, res) => {
  const serverIpv4 = req.connection.localAddress;
  if (!awsConfig.credentials.accessKeyId || !awsConfig.credentials.secretAccessKey) {
    res.send('Missing AWS credentials. Please configure accessKeyId and secretAccessKey.');
  } else {
    try {
      const scanCommand = new ScanCommand({ TableName: tableName });
      const data = await dynamoDBClient.send(scanCommand);

      const responseData = data.Items.map(item => ({
        timestamp: item.timestamp.S,
        humidity: parseFloat(item.humidity.N),
        temperature: parseFloat(item.temperature.N),
      }));

      const labels = responseData.map(item => new Date(parseInt(item.timestamp) * 1000).toLocaleTimeString());
      const humidityValues = responseData.map(item => item.humidity);
      const temperatureValues = responseData.map(item => item.temperature);

      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>IoT Platform</title>
          <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
            }
            .chart-container {
              display: flex;
              flex-direction: column;
              align-items: center;
              margin: 10px;
            }
          </style>
        </head>
        <body>
          <div class="container mt-1">
          <h2 style="text-align:center"> IoT Monitoring </h2>
          <h4 style="text-align:center">Server IP Address: ${serverIpv4}</h4>
          <div class="row">
            <div class="col-md-12">
                <div id="humidity-chart" class="p-3" style="height: 500px; margin-bottom: 20px"></div>
            </div>
          </div>    
            <h3 style="text-align:center";> LKS BANDUNG 2024 - Cloud Computing IoT Project</h3>
          </div>
          <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
          <script>
            const labels = ${JSON.stringify(labels)};
            const humidityValues = ${JSON.stringify(humidityValues)};
            const temperatureValues = ${JSON.stringify(temperatureValues)};

            var humidityData =
              {
                x: labels,
                y: humidityValues,
                type: 'scatter',
                name: 'Humidity',
                mode: 'lines',
                line: {color: '#17BECF'}
              }

              var temperatureData =
              {
                x: labels,
                y: temperatureValues,
                type: 'scatter',
                name: 'Temperature',
                mode: 'lines',
                line: {color: '#7F7F7F'}
              }

              var data = [humidityData, temperatureData];

              var layout = {
                title: 'Sensor Data',
              }

              Plotly.newPlot('humidity-chart', data, layout);
          </script>

        </body>
        </html>
      `;

      res.send(html);
    } catch (err) {
      console.error('Error:', err);
      res.status(500).send('Internal Server Error');
    }
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
