/* ===== نوار اطلاعات زنده: تاریخ شمسی، آب‌وهوا، نرخ‌ها ===== */

// تبدیل اعداد انگلیسی به فارسی
function toFaDigits(n) {
  const fa = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
  return String(n).replace(/[0-9]/g, d => fa[d]);
}

// جدا کردن سه رقم سه رقم با کاما انگلیسی
function formatNumber(num) {
  const parts = String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return toFaDigits(parts);
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

// آب و هوا مستقیم از Open-Meteo
async function loadWeather() {
  const tiWeather = document.getElementById('tiWeather');
  if (!tiWeather) return;
  
  try {
    const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=26.9576&longitude=56.2719&current_weather=true');
    const data = await res.json();
    
    if (data && data.current_weather) {
      const temp = Math.round(data.current_weather.temperature);
      const code = data.current_weather.weathercode;
      let desc = '';
      let icon = '';
      
      if (code === 0) { desc = 'آفتابی'; icon = '☀️'; }
      else if (code <= 3) { desc = 'نیمه ابری'; icon = '⛅'; }
      else if (code <= 48) { desc = 'مه‌آلود'; icon = '🌫️'; }
      else if (code <= 67) { desc = 'بارانی'; icon = '🌧️'; }
      else if (code <= 77) { desc = 'برفی'; icon = '❄️'; }
      else { desc = 'رگباری'; icon = '🌦️'; }
      
      tiWeather.innerHTML = `${icon} <span class="weather-temp">${toFaDigits(temp)}°C</span> <span class="weather-desc">${desc}</span> <span class="weather-city">قشم</span>`;
    } else {
      tiWeather.textContent = '—';
    }
  } catch (e) {
    console.error('Error loading weather:', e);
    tiWeather.textContent = '—';
  }
}

// نرخ ارز و سکه از Apps Script (شیت Rates)
async function loadRates() {
  const tiUsd = document.getElementById('tiUsd');
  const tiAed = document.getElementById('tiAed');
  const tiCoin = document.getElementById('tiCoin');
  if (!tiUsd || !tiAed || !tiCoin) return;
  
  try {
    const data = await sahelApiCall({ action: 'getRates' });
    
    if (data.success && data.rates) {
      if (data.rates.USD) {
        tiUsd.innerHTML = `💵 <span class="rate-label">دلار</span> <span class="rate-value">${formatNumber(data.rates.USD)}</span>`;
      } else {
        tiUsd.innerHTML = '💵 <span class="rate-label">دلار</span> <span class="rate-value">—</span>';
      }
      
      if (data.rates.AED) {
        tiAed.innerHTML = `💴 <span class="rate-label">درهم</span> <span class="rate-value">${formatNumber(data.rates.AED)}</span>`;
      } else {
        tiAed.innerHTML = '💴 <span class="rate-label">درهم</span> <span class="rate-value">—</span>';
      }
      
      if (data.rates.COIN) {
        tiCoin.innerHTML = `🪙 <span class="rate-label">سکه</span> <span class="rate-value">${formatNumber(data.rates.COIN)}</span>`;
      } else {
        tiCoin.innerHTML = '🪙 <span class="rate-label">سکه</span> <span class="rate-value">—</span>';
      }
    } else {
      tiUsd.innerHTML = '💵 <span class="rate-label">دلار</span> <span class="rate-value">—</span>';
      tiAed.innerHTML = '💴 <span class="rate-label">درهم</span> <span class="rate-value">—</span>';
      tiCoin.innerHTML = '🪙 <span class="rate-label">سکه</span> <span class="rate-value">—</span>';
    }
  } catch (e) {
    console.error('Error loading rates:', e);
    tiUsd.innerHTML = '💵 <span class="rate-label">دلار</span> <span class="rate-value">—</span>';
    tiAed.innerHTML = '💴 <span class="rate-label">درهم</span> <span class="rate-value">—</span>';
    tiCoin.innerHTML = '🪙 <span class="rate-label">سکه</span> <span class="rate-value">—</span>';
  }
}

// بارگذاری همه اطلاعات
function loadTopbarWidgets() {
  const tiDate = document.getElementById('tiDate');
  if (tiDate) {
    const dateStr = getPersianDate();
    tiDate.innerHTML = `📅 <span class="date-value">${dateStr}</span>`;
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
