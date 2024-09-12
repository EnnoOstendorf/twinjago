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

A doc describing installation of each part and a dockerfile for running all (except MQTT Broker) on one host will be part of this repo soon.

## Endpoints

- **/getAll** - returns a list of connected devices in json format
- **/delete/[id]** - deletes the devices with specified id from the list
- \[TODO: add futher endpoints\]

## Trivia

- the grafana dashboards are created using the grafana API, the demon takes the skeleton for the API calls out of these files:
  + grafana-panel.json (for creating a panel)
  + grafana-dash.json (for creating a dashboard)
  + grafana-inlux-query.txt (the query for grafana to access the influxdb, NOT used by the demon, just for your information)

- the state of the devices is saved into a file pipestate.json and loaded upon restart. It could be necessary to reset the demon state when you made manual changes to the grafana dashboards. To reinitiate the demon there is a shellscript __reset_mqtt_InfluxGrafanaPipe.sh__.

