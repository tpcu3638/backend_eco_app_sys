import * as mqtt1 from "mqtt";
import generateRandomString from "./components/randomString";
import { SQL } from "bun";

// checks
if (!process.env.MQTT_BROKER_URL)
  throw new Error("MQTT_BROKER_URL environment variable is not set.");

if (!process.env.DATABASE_URL)
  throw new Error("DATABASE_URL environment variable is not set.");

export const mqtt = mqtt1.connect(process.env.MQTT_BROKER_URL, {
  clientId: `mqtt_backend_eco_app_sys_${generateRandomString(8)}`,
  resubscribe: true,
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
});

const db = new SQL({
  url: process.env.DATABASE_URL!,
});

export { db };
