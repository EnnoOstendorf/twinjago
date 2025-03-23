# Twinjago - IoTBrokerToInflux

a demon to pipe sensordata from a MQTT Broker to an influx DB.

It fetches a list of devices from the MQTT Broker and subscribes for each of them, so it automatically retrieves the sensordata, as it is published at the Broker and directly writes it into the influxdb.

Additionally, it creates a grafana dashboard for each of the connected devices and publishes it, so it can be displayed in the Twinjago Frontend.

It also keeps statistics about the devices and incoming messages and exports them via some endpoints in JSON format.


## Requirements
- **MQTT-Broker Address** and Credentials to subscribe
- **influxdb** to hold the sensordata in time series
- **grafana** to display the sensordata
- **nodejs** to run the demon

## install
assuming you have copied the repo and changed to the root dir of it
```
cd IoTBrokerToInflux
npm install
```

For more details look into the [complete Install Howto](../completeINSTALL.md) 

## Configuration

Configuration is done in a textfile with the name *.env* located in the root dir of IoTBrokerToInflux. It has the following options:
- PORT - the port where the endpoints are reachable
- HTTPSPORT - the https port, analog to PORT

- INFLUX_URL - the URL for the INFLUX DB access, usually _http://localhost:8086_
- INFLUX_TOKEN - the token needed to push data into the db, you can get it, when you generate the buckets in your Influx DB during installation
- INFLUX_ORG - the ORG needed for Influx
- INFLUX_BUCKET - the bucket name, configured during installation of influx DB

- GRAFANA_URL - the url for the grafana API endpoints. Caution: localhost is normally not in the certificate, for https access you have to specify the hostname as mentioned in your cert.
- GRAFANA_TOKEN - the access token for grafana. you can generate it in your grafana setup.

- MQTTURL - a wss url to your mqtt server
- MQTTUSER - user name at mqtt server
- MQTTPASS - password at mqtt server

- PRIVKEYPATH - path to the private key file for https negotiation, e.g. with letsencrypt: _/etc/letsencrypt/live/freetwin.de/privkey.pem_
- CERTFILEPATH - path to the certificate file for https negotiation, e.g. with letsencrypt: _/etc/letsencrypt/live/freetwin.de/cert.pem_
- CAFILEPATH - path to the ca file for https negotiation, e.g. with letsencrypt: _/etc/letsencrypt/live/freetwin.de/chain.pem_


## Endpoints

- **/getAll** - returns a list of connected devices in json format
- **/delete/[id]** - deletes the devices with specified id from the list
- \[TODO: add futher endpoints\]


## Trivia

- the grafana dashboards are created using the grafana API, the demon takes the skeleton for the API calls out of these files:
  + grafana-panel.json (for creating a panel)
  + grafana-dash.json (for creating a dashboard)
  + grafana-influx-query.txt (the query for grafana to access the influxdb, NOT used by the demon, just for your information)
  
  if you make changes to the dashboards in grafana and want to update the json for generation of sensor dashboards by the demon, you have to copy the JSON out of grafana to the files ``grafana-dash.json`` and ``grafana-panel.json``.
  During generation of a dashboard, the panel json is included into the dash json once for each sensor below the panels array. Therefore you have to cut the json out of grafana into these two parts.
  After changing the files you have to re-initiate the demon by resetting the state and deleting all device dashboards in grafana.

- the state of the devices is saved into a file pipestate.json and loaded upon restart. It could be necessary to reset the demon state when you made manual changes to the grafana dashboards.

- To reinitiate the demon there is a shellscript ``reset_mqtt_InfluxGrafanaPipe.sh`` which is mainly for documentation purposes atm. critical parts are commented out.
  __Please do it manually following these steps:__
  + stop the demon (``pm2 list``, ``pm2 delete <processid of mqttInfluxGrafanaPipe.js>``)
  + reset state: ``echo '[]' > pipestat.json``
  + in grafana frontend delete every sensor dashboard
  + restart demon ``pm2 start mqttInfluxGrafanaPipe.js``

- If you do not know exactly, which dashboard to delete, you can try step 4 without the processmanager, simply start the demon by hand: ``node mqttInfluxGrafanaPipe.js``
If there are dashboards existing, that can not be overwritten by the demon, you see an error in the console identifying the device id of the dashboard and you can delete it in grafana. Stop the demon using ``<STRG-C>`` and try again.
When there are no more errors, stop the demon and start again using processmanager: ``pm2 start mqttInfluxGrafanaPipe.js``


