#!/bin/bash

#~~~artificial_device_service_starter~~~

#cd ~

#1.
cd dupli_Devices
nohup python3 dupli_mqtt_server_37.py &
#startet: dupli_mqtt_publisher_001.py
#benötigt: crazy_Device_Stopper.py


#2. 
cd ../simulation_Devices
nohup python3 simulation_server_42.py &
#startet: simulation_mqtt_publisher_002.py

#3. 
cd ../moving_Devices
nohup python3 Movin_server_43.py &
#startet: mqtt_moving_dummy_publisher_06.py



