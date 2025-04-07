import time
from datetime import datetime
# Import the Paho MQTT-Module
import paho.mqtt.client as mqtt
import sys
import math
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

def load_offsets(device_id):
    offsets = [None, None, None]  # Initialize with None to identify unprocessed slots
    try:
        with open('data.txt', 'r', encoding='utf-8') as file:
            data = json.load(file)
            for entry in data.values():
                if entry['id_object']['id'] == device_id:
                    for i in range(3):
                        value = entry['payload']['values'][i]
                        try:
                            offsets[i] = float(value)
                        except ValueError:
                            # Check if the value is a space-separated series
                            value_split = value.split()
                            if len(value_split) > 1:
                                offsets[i] = value_split
                            else:
                                offsets[i] = value  # Retain as string if it's a single non-numeric value

    except Exception as e:
        print(f"Error loading offsets for {device_id}: {e}")
    return offsets
    
def load_sleeptime(device_id):
    try:
        with open('data.txt', 'r', encoding='utf-8') as file:
            data = json.load(file)
            # Search for the given device_id
            for entry in data.values():
                if entry['id_object']['id'] == device_id:
                    return float(entry['sleep_object']['sleep'])
    except Exception as e:
        print(f"Error loading offsets for {device_id}: {e}")
    return [1]   

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
last_meta_announce = time.time()

mqtt_meta = load_mqtt_meta(config_mqtt_client_id)
if not mqtt_meta:
    print(f"No MQTT meta found for device ID: {config_mqtt_client_id}")
    sys.exit(1)

mqtt_c.publish("meta/" + config_mqtt_client_id, json.dumps(mqtt_meta), qos=0, retain=True)

#~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
sleep = load_sleeptime(config_mqtt_client_id)
offsets = load_offsets(config_mqtt_client_id)
print("Offsets und sleep",str(offsets), sleep)
current_indices = [0, 0, 0]
while True:
    current_time = time.time()
    elapsed_time = current_time - start_time
    if (current_time - last_meta_announce) > 100:
        # Republish meta data every 10 seconds
        mqtt_c.publish("meta/" + config_mqtt_client_id, json.dumps(mqtt_meta), qos=0, retain=True)
        last_meta_announce = current_time

    # Compute sinus values or directly use the offsets if they're non-numeric
    mqtt_data = [None, None, None, None]

    if isinstance(offsets[0], float):    
        frequency1 = 1 / (sleep*7000)
        amplitude1 = offsets[0]/10
        angle1 = 2 * math.pi * frequency1 * elapsed_time
        sinus_value1 = round(amplitude1 * math.sin(angle1) + offsets[0] * random.gauss(mu=1, sigma=0.1), 4)
        mqtt_data[0] = sinus_value1
        
    elif isinstance(offsets[0], list):
        # Cycle through the list elements
        value = offsets[0][current_indices[0]]
        try:
            mqtt_data[0] = float(value)  # Convert to float if possible
        except ValueError:
            mqtt_data[0] = value  # Use the original string if conversion fails
        current_indices[0] = (current_indices[0] + 1) % len(offsets[0])        
        
    else:
        mqtt_data[0] = offsets[0]  # Use the string directly

    if isinstance(offsets[1], float):
        frequency2 = 1 / (sleep*5000)
        amplitude2 = offsets[1]/10
        angle2 = 2 * math.pi * frequency2 * elapsed_time +2
        sinus_value2 = round(amplitude2 * math.sin(angle2) + offsets[1] * random.gauss(mu=1, sigma=0.1), 4)
        mqtt_data[1] = sinus_value2

    elif isinstance(offsets[1], list):
        # Cycle through the list elements
        value = offsets[1][current_indices[1]]
        try:
            mqtt_data[1] = float(value)  # Convert to float if possible
        except ValueError:
            mqtt_data[1] = value  # Use the original string if conversion fails
        current_indices[1] = (current_indices[1] + 1) % len(offsets[1])        
        
    else:
        mqtt_data[1] = offsets[1]  # Use the string directly

    if isinstance(offsets[2], float):
        frequency3 = 1 / (sleep*3000)
        amplitude3 = offsets[2]/10
        angle3 = 2 * math.pi * frequency3 * elapsed_time + 2.5
        sinus_value3 = round(amplitude3 * math.sin(angle3) + offsets[2] * random.gauss(mu=1, sigma=0.1), 4)
        mqtt_data[2] = sinus_value3

    elif isinstance(offsets[2], list):
        # Cycle through the list elements
        value = offsets[2][current_indices[2]]
        try:
            mqtt_data[2] = float(value)  # Convert to float if possible
        except ValueError:
            mqtt_data[2] = value  # Use the original string if conversion fails
        current_indices[2] = (current_indices[2] + 1) % len(offsets[2])        
        
    else:
        mqtt_data[2] = offsets[2]  # Use the string directly


    # Create timestamp and payload
    timestamp = datetime.now()
    mqtt_data[3] = str(timestamp)    
    #mqtt_data = [sinus_value1, sinus_value2, sinus_value3, str(timestamp)]

    # Publish data
    mqtt_c.publish("sensor/" + config_mqtt_client_id, json.dumps(mqtt_data))
    print(json.dumps(mqtt_data))
    
    if (time.time() - last_announce) > 1:
        mqtt_beacon = {
            "type"      : 3,
            "rssi"      : 0,
            "uptime"    : time.time() - start_time,
        }

        mqtt_c.publish("beacon/" + config_mqtt_client_id, json.dumps(mqtt_beacon))
        last_announce = time.time()    
    time.sleep(sleep)

# Disconnect cleanly from the MQTT-Broker
mqtt_c.disconnect()
