#!/bin/bash

PIPEPID=$(ps -eF | awk '/mqttInflux/ {print $2}' | awk -F";" 'NR == 1 { print $0}' )
echo $PIPEPID
##pm2 delete "$PIPEPID"
echo " pipe stoped"
sleep 1
##echo "[]" > pipestate.json
echo " flashing pipestate"
sleep 1
echo " start pipe"
pm2 start mqttInfluxGrafanaPipe.js
sleep 1
echo "done"
NEWPIPEPID=$(ps -eF | awk '/mqttInflux/ {print $2}' | awk -F";" 'NR == 1 { print $0}' )
echo "new ID is:"
echo $NEWPIPEPID

