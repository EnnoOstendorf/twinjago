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


## howto install

- system - fresh ubuntu system, first actions
  ```
  apt-get update
  apt-get upgrade
  ```
- mongodb :
  https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-ubuntu/#std-label-install-mdb-community-ubuntu
```
apt-get install gnupg curl
curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg \
   --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/8.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl status mongod
```

- influxdb :
  - db install
https://docs.influxdata.com/influxdb/v2/install/
```
curl --silent --location -O \
https://repos.influxdata.com/influxdata-archive.key
echo "943666881a1b8d9b849b74caebf02d3465d6beb716510d86a39f6c8e8dac7515  influxdata-archive.key" \
| sha256sum --check - && cat influxdata-archive.key \
| gpg --dearmor \
| tee /etc/apt/trusted.gpg.d/influxdata-archive.gpg > /dev/null \
&& echo 'deb [signed-by=/etc/apt/trusted.gpg.d/influxdata-archive.gpg] https://repos.influxdata.com/debian stable main' \
| tee /etc/apt/sources.list.d/influxdata.list
sudo apt-get update && sudo apt-get install influxdb2
sudo service influxdb start
sudo service influxdb status
```
  - cli install
https://docs.influxdata.com/influxdb/v2/tools/influx-cli/
```
wget https://dl.influxdata.com/influxdb/releases/influxdb2-client-2.7.5-linux-amd64.tar.gz
tar xvzf ./influxdb2-client-2.7.5-linux-amd64.tar.gz
sudo cp ./influx /usr/local/bin/
```
  - setup
https://docs.influxdata.com/influxdb/v2/get-started/setup/
```
influx setup \
  --username USERNAME \
  --password PASSWORD \
  --org ORG_NAME \
  --bucket BUCKET_NAME \
  --force
influx auth create \
  --org my-org \
  --all-access
```
exchange the USERNAME, PASSWORD, ORG_NAME and BUCKET_Name Vars and
**note the token in the output (!important!)**
this is the all-access token used by twinjago

