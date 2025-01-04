# Twinjago - Wilco

a demon that cleans up sensor data and packetize it into timeseries per device for a specific timespan.
This is for people who want to download sensordata and play around with it, the format is CSV.

- repeatingly sucks sensor data for all sensors from the influx DB for a timespan of one hours, then generates CSV Files per sensor and saves them to disk.
- builds daily-files at midnight
- exports the diskspace with the CSV Files to web and makes them downloadable.
- exports a web interface to present the downloadable files


## Requirements
- **influxdb** that hold the sensordata in time series
- **nodejs** to run the demon

## Webinterface

- it is reachable on port 3210 for http, 3211 for https
- no parameter gives a web interface to filter for id and hourly / daily files
- the files can directly be accessed and therefore linked with path /archive for hourly, /archive/daily for daily files

## Trivia

- the name wilco comes from the Sierra computer game space quest. The main character in Space Quest is Roger Wilco. He was the last survivor on that spaceship after a crash. And he was janitor on that ship.
Wilco is also the standard abbreviation in radio communication for __will comply__.