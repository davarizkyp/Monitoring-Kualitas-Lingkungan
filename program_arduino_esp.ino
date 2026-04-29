#include <ESP8266WiFi.h> // Ganti jadi ESP8266WiFi.h jika pakai ESP8266
#include <PubSubClient.h>
#include <DHT.h>

const char* ssid = "FCP";
const char* password = "laridulu5x";
const char* mqtt_server = "broker.hivemq.com";

// Konfigurasi DHT11
#define DHTPIN 14
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);

WiFiClient espClient;
PubSubClient client(espClient);

void setup() {
  Serial.begin(9600);
  dht.begin();
  
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(500); }
  client.setServer(mqtt_server, 1883);
}

void loop() {
  if (!client.connected()) { client.connect("ESP_DHT22_Praktikum"); }
  client.loop();

  // Baca suhu dan kelembaban (delay 2 detik karena DHT22 butuh waktu)
  delay(2000); 
  float h = dht.readHumidity();
  float t = dht.readTemperature();

  // Cek apakah sensor berhasil terbaca
  if (isnan(h) || isnan(t)) {
    Serial.println("Gagal membaca dari sensor DHT!");
    return;
  }

  // Menggabungkan data menjadi format JSON agar rapi
  String payload = "{\"suhu\":" + String(t) + ",\"kelembaban\":" + String(h) + "}";
  
  // Kirim ke MQTT
  client.publish("otomasi/sensor_dht", payload.c_str());
  
  Serial.print("Data Terkirim: ");
  Serial.println(payload);
}