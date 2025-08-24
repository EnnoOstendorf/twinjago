import time
from datetime import datetime
# Import the Paho MQTT-Module
import paho.mqtt.client as mqtt
import re
import sys
import math
import json
import random
import string
import argparse
from mathparser import Parser


# Set up argument parser
parser = argparse.ArgumentParser(description='MQTT Simulation Publisher')
parser.add_argument('device_id', type=str, help='Device ID to be used as client ID')
args = parser.parse_args()

# Use the provided device ID as the MQTT client ID
config_mqtt_client_id = args.device_id

def load_mqtt_meta(device_id):
    try:
        with open('mqtt_simulation_json_data.txt', 'r', encoding='utf-8') as file:
            data = json.load(file)
            # Search for the given device_id
            for entry in data.values():
                if entry['id_object']['id'] == device_id:
                    return entry['mqtt_meta']
    except Exception as e:
        print(f"Error loading MQTT meta for {device_id}: {e}")
    return None

def load_payload(device_id):
    payload = [None, None, None]  # Initialize with None to identify unprocessed slots
    try:
        with open('mqtt_simulation_json_data.txt', 'r', encoding='utf-8') as file:
            data = json.load(file)
            for entry in data.values():
                if entry['id_object']['id'] == device_id:
                    for i in range(3):
                        value = entry['payload']['values'][i]
                        try:
                            payload[i] = float(value)
                        except ValueError:
                            # Check if the value is a space-separated series
                            value_split = value.split()
                            if len(value_split) > 1:
                                payload[i] = value_split
                            else:
                                payload[i] = value  # Retain as string if it's a single non-numeric value

    except Exception as e:
        print(f"Error loading payload for {device_id}: {e}")
    return payload
    
def load_sleeptime(device_id):
    try:
        with open('mqtt_simulation_json_data.txt', 'r', encoding='utf-8') as file:
            data = json.load(file)
            # Search for the given device_id
            for entry in data.values():
                if entry['id_object']['id'] == device_id:
                    return float(entry['sleep_object']['sleep'])
    except Exception as e:
        print(f"Error loading sleep for {device_id}: {e}")
    return [1]   

def evaluate(expression, vars = None):
    try:
        p = Parser(expression, vars)
        value = p.getValue()
    except Exception as e:
        #msg = e.message
        print ("error")
        #raise Exception()

    # Return an integer type if the answer is an integer 
    if int(value) == value:
        return int(value)

    # If Python made some silly precision error like x.99999999999996, just return x+1 as an integer 
    epsilon = 0.0000000001
    if int(value + epsilon) != int(value):
        return int(value + epsilon)
    if int(value - epsilon) != int(value):
        return int(value)
    return value


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

last_announce   = time.time()
start_time      = time.time()
last_meta_announce = time.time()

mqtt_meta = load_mqtt_meta(config_mqtt_client_id)
if not mqtt_meta:
    print(f"No MQTT meta found for device ID: {config_mqtt_client_id}")
    sys.exit(1)

mqtt_c.publish("meta/" + config_mqtt_client_id, json.dumps(mqtt_meta), qos=0, retain=True)

sleep = load_sleeptime(config_mqtt_client_id)
payload = load_payload(config_mqtt_client_id)
print("payload und sleep",str(payload), sleep)
current_indices = [0, 0, 0]


while True:
    current_time = time.time()
    elapsed_time = current_time - start_time
    if (current_time - last_meta_announce) > 100:
        # Republish meta data every xx seconds
        mqtt_c.publish("meta/" + config_mqtt_client_id, json.dumps(mqtt_meta), qos=0, retain=True)
        last_meta_announce = current_time

    # Compute values or directly use the payload if they're non-numeric
    mqtt_data = [None, None, None, None]

#  Nr. 00  value1 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    if isinstance(payload[0], str) and not re.match(r'^[0-9.,]*$', payload[0]):
        text = payload[0]
        # Funktion zur Ersetzung von randN(a,b) und randU(a,b)
        def replace_random(match):
            function_name = match.group(1)  # "randN" oder "randU"
            a = float(match.group(2))  # Erster Parameter "a"
            b = float(match.group(3))  # Zweiter Parameter "b"
            if function_name == "randN":
                # Ersetze durch Zufallswert aus der Normalverteilung
                return str(random.normalvariate(a, b))
            elif function_name == "randU":
                # Ersetze durch Zufallswert aus der Gleichverteilung
                return str(random.uniform(a, b))
        # RegEx zum Finden von "randN(a,b)" oder "randU(a,b)"
        pattern = r"(rand[NU])\(([-+]?\d*\.?\d+),([-+]?\d*\.?\d+)\)"
        exprstring00 = re.sub(pattern, replace_random, text)
        try:
            value00 = round(evaluate(exprstring00, {'t': elapsed_time}), 4)
        except Exception as e:
            value00 = str(e)  # Pass the error message as a string to value03
        mqtt_data[0] = value00

    elif isinstance(payload[0], list):
        # Cycle through the list elements
        value00 = payload[0][current_indices[0]]
        try:
            mqtt_data[0] = float(value00)  # Convert to float if possible
        except ValueError:
            mqtt_data[0] = value00  # Use the original string if conversion fails
        current_indices[0] = (current_indices[0] + 1) % len(payload[0])        
        
    else:
        mqtt_data[0] = payload[0]  # Use the string directly

#  Nr. 01  value2 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    if isinstance(payload[1], str) and not re.match(r'^[0-9.,]*$', payload[1]):
        text1 = payload[1]
        # Funktion zur Ersetzung von randN(a,b) und randU(a,b)
        def replace_random(match):
            function_name = match.group(1)  # "randN" oder "randU"
            a = float(match.group(2))  # Erster Parameter "a"
            b = float(match.group(3))  # Zweiter Parameter "b"
            if function_name == "randN":
                # Ersetze durch Zufallswert aus der Normalverteilung
                return str(random.normalvariate(a, b))
            elif function_name == "randU":
                # Ersetze durch Zufallswert aus der Gleichverteilung
                return str(random.uniform(a, b))
        # RegEx zum Finden von "randN(a,b)" oder "randU(a,b)"
        pattern = r"(rand[NU])\(([-+]?\d*\.?\d+),([-+]?\d*\.?\d+)\)"
        exprstring01 = re.sub(pattern, replace_random, text1)
        try:
            value01 = round(evaluate(exprstring01, {'t': elapsed_time}), 4)
        except Exception as e:
            value01 = str(e)  # Pass the error message as a string to value03
        mqtt_data[1] = value01

    elif isinstance(payload[1], list):
        # Cycle through the list elements
        value01 = payload[1][current_indices[1]]
        try:
            mqtt_data[1] = float(value01)  # Convert to float if possible
        except ValueError:
            mqtt_data[1] = value01  # Use the original string if conversion fails
        current_indices[1] = (current_indices[1] + 1) % len(payload[1])        
        
    else:
        mqtt_data[1] = payload[1]  # Use the string directly

#  Nr. 02  value3 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    if isinstance(payload[2], str) and not re.match(r'^[0-9.,]*$', payload[2]):
        text2 = payload[2]
        # Funktion zur Ersetzung von randN(a,b) und randU(a,b)
        def replace_random(match):
            function_name = match.group(1)  # "randN" oder "randU"
            a = float(match.group(2))  # Erster Parameter "a"
            b = float(match.group(3))  # Zweiter Parameter "b"
            if function_name == "randN":
                # Ersetze durch Zufallswert aus der Normalverteilung
                return str(random.normalvariate(a, b))
            elif function_name == "randU":
                # Ersetze durch Zufallswert aus der Gleichverteilung
                return str(random.uniform(a, b))
        # RegEx zum Finden von "randN(a,b)" oder "randU(a,b)"
        pattern = r"(rand[NU])\(([-+]?\d*\.?\d+),([-+]?\d*\.?\d+)\)"
        exprstring02 = re.sub(pattern, replace_random, text2)
        try:
            value02 = round(evaluate(exprstring02, {'t': elapsed_time}), 4)
        except Exception as e:
            value02 = str(e)  # Pass the error message as a string to value02
        mqtt_data[2] = value02

    elif isinstance(payload[2], list):
        # Cycle through the list elements
        value02 = payload[2][current_indices[2]]
        try:
            mqtt_data[2] = float(value02)  # Convert to float if possible
        except ValueError:
            mqtt_data[2] = value02  # Use the original string if conversion fails
        current_indices[2] = (current_indices[2] + 1) % len(payload[2])        
        
    else:
        mqtt_data[2] = payload[2]  # Use the string directly
        
        
    # Create timestamp and payload
    timestamp = datetime.now()
    mqtt_data[3] = str(timestamp)    
    #mqtt_data = [sinus_value1, sinus_value2, sinus_value3, str(timestamp)]

    # Publish data
    mqtt_c.publish("sensor/" + config_mqtt_client_id, json.dumps(mqtt_data))
    #print(json.dumps(mqtt_data))
    
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
