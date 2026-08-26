/* ===== نوار اطلاعات زنده: تاریخ شمسی، آب‌وهوا، نرخ‌ها ===== */

function toFaDigits(n) {
  const fa = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
  return String(n).replace(/[0-9]/g, d => fa[d]);
}

// تاریخ شمسی
function getPersianDate() {
  try {
    const now = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    return new Intl.DateTimeFormat('fa-IR', options).format(now);
  } catch (e) {
    return '';
  }
}

// آب و هوا قشم
async function loadWeather() {
  const tiWeather = document.getElementById('tiWeather');
  if (!tiWeather) return;
  
  try {
    const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=26.96&longitude=56.28&current_weather=true&timezone=Asia/Tehran');
    const data = await res.json();
    if (data && data.current_weather) {
      const temp = Math.round(data.current_weather.temperature);
      const code = data.current_weather.weathercode;
      let desc = '';
      if (code === 0) desc = 'آفتابی';
      else if (code <= 3) desc = 'نیمه ابری';
      else if (code <= 48) desc = 'مه‌آلود';
      else if (code <= 67) desc = 'بارانی';
      else if (code <= 77) desc = 'برفی';
      else desc = 'رگباری';
      
      let weatherIcon = '';
      if (code === 0) weatherIcon = '☀️';
      else if (code <= 3) weatherIcon = '⛅';
      else if (code <= 48) weatherIcon = '🌫️';
      else if (code <= 67) weatherIcon = '🌧️';
      else if (code <= 77) weatherIcon = '❄️';
      else weatherIcon = '🌦️';
      
      tiWeather.innerHTML = `${weatherIcon} ${toFaDigits(temp)}°C ${desc}`;
    } else {
      tiWeather.textContent = '—';
    }
  } catch (e) {
    tiWeather.textContent = '—';
  }
}

// نرخ ارز و سکه از Apps Script
async function loadRates() {
  const tiUsd = document.getElementById('tiUsd');
  const tiAed = document.getElementById('tiAed');
  const tiCoin = document.getElementById('tiCoin');
  if (!tiUsd || !tiAed || !tiCoin) return;
  
  try {
    const data = await sahelApiCall({ action: 'getRates' });
    if (data.success && data.rates) {
      if (data.rates['USD']) {
        tiUsd.innerHTML = `💵 ${toFaDigits(data.rates['USD'])}`;
      } else {
        tiUsd.textContent = '💵 —';
      }
      
      if (data.rates['AED']) {
        tiAed.innerHTML = `💴 ${toFaDigits(data.rates['AED'])}`;
      } else {
        tiAed.textContent = '💴 —';
      }
      
      if (data.rates['COIN']) {
        tiCoin.innerHTML = `🪙 ${toFaDigits(data.rates['COIN'])}`;
      } else {
        tiCoin.textContent = '🪙 —';
      }
    } else {
      tiUsd.textContent = '💵 —';
      tiAed.textContent = '💴 —';
      tiCoin.textContent = '🪙 —';
    }
  } catch (e) {
    console.error('Error loading rates:', e);
    tiUsd.textContent = '💵 —';
    tiAed.textContent = '💴 —';
    tiCoin.textContent = '🪙 —';
  }
}

// بارگذاری همه اطلاعات
function loadTopbarWidgets() {
  const tiDate = document.getElementById('tiDate');
  if (tiDate) {
    const dateStr = getPersianDate();
    tiDate.innerHTML = `📅 ${dateStr}`;
  }
  
  loadWeather();
  loadRates();
}

// بارگذاری اولیه و به‌روزرسانی دوره‌ای
if (document.getElementById('tiDate')) {
  loadTopbarWidgets();
  setInterval(loadWeather, 600000); // آب و هوا هر ۱۰ دقیقه
  setInterval(loadRates, 300000);   // نرخ‌ها هر ۵ دقیقه
}
