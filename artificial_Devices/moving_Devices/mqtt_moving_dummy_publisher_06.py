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
parser = argparse.ArgumentParser(description='MQTT moving Dummy Publisher')
parser.add_argument('device_id', type=str, help='Device ID to be used as client ID')
args = parser.parse_args()

# Use the provided device ID as the MQTT client ID
config_mqtt_client_id = args.device_id

def load_mqtt_meta(device_id):
    try:
        with open('mqtt_moving_dummy_json_data.txt', 'r', encoding='utf-8') as file:
            data = json.load(file)
            # Search for the given device_id
            for entry in data.values():
                if entry['id_object']['id'] == device_id:
                    return entry['mqtt_meta']
    except Exception as e:
        print(f"Error loading MQTT meta for {device_id}: {e}")
    return None

def load_payload(device_id):
    payload = [None, None, None, None, None, None, None, None, None, None, None, None]  
    try:
        with open('mqtt_moving_dummy_json_data.txt', 'r', encoding='utf-8') as file:
            data = json.load(file)
            for entry in data.values():
                if entry['id_object']['id'] == device_id:
                    for i in range(12):
                        value = entry['payload']['values'][i]
                        try:
                            payload[i] = float(value)
                        except ValueError:
                            # Check if the value is a space-separated series ~~~~~ für die Liste!! ~~~~~
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
        with open('mqtt_moving_dummy_json_data.txt', 'r', encoding='utf-8') as file:
            data = json.load(file)
            # Search for the given device_id
            for entry in data.values():
                if entry['id_object']['id'] == device_id:
                    return float(entry['sleep_object']['sleep'])
    except Exception as e:
        print(f"Error loading offsets for {device_id}: {e}")
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


# Connect mqtt-client to broker ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~++
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

current_indices = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]

while True:
    current_time = time.time()
    elapsed_time = current_time - start_time
    if (current_time - last_meta_announce) > 100:
        # Republish meta data every xx seconds
        mqtt_c.publish("meta/" + config_mqtt_client_id, json.dumps(mqtt_meta), qos=0, retain=True)
        last_meta_announce = current_time

    # Compute values or directly use the payload if they're non-numeric
    mqtt_data = [None, None, None, None, None, None, None, None, None, None, None, None, None]

#  Nr. 00  position x ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    if isinstance(payload[0], str) and not re.match(r'^[0-9.,]*$', payload[0]):
        exprstring00 = payload[0]
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

#  Nr. 01  position y ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    if isinstance(payload[1], str) and not re.match(r'^[0-9.,]*$', payload[1]):
        exprstring01 = payload[1]
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

#  Nr. 02  position z ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    if isinstance(payload[2], str) and not re.match(r'^[0-9.,]*$', payload[2]):
        exprstring02 = payload[2]
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

#  Nr. 03  rotation x ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    if isinstance(payload[3], str) and not re.match(r'^[0-9.,]*$', payload[3]):
        exprstring03 = payload[3]
        try:
            value03 = round(evaluate(exprstring03, {'t': elapsed_time}), 4)
        except Exception as e:
            value03 = str(e)  # Pass the error message as a string to value03
        mqtt_data[3] = value03

    elif isinstance(payload[3], list):
        # Cycle through the list elements
        value03 = payload[3][current_indices[3]]
        try:
            mqtt_data[3] = float(value03)  # Convert to float if possible
        except ValueError:
            mqtt_data[3] = value03  # Use the original string if conversion fails
        current_indices[3] = (current_indices[3] + 1) % len(payload[3])        
        
    else:
        mqtt_data[3] = payload[3]  # Use the string directly

#  Nr. 04  rotation y ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    if isinstance(payload[4], str) and not re.match(r'^[0-9.,]*$', payload[4]):
        exprstring04 = payload[4]
        try:
            value04 = round(evaluate(exprstring04, {'t': elapsed_time}), 4)
        except Exception as e:
            value04 = str(e)  # Pass the error message as a string to value04
        mqtt_data[4] = value04

    elif isinstance(payload[4], list):
        # Cycle through the list elements
        value04 = payload[4][current_indices[4]]
        try:
            mqtt_data[4] = float(value04)  # Convert to float if possible
        except ValueError:
            mqtt_data[4] = value04  # Use the original string if conversion fails
        current_indices[4] = (current_indices[4] + 1) % len(payload[4])        
        
    else:
        mqtt_data[4] = payload[4]  # Use the string directly

#  Nr. 05  rotation z ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    if isinstance(payload[5], str) and not re.match(r'^[0-9.,]*$', payload[5]):
        exprstring05 = payload[5]
        try:
            value05 = round(evaluate(exprstring05, {'t': elapsed_time}), 4)
        except Exception as e:
            value05 = str(e)  # Pass the error message as a string to value03
        mqtt_data[5] = value05

    elif isinstance(payload[5], list):
        # Cycle through the list elements
        value05 = payload[5][current_indices[5]]
        try:
            mqtt_data[5] = float(value05)  # Convert to float if possible
        except ValueError:
            mqtt_data[5] = value05  # Use the original string if conversion fails
        current_indices[5] = (current_indices[5] + 1) % len(payload[5])        
        
    else:
        mqtt_data[5] = payload[5]  # Use the string directly

#  Nr. 06  scale x ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    if isinstance(payload[6], str) and not re.match(r'^[0-9.,]*$', payload[6]):
        exprstring06 = payload[6]
        try:
            value06 = round(evaluate(exprstring06, {'t': elapsed_time}), 4)
        except Exception as e:
            value06 = str(e)  # Pass the error message as a string to value06
        mqtt_data[6] = value06

    elif isinstance(payload[6], list):
        # Cycle through the list elements
        value06 = payload[6][current_indices[6]]
        try:
            mqtt_data[6] = float(value06)  # Convert to float if possible
        except ValueError:
            mqtt_data[6] = value06  # Use the original string if conversion fails
        current_indices[6] = (current_indices[6] + 1) % len(payload[6])        
        
    else:
        mqtt_data[6] = payload[6]  # Use the string directly

#  Nr. 07  scale y ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    if isinstance(payload[7], str) and not re.match(r'^[0-9.,]*$', payload[7]):
        exprstring07 = payload[7]
        try:
            value07 = round(evaluate(exprstring07, {'t': elapsed_time}), 4)
        except Exception as e:
            value07 = str(e)  # Pass the error message as a string to value07
        mqtt_data[7] = value07

    elif isinstance(payload[7], list):
        # Cycle through the list elements
        value07 = payload[7][current_indices[7]]
        try:
            mqtt_data[7] = float(value07)  # Convert to float if possible
        except ValueError:
            mqtt_data[7] = value07  # Use the original string if conversion fails
        current_indices[7] = (current_indices[7] + 1) % len(payload[7])        
        
    else:
        mqtt_data[7] = payload[7]  # Use the string directly

#  Nr. 08  scale z ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    if isinstance(payload[8], str) and not re.match(r'^[0-9.,]*$', payload[8]):
        exprstring08 = payload[8]
        try:
            value08 = round(evaluate(exprstring08, {'t': elapsed_time}), 4)
        except Exception as e:
            value08 = str(e)  # Pass the error message as a string to value08
        mqtt_data[8] = value08

    elif isinstance(payload[8], list):
        # Cycle through the list elements
        value08 = payload[8][current_indices[8]]
        try:
            mqtt_data[8] = float(value08)  # Convert to float if possible
        except ValueError:
            mqtt_data[8] = value08  # Use the original string if conversion fails
        current_indices[8] = (current_indices[8] + 1) % len(payload[8])        
        
    else:
        mqtt_data[8] = payload[8]  # Use the string directly

#  Nr. 09  mode ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    if isinstance(payload[9], str) and not re.match(r'^[0-9.,]*$', payload[9]):
        exprstring09 = payload[9]
        try:
            value09 = round(evaluate(exprstring09, {'t': elapsed_time}), 4)
        except Exception as e:
            value03 = str(e)  # Pass the error message as a string to value03
        mqtt_data[9] = value09

    elif isinstance(payload[9], list):
        # Cycle through the list elements
        value09 = payload[9][current_indices[9]]
        try:
            mqtt_data[9] = float(value09)  # Convert to float if possible
        except ValueError:
            mqtt_data[9] = value09  # Use the original string if conversion fails
        current_indices[9] = (current_indices[9] + 1) % len(payload[9])        
        
    else:
        mqtt_data[9] = payload[9]  # Use the string directly
        
#  Nr. 10  value_A ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    if isinstance(payload[10], str) and not re.match(r'^[0-9.,]*$', payload[10]):
        exprstring10 = payload[10]
        try:
            value10 = round(evaluate(exprstring10, {'t': elapsed_time}), 4)
        except Exception as e:
            value10 = str(e)  # Pass the error message as a string to value10
        mqtt_data[10] = value10

    elif isinstance(payload[10], list):
        # Cycle through the list elements
        value10 = payload[10][current_indices[10]]
        try:
            mqtt_data[10] = float(value10)  # Convert to float if possible
        except ValueError:
            mqtt_data[10] = value10  # Use the original string if conversion fails
        current_indices[10] = (current_indices[10] + 1) % len(payload[10])        
        
    else:
        mqtt_data[10] = payload[10]  # Use the string directly

#  Nr. 11  value_B ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    if isinstance(payload[11], str) and not re.match(r'^[0-9.,]*$', payload[11]):
        exprstring11 = payload[11]
        try:
            value11 = round(evaluate(exprstring11, {'t': elapsed_time}), 4)
        except Exception as e:
            value11 = str(e)  # Pass the error message as a string to value11
        mqtt_data[11] = value11

    elif isinstance(payload[11], list):
        # Cycle through the list elements
        value11 = payload[11][current_indices[11]]
        try:
            mqtt_data[11] = float(value11)  # Convert to float if possible
        except ValueError:
            mqtt_data[11] = value11  # Use the original string if conversion fails
        current_indices[11] = (current_indices[11] + 1) % len(payload[11])        
        
    else:
        mqtt_data[11] = payload[11]  # Use the string directly

#  Nr. 12  TIME  create timestamp ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    timestamp = datetime.now()
    mqtt_data[12] = str(timestamp)
    
#~~final mqtt-payload ~ Publish data ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
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
