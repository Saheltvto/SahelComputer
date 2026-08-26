/* ===== تاریخ شمسی و آب و هوا ===== */

function toFaDigits(n) {
  const fa = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
  return String(n).replace(/[0-9]/g, d => fa[d]);
}

// تاریخ شمسی
function loadDate() {
  try {
    const now = new Date();
    const dateStr = new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }).format(now);
    document.getElementById('tiDate').innerHTML = `📅 <span class="date-value">${dateStr}</span>`;
  } catch (e) {}
}

// آب و هوا
async function loadWeather() {
  try {
    const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=26.9576&longitude=56.2719&current_weather=true');
    const data = await res.json();
    if (data?.current_weather) {
      const temp = Math.round(data.current_weather.temperature);
      const code = data.current_weather.weathercode;
      let icon = '☀️';
      let desc = 'آفتابی';
      if (code <= 3) { icon = '⛅'; desc = 'نیمه ابری'; }
      else if (code <= 48) { icon = '🌫️'; desc = 'مه‌آلود'; }
      else if (code <= 67) { icon = '🌧️'; desc = 'بارانی'; }
      document.getElementById('tiWeather').innerHTML = `${icon} <span class="weather-temp">${toFaDigits(temp)}°C</span> <span class="weather-desc">${desc}</span> <span class="weather-city">قشم</span>`;
    }
  } catch (e) {}
}

loadDate();
loadWeather();

setInterval(loadWeather, 600000); // هر ۱۰ دقیقه
