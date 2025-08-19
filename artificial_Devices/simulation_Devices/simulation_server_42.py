from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import os
import paho.mqtt.client as mqtt
import ssl
import time
import subprocess
import signal
import random

device_ids = []

class SimpleHTTPRequestHandler(BaseHTTPRequestHandler):

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    device_ids = []

    def check_all_mqtt_status(self):
        config_mqtt_broker_ip = "iot.fh-muenster.de"
        config_mqtt_client_id = "fh-Kennung"
        config_mqtt_topic = f"meta/#"
        message_received = False
        global device_ids
        device_ids = []
        def on_connect(client, userdata, flags, rc):
        	client.subscribe(config_mqtt_topic)
        def on_message(client, userdata, msg):
            global device_ids
            device_id = msg.topic.split("/")[1]
            if device_id not in device_ids:
                device_ids.append(device_id)
        mqtt_c = mqtt.Client(config_mqtt_client_id)
        mqtt_c.on_connect = on_connect
        mqtt_c.on_message = on_message
        mqtt_c.username_pw_set("user001", "4ENRDutXyy")
        mqtt_c.tls_set(ca_certs="ca.pem")
        mqtt_c.tls_insecure_set(True)
        mqtt_c.connect(config_mqtt_broker_ip, 8883, 60)
        mqtt_c.loop_start()
        time.sleep(0.2)
        mqtt_c.loop_stop()
        mqtt_c.disconnect()
        print(device_ids)

    def check_list_mqtt_status(self, device_id):
        print("checklist")
        global device_ids  # Globale Referenz auf die Liste der Device-IDs
        return "TRUE" if device_id in device_ids else "FALSE"
        

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
        self.check_all_mqtt_status()
        global device_ids
        if self.path == '/':
            existing_data = {}
            if os.path.exists('mqtt_simulation_json_data.txt'):
                with open('mqtt_simulation_json_data.txt', 'r', encoding='utf-8') as f:
                     existing_data = json.load(f)
                for panel_id, device_data in existing_data.items():
                    device_id = device_data['id_object']['id']
                    #mqtt_status = self.check_mqtt_status(device_id)
                    mqtt_status = self.check_list_mqtt_status(device_id)
                    device_data['mqtt_status'] = mqtt_status
                    print(f"device id  {device_id}")
                    print(f"device id  {mqtt_status}")
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
                if os.path.exists('simulation-PIDs.txt'):
                    with open('simulation-PIDs.txt', 'r') as f:
                        lines = f.readlines()
                    with open('simulation-PIDs.txt', 'w') as f:
                        for line in lines:
                            elements = line.strip().split(',')
                            if elements[1] == device_id:
                                pid = int(elements[2])
                                #device_id = elements[1]
                                try:
                                    os.kill(pid, signal.SIGTERM)
                                    print(f"Process {pid} terminated.")
                                except Exception as e:
                                    print(f"Error terminating process {pid}: {e}")
                            else:
                                f.write(line)
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
                panel_id = f"panel{data.get('panelId')}"
                print(f"delete {panel_id}?")
                existing_data = {}
                try:
                    panel_id = f"panel{data.get('panelId')}"
                    if not os.path.exists('mqtt_simulation_json_data.txt'):
                        self.send_response(404)
                        self.send_header('Content-Type', 'application/json')
                        self.send_header('Access-Control-Allow-Origin', '*')
                        self.end_headers()
                        self.wfile.write(json.dumps({"error": "mqtt_simulation_json_data.txt not found"}).encode('utf-8'))
                        return
               # Löschen der entsprechenden panelID
                    with open('mqtt_simulation_json_data.txt', 'r', encoding='utf-8') as f:
                        existing_data = json.load(f)
                    print(panel_id)
                    if panel_id in existing_data:
                        del existing_data[panel_id]
               # Panels in eine aufsteigende Reihenfolge bringen
                        sorted_keys = sorted(existing_data.keys(), key=lambda x: int(x.replace("panel", "")))
                        renamed_data = {}
                        for index, key in enumerate(sorted_keys, start=1):
                            new_key = f"panel{index}"
                            renamed_data[new_key] = existing_data[key]
                        # Aktualisierte Daten in die Datei schreiben
                        with open('mqtt_simulation_json_data.txt', 'w', encoding='utf-8') as f:
                            json.dump(renamed_data, f, indent=4, ensure_ascii=False)
                        self.send_response(200)
                        self.send_header('Content-Type', 'application/json')
                        self.send_header('Access-Control-Allow-Origin', '*')
                        self.end_headers()
                        self.wfile.write(json.dumps({"message": f"Panel {panel_id} deleted"}).encode('utf-8'))
                    else:
                        print("no panel?")
                except json.JSONDecodeError:
                    self.send_response(400)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": "Invalid JSON"}).encode('utf-8'))
                except Exception as e:
                    self.send_response(500)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": f"Internal server error: {str(e)}"}).encode('utf-8'))
                return

            elif self.path == "/newPanel":
                #panel_id = f"panel{data.get('panelId')}"
                print("new panel?")
                try:
                    # Öffne die Datei im Lesemodus und lade das JSON
                    with open('mqtt_simulation_json_data.txt', 'r', encoding='utf-8') as f:
                        existing_data = json.load(f)
                    # Bestimme die nächste Panel-ID
                    # Alle Keys filtern, die mit "panel" beginnen
                    panel_ids = [int(key.replace("panel", "")) for key in existing_data.keys() if key.startswith("panel")]
                    next_panel_id = max(panel_ids, default=0) + 1  # Nächste freie Panel-ID
                    new_panel_key = f"panel{next_panel_id}"
                    # Definiere den neuen Panel-Eintrag
                    new_panel_data = {
                        "id_object": {
                            "id": f"newdummy{next_panel_id}{str(random.randint(1, 10000))}"
                        },
                        "mqtt_meta": {
                            "type": 1,
                            "name": "dummy_sensor",
                            "desc": "simulation",
                            "payloadType": "json",
                            "payloadStructure": [
                                {"name": "A", "unit": ""},
                                {"name": "B", "unit": ""},
                                {"name": "C", "unit": ""},
                                {"name": "Timestamp", "unit": "datetime"}
                            ]
                        },
                        "sleep_object": {
                            "sleep": "1.0"
                        },
                        "payload": {
                            "values": [
                                "0.0",
                                "0.0",
                                "0.0",
                                "1.1.2000, 00:00:00"
                            ]
                        }
                    }
                    # Füge den neuen Eintrag zum JSON hinzu
                    existing_data[new_panel_key] = new_panel_data
                    # Schreibe die aktualisierten Daten zurück in die Datei
                    with open('mqtt_simulation_json_data.txt', 'w', encoding='utf-8') as f:
                        json.dump(existing_data, f, indent=4, ensure_ascii=False)
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({"message": "new panel"}).encode('utf-8'))
                    print(f"Neues Panel {new_panel_key} hinzugefügt.")

                except FileNotFoundError:
                    print("Fehler: Die Datei 'mqtt_simulation_json_data.txt' wurde nicht gefunden.")
                except json.JSONDecodeError:
                    print("Fehler: Die Datei 'mqtt_simulation_json_data.txt' enthält ungültiges JSON.")
                except Exception as e:
                    print(f"Ein unerwarteter Fehler ist aufgetreten: {e}")
                return

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
            if os.path.exists('mqtt_simulation_json_data.txt'):
                with open('mqtt_simulation_json_data.txt', 'r', encoding='utf-8') as f:
                    existing_data = json.load(f)

            existing_data[panel_id] = device_data

            with open('mqtt_simulation_json_data.txt', 'w', encoding='utf-8') as f:
                json.dump(existing_data, f, indent=4, ensure_ascii=False)

            # Starten des Scripts
            process = subprocess.Popen(['python3', 'simulation_mqtt_publisher_002.py', device_id])
            pid = process.pid
            # Schreiben der PID-Daten
            with open('simulation-PIDs.txt', 'a') as f:
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

def run(server_class=HTTPServer, handler_class=SimpleHTTPRequestHandler, host='freetwin.de', port=3555):
    server_address = (host, port)

    httpd = server_class(server_address, handler_class)

    # SSL konfigurieren
    httpd.socket = ssl.wrap_socket(httpd.socket,
                                   keyfile="/etc/letsencrypt/live/freetwin.de/privkey.pem",
                                   certfile="/etc/letsencrypt/live/freetwin.de/cert.pem",
                                   ca_certs="/etc/letsencrypt/live/freetwin.de/chain.pem",
                                   server_side=True)    

    print(f'Starting httpd server on port {port}')
    httpd.serve_forever()

if __name__ == '__main__':
    run()
