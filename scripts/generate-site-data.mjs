import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outputDir = path.join(rootDir, 'data');
const outputPath = path.join(outputDir, 'site-data.json');

const SOURCE_TIME_ZONE = process.env.ALERT_TIME_ZONE || 'Asia/Jerusalem';
const WINDOW_DAYS = Number.parseInt(process.env.ALERT_WINDOW_DAYS || '365', 10);
const USER_AGENT = 'Mozilla/5.0 (GitHub Actions; alert-map) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36';

function formatDateInTimeZone(date, timeZone = SOURCE_TIME_ZONE) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter(part => part.type !== 'literal')
      .map(part => [part.type, part.value])
  );

  return `${parts.year}-${parts.month}-${parts.day}`;
}

function getWindowRange(windowDays) {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - (windowDays - 1));

  return {
    from: formatDateInTimeZone(start),
    to: formatDateInTimeZone(end),
  };
}

async function fetchJson(url, referer) {
  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      'user-agent': USER_AGENT,
      referer,
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed for ${url}: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

function slimAlert(alert) {
  return {
    id: alert.id,
    cities: Array.isArray(alert.cities) ? alert.cities : [],
    type: Number(alert.type),
    startTime: Number(alert.startTime),
    endTime: Number(alert.endTime),
    description: alert.description || '',
  };
}

async function main() {
  const range = getWindowRange(WINDOW_DAYS);
  const alertsUrl = `https://tzevadom.com/api/alerts-history/summary/custom/${range.from}/${range.to}`;
  const alertsReferer = `https://tzevadom.com/summary/custom/${range.from}/${range.to}`;
  const citiesUrl = 'https://www.tzevaadom.co.il/static/cities.json';

  const [alertsData, citiesData] = await Promise.all([
    fetchJson(alertsUrl, alertsReferer),
    fetchJson(citiesUrl, 'https://www.tzevaadom.co.il/'),
  ]);

  const alerts = Array.isArray(alertsData.alerts) ? alertsData.alerts.map(slimAlert) : [];
  const cities = citiesData.cities || {};

  const payload = {
    meta: {
      generatedAt: new Date().toISOString(),
      range,
      windowDays: WINDOW_DAYS,
      alertCount: alerts.length,
      cityCount: Object.keys(cities).length,
      timeZone: SOURCE_TIME_ZONE,
      sources: {
        alerts: alertsUrl,
        cities: citiesUrl,
      },
    },
    cities,
    alerts,
  };

  await mkdir(outputDir, { recursive: true });
  await writeFile(outputPath, JSON.stringify(payload));

  console.log(`Wrote ${alerts.length} alerts and ${Object.keys(cities).length} cities to ${outputPath}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
