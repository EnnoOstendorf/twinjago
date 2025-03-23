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

### install
assuming you are in a shell in the repo root dir, go to directory ``IoT-Frontend`` and run the installer

```
cd IOT-Frontend
npm install
```

For more details look into the [complete Install Howto](../completeINSTALL.md).

## Configuration
configuration is done in the .env file, should be created in this directory, listed are the parameters
- DOMAIN the domain of this instance
- PORT the port which serves the web frontend
- HTTPSPORT the https port which serves the web frontend
- DATABASE_URL database url, for readonly access without credentials
- MONGODB_URL database url with access creds
- PRIVKEPATH, CERTFILEPATH, CAFILEPATH params needed for https negotiation, containing filepaths
- Example:
```
DOMAIN=freetwin.de
PORT=3456
HTTPSPORT=3457
DATABASE_URL=mongodb://localhost:27017/IoT-Devices
MONGODB_URL=mongodb://dbuser:dbpassword@127.0.0.1:27017/IoT-Devices
PRIVKEYPATH=/etc/letsencrypt/live/freetwin.de/privkey.pem
CERTFILEPATH=/etc/letsencrypt/live/freetwin.de/cert.pem
CAFILEPATH=/etc/letsencrypt/live/freetwin.de/chain.pem
```
- some content-related config such as infotext is configured through the web interface

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

## HOWTO Maintain
- Remove/-init a sensor-device in IOT-Frontend (incl. grafana)
  - **stop the sensor**
  - **remove the sensor from pipeguy** by calling the delete endpoint, eg for device id XYZ call endpoint '''/delete/XYZ'''
  - **check wether the device has been removed** by calling the '''/list''' endpoint
  - **delete the dashboard in grafana**
  - when you now **start your sensor again**, the pipeguy receives messages from an unknown new device, creates a fresh grafana dashboard and saves the link for use in the IOT-Frontend. This can take a few minutes.

## Trivia

- The Frontend uses most of the endpoints itself, so there should be no need to directly access them, but you can.
- The downloadable documents are stored in a different bucket to keep the size of the _thing_ Data reasonable. Therefore they have different endpoints.
