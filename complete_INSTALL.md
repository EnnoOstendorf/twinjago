# Complete install

This is a complete Step-By-Step install.
You only need the credentials to an MQTT-Broker, which is not part of twinjago. (atm)

## system - fresh ubuntu system, first actions
  ```
  apt-get update
  apt-get upgrade
  ```

## Prerequesites for the twinjago app  

### install zip
wilco needs zip to compress the archives
```
sudo apt-get install zip
```

### install unzip
if you transfer the twinjago repo via zip archive, first install unzip
```
sudo apt-get install unzip
```

### install nodejs
nodejs executes the app  
https://nodejs.org/en/download
```
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.2/install.sh | bash
\. "$HOME/.nvm/nvm.sh"
nvm install 23
node -v # Should print "v23.10.0".
nvm current # Should print "v23.10.0".
npm -v # Should print "10.9.2".
```

### install pm2
processmanager for node  
https://pm2.keymetrics.io/docs/usage/quick-start/
```
npm install pm2@latest -g
```

## influxdb
### install
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
### cli install
https://docs.influxdata.com/influxdb/v2/tools/influx-cli/
```
wget https://dl.influxdata.com/influxdb/releases/influxdb2-client-2.7.5-linux-amd64.tar.gz
tar xvzf ./influxdb2-client-2.7.5-linux-amd64.tar.gz
sudo cp ./influx /usr/local/bin/
```
### setup
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

## https
for https you need a certificate.
here we describe getting a certificate from letsencrypt using certbot and a standard apache setting.
you can also use your own certificate, you can set the path to the ca file etc. in the env config and grafana setting.

We don't need it directly for twinjago, but for delivering a standard web page around twinjago and for easier handling the certbot (see below) we install and configure standard Apache
```
sudo apt install apache2
```
edit the apache default config file ``/etc/apache2/sites-enabled/000-default.conf`` and change ServerName to your domain, e.g. twinjago.de

now install and run certbot:
```
sudo snap install --classic certbot
sudo certbot --apache
```
it should list your domain, confirm it.
The apache config is now automatically updated by certbot and https redirection and negotiation has been added.

The webroot of the apache standard normally can be found in ``/var/www/html.``

If you navigate your browser to your host name you should see the apache default page.


## grafana

https://grafana.com/docs/grafana/latest/setup-grafana/

### install grafana
```
wget -q -O - https://packages.grafana.com/gpg.key | sudo apt-key add - echo "deb https://packages.grafana.com/oss/deb stable main " | sudo tee -a /etc/apt/sources.list.d/grafana.list
sudo apt-get update
sudo apt-get install grafana
sudo /bin/systemctl daemon-reload
sudo /bin/systemctl start grafana-server
sudo systemctl enable grafana-server.service
```

### https for grafana (with letsencrypt/certbot)

https://grafana.com/docs/grafana/latest/setup-grafana/set-up-https/

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

### configure grafana
edit file /etc/grafana/grafana.ini and change these values
```
protocol = https
http_prt = 3000
domain = YOUR_DOMAIN
enforce_domain = false
root_url = https://YOUR_DOMAIN:3000
cert_key = /etc/grafana/grafana.key
cert_file = /etc/grafana/grafana.crt
```

### restart grafana

```
sudo systemctl restart grafana-server
```

### initialize using plain auth (no ui interaction needed)
- grafana initially has the admin account with password admin
- the user and password has to be specified in the .env file
- if you follow the next steps and change the password, you have to change it in .env also 

### initialize grafana web-frontend [deprecated no need]
- in your browser navigate to YOUR_DOMAIN:3000, eg: https://twinjago.de:3000
- login with default username admin, password admin and change password, note the password

### generate grafana user and token  [deprecated no need] 
- navigate to /org/serviceaccount e.g. https://twinjago.de:3000/org/serviceaccount
- click Add Service Account  
- give a name and click on generate Token  
- copy the token for later use in config
![screenshot of grafana token dialogue](/grafana-token-scr.png)

### prepare grafana for pipeguy
grafana needs an influx datasource, you can create one on your own using the ui, than you have to copy the id of that data source into the file grafana-panel.json.
this process will be part of a setup process in the future. the creation of the datasource can be done by api calls.

you can get the id doing a call to the api
`` curl http://admin:<ADMINPASSWORD>@localhost:3000/api/datasources``

The file grafana-panel.json contains keys for the influx data source, there the field uid has to be replaced with the uid from the datasources api output. 


## pipeguy
assuming you have copied the repo and changed to the root dir of it

### install
```
cd IoTBrokerToInflux
npm install
```

### configure
add a text file named ``.env`` and edit using the following variables
```
PORT=3458
HTTPSPORT=3459
INFLUX_URL=http://localhost:8086
INFLUX_TOKEN=<ADD YOUR INFLUX TOKEN FROM ABOVE>
INFLUX_ORG=<YOUR_ORG>
INFLUX_BUCKET=<YOUR_BUCKET>
GRAFANA_USER=admin
GRAFANA_PASS=<ADMIN_PASSWORD>
GRAFANA_PROTO=https
GRAFANA_HOST=<YOUR_DOMAIN>
GRAFANA_PORT=3000
MQTTURL=<MQTT SERVER URL>
MQTTUSER=<MQTT SERVER USER>
MQTTPASS=<MQTT SERVER PASSWORD>
PRIVKEYPATH=/etc/letsencrypt/live/<YOUR_DOMAIN>/privkey.pem
CERTFILEPATH=/etc/letsencrypt/live/<YOUR_DOMAIN>/cert.pem
CAFILEPATH=/etc/letsencrypt/live/<YOUR_DOMAIN>/chain.pem
```
exchange the values in <> by that data you gathered through the above process  
MQTT Server must exist externally

### run
after first install, start pipeguy manually to see the status and error messages in the console
```
node mqttInfluxGrafanaPipe.js
```
it should connect to InfluxDB, connect to the MQTT server and new devices should be detected.
Upon detection the grafana dashboards should be created.

### run in background
if no errors are shown, stop the demon (``STRG-C``) and restart it in background using pm2
```
pm2 start mqttInfluxGrafanaPipe.js
```
now the pipeguy runs in background and can be accessed via the endpoints.

## wilco

### install
assuming you are in a shell in the repo root dir, go to directory wilco and run the installer
```
cd wilco
npm install
```

### configure

add a text file named ``.env`` and edit using the following variables
```
PORT=3210
HTTPSPORT=3211
INFLUX_URL=http://localhost:8086
INFLUX_TOKEN=<YOUR_INFLUX_TOKEN>
INFLUX_ORG=<YOUR_INFLUX_ORG>
INFLUX_BUCKET=<YOUR_INFLUX_BUCKET>
DEVICELISTURL=http://localhost:3458/getAll
PRIVKEYPATH=/etc/letsencrypt/live/<YOUR_DOMAIN>/privkey.pem
CERTFILEPATH=/etc/letsencrypt/live/<YOUR_DOMAIN>/cert.pem
CAFILEPATH=/etc/letsencrypt/live/<YOUR_DOMAIN>/chain.pem
```
exchange the values in <> by that data you gathered through the above process  

### run
after first install, start wilco manually to see the status and error messages in the console
```
node wilco.js
```
it should connect to InfluxDB and return it's ports.

### run in background
if no errors are shown, stop the demon (``STRG-C``) and restart it in background using pm2
```
pm2 start wilco.js
```


## IoT-Frontend

we assume in here a DB-name ``IoT-Devices``
we assume in here domain is twinjago.de

### install mongodb
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

### create mongodb user

** start mongosh shell **

```
mongosh
```

** in mongosh do **

```
test> use IoT-Devices
switched to db IoT-Devices
IoT-Devices> db.createUser( { user: "<YOUR_MONGO_USER>", pwd: "<YOUR_MONGO_PASSWORD>", roles: [ "readWrite" ] })
{ ok: 1 }
IoT-Devices> quit
```


### import data

you may wish to import from another instance, you can create a dump of the mongodb  
https://www.mongodb.com/docs/database-tools/mongodump/

```
mongodump --archive="IoT-Devices-mongo-dump-21-03-25.gz" --gzip --db="IoT-Devices"
```

copy it to the new instance and restore it
```
mongorestore --archive="IoT-Devices-mongo-dump-21-03-25.gz" --gzip
```

### install IOT-Frontend
assuming you are in a shell in the repo root dir, go to directory ``IoT-Frontend`` and run the installer

```
cd IOT-Frontend
npm install
```

### configure

add a text file named ``.env`` and edit using the following variables
```
DOMAIN=twinjago.de
PORT=3456
HTTPSPORT=3457
DATABASE_URL=mongodb://localhost:27017/IoT-Devices
MONGODB_URL=mongodb://<YOUR_MONGO_USER>:<YOUR_MONGO_PASSWORD>@127.0.0.1:27017/IoT-Devices
PRIVKEYPATH=/etc/letsencrypt/live/twinjago.de/privkey.pem
CERTFILEPATH=/etc/letsencrypt/live/twinjago.de/cert.pem
CAFILEPATH=/etc/letsencrypt/live/twinjago.de/chain.pem
```
exchange the values in <> by that data you gathered through the above process  

### run IOT-Frontend
after first install, start IOT-Frontend manually to see the status and error messages in the console
```
node index.js
```
it should connect to MongoDB, show the number of doks and devices and return it's ports.

### check frontend in browser on <YOURDOMAIN>:3457, eg. https://twinjago.de:3457/

### run IOT-Frontend in background
if no errors are shown, stop the demon (``STRG-C``) and restart it in background using pm2
```
pm2 start index.js
```
