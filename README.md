# Twinjago

![Picture of a game called twinjago](/twinjago_Spiel_05.jpg)

a **_Digital Twin_** Editor and Presenter.
This tool enables you to create a digital Twin of your _Thing_, 
so that others can inspect it and have everything they need to reproduce your _Thing_!

## Requirements
- **mongodb** to hold the Twin data
- **influxdb** to hold the sensordata in time series
- **grafana** to display the sensordata
- **nodejs** to run the demons

A doc describing installation of each part and a dockerfile for running all on one host will be part of this repo.

## Components

- **IoTBrokerToInflux** - a demon, that fetches sensordata from a MQTT broker and injects it into an influx DB to make it accessible to grafana
- **IoTFrontend** - the frontend, served on a specified port accesible by Browsers, has an admin and a showroom part
  + **admin part** - let's you upload your 3D Files which are displayed in 3D where you can position and configure it, add Tooltip Infos, add pins and route them, add some documentation files, connect reallife devices from a MQTT broker and more
  + **showroom** - shows the 3D Model and let the user explore it, displays data from the connected reallife devices - realtime and historic with grafana, gives the user access to the documentational files. The showroom part is responsive, works with mouse or touch devices


## Install

We have gathered all the bash stuff into a [complete Install Howto](complete_INSTALL.md).
You just need the MQTT-Broker credentials, which is not part of twinjago.

## Roadmap
[Roadmap](Roadmap.md)
