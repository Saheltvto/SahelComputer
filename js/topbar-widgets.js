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
      tiWeather.textContent = `قشم: ${toFaDigits(temp)}°C ${desc}`;
    } else {
      tiWeather.textContent = 'قشم: —';
    }
  } catch (e) {
    tiWeather.textContent = 'قشم: —';
  }
}

// نرخ ارز و سکه از bonbast.com
async function loadRates() {
  const tiUsd = document.getElementById('tiUsd');
  const tiAed = document.getElementById('tiAed');
  const tiCoin = document.getElementById('tiCoin');
  if (!tiUsd || !tiAed || !tiCoin) return;
  
  try {
    // استفاده از bonbast.com برای نرخ‌ها
    const response = await fetch('https://bonbast.com/graph', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'param=USD,EUR,AED,COIN'
    });
    
    if (response.ok) {
      const data = await response.json();
      
      // ساختار داده bonbast.com (هر ارز دو مقدار: sell و buy)
      if (data && data.USD) {
        const usdSell = data.USD.sell || '—';
        tiUsd.textContent = `دلار: ${toFaDigits(usdSell)}`;
      }
      
      if (data && data.AED) {
        const aedSell = data.AED.sell || '—';
        tiAed.textContent = `درهم: ${toFaDigits(aedSell)}`;
      }
      
      if (data && data.COIN) {
        const coinSell = data.COIN.sell || '—';
        tiCoin.textContent = `سکه: ${toFaDigits(coinSell)}`;
      }
    } else {
      // اگر bonbast جواب نداد، مقادیر پیش‌فرض
      tiUsd.textContent = 'دلار: —';
      tiAed.textContent = 'درهم: —';
      tiCoin.textContent = 'سکه: —';
    }
  } catch (e) {
    console.error('Error loading rates:', e);
    tiUsd.textContent = 'دلار: —';
    tiAed.textContent = 'درهم: —';
    tiCoin.textContent = 'سکه: —';
  }
}

// بارگذاری همه اطلاعات
function loadTopbarWidgets() {
  const tiDate = document.getElementById('tiDate');
  if (tiDate) tiDate.textContent = getPersianDate();
  
  loadWeather();
  loadRates();
}

// بارگذاری اولیه و به‌روزرسانی دوره‌ای
if (document.getElementById('tiDate')) {
  loadTopbarWidgets();
  setInterval(loadWeather, 600000); // آب و هوا هر ۱۰ دقیقه
  setInterval(loadRates, 300000);   // نرخ‌ها هر ۵ دقیقه
}
