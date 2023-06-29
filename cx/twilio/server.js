const express = require('express');
const {SessionsClient} = require('@google-cloud/dialogflow-cx');
const MessagingResponse = require('twilio').twiml.MessagingResponse;
const path = require('path')
const bodyParser = require('body-parser');
const ENV_FILE = path.join(__dirname, '.env');
require('dotenv').config({ path: ENV_FILE });

const sessionClient = new SessionsClient(
    {apiEndpoint: process.env.LOCATION + "-dialogflow.googleapis.com"}
);

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const listener = app.listen(process.env.PORT, () => {
    console.log('Your Dialogflow integration server is listening on port ' +
    listener.address().port);
});

const twilioToDetectIntent = (twilioReq) => {
    const sessionPath = sessionClient.projectLocationAgentSessionPath (
        process.env.PROJECT_ID,
        process.env.LOCATION,
        process.env.AGENT_ID,
        process.env.SESSION_ID
    );

    const message = twilioReq.body.Body;

    const languageCode = process.env.LANGUAGE_CODE;
    const request = {
        session: sessionPath,
        queryInput: 
            {
                text: {
                    text: message
                },
                languageCode
            }
        };
    
    return request;
}

const detectIntentToTwilio = (dialogflowResponse) => {
    let reply = "";
    
    for (let responseMessage of dialogflowResponse.queryResult.responseMessages) {
        if (responseMessage.hasOwnProperty('text')) {
            reply += responseMessage.text.text;
        }
    }

    const twiml = new  MessagingResponse();
    twiml.message(reply);
    return twiml;
}

app.post('/', async (req, res) => {
    const dialogflowRequest = twilioToDetectIntent(req);
    const [dialogflowResponse] = await sessionClient.detectIntent(dialogflowRequest);
    const twiml = detectIntentToTwilio(dialogflowResponse);
    res.send(twiml.toString());
})

process.on('SIGTERM', () => {
    listener.close(async ()=> {
      console.log('Closing server.');
      process.exit(0);
    });
  });

module.exports = {twilioToDetectIntent, detectIntentToTwilio}