import { 
    db, auth, collection, addDoc, query, orderBy, limit, onSnapshot, getDocs, writeBatch
} from "./firebase-config.js";
import { showNotification } from "./ui-common.js";

// We access stState via window to avoid circular dependency with ui-storyteller.js
// window.stState is initialized in ui-storyteller.js

// --- GLOBAL CHAT FUNCTIONS ---

export function initChatSystem() {
    // Bind global functions for UI interaction
    window.startChatListener = startChatListener;
    window.sendChronicleMessage = sendChronicleMessage;
    window.stClearChat = stClearChat;
    window.stExportChat = stExportChat;
    window.stSendEvent = stSendEvent;
    window.stSetWhisperTarget = stSetWhisperTarget;
}

// 1. Start Listener
export function startChatListener(chronicleId) {
    const stState = window.stState;
    if (!stState) return;

    if (stState.chatUnsub) stState.chatUnsub();
    
    // Flag to prevent notifying for the initial 100 history items
    let isInitialLoad = true;

    // Query messages (Limit to 100 recent)
    const q = query(
        collection(db, 'chronicles', chronicleId, 'messages'), 
        orderBy('timestamp', 'desc'), 
        limit(100)
    );

    stState.chatUnsub = onSnapshot(q, (snapshot) => {
        const messages = [];
        const uid = auth.currentUser?.uid;

        snapshot.forEach(doc => messages.push({ id: doc.id, ...doc.data() }));
        messages.reverse(); // Show oldest first (top to bottom)
        
        // Cache for export
        stState.chatHistory = messages;
        
        // --- REAL-TIME NOTIFICATIONS ---
        if (!isInitialLoad) {
            snapshot.docChanges().forEach(change => {
                if (change.type === "added") {
                    const msg = change.doc.data();
                    const isSelf = msg.senderId === uid;

                    // Don't notify for our own messages
                    if (isSelf) return;

                    // Visibility logic for Notifications (Mirroring render logic)
                    let canSee = true;
                    if (msg.isWhisper) {
                        const recipients = msg.recipients || [];
                        if (msg.recipientId) recipients.push(msg.recipientId);
                        const isRecipient = recipients.includes(uid);
                        if (!isRecipient) canSee = false;
                    }

                    if (canSee) {
                        let notifyType = 'chat';
                        let header = msg.sender;
                        let content = msg.content;

                        if (msg.type === 'roll') {
                            notifyType = 'roll';
                            header = `${msg.sender} Rolled`;
                        } else if (msg.type === 'event') {
                            notifyType = 'event';
                            header = 'Chronicle Event';
                        } else if (msg.type === 'system') {
                            notifyType = 'system';
                            header = 'System Message';
                        } else if (msg.isWhisper) {
                            notifyType = 'whisper';
                            header = `Whisper from ${msg.sender}`;
                        }

                        // Clean HTML from content for notification
                        const cleanContent = content.replace(/<[^>]*>/g, '');
                        showNotification(cleanContent, notifyType, header);
                    }
                }
            });
        }
        
        isInitialLoad = false;
        
        // Trigger UI Updates
        refreshChatUI();
        
    }, (error) => {
        if (error.code === 'permission-denied') {
            console.warn("Chat Listener: Access Denied.");
        } else {
            console.error("Chat Listener Error:", error);
        }
    });
}

// 2. Send Message
export async function sendChronicleMessage(type, content, details = null, options = {}) {
    const stState = window.stState;
    if (!stState || !stState.activeChronicleId) return;
    
    let senderName = "Unknown";
    if (stState.isStoryteller) {
        senderName = "Storyteller";
    } else {
        senderName = document.getElementById('c-name')?.value || "Player";
    }

    // WHISPER LOGIC
    let isWhisper = !!options.isWhisper; 
    let recipientId = options.recipientId || null;
    let recipients = options.recipients || [];
    
    // Merge legacy ID into array if present
    if (recipientId) recipients.push(recipientId);
    
    // Ensure uniqueness
    recipients = [...new Set(recipients)];

    try {
        await addDoc(collection(db, 'chronicles', stState.activeChronicleId, 'messages'), {
            type: type,
            content: content,
            sender: senderName,
            senderId: auth.currentUser.uid,
            details: details,
            timestamp: new Date(),
            isWhisper: isWhisper,
            recipientId: recipientId, // Keep for legacy compatibility
            recipients: recipients,   // New Array Field
            mood: options.mood || null // NEW: Mood Descriptor
        });
    } catch(e) {
        console.error("Chat Error:", e.message);
        if (type !== 'system') showNotification("Failed to send message: " + e.message, "error");
    }
}

// 3. Clear Chat (ST Only)
export async function stClearChat() {
    const stState = window.stState;
    if (!stState || !stState.activeChronicleId) return;

    if (!confirm("CLEAR ALL CHAT HISTORY?\n\nThis will permanently delete all messages for everyone. This cannot be undone.")) return;
    
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
            sendChronicleMessage('system', 'Storyteller cleared the chat history.');
            showNotification(`Cleared ${count} messages.`);
        } else {
            showNotification("Chat already empty.");
        }
    } catch (e) {
        console.error("Clear Chat Error:", e);
        showNotification("Failed to clear chat.", "error");
    }
}

// 4. Export Chat
export async function stExportChat() {
    const stState = window.stState;
    if (!stState || !stState.chatHistory || stState.chatHistory.length === 0) {
        showNotification("Chat is empty.", "error");
        return;
    }

    let textContent = `CHRONICLE CHAT LOG: ${stState.activeChronicleId}\nExported: ${new Date().toLocaleString()}\n\n`;
    
    stState.chatHistory.forEach(msg => {
        const time = msg.timestamp ? new Date(msg.timestamp.seconds * 1000).toLocaleString() : 'Unknown';
        const moodText = msg.mood ? ` <${msg.mood}>` : "";

        if (msg.type === 'system') {
            textContent += `[${time}] SYSTEM: ${msg.content.replace(/<[^>]*>/g, '')}\n`; 
        } else if (msg.type === 'event') {
            textContent += `[${time}] EVENT: ${msg.content}\n`;
        } else if (msg.type === 'roll') {
            textContent += `[${time}] ${msg.sender} ROLLED: ${msg.content.replace(/<[^>]*>/g, '')} (Pool: ${msg.details?.pool || '?'})\n`;
        } else {
            const whisperTag = msg.isWhisper ? "[WHISPER] " : "";
            textContent += `[${time}] ${whisperTag}${msg.sender}${moodText}: ${msg.content}\n`;
        }
    });

    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `V20_ChatLog_${new Date().toISOString().slice(0,10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification("Chat Log Exported.");
}

// 5. Send Event Announcement (ST)
export async function stSendEvent() {
    const input = document.getElementById('st-chat-input');
    if(!input) return;
    const txt = input.value.trim();
    if(!txt) return;
    
    sendChronicleMessage('event', txt);
    input.value = '';
}

// 6. Set Whisper Target (From Roster Click)
export function stSetWhisperTarget(id, name) {
    // If the view isn't chat, switch to chat (Assumes switchStorytellerView is global)
    if (window.switchStorytellerView) window.switchStorytellerView('chat');
    
    // Defer slightly to ensure chat view is rendered
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
        
        showNotification(`Whispering to ${name}`);
    }, 100);
}

// --- UI RENDERING ---

// Render the bubbles
export function renderMessageList(container, messages) {
    container.innerHTML = '';
    
    if (messages.length === 0) {
        container.innerHTML = `<div class="text-center text-gray-600 text-xs italic mt-4">Chronicle initialized. No messages yet.</div>`;
        return;
    }

    const stState = window.stState;
    const uid = auth.currentUser?.uid;
    
    messages.forEach(msg => {
        let isVisible = true;
        let recipientNames = "";

        // FILTER: Check if message is private (Whisper)
        if (msg.isWhisper) {
            const isSender = msg.senderId === uid;
            
            // Normalize recipients to an array
            let recipients = msg.recipients || [];
            if (msg.recipientId) recipients.push(msg.recipientId); // Legacy support
            recipients = [...new Set(recipients)]; // De-duplicate

            const isRecipient = recipients.includes(uid);
            
            // If I am NOT the sender AND NOT a recipient
            if (!isSender && !isRecipient) {
                 isVisible = false;
            }

            // Resolve Names for Display
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
        div.className = "mb-2 text-xs";
        
        // DATE FORMATTING
        const dateObj = msg.timestamp ? new Date(msg.timestamp.seconds * 1000) : new Date();
        const dateStr = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        const timeStr = dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const fullTime = `${dateStr} ${timeStr}`;
        
        if (msg.type === 'event') {
            // NARRATIVE BEAT (BIG GOLD TEXT)
            div.innerHTML = `
                <div class="my-4 text-center border-t border-b border-[#d4af37]/30 py-2 bg-black/40">
                    <div class="text-[#d4af37] font-cinzel font-bold text-lg uppercase tracking-widest text-shadow">${msg.content}</div>
                    <div class="text-[9px] text-gray-600 font-mono mt-1">${fullTime}</div>
                </div>
            `;
        } else if (msg.type === 'system') {
            div.innerHTML = `<div class="text-gray-500 italic text-center text-[10px] border-b border-[#333] leading-tight pb-1 mb-1"><span class="mr-2">${fullTime}</span>${msg.content}</div>`;
        } else if (msg.type === 'roll') {
            // VISUAL DICE RENDERING
            let diceHTML = '';
            if (msg.details && msg.details.results) {
                diceHTML = msg.details.results.map(d => {
                    let color = 'text-gray-500 border-gray-700';
                    if (d >= (msg.details.diff || 6)) color = 'text-[#d4af37] border-[#d4af37] font-bold';
                    if (d === 10 && msg.details.isSpec) color = 'text-[#4ade80] border-[#4ade80] font-black shadow-[0_0_5px_lime]';
                    if (d === 1) color = 'text-red-600 border-red-900 font-bold';
                    return `<span class="inline-flex items-center justify-center w-5 h-5 border ${color} bg-black/50 rounded text-[10px] mx-0.5">${d}</span>`;
                }).join('');
            }

            div.innerHTML = `
                <div class="bg-[#111] border border-[#333] p-2 rounded relative group hover:border-[#555] transition-colors">
                    <div class="flex justify-between items-baseline mb-1">
                        <span class="font-bold text-[#d4af37]">${msg.sender}</span>
                        <span class="text-[9px] text-gray-600">${fullTime}</span>
                    </div>
                    <div class="text-gray-300 font-mono mb-1">${msg.content}</div>
                    ${diceHTML ? `<div class="flex flex-wrap mt-1 py-1 border-t border-[#222] bg-black/20 justify-center">${diceHTML}</div>` : ''}
                    ${msg.details ? `<div class="text-[9px] text-gray-500 mt-1 text-center">Pool: ${msg.details.pool} (Diff ${msg.details.diff})</div>` : ''}
                </div>
            `;
        } else {
            // CHAT / WHISPER
            const isSelf = msg.senderId === uid;
            
            // Visual Indication for Private Messages
            let wrapperClass = isSelf ? 'bg-[#2a2a2a] text-gray-200' : 'bg-[#1a1a1a] text-gray-300 border border-[#333]';
            let whisperLabel = '';
            let senderLine = msg.sender;
            
            if (msg.isWhisper) {
                wrapperClass = 'bg-[#1a0525] border border-purple-500/30 text-purple-100'; // Dark Purple
                whisperLabel = `<span class="text-purple-400 font-bold text-[9px] mr-1 uppercase tracking-wider"><i class="fas fa-user-secret"></i> Whisper</span>`;
                senderLine = `${msg.sender} <span class="text-gray-500 text-[9px] mx-1">to</span> <span class="text-purple-300 font-bold">${recipientNames || "Unknown"}</span>`;
            }

            // MOOD RENDERING
            let moodHtml = "";
            if (msg.mood) {
                moodHtml = `<span class="text-gray-500 italic text-[10px] mr-1">&lt;${msg.mood}&gt;</span>`;
            }
            
            div.innerHTML = `
                <div class="${isSelf ? 'text-right' : 'text-left'}">
                    <div class="text-[10px] text-gray-500 font-bold mb-0.5">${whisperLabel} ${senderLine} <span class="font-normal opacity-50 text-[9px] ml-1">${fullTime}</span></div>
                    <div class="inline-block px-3 py-1.5 rounded ${wrapperClass}">${moodHtml}${msg.content}</div>
                </div>
            `;
        }
        container.appendChild(div);
    });
    
    container.scrollTop = container.scrollHeight;
}

// Refresh wrapper to update both ST and Player views if they exist in DOM
export function refreshChatUI() {
    const stState = window.stState;
    if (!stState || !stState.chatHistory) return;

    // Re-render Player Chat (Sidebar/Tab)
    const pContainer = document.getElementById('chronicle-chat-history');
    if (pContainer && stState.chatHistory.length > 0) {
        renderMessageList(pContainer, stState.chatHistory);
    }

    // Re-render ST Dashboard Chat
    if (stState.dashboardActive && stState.currentView === 'chat') {
        const stContainer = document.getElementById('st-chat-history');
        if (stContainer && stState.chatHistory.length > 0) {
            renderMessageList(stContainer, stState.chatHistory);
        }
    }
}
