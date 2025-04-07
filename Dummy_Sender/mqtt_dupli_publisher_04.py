import time
import signal
from datetime import datetime
import paho.mqtt.client as mqtt
import json
import argparse
import subprocess
import os

# Set up argument parser
parser = argparse.ArgumentParser(description='MQTT Dupli Publisher')
parser.add_argument('original_id', type=str, help='Original ID to be used for data duplication')
args = parser.parse_args()

# Use the provided original ID to look up the new ID
original_id = args.original_id

# Load the new_id corresponding to the original_id from Double_Device_IDs.txt
def load_new_id(original_id):
    try:
        with open('Double_Device_IDs.txt', 'r', encoding='utf-8') as file:
            data = json.load(file)
            for entry in data.values():
                if entry['original_id'] == original_id:
                    return entry['new_id']
    except Exception as e:
        print(f"Error loading new ID for {original_id}: {e}")
    return None

new_id = load_new_id(original_id)
if not new_id:
    print(f"No new ID found for original ID: {original_id}")
    exit(1)

# Set up MQTT configurations
config_mqtt_broker_ip = "iot.fh-muenster.de"
config_mqtt_broker_user = "user001"
config_mqtt_broker_pass = "4ENRDutXyy"
config_mqtt_topic_meta = f"meta/{original_id}"
config_mqtt_topic_data = f"sensor/{original_id}"

# Callback to process received messages from the broker
def on_connect(client, userdata, flags, rc):
    print("Connected with result code " + str(rc))
    client.subscribe([(config_mqtt_topic_meta, 0), (config_mqtt_topic_data, 0)])

def on_message(client, userdata, msg):
    #print(f"Received {msg.topic}: {msg.payload.decode()}")
    #last_announce   = time.time()
    if msg.topic == config_mqtt_topic_meta:
        # Republish the meta-data under the new ID
        mqtt_c.publish(f"meta/{new_id}", msg.payload, qos=0, retain=True)
        
    elif msg.topic == config_mqtt_topic_data:
        # Republish the sensor data under the new ID
        mqtt_c.publish(f"sensor/{new_id}", msg.payload)

#    if (time.time() - last_announce) > 1:
#        mqtt_beacon = {
#            "type"      : 3,
#            "rssi"      : 0,
#            "uptime"    : time.time() - start_time,
#        }
#        mqtt_c.publish("beacon/" + config_mqtt_client_id, json.dumps(mqtt_beacon))
#        last_announce = time.time()  

def on_disconnect(client, userdata, rc):
    print("Disconnected from MQTT broker")

mqtt_c = mqtt.Client(new_id, clean_session=True)
mqtt_c.username_pw_set(config_mqtt_broker_user, config_mqtt_broker_pass)
mqtt_c.on_connect = on_connect
mqtt_c.on_message = on_message
mqtt_meta_last_will = {'type' : 2}
mqtt_c.will_set("meta/" + new_id, None, qos=0, retain=True)

#mqtt_c.on_disconnect = on_disconnect
mqtt_c.tls_set(ca_certs="ca.pem")
mqtt_c.tls_insecure_set(True)
mqtt_c.connect(config_mqtt_broker_ip, 8883, 60)

def disconnect_mqtt(client):
    print("Disconnecting MQTT client...")
    client.loop_stop()  # Stop network loop
    client.disconnect()

def signal_handler(signum, frame):
    process = subprocess.Popen(['python3', 'crazy_Device_Stopper.py', new_id])
    stopper_pid = process.pid
    print("new_id: ",new_id,"pid: ", stopper_pid)
    time.sleep(3)
    try:
        os.kill(stopper_pid, signal.SIGTERM)
        print(f"Process {stopper_pid} terminated.")
    except Exception as e:
        print(f"Error terminating process {stopper_pid}: {e}")
    
    
    mqtt_c.loop_stop()  # Ensure stopping the loop
    mqtt_c.disconnect()  # Clean disconnection
    print("Program terminated.")
    exit(0)

# Register signal handlers for termination signals
signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

mqtt_c.loop_start()

last_announce = time.time()
start_time = time.time()

try:
    while True:
        current_time = time.time()

        # Send MQTT beacon messages every second
        if (current_time - last_announce) > 1:
            mqtt_beacon = {
                "type": 3,
                "rssi": 0,
                "uptime": current_time - start_time,
            }
            mqtt_c.publish(f"beacon/{new_id}", json.dumps(mqtt_beacon))
            last_announce = current_time

        time.sleep(1)
    mqtt_c.loop_stop()
    mqtt_c.disconnect()
except KeyboardInterrupt:
    print("Exiting...")
    signal_handler(None, None)
finally:
    mqtt_c.loop_stop()
    mqtt_c.disconnect()
    
