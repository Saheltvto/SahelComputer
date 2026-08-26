/* ===== چت - فقط ارسال پیام ===== */

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
      loadChatMessages(contactId);
    }
  } catch (e) {
    console.error('Error:', e);
  } finally {
    btn.disabled = false;
  }
});

document.getElementById('chatInput')?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    document.getElementById('chatSendBtn').click();
  }
});
