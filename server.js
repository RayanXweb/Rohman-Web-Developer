const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "50kb" }));

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!BOT_TOKEN || !CHAT_ID) {
  console.error("ERROR: TELEGRAM_BOT_TOKEN atau TELEGRAM_CHAT_ID belum diatur.");
}

function escapeHtml(value) {
  return String(value ?? "-")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getDeviceName(platform, userAgent) {
  const ua = String(userAgent || "").toLowerCase();

  if (ua.includes("iphone")) return "iPhone";
  if (ua.includes("ipad")) return "iPad";
  if (ua.includes("android")) return "Android";
  if (ua.includes("windows")) return "Windows PC";
  if (ua.includes("macintosh")) return "Mac";
  if (ua.includes("linux")) return "Linux";

  return platform || "Perangkat tidak diketahui";
}

function formatLocation(latitude, longitude, accuracy) {
  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number"
  ) {
    return "Tidak tersedia";
  }

  const mapsUrl =
    `https://www.google.com/maps?q=${latitude},${longitude}`;

  const accuracyText =
    typeof accuracy === "number"
      ? `\nAkurasi: ±${Math.round(accuracy)} meter`
      : "";

  return `${mapsUrl}${accuracyText}`;
}

async function sendTelegram(message) {
  if (!BOT_TOKEN || !CHAT_ID) {
    throw new Error("Telegram environment variables belum tersedia.");
  }

  const response = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: "HTML",
        disable_web_page_preview: false
      })
    }
  );

  const result = await response.json();

  if (!response.ok || !result.ok) {
    throw new Error(
      result.description || "Telegram API gagal mengirim pesan."
    );
  }

  return result;
}

app.get("/", (req, res) => {
  res.json({
    status: "online",
    service: "Rohman Portfolio Telegram Notification API"
  });
});

app.post("/api/visit", async (req, res) => {
  try {
    const data = req.body?.data || {};

    const userAgent = data.userAgent || "Tidak tersedia";
    const platform = data.platform || "Tidak tersedia";

    const deviceName = getDeviceName(
      platform,
      userAgent
    );

    const location = formatLocation(
      data.latitude,
      data.longitude,
      data.accuracy
    );

    const message = `
<b>🔔 KUNJUNGAN WEBSITE</b>

<b>📱 Nama perangkat:</b>
${escapeHtml(deviceName)}

<b>🌐 User agent:</b>
<code>${escapeHtml(userAgent)}</code>

<b>📍 Lokasi:</b>
${escapeHtml(location)}

<b>🕐 Waktu:</b>
${escapeHtml(data.time || new Date().toISOString())}

<b>🌎 Bahasa:</b>
${escapeHtml(data.language || "-")}

<b>🖥️ Layar:</b>
${escapeHtml(data.screen || "-")}

<b>📄 Halaman:</b>
${escapeHtml(data.page || "-")}
`.trim();

    await sendTelegram(message);

    res.json({
      success: true,
      message: "Notifikasi berhasil dikirim."
    });

  } catch (error) {
    console.error("Telegram error:", error.message);

    res.status(500).json({
      success: false,
      message: "Gagal mengirim notifikasi."
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server berjalan pada port ${PORT}`);
});
