# Twinjago - IOT-Frontend

this let's you create digital Twins of your __things__.

It consists of an admin part, where you create the Twins and a showroom part, where users can examine it.

The Frontend listens on a specified port and delivers Webpages on https:
- /admin - the admin part, URL's have prefix _/admin/_.
- /static - the showroom part, the URL's have no prefix.

Additionally it has some maintenance endpoints that understand and speak JSON.

## Requirements
- **MQTT-Broker Address** and Credentials for fetching livedata directly
- **mongodb** to hold the data of your __things__
- **grafana** to display the sensordata
- **nodejs** to run the demon

A doc describing installation of each part and a dockerfile for running all (except MQTT Broker) on one host will be part of this repo soon.

## Endpoints

- **/post** - endpoint for retrieving and saving model to DB (POST)
- **/list** - returns a list of saved __things__  (GET)
- **/getOne/[id] - returns one __thing__  (GET)
- **/update/[id] - changes data for [id]  (PATCH)
- **/delete/[id]** - deletes the __thing__ with specified id from the list (DELETE)
- **/doklist** - returns a list of saved download documents (GET)
- **/download/[id] - returns one downloadable document (GET)
- **/dokdelete/[id]** - deletes the downloadable document with specified id from the list  (DELETE)
- \[TODO: add futher endpoints\]

## Trivia

- The Frontend uses most of the endpoints itself, so there should be no need to directly access them, but you can.
- The downloadable documents are stored in a different bucket to keep the size of the __thing__ Data reasonable. Therefore they have different endpoints.
