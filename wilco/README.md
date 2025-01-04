# Twinjago - Wilco

a demon that cleans up sensor data and packetize it into timeseries per device for a specific timespan.
This is for people who want to download sensordata and play around with it, the format is CSV.

It repeatingly sucks sensor data for all sensors from the influx DB for a timespan, default is 4 hours, then generates CSV Files per sensor and saves them to disk.
Furthermore it exports the diskspace with the CSV Files to web and makes them downloadable.
It creates a directory for each device and saves the data in 4h (or another given timespan) packets.


## Requirements
- **influxdb** that hold the sensordata in time series
- **nodejs** to run the demon

## Webinterface

- it is reachable on port 3210 for http, 3211 for https
- no parameter exports the top directory with all sensors
- **/?ID** exports the directory for the given deviceid

## Trivia

- the name wilco comes from the Sierra computer game space quest. The main character in Space Quest is Roger Wilco. He was the last survivor on that spaceship after a crash. And he was janitor on that ship.
Wilco is also the standard abbreviation in radio communication for __will comply__.