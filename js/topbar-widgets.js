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

// نرخ ارز و سکه
async function loadRates() {
  const tiUsd = document.getElementById('tiUsd');
  const tiAed = document.getElementById('tiAed');
  const tiCoin = document.getElementById('tiCoin');
  if (!tiUsd || !tiAed || !tiCoin) return;
  
  try {
    // استفاده از API رایگان - می‌توانید آدرس را تغییر دهید
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    const data = await res.json();
    
    if (data && data.rates) {
      const usdRate = Math.round((1 / data.rates.IRR) * 1000000); // تبدیل به تومان
      const aedRate = Math.round((data.rates.AED / data.rates.IRR) * 1000000);
      
      tiUsd.textContent = `دلار: ${toFaDigits(usdRate)}`;
      tiAed.textContent = `درهم: ${toFaDigits(aedRate)}`;
    }
  } catch (e) {
    tiUsd.textContent = 'دلار: —';
    tiAed.textContent = 'درهم: —';
  }
  
  // سکه - نیاز به API جداگانه
  try {
    // این API ممکن است کار نکند - باید یک API معتبر پیدا کنید
    const res = await fetch('https://api.iraneconomics.com/coin');
    const data = await res.json();
    if (data && data.price) {
      tiCoin.textContent = `سکه: ${toFaDigits(data.price)}`;
    }
  } catch (e) {
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
