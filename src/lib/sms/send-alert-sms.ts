interface AlertSummary {
  spotName: string;
  timeWindow: string;
  forecastHour: Date;
  effectiveScore: number;
}

export async function sendAlertSMS(
  phoneNumber: string,
  alerts: AlertSummary[]
): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.log("[sms] Twilio not configured, skipping");
    return false;
  }

  const body = formatSMSBody(alerts);

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: phoneNumber,
          From: fromNumber,
          Body: body,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error(`[sms] Twilio error (${response.status}):`, error);
      return false;
    }

    console.log(`[sms] Sent SMS to ${phoneNumber.slice(0, 4)}****`);
    return true;
  } catch (error) {
    console.error("[sms] Failed to send SMS:", error);
    return false;
  }
}

function formatSMSBody(alerts: AlertSummary[]): string {
  if (alerts.length === 1) {
    const a = alerts[0];
    const dateStr = formatDate(a.forecastHour);
    return `Wavebook: Good surf at ${a.spotName}! ${capitalize(a.timeWindow)} ${dateStr} — ${Math.round(a.effectiveScore)}% match.`;
  }

  const top = alerts.slice(0, 5);
  const lines = top.map(
    (a) =>
      `${a.spotName}: ${capitalize(a.timeWindow)} ${formatDate(a.forecastHour)} (${Math.round(a.effectiveScore)}%)`
  );

  let msg = `Wavebook: ${alerts.length} alerts\n${lines.join("\n")}`;
  if (alerts.length > 5) {
    msg += `\n...and ${alerts.length - 5} more`;
  }
  return msg;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
