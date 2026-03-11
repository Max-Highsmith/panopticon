/* ===================================================================
   PANOPTICON — Diplomat / Messenger Ambient Layer
   Generalizable communications panel. Shows diplomatic contacts,
   message threads, and channel status. Reacts to tool calls:
   query_diplomatic_channels (open panel), contact_diplomat (typing
   animation + message display).
   =================================================================== */

import { createAmbientLayer } from './ambientlayer.js';
import { registerLayerLoader } from '../layerregistry.js';

// --- Accumulated state (persists across render calls) ---
let diplomatState = {
  available_contacts: [],
  overall_status: 'unknown',
  contacts_reached: [],
  messages_sent: [],
  responses_received: [],
  intel_updates: [],
};

export function resetDiplomatState() {
  diplomatState = {
    available_contacts: [],
    overall_status: 'unknown',
    contacts_reached: [],
    messages_sent: [],
    responses_received: [],
    intel_updates: [],
  };
}

// --- Render ---

function renderDiplomatPanel(contentEl, data) {
  // Merge incoming data into accumulated state
  if (data.available_contacts) diplomatState.available_contacts = data.available_contacts;
  if (data.overall_status) diplomatState.overall_status = data.overall_status;
  if (data.contacts_reached) diplomatState.contacts_reached = data.contacts_reached;
  if (data.messages_sent) diplomatState.messages_sent = data.messages_sent;
  if (data.responses_received) diplomatState.responses_received = data.responses_received;
  if (data._newMessage) diplomatState.messages_sent.push(data._newMessage);
  if (data._intelUpdate) diplomatState.intel_updates.push(data._intelUpdate);

  contentEl.innerHTML = '';

  // Status header
  const statusBar = document.createElement('div');
  statusBar.className = 'diplomat-status';
  const statusText = diplomatState.overall_status.replace(/_/g, ' ').toUpperCase();
  statusBar.innerHTML = `<span class="diplomat-status-dot ${getStatusClass(diplomatState.overall_status)}"></span> ${statusText}`;
  contentEl.appendChild(statusBar);

  // Contacts
  if (diplomatState.available_contacts.length > 0) {
    const section = document.createElement('div');
    section.className = 'diplomat-section';
    section.innerHTML = '<div class="diplomat-section-title">CONTACTS</div>';
    for (const contact of diplomatState.available_contacts) {
      const card = document.createElement('div');
      card.className = 'diplomat-contact-card';
      const reached = diplomatState.contacts_reached.includes(contact.name);
      card.innerHTML = `
        <div class="diplomat-contact-name">${contact.name}${reached ? ' <span class="diplomat-contacted">\u2713 CONTACTED</span>' : ''}</div>
        <div class="diplomat-contact-role">${contact.role || ''}</div>
        ${contact.last_known_status ? `<div class="diplomat-contact-status">${contact.last_known_status}</div>` : ''}
      `;
      section.appendChild(card);
    }
    contentEl.appendChild(section);
  }

  // Message thread
  const allMessages = buildMessageThread();
  if (allMessages.length > 0) {
    const section = document.createElement('div');
    section.className = 'diplomat-section';
    section.innerHTML = '<div class="diplomat-section-title">MESSAGE LOG</div>';
    const thread = document.createElement('div');
    thread.className = 'diplomat-thread';
    for (const msg of allMessages) {
      const bubble = document.createElement('div');
      bubble.className = `diplomat-message ${msg.direction}`;
      const prefix = msg.direction === 'sent' ? '\u25B8 TO'
        : msg.direction === 'intel' ? '\u25C6 INTEL'
        : '\u25C2 FROM';
      bubble.innerHTML = `
        <div class="diplomat-msg-header">${prefix}: ${msg.contact}</div>
        <div class="diplomat-msg-body">${msg.text}</div>
      `;
      thread.appendChild(bubble);
    }
    section.appendChild(thread);
    contentEl.appendChild(section);
  }

  // Typing indicator
  if (data._typing) {
    const typing = document.createElement('div');
    typing.className = 'diplomat-typing';
    const direction = data._typing.direction || 'SENDING TO';
    typing.innerHTML = `<span class="diplomat-typing-label">${direction} ${data._typing.contact_name || '...'}</span><span class="diplomat-typing-dots"><span>.</span><span>.</span><span>.</span></span>`;
    contentEl.appendChild(typing);
  }
}

function getStatusClass(status) {
  if (!status) return '';
  if (status.includes('exhausted') || status.includes('denied')) return 'status-red';
  if (status.includes('open') || status.includes('active')) return 'status-green';
  return 'status-yellow';
}

function buildMessageThread() {
  const thread = [];
  for (const msg of diplomatState.messages_sent) {
    thread.push({
      direction: 'sent',
      contact: msg.contact_name || msg.name || 'Unknown',
      text: msg.message || '',
      time: msg.sent_at || null,
    });
  }
  for (const resp of diplomatState.responses_received) {
    thread.push({
      direction: 'received',
      contact: resp.from || 'Unknown',
      text: resp.response || '',
      time: resp.received_at || null,
    });
  }
  for (const intel of diplomatState.intel_updates) {
    thread.push({
      direction: 'intel',
      contact: intel.source || 'FIELD INTEL',
      text: intel.message || '',
      time: intel.time || null,
    });
  }
  // Sort by time if available
  thread.sort((a, b) => {
    if (!a.time || !b.time) return 0;
    return new Date(a.time) - new Date(b.time);
  });
  return thread;
}

// --- Layer creation ---

const layer = createAmbientLayer({
  layerKey: 'diplomat',
  dataUrl: '', // Dynamic layer — data pushed via update(), not fetched
  panelId: 'diplomat-panel',
  countId: 'diplomat-count',
  logLabel: 'COMMS',
  tabLabel: 'COMMS',
  tabColor: '#4488ff',
  renderFn: renderDiplomatPanel,
  countFn: (data) => {
    const sent = data.messages_sent?.length || diplomatState.messages_sent.length || 0;
    return sent > 0 ? `${sent} MSG` : '0';
  },
});

registerLayerLoader('diplomat', {
  load: layer.load,
  flyTo: null,
  reset: () => { resetDiplomatState(); layer.reset(); },
  dataUrl: '',
  layerType: 'ambient',
  show: layer.show,
  hide: layer.hide,
  update: layer.update,
});
