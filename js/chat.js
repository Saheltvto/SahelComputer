/* ===== سیستم چت داخلی ===== */

const chatBtn = document.getElementById('chatBtn');
const chatPanel = document.getElementById('chatPanel');
const chatBadge = document.getElementById('chatBadge');
const chatContactsList = document.getElementById('chatContactsList');
const chatContactsView = document.getElementById('chatContactsView');
const chatThreadView = document.getElementById('chatThreadView');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const chatSendBtn = document.getElementById('chatSendBtn');
const chatBackBtn = document.getElementById('chatBackBtn');
const chatPanelTitle = document.getElementById('chatPanelTitle');

let activeChatContact = null;
let chatContacts = [];
let chatMessagesData = {};
let contactsLoaded = false;
let contactsLoading = false;

function toFaDigits(n) {
  const fa = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
  return String(n).replace(/[0-9]/g, d => fa[d]);
}

/* کش محلی */
const chatCache = {
  set(key, data, ttl = 15000) {
    const item = { data, expiry: Date.now() + ttl };
    sessionStorage.setItem('chat_' + key, JSON.stringify(item));
  },
  get(key) {
    const item = sessionStorage.getItem('chat_' + key);
    if (!item) return null;
    const parsed = JSON.parse(item);
    if (Date.now() > parsed.expiry) {
      sessionStorage.removeItem('chat_' + key);
      return null;
    }
    return parsed.data;
  }
};

/* بارگذاری مخاطبین */
window.sahelChatLoadContacts = async function(force = false) {
  if (contactsLoading) return;
  
  // اول از کش
  if (!force) {
    const cached = chatCache.get('contacts_' + sahelUser.id);
    if (cached) {
      chatContacts = cached.users;
      renderChatContacts();
      updateChatBadge(cached.unreadCount);
      contactsLoaded = true;
    }
  }
  
  contactsLoading = true;
  try {
    const data = await sahelApiCall({ action: 'getChatContacts', userId: sahelUser.id });
    if (data.success && data.users) {
      chatContacts = data.users;
      chatCache.set('contacts_' + sahelUser.id, { users: data.users, unreadCount: data.unreadCount || 0 }, 15000);
      renderChatContacts();
      updateChatBadge(data.unreadCount || 0);
      contactsLoaded = true;
    } else {
      if (!contactsLoaded) {
        chatContactsList.innerHTML = '<div class="file-empty">خطا در بارگذاری کاربران</div>';
      }
    }
  } catch (e) {
    console.error('Error loading chat contacts:', e);
    if (!contactsLoaded) {
      chatContactsList.innerHTML = '<div class="file-empty">خطا در بارگذاری کاربران</div>';
    }
  } finally {
    contactsLoading = false;
  }
};

/* نمایش مخاطبین */
function renderChatContacts() {
  if (!chatContacts.length) {
    chatContactsList.innerHTML = '<div class="file-empty">کاربری برای گفتگو نیست.</div>';
    return;
  }
  
  chatContactsList.innerHTML = chatContacts.map(u => {
    const initials = u.initials || (u.name ? u.name.slice(0, 2) : '--');
    const lastMsg = u.lastMessage ? u.lastMessage.substring(0, 30) + (u.lastMessage.length > 30 ? '...' : '') : 'برای شروع گفتگو کلیک کنید';
    
    return `
      <div class="chat-contact-row" data-id="${u.id}">
        <div class="member-avatar">${initials}</div>
        <div class="member-info">
          <b>${u.name}${u.unreadCount > 0 ? ` <span style="background:#2FB8A6;color:#fff;border-radius:10px;padding:2px 8px;font-size:11px;">${toFaDigits(u.unreadCount)}</span>` : ''}</b>
          <span class="chat-contact-last">${lastMsg}</span>
        </div>
        ${u.unreadCount > 0 ? '<span class="chat-unread-dot"></span>' : ''}
      </div>
    `;
  }).join('');
  
  chatContactsList.querySelectorAll('.chat-contact-row').forEach(row => {
    row.addEventListener('click', () => {
      const contactId = row.dataset.id;
      const contact = chatContacts.find(c => String(c.id) === contactId);
      if (contact) {
        openChatThread(contact);
      }
    });
  });
}

/* باز کردن گفتگو */
function openChatThread(contact) {
  activeChatContact = contact;
  chatPanelTitle.textContent = contact.name;
  chatContactsView.style.display = 'none';
  chatThreadView.style.display = 'flex';
  chatBackBtn.style.display = 'flex';
  
  // اول از کش
  const cachedMessages = chatCache.get('messages_' + contact.id);
  if (cachedMessages) {
    chatMessagesData[contact.id] = cachedMessages;
    renderChatMessages(contact.id);
  }
  
  loadChatMessages(contact.id);
}

/* بارگذاری پیام‌ها */
async function loadChatMessages(contactId) {
  try {
    const data = await sahelApiCall({ 
      action: 'getChatMessages', 
      userId: sahelUser.id,
      contactId: contactId 
    });
    
    if (data.success) {
      chatMessagesData[contactId] = data.messages || [];
      chatCache.set('messages_' + contactId, data.messages || [], 10000);
      renderChatMessages(contactId);
      
      sahelApiCall({
        action: 'markChatRead',
        userId: sahelUser.id,
        contactId: contactId
      }).catch(() => {});
    } else {
      if (!chatMessagesData[contactId]) {
        chatMessages.innerHTML = '<div style="text-align:center;color:#7F9A9C;padding:20px;">' + (data.message || 'خطا در بارگذاری پیام‌ها') + '</div>';
      }
    }
  } catch (e) {
    console.error('Error loading chat messages:', e);
    if (!chatMessagesData[contactId]) {
      chatMessages.innerHTML = '<div style="text-align:center;color:#7F9A9C;padding:20px;">خطا در بارگذاری پیام‌ها</div>';
    }
  }
}

/* نمایش پیام‌ها */
function renderChatMessages(contactId) {
  const messages = chatMessagesData[contactId] || [];
  
  if (!messages.length) {
    chatMessages.innerHTML = '<div style="text-align:center;color:#7F9A9C;padding:20px;">گفتگو را شروع کنید</div>';
    return;
  }
  
  chatMessages.innerHTML = messages.map(msg => {
    const isOut = String(msg.senderId) === String(sahelUser.id);
    const timeStr = formatChatTime(msg.time);
    const textWithLinks = msg.text.replace(/https?:\/\/[^\s]+/g, url => `<a href="${url}" target="_blank">${url}</a>`);
    
    return `
      <div class="chat-bubble ${isOut ? 'chat-bubble-out' : 'chat-bubble-in'}">
        ${textWithLinks}
        <span class="chat-bubble-time">${timeStr}</span>
      </div>
    `;
  }).join('');
  
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function formatChatTime(time) {
  try {
    return new Date(time).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return '';
  }
}

/* ارسال پیام */
async function sendChatMessage() {
  const text = chatInput.value.trim();
  if (!text || !activeChatContact) return;
  
  chatSendBtn.disabled = true;
  
  try {
    const data = await sahelApiCall({
      action: 'sendChatMessage',
      senderId: sahelUser.id,
      receiverId: activeChatContact.id,
      text: text
    });
    
    if (data.success) {
      chatInput.value = '';
      // پاک کردن کش پیام‌ها
      sessionStorage.removeItem('chat_messages_' + activeChatContact.id);
      await loadChatMessages(activeChatContact.id);
    } else {
      alert(data.message || 'خطا در ارسال پیام');
    }
  } catch (e) {
    console.error('Error sending message:', e);
    alert('خطا در ارسال پیام');
  } finally {
    chatSendBtn.disabled = false;
  }
}

function backToContacts() {
  chatThreadView.style.display = 'none';
  chatContactsView.style.display = 'flex';
  chatBackBtn.style.display = 'none';
  chatPanelTitle.textContent = 'گفتگوها';
  activeChatContact = null;
}

function updateChatBadge(count) {
  if (count > 0) {
    chatBadge.style.display = 'flex';
    chatBadge.textContent = toFaDigits(count);
  } else {
    chatBadge.style.display = 'none';
  }
}

/* Event Listeners */
if (chatBtn && chatPanel) {
  chatBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = chatPanel.style.display === 'flex';
    closeAllPanels();
    if (!isOpen) {
      positionPanel(chatPanel, chatBtn);
      chatPanel.style.display = 'flex';
      
      chatContactsView.style.display = 'flex';
      chatThreadView.style.display = 'none';
      chatBackBtn.style.display = 'none';
      chatPanelTitle.textContent = 'گفتگوها';
      
      if (window.sahelChatLoadContacts) window.sahelChatLoadContacts();
    }
  });
  
  chatPanel.addEventListener('click', (e) => e.stopPropagation());
}

if (chatBackBtn) {
  chatBackBtn.addEventListener('click', backToContacts);
}

if (chatSendBtn) {
  chatSendBtn.addEventListener('click', sendChatMessage);
}

if (chatInput) {
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  });
}

/* بارگذاری اولیه */
if (sahelUser) {
  setTimeout(() => {
    if (window.sahelChatLoadContacts) {
      window.sahelChatLoadContacts();
    }
  }, 1000);
}

/* به‌روزرسانی دوره‌ای مخاطبین (هر ۳۰ ثانیه) */
setInterval(() => {
  if (sahelUser && document.visibilityState === 'visible') {
    window.sahelChatLoadContacts(true);
  }
}, 30000);
