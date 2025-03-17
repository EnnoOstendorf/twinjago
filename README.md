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

### system - fresh ubuntu system, first actions
  ```
  apt-get update
  apt-get upgrade
  ```
### mongodb :
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

### influxdb
- install
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
  --org ORG_NAME \
  --all-access
```
exchange the USERNAME, PASSWORD, ORG_NAME and BUCKET_Name Vars and
**note the token in the output (!important!)**
this is the all-access token used by twinjago

### https
for https you need a certificate.
here we describe getting a certificate from letsencrypt using certbot and a standard apache setting.
you can also use your own certificate, you can set the path to the ca file etc. in the env config and grafana setting.

We don't need it directly for twinjago, but for delivering a standard web page around twinjago and for easier handling the certbot (see below) we install and configure standard Apache
```
sudo apt install apache2
```
edit the apache default config file /etc/apache2/sites-enabled/000-default.conf and change ServerName to your domain, e.g. twinjago.de

now install and run certbot:
```
sudo snap install --classic certbot
sudo certbot --apache
```
it should list your domain, confirm it.
The apache config is now automatically updated by certbot and https redirection and negotiation has been added.

The webroot of the apache standard normally can be found in /var/www/html.


### grafana
- install grafana
```
wget -q -O - https://packages.grafana.com/gpg.key | sudo apt-key add - echo "deb https://packages.grafana.com/oss/deb stable main " | sudo tee -a /etc/apt/sources.list.d/grafana.list
sudo apt-get update
sudo apt-get install grafana
sudo /bin/systemctl daemon-reload
sudo /bin/systemctl start grafana-server
```

- https for grafana (with letsencrypt/certbot)
```
ln -s /etc/letsencrypt/live/YOUR_DOMAIN/privkey.pem /etc/grafana/grafana.key
ln -s /etc/letsencrypt/live/YOUR_DOMAIN/fullchain.pem /etc/grafana/grafana.crt
chgrp -R grafana /etc/letsencrypt/*
chmod -R g+rx /etc/letsencrypt/*
chgrp -R grafana /etc/grafana/grafana.crt /etc/grafana/grafana.key
chmod 400 /etc/grafana/grafana.crt /etc/grafana/grafana.key
chmod g+r /etc/letsencrypt/archive/YOUR_DOMAIN/*
```
  replace YOUR_DOMAIN with your domain, e.g. twinjago.de

  the last command should not be necessary, since in the 4th command that should be included, but it wasn't.

- configure grafana
edit file /etc/grafana/grafana.ini and change these values
```
protocol = https
http_üprt = 3000
domain = YOUR_DOMAIN
enforce_domain = false
root_url = https://YOUR_DOMAIN:3000
cert_key = /etc/grafana/grafana.key
cert_file = /etc/grafana/grafana.crt
```

- restart grafana

```
sudo systemctl daemon-reload
sudo systemctl start grafana-server
```
