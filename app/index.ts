import { mqtt, db } from "./clients";
import getCwaData from "./components/getCwaData";
import type { MQTTReturnData } from "./types";

const cache: Record<string, any> = {};

const CACHE_DURATION = 1000 * 60 * 60;

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
  try {
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
    const cwaData: any = await getCwaData(jsonData.local_gps_lat, jsonData.local_gps_long);
console.log(cwaData);
/**    await db`
        INSERT INTO logger (
          device_uuid,
          cwa_type,
          cwa_location,
          cwa_temp,
          cwa_hum,
          cwa_daily_high,
          cwa_daily_low,
          local_temp,
          local_hum,
          local_gps_lat,
          local_gps_long,
          local_time,
          local_jistatus,
          local_light,
          local_detect
        ) VALUES (
          ${topic.split("/")[1]},
          ${cwaData.data?.weather ?? "晴"},
          ${cwaData.data?.location ?? null},
          ${typeof jsonData.cwa_temp === "number" ? jsonData.cwa_temp : null},
          ${typeof jsonData.cwa_hum === "number" ? jsonData.cwa_hum : null},
          ${typeof jsonData.cwa_daily_high === "number" ? jsonData.cwa_daily_high : null},
          ${typeof jsonData.cwa_daily_low === "number" ? jsonData.cwa_daily_low : null},
          ${typeof jsonData.local_temp === "number" ? jsonData.local_temp : null},
          ${typeof jsonData.local_hum === "number" ? jsonData.local_hum : null},
          ${jsonData.local_gps_lat ?? null},
          ${jsonData.local_gps_long ?? null},
          ${jsonData.local_time ?? null},
          ${typeof jsonData.local_jistatus === "boolean" ? jsonData.local_jistatus : null},
          ${typeof jsonData.local_light === "boolean" ? jsonData.local_light : null},
          ${jsonData.local_detect ? JSON.stringify(jsonData.local_detect) : null}
        )
      `; */

    process.stdout.write(
      `Device ${topic.split("/")[1]}, ESP32 Temp: ${jsonData.esp_temp}, Local Temp: ${jsonData.local_temp}, Local Hum: ${jsonData.local_hum}, Local GPS Lat: ${jsonData.local_gps_lat}, Local GPS Long: ${jsonData.local_gps_long} \n\n`,
    );
    mqtt.publish(`eco_clients/${topic.split("/")[1]}/server_response`, `ok`);
  }
  } catch (e: any) {}
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
