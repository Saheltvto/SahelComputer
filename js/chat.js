/* ===== چت - ارسال پیام (تنها منبع مدیریت ارسال، برای جلوگیری از ارسال دوبل) ===== */
const chatInputEl = document.getElementById('chatInput');

function autoGrowChatInput() {
  if (!chatInputEl) return;
  chatInputEl.style.height = 'auto';
  chatInputEl.style.height = Math.min(chatInputEl.scrollHeight, 120) + 'px';
}

chatInputEl?.addEventListener('input', autoGrowChatInput);

document.getElementById('chatSendBtn')?.addEventListener('click', async () => {
  const input = document.getElementById('chatInput');
  const chatMessages = document.getElementById('chatMessages');
  const text = input.value.trim();
  const contactId = chatMessages.dataset.contactId;
  if (!text || !contactId) return;
  const btn = document.getElementById('chatSendBtn');
  btn.disabled = true;
  try {
    const data = await sahelApiCall({
      action: 'sendChatMessage',
      senderId: sahelUser.id,
      receiverId: contactId,
      text: text
    });
    if (data.success) {
      input.value = '';
      autoGrowChatInput();
      loadChatMessages(contactId);
    }
  } catch (e) {
    console.error('Error:', e);
  } finally {
    btn.disabled = false;
  }
});

document.getElementById('chatInput')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    document.getElementById('chatSendBtn').click();
  }
  // Shift+Enter به‌صورت پیش‌فرض مرورگر یک خط جدید در textarea ایجاد می‌کند
});
