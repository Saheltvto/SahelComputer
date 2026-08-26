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

// بارگذاری مخاطبین چت
window.sahelChatLoadContacts = async function() {
  try {
    const data = await sahelApiCall({ action: 'getChatContacts', userId: sahelUser.id });
    if (data.success && data.users) {
      chatContacts = data.users;
      renderChatContacts();
    }
  } catch (e) {
    console.error('Error loading chat contacts:', e);
  }
};

// نمایش مخاطبین
function renderChatContacts() {
  if (!chatContacts.length) {
    chatContactsList.innerHTML = '<div class="file-empty">کاربری برای گفتگو نیست.</div>';
    return;
  }
  
  chatContactsList.innerHTML = chatContacts.map(u => `
    <div class="chat-contact-row" data-id="${u.id}">
      <div class="member-avatar">${u.initials || u.name.slice(0, 2)}</div>
      <div class="member-info">
        <b>${u.name}</b>
        <span class="chat-contact-last">برای شروع گفتگو کلیک کنید</span>
      </div>
    </div>
  `).join('');
  
  chatContactsList.querySelectorAll('.chat-contact-row').forEach(row => {
    row.addEventListener('click', () => {
      const contactId = row.dataset.id;
      const contact = chatContacts.find(c => String(c.id) === contactId);
      openChatThread(contact);
    });
  });
}

// باز کردن گفتگو با یک مخاطب
function openChatThread(contact) {
  activeChatContact = contact;
  chatPanelTitle.textContent = contact.name;
  chatContactsView.style.display = 'none';
  chatThreadView.style.display = 'flex';
  chatBackBtn.style.display = 'flex';
  
  loadChatMessages(contact.id);
}

// بارگذاری پیام‌ها
async function loadChatMessages(contactId) {
  try {
    const data = await sahelApiCall({ 
      action: 'getChatMessages', 
      userId: sahelUser.id,
      contactId: contactId 
    });
    
    if (data.success) {
      chatMessagesData[contactId] = data.messages || [];
      renderChatMessages(contactId);
    }
  } catch (e) {
    console.error('Error loading chat messages:', e);
  }
}

// نمایش پیام‌ها
function renderChatMessages(contactId) {
  const messages = chatMessagesData[contactId] || [];
  
  if (!messages.length) {
    chatMessages.innerHTML = '<div style="text-align:center;color:#7F9A9C;padding:20px;">گفتگو را شروع کنید</div>';
    return;
  }
  
  chatMessages.innerHTML = messages.map(msg => `
    <div class="chat-bubble ${String(msg.senderId) === String(sahelUser.id) ? 'chat-bubble-out' : 'chat-bubble-in'}">
      ${msg.text.replace(/https?:\/\/[^\s]+/g, url => `<a href="${url}" target="_blank">${url}</a>`)}
      <span class="chat-bubble-time">${formatChatTime(msg.time)}</span>
    </div>
  `).join('');
  
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// فرمت زمان
function formatChatTime(time) {
  try {
    return new Date(time).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return '';
  }
}

// ارسال پیام
async function sendChatMessage() {
  const text = chatInput.value.trim();
  if (!text || !activeChatContact) return;
  
  try {
    const data = await sahelApiCall({
      action: 'sendChatMessage',
      senderId: sahelUser.id,
      receiverId: activeChatContact.id,
      text: text
    });
    
    if (data.success) {
      chatInput.value = '';
      await loadChatMessages(activeChatContact.id);
    }
  } catch (e) {
    console.error('Error sending message:', e);
  }
}

// بازگشت به لیست مخاطبین
function backToContacts() {
  chatThreadView.style.display = 'none';
  chatContactsView.style.display = 'flex';
  chatBackBtn.style.display = 'none';
  chatPanelTitle.textContent = 'گفتگوها';
  activeChatContact = null;
}

// Event Listeners
if (chatBtn && chatPanel) {
  chatBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = chatPanel.style.display === 'flex';
    closeAllPanels();
    if (!isOpen) {
      positionPanel(chatPanel, chatBtn);
      chatPanel.style.display = 'flex';
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

// بارگذاری اولیه مخاطبین
if (sahelUser) {
  setTimeout(() => window.sahelChatLoadContacts(), 1000);
}
