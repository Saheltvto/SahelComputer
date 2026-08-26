/* ===== نوار اطلاعات زنده: تاریخ شمسی، آب‌وهوا، نرخ‌ها ===== */

// تابع تبدیل اعداد به فارسی
function toFaDigits(n) {
  const fa = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
  return String(n).replace(/[0-9]/g, d => fa[d]);
}

// تاریخ شمسی
function getPersianDate() {
  try {
    const now = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    const dateStr = new Intl.DateTimeFormat('fa-IR', options).format(now);
    return dateStr;
  } catch (e) {
    return '';
  }
}

// آب و هوا قشم
async function loadWeather() {
  const tiWeather = document.getElementById('tiWeather');
  try {
    // استفاده از API رایگان Open-Meteo برای قشم
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

// نرخ ارز و سکه
async function loadRates() {
  const tiUsd = document.getElementById('tiUsd');
  const tiAed = document.getElementById('tiAed');
  const tiCoin = document.getElementById('tiCoin');
  
  try {
    // استفاده از API نرخ ارز - bonbast.com (غیررسمی)
    const res = await fetch('https://bonbast.com/graph', {
      headers: { 'Accept': 'application/json' }
    });
    const data = await res.json();
    
    // این API ممکن است تغییر کند - جایگزین: می‌توانید از API دیگری استفاده کنید
    if (data) {
      // باید ساختار دقیق API را بررسی کنید
      const usd = data.usd_sell || data.USD?.sell || '—';
      const aed = data.aed_sell || data.AED?.sell || '—';
      const coin = data.coin_emami_sell || data.COIN?.sell || '—';
      
      tiUsd.textContent = `دلار: ${toFaDigits(usd)}`;
      tiAed.textContent = `درهم: ${toFaDigits(aed)}`;
      tiCoin.textContent = `سکه: ${toFaDigits(coin)}`;
    }
  } catch (e) {
    // در صورت خطا از API جایگزین استفاده کنید
    try {
      // API جایگزین: myapi.ir یا هر API داخلی دیگر
      const res = await fetch('https://api.myapi.ir/currency');
      const data = await res.json();
      if (data && data.currency) {
        const usd = data.currency.find(c => c.code === 'USD');
        const aed = data.currency.find(c => c.code === 'AED');
        if (usd) tiUsd.textContent = `دلار: ${toFaDigits(usd.price)}`;
        if (aed) tiAed.textContent = `درهم: ${toFaDigits(aed.price)}`;
      }
    } catch (e2) {
      tiUsd.textContent = 'دلار: —';
      tiAed.textContent = 'درهم: —';
    }
    
    // سکه از منبع دیگر
    try {
      const res = await fetch('https://api.myapi.ir/coin');
      const data = await res.json();
      if (data && data.coin) {
        tiCoin.textContent = `سکه: ${toFaDigits(data.coin.price)}`;
      }
    } catch (e3) {
      tiCoin.textContent = 'سکه: —';
    }
  }
}

// بارگذاری همه اطلاعات
function loadTopbarWidgets() {
  const tiDate = document.getElementById('tiDate');
  if (tiDate) tiDate.textContent = getPersianDate();
  
  loadWeather();
  loadRates();
}

// بارگذاری اولیه و هر ۱۰ دقیقه یکبار به‌روزرسانی
if (document.getElementById('tiDate')) {
  loadTopbarWidgets();
  setInterval(loadWeather, 600000); // آب و هوا هر ۱۰ دقیقه
  setInterval(loadRates, 300000);   // نرخ‌ها هر ۵ دقیقه
}
