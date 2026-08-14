// آدرس Web App که بعد از Deploy کردن Apps Script می‌گیرید را اینجا جایگزین کنید
// مثال: https://script.google.com/macros/s/AKfycb.../exec
const SAHEL_API_URL = "https://script.google.com/macros/s/AKfycbyS2fUQG28Tpr2H2HrKZkql15UO9XJdnFjrwUk80MSQkhbk-JVODdKzLFPBE4jXdTg91g/exec";

async function sahelApiCall(payload) {
  const res = await fetch(SAHEL_API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  });
  return res.json();
}
