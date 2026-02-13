import { 
    db, auth, collection, addDoc, query, orderBy, limit, onSnapshot, getDocs, writeBatch
} from "./firebase-config.js";
import { showNotification } from "./ui-common.js";

// We access stState via window to avoid circular dependency with ui-storyteller.js
// window.stState is initialized in ui-storyteller.js

// ==========================================================================
// CHRONICLE CHAT SYSTEM
// ==========================================================================

/**
 * Initializes the chat system by exposing necessary functions to the window object.
 */
export function initChatSystem() {
    window.startChatListener = startChatListener;
    window.sendChronicleMessage = sendChronicleMessage;
    window.stClearChat = stClearChat;
    window.stExportChat = stExportChat;
    window.stSendEvent = stSendEvent;
    window.stSetWhisperTarget = stSetWhisperTarget;
    window.refreshChatUI = refreshChatUI;
}

/**
 * Starts a real-time listener for the chronicle message collection.
 * Triggers persistent notifications and audio cues for new incoming activity.
 * @param {string} chronicleId - The ID of the connected chronicle.
 */
export function startChatListener(chronicleId) {
    const stState = window.stState;
    if (!stState) return;

    // Clean up existing listener if necessary
    if (stState.chatUnsub) stState.chatUnsub();
    
    // Flag used to differentiate between the initial 100 history items and live new messages
    let isInitialLoad = true;

    const q = query(
        collection(db, 'chronicles', chronicleId, 'messages'), 
        orderBy('timestamp', 'desc'), 
        limit(100)
    );

    stState.chatUnsub = onSnapshot(q, (snapshot) => {
        const messages = [];
        const uid = auth.currentUser?.uid;

        // Process snapshot into local array
        snapshot.forEach(doc => {
            messages.push({ id: doc.id, ...doc.data() });
        });
        
        // V20 requirement: Show messages in chronological order (top to bottom)
        messages.reverse(); 
        
        // Cache history for export functionality
        stState.chatHistory = messages;
        
        // --- LIVE NOTIFICATION LOGIC ---
        // We only trigger notifications for document changes that happen AFTER the initial load
        if (!isInitialLoad) {
            snapshot.docChanges().forEach(change => {
                if (change.type === "added") {
                    const msg = change.doc.data();
                    const isSelf = msg.senderId === uid;

                    // Do not notify for our own sent messages
                    if (isSelf) return;

                    // Visibility logic for Notifications
                    let canSee = true;
                    if (msg.isWhisper) {
                        const recipients = msg.recipients || [];
                        if (msg.recipientId) recipients.push(msg.recipientId);
                        const isRecipient = recipients.includes(uid);
                        // If I'm not a recipient of the whisper, I shouldn't get a notification
                        if (!isRecipient) canSee = false;
                    }

                    if (canSee) {
                        let notifyType = 'chat';
                        let header = msg.sender;
                        let content = msg.content;

                        // Customize notification metadata based on message type
                        if (msg.type === 'roll') {
                            notifyType = 'roll';
                            header = `${msg.sender} Rolled Dice`;
                        } else if (msg.type === 'event') {
                            notifyType = 'event';
                            header = 'Chronicle Narrative';
                        } else if (msg.type === 'system') {
                            notifyType = 'system';
                            header = 'System Alert';
                        } else if (msg.isWhisper) {
                            notifyType = 'whisper';
                            header = `Whisper from ${msg.sender}`;
                        }

                        // Strip HTML tags (like dice styling) for a clean toast display
                        const cleanContent = content.replace(/<[^>]*>/g, '');
                        
                        // Trigger the persistent toast and the Church Bell Chime
                        if (typeof showNotification === 'function') {
                            showNotification(cleanContent, notifyType, header);
                        }
                    }
                }
            });
        }
        
        // Initial snapshot is finished, set flag to allow future notifications
        isInitialLoad = false;
        
        // Sync with UI components (Play Tab and ST Dashboard)
        refreshChatUI();
        
    }, (error) => {
        if (error.code === 'permission-denied') {
            console.warn("Chat Listener: Access Denied. Joining chronicle required.");
        } else {
            console.error("Chat Listener Error:", error);
        }
    });
}

/**
 * Sends a message to the Firestore collection.
 * @param {string} type - 'chat', 'roll', 'system', 'event'.
 * @param {string} content - Message body.
 * @param {Object} details - Optional metadata (e.g., dice results).
 * @param {Object} options - Optional whisper settings.
 */
export async function sendChronicleMessage(type, content, details = null, options = {}) {
    const stState = window.stState;
    if (!stState || !stState.activeChronicleId) return;
    
    let senderName = "Unknown";
    if (stState.isStoryteller) {
        senderName = "Storyteller";
    } else {
        senderName = document.getElementById('c-name')?.value || "Player";
    }

    // New Multi-Recipient Whisper Logic
    let isWhisper = !!options.isWhisper; 
    let recipientId = options.recipientId || null;
    let recipients = options.recipients || [];
    
    if (recipientId) recipients.push(recipientId);
    recipients = [...new Set(recipients)]; // De-duplicate

    try {
        await addDoc(collection(db, 'chronicles', stState.activeChronicleId, 'messages'), {
            type: type,
            content: content,
            sender: senderName,
            senderId: auth.currentUser.uid,
            details: details,
            timestamp: new Date(),
            isWhisper: isWhisper,
            recipientId: recipientId, 
            recipients: recipients,   
            mood: options.mood || null 
        });
    } catch(e) {
        console.error("Failed to send message:", e);
        if (type !== 'system') {
            showNotification("Message failed to send.", "error");
        }
    }
}

/**
 * Storyteller function to purge chat history.
 */
export async function stClearChat() {
    const stState = window.stState;
    if (!stState || !stState.activeChronicleId) return;

    if (!confirm("This will permanently delete the chat history for all users. Continue?")) return;
    
    try {
        const q = query(collection(db, 'chronicles', stState.activeChronicleId, 'messages'));
        const snapshot = await getDocs(q);
        
        const batch = writeBatch(db);
        let count = 0;
        
        snapshot.forEach(doc => {
            batch.delete(doc.ref);
            count++;
        });

        if (count > 0) {
            await batch.commit();
            sendChronicleMessage('system', 'The Storyteller has cleared the archives.');
            showNotification(`Deleted ${count} messages.`);
        }
    } catch (e) {
        console.error("Clear Chat Failed:", e);
        showNotification("Failed to clear history.", "error");
    }
}

/**
 * Generates a text file of the chat history and triggers a browser download.
 */
export async function stExportChat() {
    const stState = window.stState;
    if (!stState || !stState.chatHistory || stState.chatHistory.length === 0) {
        showNotification("No history to export.");
        return;
    }

    let log = `CHRONICLE LOG: ${stState.activeChronicleId}\nGenerated: ${new Date().toLocaleString()}\n\n`;
    
    stState.chatHistory.forEach(msg => {
        const time = msg.timestamp ? new Date(msg.timestamp.seconds * 1000).toLocaleString() : 'N/A';
        const mood = msg.mood ? ` <${msg.mood}>` : "";

        if (msg.type === 'system') {
            log += `[${time}] SYSTEM: ${msg.content.replace(/<[^>]*>/g, '')}\n`; 
        } else if (msg.type === 'event') {
            log += `[${time}] EVENT: ${msg.content}\n`;
        } else if (msg.type === 'roll') {
            log += `[${time}] ${msg.sender} ROLLED: ${msg.content.replace(/<[^>]*>/g, '')}\n`;
        } else {
            const whisperTag = msg.isWhisper ? "[PRIVATE] " : "";
            log += `[${time}] ${whisperTag}${msg.sender}${mood}: ${msg.content}\n`;
        }
    });

    const blob = new Blob([log], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `V20_Log_${stState.activeChronicleId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification("Log file generated.");
}

/**
 * Triggers a major narrative announcement (Storyteller Only).
 */
export async function stSendEvent() {
    const input = document.getElementById('st-chat-input');
    if(!input) return;
    const txt = input.value.trim();
    if(!txt) return;
    
    sendChronicleMessage('event', txt);
    input.value = '';
}

/**
 * Automates the creation of a private whisper to a specific user.
 */
export function stSetWhisperTarget(id, name) {
    if (window.switchStorytellerView) window.switchStorytellerView('chat');
    
    setTimeout(() => {
        const checkboxes = document.querySelectorAll('.st-recipient-checkbox');
        const allCheck = document.getElementById('st-chat-all-checkbox');
        
        if (allCheck) {
            allCheck.checked = false;
            allCheck.dispatchEvent(new Event('change'));
        }
        
        checkboxes.forEach(cb => {
            if (cb.value === id) {
                cb.checked = true;
                cb.dispatchEvent(new Event('change'));
            } else {
                cb.checked = false;
            }
        });
        
        showNotification(`Targeting whisper to ${name}`);
    }, 100);
}

/**
 * Renders message objects into a container with appropriate styling.
 */
export function renderMessageList(container, messages) {
    container.innerHTML = '';
    
    if (messages.length === 0) {
        container.innerHTML = `<div class="text-center text-gray-600 text-[10px] italic mt-4 opacity-50">Empty Archive</div>`;
        return;
    }

    const stState = window.stState;
    const uid = auth.currentUser?.uid;
    
    messages.forEach(msg => {
        let isVisible = true;
        let recipientNames = "";

        if (msg.isWhisper) {
            const isSender = msg.senderId === uid;
            let recipients = msg.recipients || [];
            if (msg.recipientId) recipients.push(msg.recipientId);
            recipients = [...new Set(recipients)];

            const isRecipient = recipients.includes(uid);
            
            // Filter visibility for whispers
            if (!isSender && !isRecipient) {
                 isVisible = false;
            }

            if (isVisible) {
                const names = recipients.map(rid => {
                    if (rid === uid) return "You";
                    if (stState.settings && stState.settings.storyteller_uid === rid) return "Storyteller";
                    const p = stState.players[rid];
                    return p ? (p.character_name || "Unknown") : "Unknown";
                });
                recipientNames = names.join(", ");
            }
        }

        if (!isVisible) return;

        const div = document.createElement('div');
        div.className = "mb-3 text-[11px]";
        
        const dateObj = msg.timestamp ? new Date(msg.timestamp.seconds * 1000) : new Date();
        const timeStr = dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        if (msg.type === 'event') {
            div.innerHTML = `
                <div class="my-6 text-center border-t border-b border-[#d4af37]/40 py-3 bg-gold/5">
                    <div class="text-[#d4af37] font-cinzel font-bold text-base uppercase tracking-[0.2em]">${msg.content}</div>
                    <div class="text-[8px] text-gray-600 font-mono mt-1">${timeStr}</div>
                </div>
            `;
        } else if (msg.type === 'system') {
            div.innerHTML = `<div class="text-gray-500 italic text-center text-[9px] border-b border-[#222] pb-1 mb-2">${msg.content} <span class="ml-2 opacity-50">${timeStr}</span></div>`;
        } else if (msg.type === 'roll') {
            let diceHTML = '';
            if (msg.details && msg.details.results) {
                diceHTML = msg.details.results.map(d => {
                    let color = 'text-gray-500 border-gray-800';
                    if (d >= (msg.details.diff || 6)) color = 'text-[#d4af37] border-[#d4af37] font-bold';
                    if (d === 10 && msg.details.isSpec) color = 'text-[#4ade80] border-[#4ade80] font-black shadow-[0_0_5px_lime]';
                    if (d === 1) color = 'text-red-600 border-red-900 font-bold';
                    return `<span class="inline-flex items-center justify-center w-6 h-6 border ${color} bg-black/40 rounded text-[10px] mx-0.5">${d}</span>`;
                }).join('');
            }

            div.innerHTML = `
                <div class="bg-[#111] border border-[#333] p-3 rounded hover:border-[#555] transition-all">
                    <div class="flex justify-between items-baseline mb-2">
                        <span class="font-bold text-[#d4af37] uppercase tracking-wider">${msg.sender}</span>
                        <span class="text-[8px] text-gray-600 font-mono">${timeStr}</span>
                    </div>
                    <div class="text-gray-300 font-mono mb-2">${msg.content}</div>
                    ${diceHTML ? `<div class="flex flex-wrap mt-1 py-2 border-t border-[#222] bg-black/10 justify-center rounded">${diceHTML}</div>` : ''}
                    ${msg.details ? `<div class="text-[8px] text-gray-500 mt-1 text-center italic uppercase">Pool: ${msg.details.pool} | Diff: ${msg.details.diff}</div>` : ''}
                </div>
            `;
        } else {
            const isSelf = msg.senderId === uid;
            let wrapperClass = isSelf ? 'bg-[#222] border-gray-700' : 'bg-[#151515] border-[#333]';
            let whisperLabel = '';
            let senderLine = msg.sender;
            
            if (msg.isWhisper) {
                wrapperClass = 'bg-[#1a0525] border-purple-900/50 text-purple-100';
                whisperLabel = `<span class="text-purple-400 font-bold text-[8px] mr-1 uppercase tracking-widest"><i class="fas fa-user-secret"></i> Whisper</span>`;
                senderLine = `${msg.sender} <i class="fas fa-long-arrow-alt-right text-gray-700 mx-1"></i> <span class="text-purple-300 font-bold">${recipientNames}</span>`;
            }

            let moodHtml = msg.mood ? `<span class="text-gray-500 italic text-[10px] mr-2">&lt;${msg.mood}&gt;</span>` : "";
            
            div.innerHTML = `
                <div class="${isSelf ? 'text-right' : 'text-left'}">
                    <div class="text-[9px] text-gray-600 font-bold mb-1">${whisperLabel}${senderLine} <span class="font-normal opacity-40 ml-1">${timeStr}</span></div>
                    <div class="inline-block px-4 py-2 rounded border ${wrapperClass} leading-relaxed shadow-sm">${moodHtml}${msg.content}</div>
                </div>
            `;
        }
        container.appendChild(div);
    });
    
    container.scrollTop = container.scrollHeight;
}

/**
 * Re-renders all active chat UI components across the application.
 */
export function refreshChatUI() {
    const stState = window.stState;
    if (!stState || !stState.chatHistory) return;

    // Player View
    const pContainer = document.getElementById('chronicle-chat-history');
    if (pContainer) {
        renderMessageList(pContainer, stState.chatHistory);
    }

    // Storyteller Dashboard View
    if (stState.dashboardActive && stState.currentView === 'chat') {
        const stContainer = document.getElementById('st-chat-history');
        if (stContainer) {
            renderMessageList(stContainer, stState.chatHistory);
        }
    }
}
