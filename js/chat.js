/* ===== چت - ارسال پیام با کش آفلاین ===== */
const chatInputEl = document.getElementById('chatInput');

// ===== کش پیامهای آفلاین =====
const ChatMessageCache = {
  PREFIX: 'sahel_chat_',
  
  getKey(contactId) {
    return this.PREFIX + (sahelUser ? sahelUser.id + '_' : '') + contactId;
  },
  
  get(contactId) {
    try {
      const raw = localStorage.getItem(this.getKey(contactId));
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  },
  
  set(contactId, messages) {
    try {
      localStorage.setItem(this.getKey(contactId), JSON.stringify(messages));
    } catch (e) {}
  }
};

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
    // ⚡ ارسال آفلاین — ذخیره در صف
    console.log('آفلاین — پیام در صف ذخیره شد');
    
    const pendingMessages = JSON.parse(localStorage.getItem('sahel_pending_chats') || '[]');
    pendingMessages.push({
      senderId: sahelUser.id,
      receiverId: contactId,
      text: text,
      timestamp: Date.now()
    });
    localStorage.setItem('sahel_pending_chats', JSON.stringify(pendingMessages));
    
    // نمایش پیام به صورت محلی
    input.value = '';
    autoGrowChatInput();
    
    const timeStr = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    const chatMessagesEl = document.getElementById('chatMessages');
    chatMessagesEl.insertAdjacentHTML('beforeend', `
      <div class="chat-bubble chat-bubble-out" style="opacity:.7;">
        ${text}
        <span class="chat-bubble-time">${timeStr} (در انتظار ارسال)</span>
      </div>
    `);
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
    
    // تلاش مجدد بعد از آنلاین شدن
    window.addEventListener('online', syncPendingMessages, { once: true });
  } finally {
    btn.disabled = false;
  }
});

// ===== ارسال پیامهای در انتظار بعد از آنلاین شدن =====
async function syncPendingMessages() {
  const pending = JSON.parse(localStorage.getItem('sahel_pending_chats') || '[]');
  if (!pending.length) return;
  
  console.log('🔄 ارسال ' + pending.length + ' پیام در انتظار...');
  
  for (const msg of pending) {
    try {
      await sahelApiCall({
        action: 'sendChatMessage',
        senderId: msg.senderId,
        receiverId: msg.receiverId,
        text: msg.text
      });
    } catch (e) {
      console.log('خطا در ارسال پیام در انتظار');
      break;
    }
  }
  
  // پاک کردن پیامهای ارسال شده
  localStorage.removeItem('sahel_pending_chats');
  console.log('✅ همه پیامهای در انتظار ارسال شد');
}

// بارگذاری پیامها با کش
async function loadChatMessages(contactId) {
  const chatMessages = document.getElementById('chatMessages');
  chatMessages.innerHTML = '<div style="text-align:center;color:#7F9A9C;padding:20px;">در حال بارگذاری...</div>';
  
  try {
    const data = await sahelApiCall({ action: 'getChatMessages', userId: sahelUser.id, contactId: contactId });
    if (data.success) {
      // ذخیره در کش
      ChatMessageCache.set(contactId, data.messages);
      renderChatMessages(data.messages, contactId);
    }
  } catch (e) {
    // ⚡ استفاده از کش
    const cachedMessages = ChatMessageCache.get(contactId);
    if (cachedMessages) {
      renderChatMessages(cachedMessages, contactId);
    } else {
      chatMessages.innerHTML = '<div style="text-align:center;color:#7F9A9C;padding:20px;">خطا</div>';
    }
  }
}

// بررسی پیامهای در انتظار هنگام لود
window.addEventListener('online', () => {
  syncPendingMessages();
});

document.getElementById('chatInput')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    document.getElementById('chatSendBtn').click();
  }
  // Shift+Enter به‌صورت پیش‌فرض مرورگر یک خط جدید در textarea ایجاد می‌کند
});
