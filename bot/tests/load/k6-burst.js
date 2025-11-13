import http from "k6/http";
import { sleep } from "k6";

export const options = {
  stages: [
    { duration: "1m", target: 50 },
    { duration: "2m", target: 300 },
    { duration: "30s", target: 600 },
    { duration: "1m", target: 50 }
  ],
  thresholds: {
    http_req_duration: ["p(95)<500", "p(99)<900"],
    http_req_failed: ["rate<0.02"]
  }
};

export default function () {
  const res = http.post(
    `${__ENV.BASE_URL}/telegram/webhook`,
    JSON.stringify({ update_id: Date.now(), message: { text: "/report" } }),
    {
      headers: {
        "Content-Type": "application/json",
        "X-Telegram-Bot-Api-Secret-Token": __ENV.WEBHOOK_SECRET
      }
    }
  );
  if (res.status !== 200 && res.status !== 429) {
    console.warn(`Unexpected status ${res.status}`);
  }
  sleep(1);
}
