# Twinjago - IOT-Frontend

this let's you create digital Twins of your _things_.

It consists of an admin part, where you create the Twins and a showroom part, where users can examine it.

The Frontend listens on a specified port and delivers Webpages on https:
- **/admin** - the admin part, located in the _admin_ directory.
- **/** - the showroom part, located in the _static_ directory.

Additionally it has some maintenance endpoints that understand and speak JSON.

## Requirements
- **MQTT-Broker Address** and Credentials for fetching livedata directly
- **mongodb** to hold the data of your _things_
- **grafana** to display the sensordata
- **nodejs** to run the demon

A doc describing installation of each part and a dockerfile for running all (except MQTT Broker) on one host will be part of this repo soon.

## Endpoints

- **/post** - endpoint for retrieving and saving model to DB (POST)
- **/list** - returns a list of saved _things_  (GET)
- **/getOne/\[id\]** - returns one _thing_  (GET)
- **/update/\[id\]** - changes data for \[id\]  (PATCH)
- **/delete/\[id\]** - deletes the _thing_ with specified id from the list (DELETE)
- **/doklist** - returns a list of saved download documents (GET)
- **/download/\[id\]** - returns one downloadable document (GET)
- **/dokdelete/\[id\]** - deletes the downloadable document with specified id from the list  (DELETE)
- \[TODO: add futher endpoints\]

## Trivia

- The Frontend uses most of the endpoints itself, so there should be no need to directly access them, but you can.
- The downloadable documents are stored in a different bucket to keep the size of the _thing_ Data reasonable. Therefore they have different endpoints.
