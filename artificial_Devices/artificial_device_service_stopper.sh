#!/bin/bash

#~~~artificial_device_service_stopper~~~

PROCESS_NAME1="dupli_mqtt_server_37.py"
PROCESS_NAME2="simulation_server_42.py"
PROCESS_NAME3="Movin_server_43.py"
PROCESS_NAME4="dupli_mqtt_publisher_001.py"
PROCESS_NAME5="simulation_mqtt_publisher_002.py"
PROCESS_NAME6="mqtt_moving_dummy_publisher_06.py"

# Prozess-ID mit pgrep finden
PID1=$(pgrep -f "$PROCESS_NAME1")
PID2=$(pgrep -f "$PROCESS_NAME2")
PID3=$(pgrep -f "$PROCESS_NAME3")
PID4=$(pgrep -f "$PROCESS_NAME4")
PID5=$(pgrep -f "$PROCESS_NAME5")
PID6=$(pgrep -f "$PROCESS_NAME6")


# Überprüfen, ob der Prozess gefunden wurde
if [ -n "$PID1" ]; then
  echo "Prozess '$PROCESS_NAME1' gefunden mit PID: $PID1"
  # killen
  kill $PID1
  ps -p "$PID1" -o pid,args
  
else
  echo "Prozess nicht gefunden."
fi
  
if [ -n "$PID2" ]; then
  echo "Prozess '$PROCESS_NAME2' gefunden mit PID: $PID2"
  # killen
  kill $PID2
  ps -p "$PID2" -o pid,args
  
else
  echo "Prozess nicht gefunden."
fi
  
if [ -n "$PID3" ]; then
  echo "Prozess '$PROCESS_NAME3' gefunden mit PID: $PID3"
  # killen
  kill $PID3
  ps -p "$PID3" -o pid,args
  
else
  echo "Prozess nicht gefunden."
fi

if [ -n "$PID4" ]; then
  echo "Prozess '$PROCESS_NAME4' gefunden mit PID: $PID4"
  # killen
  kill $PID4
  ps -p "$PID4" -o pid,args
  
else
  echo "Prozess nicht gefunden."
fi
  
if [ -n "$PID5" ]; then
  echo "Prozess '$PROCESS_NAME5' gefunden mit PID: $PID5"
  # killen
  kill $PID5
  ps -p "$PID5" -o pid,args
  
else
  echo "Prozess nicht gefunden."
fi
  
if [ -n "$PID6" ]; then
  echo "Prozess '$PROCESS_NAME6' gefunden mit PID: $PID6"
  # killen
  kill $PID6
  ps -p "$PID6" -o pid,args
  
else
  echo "Prozess nicht gefunden."
fi

cd dupli_Devices
>Double-PIDs.txt
cd ../simulation_Devices
>simulation-PIDs.txt
cd ../moving_Devices
>moving-PIDs.txt


