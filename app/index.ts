import { mqtt, db } from "./clients";
import type { MQTTReturnData } from "./types";

// checks
if (!process.env.MQTT_BROKER_URL)
  throw new Error("MQTT_BROKER_URL environment variable is not set.");

if (!process.env.DATABASE_URL)
  throw new Error("DATABASE_URL environment variable is not set.");

process.stdout.write("Starting backend...\n");

mqtt.on("connect", () => {
  mqtt.subscribe("eco_clients/#", { qos: 0 }, async (err) => {
    if (err) {
      console.log(err);
      process.exit(1);
    }
  });
});

mqtt.on("reconnect", () => console.log("Reconnecting..."));
mqtt.on("error", async (err) => {
  console.error("MQTT error:", err);
});

mqtt.on("message", async (topic, message) => {
  const raw = message.toString();
  if (
    topic
      .split("/")[1]
      ?.match(
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/,
      ) == null
  ) {
    console.error("Invalid client ID format");
    return;
  }
  if (
    topic.split("/")[2] === "status" ||
    topic.split("/")[2] === "server_response"
  ) {
    mqtt.unsubscribe(`eco_clients/${topic.split("/")[1]}/#`);
    mqtt.subscribe(`eco_clients/${topic.split("/")[1]}/data`);
  } else if (topic.split("/")[2] === "data") {
    var jsonData: any = {};
    try {
      jsonData = JSON.parse(message.toString());
    } catch (error) {
      console.error("Failed to parse JSON:", error);
      return;
    }
    if (
      !(
        jsonData !== null &&
        typeof jsonData === "object" &&
        typeof (jsonData as any).esp_temp === "number"
      )
    ) {
      console.error("Received payload does not match MQTTReturnData");
      return;
    }

    process.stdout.write(
      `Device ${topic.split("/")[1]} ESP32 Temp: ${jsonData.esp_temp}, Local Temp: ${jsonData.local_temp}, Local Hum: ${jsonData.local_hum}, Local GPS Lat: ${jsonData.local_gps_lat}, Local GPS Long: ${jsonData.local_gps_long} \n\n`,
    );
    mqtt.publish(`eco_clients/${topic.split("/")[1]}/server_response`, `ok`);
  }
});

// ON PROCESS QUIT
process.on("SIGINT", () => {
  console.log("Closing MQTT connection...");
  mqtt.end(false, {}, () => {
    console.log("MQTT connection closed");
    process.exit(0);
  });
});
process.on("SIGTERM", () => {
  console.log("Closing MQTT connection...");
  mqtt.end(false, {}, () => {
    console.log("MQTT connection closed");
    process.exit(0);
  });
});
