import paho.mqtt.client as mqtt
import requests

# URL Firebase Anda (pastikan berakhiran /sensor_aktual)
FIREBASE_URL = "https://nutribot-18e6e-default-rtdb.firebaseio.com/NutriBot_Node1/sensor_aktual"

def on_connect(client, userdata, flags, rc):
    print("[STATUS] Terhubung ke MQTT Broker!")
    client.subscribe("nutribot/sensor/#")

def on_message(client, userdata, msg):
    topic = msg.topic
    payload = msg.payload.decode('utf-8')
    
    # Mencocokkan topik dari ESP32 ke alamat Firebase
    firebase_path = ""
    if topic == "nutribot/sensor/volume_air":
        firebase_path = "/volume_air_persen.json"
    elif topic == "nutribot/sensor/level_nutrisi":
        firebase_path = "/level_nutrisi_persen.json"
    elif topic == "nutribot/sensor/suhu":
        firebase_path = "/suhu_air.json"
    elif topic == "nutribot/sensor/ph":
        firebase_path = "/ph_air.json"

    # Tembakkan ke Firebase
    if firebase_path:
        url = FIREBASE_URL + firebase_path
        requests.put(url, data=payload)
        print(f"[TERSIMPAN] {topic} -> {payload}")

client = mqtt.Client()
client.on_connect = on_connect
client.on_message = on_message
client.connect("broker.hivemq.com", 1883, 60)

print("=== JEMBATAN MQTT KE FIREBASE AKTIF ===")
client.loop_forever()