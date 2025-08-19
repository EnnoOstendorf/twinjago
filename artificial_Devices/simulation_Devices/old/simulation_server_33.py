from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import os
import paho.mqtt.client as mqtt
import ssl
import time
import subprocess
import signal

class SimpleHTTPRequestHandler(BaseHTTPRequestHandler):

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def check_mqtt_status(self, device_id):
        config_mqtt_broker_ip = "iot.fh-muenster.de"
        config_mqtt_client_id = "fh-Kennung"
        config_mqtt_topic = f"meta/{device_id}"

        message_received = False

        def on_connect(client, userdata, flags, rc):
            client.subscribe(config_mqtt_topic)

        def on_message(client, userdata, msg):
            nonlocal message_received
            message_received = True
            client.disconnect()

        mqtt_c = mqtt.Client(config_mqtt_client_id)
        mqtt_c.on_connect = on_connect
        mqtt_c.on_message = on_message
        mqtt_c.username_pw_set("user001", "4ENRDutXyy")
        mqtt_c.tls_set(ca_certs="ca.pem")
        mqtt_c.tls_insecure_set(True)
        mqtt_c.connect(config_mqtt_broker_ip, 8883, 60)

        mqtt_c.loop_start()
        time.sleep(0.1)
        mqtt_c.loop_stop()
        mqtt_c.disconnect()

        return "TRUE" if message_received else "FALSE"

    def do_GET(self):
        existing_data = {}

        if self.path == '/':
            existing_data = {}
            if os.path.exists('data.txt'):
                with open('data.txt', 'r', encoding='utf-8') as f:
                     existing_data = json.load(f)
            
                for panel_id, device_data in existing_data.items():
                    device_id = device_data['id_object']['id']
                    mqtt_status = self.check_mqtt_status(device_id)
                    device_data['mqtt_status'] = mqtt_status

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(existing_data).encode('utf-8'))
            return

    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        try:
            data = json.loads(post_data)
            device_id = data.get('id')
            path = self.path

            if self.path == "/stop":
                panel_id = f"panel{data.get('panelId')}"
                print(f"Stop device action for panel {panel_id}")

                # Lesen und Beenden des Prozesses und dann die PID-Einträge aus Datei entfernen
                
                if os.path.exists('Dummy-PIDs.txt'):
                    with open('Dummy-PIDs.txt', 'r') as f:
                        lines = f.readlines()

                    with open('Dummy-PIDs.txt', 'w') as f:
                        for line in lines:
                            elements = line.strip().split(',')
                            if elements[0] == panel_id:
                                pid = int(elements[2])
                                device_id = elements[1]
                                try:
                                    os.kill(pid, signal.SIGTERM)
                                    print(f"Process {pid} terminated.")
                                except Exception as e:
                                    print(f"Error terminating process {pid}: {e}")
                            else:
                                f.write(line)

                # Abfrage des MQTT-Status, um ihn zurück an den Client zu senden
                mqtt_status = self.check_mqtt_status(device_id) if device_id else "FALSE"
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                response = {
                    "message": "Stop request processed",
                    "mqtt_status": mqtt_status
                }
                self.wfile.write(json.dumps(response).encode('utf-8'))
                return

            elif self.path == "/delete":
                print(f"delete?")
				

            panel_id = f"panel{data.get('panelId')}"
            device_id = data.get('id')

            # Erstellen der Datenstruktur und Schreiben in die Datei
            mqtt_meta = {
                "type": 1,
                "name": data.get("name"),
                "desc": data.get("comment"),
                "payloadType": "json",
                "payloadStructure": [
                    {"name": entry["itemName"], "unit": entry.get("unit")}
                    for entry in data.get("inputTable", [])
                ]
            }

            payload = {
                "values": [entry["value"] for entry in data.get("inputTable", [])]
            }

            id_object = {"id": device_id}
            sleep_object = {"sleep": data.get("sleep")}

            device_data = {
                "id_object": id_object,
                "mqtt_meta": mqtt_meta,
                "sleep_object": sleep_object,
                "payload": payload
            }

            existing_data = {}
            if os.path.exists('data.txt'):
                with open('data.txt', 'r', encoding='utf-8') as f:
                    existing_data = json.load(f)

            existing_data[panel_id] = device_data

            with open('data.txt', 'w', encoding='utf-8') as f:
                json.dump(existing_data, f, indent=4, ensure_ascii=False)

            # Starten des Scripts "mqtt_dummy_publish_test_03.py"
            process = subprocess.Popen(['python3', 'dummy_mqtt_publisher_001.py', device_id])
            pid = process.pid

            # Schreiben der PID-Daten
            with open('Dummy-PIDs.txt', 'a') as f:
                f.write(f"{panel_id},{device_id},{pid}\n")

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            mqtt_check_status = self.check_mqtt_status(device_id)            
            response = {
                "Device": device_id,
                "mqtt_status": mqtt_check_status
            }
            self.wfile.write(json.dumps(response).encode('utf-8'))

        except (json.JSONDecodeError, KeyError) as e:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            error_response = {"error": "Ungültiges JSON oder fehlende Daten"}
            self.wfile.write(json.dumps(error_response).encode('utf-8'))

def run(server_class=HTTPServer, handler_class=SimpleHTTPRequestHandler, port=3555):
    server_address = ('', port)
    httpd = server_class(server_address, handler_class)
    print(f'Starting httpd server on port {port}')
    httpd.serve_forever()

if __name__ == '__main__':
    run()
