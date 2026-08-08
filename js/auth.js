const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const loginBtn = document.getElementById('loginBtn');

if (loginForm) {
  loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    loginError.style.display = 'none';
    loginBtn.disabled = true;
    loginBtn.textContent = 'در حال ورود...';

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    try {
      const data = await sahelApiCall({ action: 'login', email: email, password: password });
      if (data.success) {
        sessionStorage.setItem('sahel_user', JSON.stringify(data.user));
        window.location.href = 'dashboard.html';
      } else {
        loginError.textContent = data.message || 'ورود ناموفق بود.';
        loginError.style.display = 'block';
      }
    } catch (err) {
      loginError.textContent = 'خطا در برقراری ارتباط با سرور. آدرس API را بررسی کنید.';
      loginError.style.display = 'block';
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = 'ورود';
    }
  });
}
