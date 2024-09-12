# TWINJAGO

a _Digital Twin_ Editor and Presenter.
This tool enables you to create a digital Twin of your _Thing_, 
so that others can inspect it and have everything they need to reproduce your _Thing_!

## Requirements
- Mongodb to hold the Twin data
- influxdb to hold the sensordata in time series
- grafana to display the sensordata
- nodejs to run the demons

## Components

- IoTBrokerToInflux - a demon, that fetches sensordata from a MQTT broker and injects it into an influx DB to make it accessible to grafana
- IoTFrontend - the frontend, served on a specified port accesible by Browsers, has an admin and a user part
- - admin part
