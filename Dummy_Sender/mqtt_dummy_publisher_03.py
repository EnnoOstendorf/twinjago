import time
from datetime import datetime
# Import the Paho MQTT-Module
import paho.mqtt.client as mqtt
import sys
import json
import random
import string
import argparse

# Set up argument parser
parser = argparse.ArgumentParser(description='MQTT Dummy Publisher')
parser.add_argument('device_id', type=str, help='Device ID to be used as client ID')
args = parser.parse_args()

# Use the provided device ID as the MQTT client ID
config_mqtt_client_id = args.device_id

def load_mqtt_meta(device_id):
    try:
        with open('data.txt', 'r', encoding='utf-8') as file:
            data = json.load(file)
            # Search for the given device_id
            for entry in data.values():
                if entry['id_object']['id'] == device_id:
                    return entry['mqtt_meta']
    except Exception as e:
        print(f"Error loading MQTT meta for {device_id}: {e}")
    return None


config_mqtt_broker_ip = "iot.fh-muenster.de"
config_mqtt_broker_user = "user001"
config_mqtt_broker_pass = "4ENRDutXyy"
#config_mqtt_client_id = "18:00:01:02:03:44";
config_mqtt_topic     = "sensor/" + config_mqtt_client_id

# The callback for when the client receives a CONNACK response from the server.
def on_connect(client, userdata, flags, rc):
    print("Connected with result code "+str(rc))

# Create MQTT-Client
mqtt_c = mqtt.Client(config_mqtt_client_id, clean_session=True)
mqtt_c.username_pw_set(config_mqtt_broker_user, config_mqtt_broker_pass)
mqtt_c.on_connect = on_connect
mqtt_c.tls_set(ca_certs="ca.pem")
mqtt_meta_last_will = {'type' : 2}
mqtt_c.will_set("meta/" + config_mqtt_client_id, None, qos=0, retain=True)

# Connect mqtt-client to broker
mqtt_c.connect(config_mqtt_broker_ip, 8883, 60)

# Start MQTT-Loop
mqtt_c.loop_start()

#~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

last_announce   = time.time()
start_time      = time.time()


mqtt_meta = load_mqtt_meta(config_mqtt_client_id)
if not mqtt_meta:
    print(f"No MQTT meta found for device ID: {config_mqtt_client_id}")
    sys.exit(1)




mqtt_c.publish("meta/" + config_mqtt_client_id, json.dumps(mqtt_meta), qos=0, retain=True)

#~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

while True:
    data = ("4520", "16€", "3")
    timestamp = datetime.now()
    mqtt_data = [data[0],data[1],data[2],str(timestamp)    ]

    mqtt_c.publish("sensor/" + config_mqtt_client_id, json.dumps(mqtt_data));
    print(json.dumps(mqtt_data)) 
    
    time.sleep(2)    
    
    data2 = ("0", "1", "0")
    timestamp = datetime.now()
    mqtt_data = [data2[0],data2[1],data2[2],str(timestamp)    ]

    mqtt_c.publish("sensor/" + config_mqtt_client_id, json.dumps(mqtt_data));
    print(json.dumps(mqtt_data))   
    
    if (time.time() - last_announce) > 1:
        mqtt_beacon = {
            "type"      : 3,
            "rssi"      : 0,
            "uptime"    : time.time() - start_time,
        }

        mqtt_c.publish("beacon/" + config_mqtt_client_id, json.dumps(mqtt_beacon))
        last_announce = time.time()    
    time.sleep(2)

# Disconnect cleanly from the MQTT-Broker
mqtt_c.disconnect()
