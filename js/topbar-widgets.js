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
    document.getElementById('tiDate').innerHTML = `<span class="date-value">${dateStr}</span>`;
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

      let desc = 'آفتابی';
      let wxClass = 'wx-sun';
      if (code <= 1) { desc = 'آفتابی'; wxClass = 'wx-sun'; }
      else if (code <= 3) { desc = 'نیمه ابری'; wxClass = 'wx-cloud'; }
      else if (code <= 48) { desc = 'مه‌آلود'; wxClass = 'wx-fog'; }
      else if (code <= 67) { desc = 'بارانی'; wxClass = 'wx-rain'; }
      else { desc = 'ابری'; wxClass = 'wx-cloud'; }

      const el = document.getElementById('tiWeather');
      el.classList.remove('wx-sun', 'wx-cloud', 'wx-fog', 'wx-rain');
      el.classList.add(wxClass);
      el.innerHTML = `<span class="weather-temp">${toFaDigits(temp)}°C</span> <span class="weather-desc">${desc}</span> <span class="weather-city">قشم</span>`;
    }
  } catch (e) {}
}

loadDate();
loadWeather();
setInterval(loadWeather, 600000); // هر ۱۰ دقیقه
