// מערכת בינה מלאכותית חכמה - גרסה מתקדמת (קול, קבצים, מודלים, וזיכרון שיחות)
const HybridAI = {
    mode: 'offline',
    keyTimer: null,
    TIMEOUT_MS: 15 * 60 * 1000, 
    currentAttachment: null,
    isUploading: false,
    
    // הגדרות מתקדמות
    currentModel: 'gemini-2.5-flash',
    sessions: [], // מערך של 5 השיחות האחרונות
    activeSessionIndex: 0,
    isListening: false,

    init() {
        const btnContainer = document.getElementById('ai-bubble-container');
        if (btnContainer) {
            btnContainer.classList.remove('hidden-screen', 'hidden');
            btnContainer.style.display = 'block';
        }

        this.loadSessions();
        this.buildAdvancedUI();
        this.checkApiKey();
        
        window.addEventListener('online', () => this.handleNetworkChange(true));
        window.addEventListener('offline', () => this.handleNetworkChange(false));
        ['mousemove', 'keydown', 'click'].forEach(ev => document.addEventListener(ev, () => this.resetKeyExpiration()));
        this.resetKeyExpiration();
    },

    // --- ניהול זיכרון ושיחות (5 צ'אטים אחרונים) ---
    loadSessions() {
        try {
            const saved = JSON.parse(localStorage.getItem('gemini_chat_sessions'));
            if (Array.isArray(saved) && saved.length > 0) {
                this.sessions = saved;
            } else {
                this.createNewSession(false);
            }
        } catch (e) {
            this.createNewSession(false);
        }
    },

    saveSessions() {
        // שמירת 5 השיחות האחרונות בלבד
        if (this.sessions.length > 5) this.sessions = this.sessions.slice(-5);
        localStorage.setItem('gemini_chat_sessions', JSON.stringify(this.sessions));
    },

    createNewSession(save = true) {
        const newSession = {
            id: Date.now(),
            date: new Date().toLocaleString('he-IL'),
            context: []
        };
        this.sessions.push(newSession);
        this.activeSessionIndex = this.sessions.length - 1;
        if (save) {
            this.saveSessions();
            document.getElementById('ai-messages').innerHTML = '';
            this.addMsg("התחלנו צ'אט חדש וריק. זיכרון השיחה הקודמת נשמר בארכיון.", 'system');
        }
    },

    getActiveContext() {
        return this.sessions[this.activeSessionIndex].context;
    },

    updateActiveContext(role, parts) {
        const context = this.getActiveContext();
        context.push({ role, parts });
        // הגבלת הזיכרון בתוך השיחה הנוכחית כדי לא לחרוג ממגבלות הטוקנים
        if (context.length > 20) this.sessions[this.activeSessionIndex].context = context.slice(-20);
        this.saveSessions();
    },

    // --- בניית ממשק משתמש מתקדם ---
    buildAdvancedUI() {
        const header = document.getElementById('ai-header-controls'); // ודא שיש לך דיב כזה ב-HTML מעל הצ'אט
        if (!header) return;
        
        header.innerHTML = `
            <div class="flex flex-col gap-2 p-2 bg-gray-50 border-b border-gray-200">
                <div class="flex justify-between items-center gap-2">
                    <select id="ai-model-selector" onchange="HybridAI.currentModel = this.value" class="text-xs p-1 border rounded bg-white">
                        <option value="gemini-2.5-flash">Gemini 2.5 Flash (מהיר)</option>
                        <option value="gemini-2.5-pro">Gemini 2.5 Pro (חכם ומורכב)</option>
                    </select>
                    <div class="flex gap-1">
                        <button onclick="HybridAI.createNewSession()" title="צ'אט חדש" class="p-1.5 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"><i class="fas fa-plus"></i></button>
                        <button onclick="HybridAI.showKeyInputUI(true)" title="החלף מפתח" class="p-1.5 text-xs bg-amber-100 text-amber-700 rounded hover:bg-amber-200"><i class="fas fa-key"></i></button>
                        <button onclick="HybridAI.clearAllMemory()" title="נקה הכל" class="p-1.5 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            </div>
        `;

        // החלפת שדה הקלט ל-textarea שמתרחב מעצמו
        const inputContainer = document.getElementById('ai-input-container'); // הדיב שעוטף את הקלט
        if (inputContainer) {
            const oldInput = document.getElementById('ai-input');
            if (oldInput && oldInput.tagName.toLowerCase() === 'input') {
                const textarea = document.createElement('textarea');
                textarea.id = 'ai-input';
                textarea.className = oldInput.className + ' resize-none overflow-hidden'; // הסרת גלילה ושינוי גודל ידני
                textarea.placeholder = "הקלד הודעה או השתמש במיקרופון...";
                textarea.rows = 1;
                textarea.oninput = function() {
                    this.style.height = 'auto';
                    this.style.height = (this.scrollHeight) + 'px';
                };
                textarea.onkeydown = (e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); HybridAI.send(); } };
                oldInput.replaceWith(textarea);
            }
            
            // הוספת כפתור מיקרופון
            if (!document.getElementById('ai-mic-btn')) {
                const micBtn = document.createElement('button');
                micBtn.id = 'ai-mic-btn';
                micBtn.innerHTML = '<i class="fas fa-microphone"></i>';
                micBtn.className = "p-2 text-gray-500 hover:text-indigo-600 transition";
                micBtn.onclick = () => this.toggleVoiceDictation();
                inputContainer.insertBefore(micBtn, document.getElementById('ai-send-btn'));
            }
        }
    },

    clearAllMemory() {
        if(confirm("האם למחוק את כל היסטוריית הצ'אטים והמפתח?")) {
            localStorage.removeItem('gemini_chat_sessions');
            localStorage.removeItem('gemini_manual_key');
            this.sessions = [];
            this.createNewSession(true);
            this.setOffline("מערכת אופסה");
        }
    },

    resetKeyExpiration() {
        clearTimeout(this.keyTimer);
        this.keyTimer = setTimeout(() => {
            if (localStorage.getItem('gemini_manual_key')) {
                localStorage.removeItem('gemini_manual_key');
                this.setOffline("המפתח נמחק עקב חוסר פעילות");
            }
        }, this.TIMEOUT_MS);
    },

    showKeyInputUI(forceChange = false) {
        if(forceChange) localStorage.removeItem('gemini_manual_key');
        const container = document.getElementById('ai-messages');
        if(!container) return;
        container.innerHTML = `
            <div class="bg-indigo-50 p-6 rounded-3xl border border-indigo-200 text-center mt-4">
                <i class="fas fa-lock text-3xl text-indigo-500 mb-2"></i>
                <h4 class="font-black text-lg mb-2 text-indigo-900">הזן מפתח API</h4>
                <input type="password" id="manual-key-input" placeholder="הדבק מפתח כאן..." class="w-full p-2 text-sm border rounded mb-3 text-center">
                <button onclick="HybridAI.handleManualKey(document.getElementById('manual-key-input').value)" class="w-full bg-indigo-600 text-white rounded-xl py-2 text-sm font-bold shadow">
                    התחבר
                </button>
            </div>
        `;
    },

    handleManualKey(keyText) {
        if (keyText && keyText.length > 20) { 
            localStorage.setItem('gemini_manual_key', keyText.trim());
            document.getElementById('ai-messages').innerHTML = '<div class="text-center p-4 text-emerald-600 font-bold">המערכת נפתחה!</div>';
            setTimeout(() => {
                document.getElementById('ai-messages').innerHTML = '';
                this.checkApiKey();
            }, 1000);
        } else {
            alert("המפתח קצר מדי או לא תקין.");
        }
    },

    checkApiKey() {
        let key = localStorage.getItem('gemini_manual_key') || window.GEMINI_API_KEY;
        if (!key || key.includes('PLACEHOLDER')) {
            this.setOffline("דרוש מפתח");
            return false;
        }
        this.setOnline();
        return true;
    },

    setOnline() { this.mode = 'online'; /* עדכון UI של הנקודה הירוקה */ },
    setOffline(reason) { 
        this.mode = 'offline'; 
        if (reason.includes("מפתח")) this.showKeyInputUI(); 
    },
    handleNetworkChange(isOnline) { isOnline ? this.checkApiKey() : this.setOffline("אין אינטרנט"); },

    // --- טיפול בקבצים כולל המרת אקסל ---
    handleFileUpload(input) {
        const file = input.files[0];
        if (!file) return;

        this.isUploading = true;
        document.getElementById('ai-input').placeholder = 'מעבד קובץ...';

        // אם זה אקסל ויש את הספריית XLSX
        if ((file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) && window.XLSX) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, {type: 'array'});
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const csvData = XLSX.utils.sheet_to_csv(firstSheet);
                    
                    // המרת ה-CSV ל-Base64 כדי לשלוח ל-Gemini
                    const base64Data = btoa(unescape(encodeURIComponent(csvData)));
                    
                    this.currentAttachment = {
                        mime_type: 'text/csv',
                        data: base64Data,
                        name: file.name + ' (הומר לטקסט)'
                    };
                    this.finishFileUpload(file.name);
                } catch(err) {
                    alert("שגיאה בפענוח האקסל. ודא שהקובץ תקין.");
                    this.clearAttachment();
                }
            };
            reader.readAsArrayBuffer(file);
            return;
        } else if (file.name.endsWith('.xlsx')) {
            alert("חסרה ספריית XLSX. אנא הוסף אותה לקוד ה-HTML כדי לקרוא אקסל.");
            this.clearAttachment();
            return;
        }

        // טיפול רגיל בתמונות, PDF וטקסט
        const reader = new FileReader();
        reader.onload = (e) => {
            this.currentAttachment = {
                mime_type: file.type,
                data: e.target.result.split(',')[1],
                name: file.name
            };
            this.finishFileUpload(file.name);
        };
        reader.readAsDataURL(file);
    },

    finishFileUpload(fileName) {
        const preview = document.getElementById('ai-attachment-preview');
        const nameEl = document.getElementById('ai-attachment-name');
        if (nameEl) nameEl.innerText = fileName;
        if (preview) preview.classList.remove('hidden');
        this.isUploading = false;
        document.getElementById('ai-input').placeholder = 'הקלד הודעה...';
    },

    clearAttachment() {
        this.currentAttachment = null;
        this.isUploading = false;
        const preview = document.getElementById('ai-attachment-preview');
        const uploadInput = document.getElementById('ai-file-upload');
        if (preview) preview.classList.add('hidden');
        if (uploadInput) uploadInput.value = '';
    },

    // --- זיהוי קולי (STT) והקראה (TTS) ---
    toggleVoiceDictation() {
        if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
            alert("הדפדפן שלך לא תומך בהקלטה קולית.");
            return;
        }
        if (this.isListening) return;

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = 'he-IL';
        recognition.interimResults = false;

        recognition.onstart = () => {
            this.isListening = true;
            document.getElementById('ai-mic-btn').classList.add('text-red-500', 'animate-pulse');
            document.getElementById('ai-input').placeholder = 'מקשיב...';
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            const input = document.getElementById('ai-input');
            input.value += (input.value ? ' ' : '') + transcript;
            input.dispatchEvent(new Event('input')); // לעדכון גובה השדה
        };

        recognition.onend = () => {
            this.isListening = false;
            document.getElementById('ai-mic-btn').classList.remove('text-red-500', 'animate-pulse');
            document.getElementById('ai-input').placeholder = 'הקלד הודעה או השתמש במיקרופון...';
        };

        recognition.start();
    },

    speakText(text) {
        if (!window.speechSynthesis) return;
        speechSynthesis.cancel(); // עצור הקראות קודמות
        const utterance = new SpeechSynthesisUtterance(text.replace(/<[^>]*>?/gm, '')); // הסרת תגיות HTML
        utterance.lang = 'he-IL';
        speechSynthesis.speak(utterance);
    },

    addMsg(html, role) {
        const container = document.getElementById('ai-messages');
        if (!container) return;
        const div = document.createElement('div');
        
        let speakerBtn = '';
        if (role === 'ai') {
            const plainText = html.replace(/"/g, "'"); // הגנה על מרכאות
            speakerBtn = `<button onclick="HybridAI.speakText(\`${plainText}\`)" class="float-left text-gray-400 hover:text-indigo-500 ml-2"><i class="fas fa-volume-up"></i></button>`;
        }

        div.className = role === 'user' 
            ? "bg-indigo-600 text-white self-end p-3 rounded-2xl rounded-tr-sm mb-2 text-sm max-w-[90%] shadow-md whitespace-pre-wrap break-words" 
            : role === 'system'
            ? "text-center text-xs text-amber-600 my-2 font-bold bg-amber-50 p-2 rounded-lg"
            : "bg-white border border-indigo-50 text-gray-800 self-start p-3 rounded-2xl rounded-tl-sm mb-2 text-sm max-w-[95%] shadow-sm leading-relaxed overflow-hidden";
        
        div.innerHTML = speakerBtn + html;
        container.appendChild(div);
        
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    },

    // --- יצירת קבצים מתקדמת ממשובית של ה-AI ---
    executeAICommand(responseHtml) {
        // ... (הפקודות הקודמות שלך נשארו כאן: DB_UPDATE, ROUTE וכו') ...

        // יצירת אקסל מנתונים שה-AI אסף
        const excelMatch = responseHtml.match(/\[ACTION:GENERATE_EXCEL\]([\s\S]*?)\[\/ACTION:GENERATE_EXCEL\]/);
        if (excelMatch && window.XLSX) {
            try {
                const dataToExport = JSON.parse(excelMatch[1].trim());
                const actionId = 'excel-act-' + Date.now();
                const safeData = encodeURIComponent(JSON.stringify(dataToExport.data));
                
                const card = `
                    <div class="mt-2 bg-green-50 p-3 rounded-xl border border-green-200 shadow-sm">
                        <p class="text-green-800 text-xs font-bold mb-2"><i class="fas fa-file-excel"></i> הכנתי את קובץ האקסל: ${dataToExport.filename}</p>
                        <button onclick="HybridAI.downloadExcel('${safeData}', '${dataToExport.filename}')" class="bg-green-600 text-white p-2 rounded text-xs w-full shadow hover:bg-green-700">
                            הורד קובץ עכשיו
                        </button>
                    </div>
                `;
                responseHtml = responseHtml.replace(excelMatch[0], card);
            } catch(e) { console.error("Excel parse error"); }
        }

        // יצירת PDF מ-HTML
        const pdfMatch = responseHtml.match(/\[ACTION:GENERATE_PDF\]([\s\S]*?)\[\/ACTION:GENERATE_PDF\]/);
        if (pdfMatch && window.html2pdf) {
            try {
                const pdfData = JSON.parse(pdfMatch[1].trim());
                const safeHtml = encodeURIComponent(pdfData.htmlContent);
                const card = `
                    <div class="mt-2 bg-red-50 p-3 rounded-xl border border-red-200 shadow-sm">
                        <p class="text-red-800 text-xs font-bold mb-2"><i class="fas fa-file-pdf"></i> הדו"ח מוכן להורדה: ${pdfData.filename}</p>
                        <button onclick="HybridAI.downloadPDF('${safeHtml}', '${pdfData.filename}')" class="bg-red-600 text-white p-2 rounded text-xs w-full shadow hover:bg-red-700">
                            הורד PDF
                        </button>
                    </div>
                `;
                responseHtml = responseHtml.replace(pdfMatch[0], card);
            } catch(e) { console.error("PDF parse error"); }
        }

        return responseHtml.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    },

    downloadExcel(encodedData, filename) {
        const data = JSON.parse(decodeURIComponent(encodedData));
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
        XLSX.writeFile(workbook, filename || "export.xlsx");
    },

    downloadPDF(encodedHtml, filename) {
        const html = decodeURIComponent(encodedHtml);
        const wrapper = document.createElement('div');
        wrapper.innerHTML = html;
        wrapper.style.padding = '20px';
        wrapper.style.direction = 'rtl'; // התאמה לעברית
        
        html2pdf().set({
            margin: 10,
            filename: filename || 'document.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        }).from(wrapper).save();
    },

    // --- שליחת ההודעה מול ה-API ---
    async send() {
        if (this.isUploading) {
            alert("אנא המתן לסיום טעינת הקובץ לפני השליחה.");
            return;
        }

        const inp = document.getElementById('ai-input');
        const text = inp.value.trim();
        if (!text && !this.currentAttachment) return;

        let displayHtml = text;
        if (this.currentAttachment) {
            displayHtml = `<div class="bg-indigo-100 text-indigo-800 text-xs p-1 rounded inline-block mb-1"><i class="fas fa-paperclip"></i> ${this.currentAttachment.name}</div>\n` + text;
        }

        this.addMsg(displayHtml, 'user');
        inp.value = '';
        inp.style.height = 'auto'; // איפוס גובה שדה ההקלדה

        if (this.mode === 'offline') {
            setTimeout(() => this.addMsg("המערכת נעולה. הזן מפתח בהגדרות.", 'ai'), 500); 
            return;
        }

        this.addMsg('<i class="fas fa-spinner fa-spin text-indigo-500"></i> מנתח נתונים...', 'ai');
        
        try {
            const sysInstruction = `
            You are an advanced AI assistant. 
            Rules:
            1. Speak ONLY in Hebrew.
            2. To generate an Excel file for the user to download, respond with:
               [ACTION:GENERATE_EXCEL]{ "filename": "data.xlsx", "data": [{"name":"Moshe","age":20}] }[/ACTION:GENERATE_EXCEL]
            3. To generate a PDF report for the user, respond with:
               [ACTION:GENERATE_PDF]{ "filename": "report.pdf", "htmlContent": "<h1>כותרת הדו''ח</h1><p>תוכן הדו''ח</p>" }[/ACTION:GENERATE_PDF]
            `;

            let key = localStorage.getItem('gemini_manual_key') || window.GEMINI_API_KEY;

            const userParts = [];
            if (text) userParts.push({ text: text });
            if (this.currentAttachment) {
                userParts.push({ inline_data: { mime_type: this.currentAttachment.mime_type, data: this.currentAttachment.data } });
            }

            this.updateActiveContext("user", userParts);

            const requestBody = {
                system_instruction: { parts: { text: sysInstruction } },
                contents: this.getActiveContext()
            };

            // שימוש במודל שנבחר מההגדרות (2.5-flash או 2.5-pro)
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.currentModel}:generateContent?key=${key}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (this.currentAttachment) this.clearAttachment();

            const data = await response.json();
            
            const msgs = document.getElementById('ai-messages');
            if (msgs && msgs.lastElementChild.innerHTML.includes('fa-spinner')) msgs.lastElementChild.remove();

            if (data.error) {
                if (data.error.message.includes('API key') || data.error.code === 401 || data.error.code === 403) {
                    localStorage.removeItem('gemini_manual_key');
                    this.setOffline("מפתח שגוי. אנא הזן מפתח חדש.");
                    return;
                }
                throw new Error(data.error.message || "שגיאה בשרת");
            }
            
            const rawReply = data.candidates?.[0]?.content?.parts?.[0]?.text || "בוצעה פעולה (ללא מלל).";
            
            this.updateActiveContext("model", [{ text: rawReply }]);

            const finalHtml = this.executeAICommand(rawReply);
            this.addMsg(finalHtml, 'ai');

        } catch (e) {
            console.error(e);
            this.addMsg(`שגיאה. <br><span class="text-[10px] text-red-500">${e.message}</span>`, 'ai');
            const context = this.getActiveContext();
            context.pop(); // מחיקת השאלה הכושלת מהזיכרון
            this.saveSessions();
        }
    }
};

window.HybridAI = HybridAI;
document.addEventListener('DOMContentLoaded', () => setTimeout(() => HybridAI.init(), 1000));
