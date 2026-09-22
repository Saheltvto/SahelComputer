// همزمان با نمایش فرم ورود، اسکریپت گوگل را در پس‌زمینه «گرم» می‌کنیم
// تا تا زمانی که کاربر ایمیل/رمز را تایپ می‌کند، تاخیر احتمالی Cold Start
// از قبل طی شده باشد و لحظه‌ی کلیک روی «ورود» سریع‌تر پاسخ بیاید.
if (typeof sahelWarmup === 'function') {
  sahelWarmup();
}

const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const loginBtn = document.getElementById('loginBtn');

function faDigitsLocal(n) {
  const fa = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(n).replace(/[0-9]/g, d => fa[d]);
}

if (loginForm) {
  loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    loginError.style.display = 'none';
    loginBtn.disabled = true;
    loginBtn.textContent = 'در حال ورود...';

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    try {
      // اگر تلاش اول به‌خاطر کندی/قطعی لحظه‌ای شبکه شکست بخورد، خودش
      // خودکار تا ۲ بار دیگر (جمعاً ۳ تلاش) دوباره امتحان می‌کند —
      // کاربر دیگر لازم نیست خودش چند بار دکمه را بزند.
      const data = await sahelApiCall(
        { action: 'login', email: email, password: password },
        {
          retries: 2,
          timeoutMs: 8000,
          onRetry: (attempt, total) => {
            loginBtn.textContent = `اتصال کند است، تلاش ${faDigitsLocal(attempt)} از ${faDigitsLocal(total)}...`;
          }
        }
      );

      if (data.success) {
        sessionStorage.setItem('sahel_user', JSON.stringify(data.user));
        window.location.href = 'dashboard.html';
      } else {
        loginError.textContent = data.message || 'ورود ناموفق بود.';
        loginError.style.display = 'block';
      }
    } catch (err) {
      loginError.textContent = 'اتصال به سرور برقرار نشد. اینترنت خود را بررسی کنید و دوباره تلاش کنید.';
      loginError.style.display = 'block';
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = 'ورود';
    }
  });
}
