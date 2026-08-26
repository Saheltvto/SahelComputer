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
      let icon = '';
      
      if (code === 0) { desc = 'آفتابی'; icon = '☀️'; }
      else if (code <= 3) { desc = 'نیمه ابری'; icon = '⛅'; }
      else if (code <= 48) { desc = 'مه‌آلود'; icon = '🌫️'; }
      else if (code <= 67) { desc = 'بارانی'; icon = '🌧️'; }
      else if (code <= 77) { desc = 'برفی'; icon = '❄️'; }
      else { desc = 'رگباری'; icon = '🌦️'; }
      
      tiWeather.innerHTML = `${icon} ${toFaDigits(temp)}°C ${desc}`;
    } else {
      tiWeather.textContent = '—';
    }
  } catch (e) {
    tiWeather.textContent = '—';
  }
}

// نرخ ارز و سکه از API آنلاین
async function loadRates() {
  const tiUsd = document.getElementById('tiUsd');
  const tiAed = document.getElementById('tiAed');
  const tiCoin = document.getElementById('tiCoin');
  if (!tiUsd || !tiAed || !tiCoin) return;
  
  // روش ۱: استفاده از API نوسان (navasan.tech)
  try {
    const response = await fetch('https://api.navasan.tech/latest/?api_key=free');
    const data = await response.json();
    
    if (data && data.usd && data.usd.value) {
      tiUsd.innerHTML = `💵 ${toFaDigits(Math.round(data.usd.value))}`;
    }
    
    if (data && data.aed && data.aed.value) {
      tiAed.innerHTML = `💴 ${toFaDigits(Math.round(data.aed.value))}`;
    }
    
    if (data && data.coin && data.coin.value) {
      tiCoin.innerHTML = `🪙 ${toFaDigits(Math.round(data.coin.value))}`;
    }
  } catch (e) {
    console.error('Error with navasan API:', e);
    loadRatesFromAlternative();
  }
}

// API جایگزین
async function loadRatesFromAlternative() {
  const tiUsd = document.getElementById('tiUsd');
  const tiAed = document.getElementById('tiAed');
  const tiCoin = document.getElementById('tiCoin');
  
  try {
    // استفاده از bonbast.com
    const response = await fetch('https://bonbast.com/graph', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'param=USD,AED,COIN'
    });
    
    if (response.ok) {
      const data = await response.json();
      
      if (data && data.USD && data.USD.sell) {
        tiUsd.innerHTML = `💵 ${toFaDigits(data.USD.sell)}`;
      } else {
        tiUsd.textContent = '💵 —';
      }
      
      if (data && data.AED && data.AED.sell) {
        tiAed.innerHTML = `💴 ${toFaDigits(data.AED.sell)}`;
      } else {
        tiAed.textContent = '💴 —';
      }
      
      if (data && data.COIN && data.COIN.sell) {
        tiCoin.innerHTML = `🪙 ${toFaDigits(data.COIN.sell)}`;
      } else {
        tiCoin.textContent = '🪙 —';
      }
    } else {
      // اگر bonbast هم جواب نداد، از شیت خودمان بخوانیم
      loadRatesFromSheet();
    }
  } catch (e) {
    console.error('Error with bonbast API:', e);
    loadRatesFromSheet();
  }
}

// خواندن از شیت Rates در صورت خطای API
async function loadRatesFromSheet() {
  const tiUsd = document.getElementById('tiUsd');
  const tiAed = document.getElementById('tiAed');
  const tiCoin = document.getElementById('tiCoin');
  
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
    }
  } catch (e) {
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
