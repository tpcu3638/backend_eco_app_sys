import { mqtt } from "./clients";

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
  if (topic.split("/")[2] === "status") {
    mqtt.unsubscribe(`eco_clients/${topic.split("/")[1]}/status`);
    mqtt.unsubscribe(`eco_clients/${topic.split("/")[1]}/server_response`);
  } else if (topic.split("/")[2] === "data") {
    const raw = message.toString();
    const displayed = raw.replace(/\r/g, "\\r").replace(/\n/g, "\\n");
    process.stdout.write(`Topic: ${topic}, Message: ${displayed}\n`);
    mqtt.publish(
      `eco_clients/${topic.split("/")[1]}/server_response`,
      `${displayed}`,
    );
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
