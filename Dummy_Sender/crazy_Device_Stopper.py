import time
from datetime import datetime
import paho.mqtt.client as mqtt
import json
import argparse

# Set up argument parser
parser = argparse.ArgumentParser(description='MQTT Dummy Publisher')
parser.add_argument('bad_id', type=str, help='Device ID to be used as client ID')
args = parser.parse_args()
config_mqtt_client_id = args.bad_id

# Broker-Zugangsdaten
config_mqtt_broker_ip = "iot.fh-muenster.de"
config_mqtt_broker_user = "user001"
config_mqtt_broker_pass = "4ENRDutXyy"
#config_mqtt_client_id = "A4:CF:12:78:3C:8C_dupli"  # ID des hängengebliebenen Geräts

# The callback for when the client receives a CONNACK response from the server
def on_connect(client, userdata, flags, rc):
    print("Connected with result code " + str(rc))

client = mqtt.Client(config_mqtt_client_id, clean_session=True)
client.username_pw_set(config_mqtt_broker_user, config_mqtt_broker_pass)
client.on_connect = on_connect
client.tls_set(ca_certs="ca.pem")  
client.tls_insecure_set(True)
mqtt_meta_last_will = {'type' : 2}
client.will_set("meta/" + config_mqtt_client_id, None, qos=0, retain=True)
client.connect(config_mqtt_broker_ip, 8883, 60)

client.loop_start()

for i in range(1, 31):
    time.sleep(1)
time.sleep(1)

client.loop_stop()
client.disconnect()
print("Device disconnected")
