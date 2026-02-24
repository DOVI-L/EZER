const HybridAI = {
    mode: 'offline',
    keyTimer: null,
    TIMEOUT_MS: 15 * 60 * 1000, 
    currentAttachment: null,
    isUploading: false,
    
    currentModel: 'gemini-1.5-flash', // המודלים העדכניים והנתמכים כיום
    sessions: [], 
    activeSessionId: null,
    isListening: false,

    init() {
        const btnContainer = document.getElementById('ai-bubble-container');
        if (btnContainer) {
            btnContainer.classList.remove('hidden-screen', 'hidden');
            btnContainer.style.display = 'block';
        }

        this.loadSessions();
        this.checkApiKey();
        
        window.addEventListener('online', () => this.handleNetworkChange(true));
        window.addEventListener('offline', () => this.handleNetworkChange(false));
        ['mousemove', 'keydown', 'click'].forEach(ev => document.addEventListener(ev, () => this.resetKeyExpiration()));
        this.resetKeyExpiration();
    },

    // --- זיכרון של 5 צ'אטים אחרונים ---
    loadSessions() {
        try {
            const saved = JSON.parse(localStorage.getItem('gemini_chat_sessions_v2'));
            if (Array.isArray(saved) && saved.length > 0) {
                this.sessions = saved;
                this.switchSession(this.sessions[this.sessions.length - 1].id);
            } else {
                this.createNewSession();
            }
        } catch (e) {
            this.createNewSession();
        }
    },

    saveSessions() {
        if (this.sessions.length > 5) this.sessions = this.sessions.slice(-5);
        localStorage.setItem('gemini_chat_sessions_v2', JSON.stringify(this.sessions));
        this.updateSessionDropdown();
    },

    createNewSession() {
        const newId = Date.now().toString();
        const dateStr = new Date().toLocaleString('he-IL', {day: '2-digit', month: '2-digit', hour: '2-digit', minute:'2-digit'});
        
        this.sessions.push({
            id: newId,
            title: `שיחה - ${dateStr}`,
            context: []
        });
        
        this.saveSessions();
        this.switchSession(newId);
    },

    switchSession(sessionId) {
        this.activeSessionId = sessionId;
        document.getElementById('ai-session-selector').value = sessionId;
        this.renderCurrentSession();
    },

    updateSessionDropdown() {
        const select = document.getElementById('ai-session-selector');
        if(!select) return;
        select.innerHTML = '';
        [...this.sessions].reverse().forEach((s, idx) => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.text = s.title + (idx === 0 ? ' (נוכחי)' : '');
            select.appendChild(opt);
        });
        select.value = this.activeSessionId;
    },

    renderCurrentSession() {
        const msgsContainer = document.getElementById('ai-messages');
        msgsContainer.innerHTML = '';
        const session = this.sessions.find(s => s.id === this.activeSessionId);
        
        if (!session || session.context.length === 0) {
            this.addMsg("התחלנו צ'אט חדש. שאל אותי או בקש ממני ליצור דו\"חות על בסיס הנתונים במערכת!", 'system');
            return;
        }

        session.context.forEach(msg => {
            if (msg.role === 'user') {
                this.addMsg(msg.parts[0].text, 'user', false);
            } else if (msg.role === 'model') {
                this.addMsg(this.executeAICommand(msg.parts[0].text), 'ai', false);
            }
        });
    },

    getActiveSession() {
        return this.sessions.find(s => s.id === this.activeSessionId);
    },

    updateActiveContext(role, parts) {
        const session = this.getActiveSession();
        if (!session) return;
        session.context.push({ role, parts });
        if (session.context.length > 15) session.context = session.context.slice(-15); // הגבלת טוקנים נבונה
        this.saveSessions();
    },

    // --- מפתח API ---
    resetKeyExpiration() {
        clearTimeout(this.keyTimer);
        this.keyTimer = setTimeout(() => {
            if (localStorage.getItem('gemini_manual_key')) {
                localStorage.removeItem('gemini_manual_key');
                this.setOffline("המפתח נמחק מטעמי אבטחה");
            }
        }, this.TIMEOUT_MS);
    },

    showKeyInputUI(forceChange = false) {
        if(forceChange) localStorage.removeItem('gemini_manual_key');
        const container = document.getElementById('ai-messages');
        container.innerHTML = `
            <div class="bg-indigo-50 p-6 rounded-2xl border border-indigo-200 text-center mt-4 shadow-sm">
                <i class="fas fa-lock text-3xl text-indigo-500 mb-3"></i>
                <h4 class="font-black text-lg mb-2 text-indigo-900">הזן מפתח API של Google</h4>
                <p class="text-xs text-indigo-700 mb-4">המפתח נשמר בדפדפן שלך בלבד ונמחק לאחר חוסר פעילות.</p>
                <input type="password" id="manual-key-input" placeholder="הדבק מפתח כאן..." class="w-full p-2.5 text-sm border border-indigo-200 rounded-xl mb-3 text-center outline-none focus:border-indigo-500">
                <button onclick="HybridAI.handleManualKey(document.getElementById('manual-key-input').value)" class="w-full bg-indigo-600 hover:bg-indigo-700 transition text-white rounded-xl py-2.5 text-sm font-bold shadow">
                    התחבר
                </button>
            </div>
        `;
    },

    handleManualKey(keyText) {
        if (keyText && keyText.length > 20) { 
            localStorage.setItem('gemini_manual_key', keyText.trim());
            document.getElementById('ai-messages').innerHTML = '<div class="text-center p-4 text-emerald-600 font-bold bg-emerald-50 rounded-xl m-4">החיבור הצליח!</div>';
            setTimeout(() => { this.checkApiKey(); this.renderCurrentSession(); }, 1500);
        } else {
            alert("המפתח קצר מדי או לא תקין.");
        }
    },

    checkApiKey() {
        let key = localStorage.getItem('gemini_manual_key') || window.GEMINI_API_KEY;
        const dot = document.getElementById('ai-status-dot');
        const txt = document.getElementById('ai-status-text');
        
        if (!key || key.includes('PLACEHOLDER')) {
            this.mode = 'offline';
            if(dot) { dot.className = 'w-3 h-3 rounded-full bg-red-500 border-2 border-white/50 animate-pulse'; }
            if(txt) { txt.innerText = 'דרוש חיבור'; }
            this.showKeyInputUI();
            return false;
        }
        
        this.mode = 'online';
        if(dot) { dot.className = 'w-3 h-3 rounded-full bg-emerald-400 border-2 border-white/50 shadow-[0_0_10px_rgba(52,211,153,0.8)]'; }
        if(txt) { txt.innerText = 'מחובר ומוכן'; }
        return true;
    },

    // --- טיפול בקבצים (כולל אקסל) ---
    handleFileUpload(input) {
        const file = input.files[0];
        if (!file) return;

        this.isUploading = true;
        document.getElementById('ai-input').placeholder = 'קורא קובץ...';

        // קריאת אקסל והמרה לטקסט מובן ל-AI
        if ((file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) && window.XLSX) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, {type: 'array'});
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const csvData = XLSX.utils.sheet_to_csv(firstSheet);
                    
                    this.currentAttachment = {
                        type: 'text',
                        data: `תוכן הקובץ האקסל ${file.name}:\n${csvData}`,
                        name: file.name
                    };
                    this.finishFileUpload(file.name);
                } catch(err) {
                    alert("שגיאה בפענוח האקסל. ודא שהקובץ תקין.");
                    this.clearAttachment();
                }
            };
            reader.readAsArrayBuffer(file);
        } 
        // קריאת תמונה או PDF (Base64)
        else {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.currentAttachment = {
                    type: 'media',
                    mime_type: file.type,
                    data: e.target.result.split(',')[1],
                    name: file.name
                };
                this.finishFileUpload(file.name);
            };
            reader.readAsDataURL(file);
        }
    },

    finishFileUpload(fileName) {
        document.getElementById('ai-attachment-name').innerText = fileName;
        document.getElementById('ai-attachment-preview').classList.remove('hidden');
        this.isUploading = false;
        document.getElementById('ai-input').placeholder = 'הקלד הודעה...';
    },

    clearAttachment() {
        this.currentAttachment = null;
        this.isUploading = false;
        document.getElementById('ai-attachment-preview').classList.add('hidden');
        document.getElementById('ai-file-upload').value = '';
    },

    // --- זיהוי קולי והקראה ---
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
            input.style.height = 'auto';
            input.style.height = input.scrollHeight + 'px';
        };

        recognition.onend = () => {
            this.isListening = false;
            document.getElementById('ai-mic-btn').classList.remove('text-red-500', 'animate-pulse');
            document.getElementById('ai-input').placeholder = 'הקלד כאן...';
        };

        recognition.start();
    },

    speakText(text) {
        if (!window.speechSynthesis) return;
        speechSynthesis.cancel(); 
        // ניקוי תגיות HTML ומידע טכני לפני הקראה
        let cleanText = text.replace(/<[^>]*>?/gm, '').replace(/\[ACTION:.*?\]/g, '');
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'he-IL';
        speechSynthesis.speak(utterance);
    },

    addMsg(html, role, smoothScroll = true) {
        const container = document.getElementById('ai-messages');
        if (!container) return;
        const div = document.createElement('div');
        
        let speakerBtn = '';
        if (role === 'ai') {
            const plainText = html.replace(/"/g, "'").replace(/\n/g, ' '); 
            speakerBtn = `<button onclick="HybridAI.speakText(\`${plainText}\`)" class="float-left text-indigo-300 hover:text-indigo-600 ml-2 transition bg-white/50 rounded-full w-6 h-6 flex items-center justify-center shadow-sm"><i class="fas fa-volume-up text-xs"></i></button>`;
        }

        div.className = role === 'user' 
            ? "bg-indigo-600 text-white self-end p-3 rounded-2xl rounded-tr-sm mb-1 text-sm max-w-[90%] shadow-md whitespace-pre-wrap break-words" 
            : role === 'system'
            ? "text-center text-xs text-amber-600 my-2 font-bold bg-amber-50 p-2 rounded-lg"
            : "bg-white border border-indigo-100 text-slate-800 self-start p-3.5 rounded-2xl rounded-tl-sm mb-1 text-sm max-w-[95%] shadow-sm leading-relaxed overflow-hidden relative";
        
        div.innerHTML = speakerBtn + html;
        container.appendChild(div);
        
        if (smoothScroll) {
            container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
        }
    },

    // --- יצירת קבצים והזרקת כפתורים חכמים ---
    executeAICommand(responseHtml) {
        // מציאת בלוק JSON לייצור אקסל
        const excelRegex = /\[EXCEL_START\]([\s\S]*?)\[EXCEL_END\]/i;
        const excelMatch = responseHtml.match(excelRegex);
        if (excelMatch && window.XLSX) {
            try {
                const jsonStr = excelMatch[1].replace(/```json/g, '').replace(/```/g, '').trim();
                const dataToExport = JSON.parse(jsonStr);
                const safeData = encodeURIComponent(JSON.stringify(dataToExport.data));
                const fname = dataToExport.filename || 'report.xlsx';
                
                const card = `
                    <div class="mt-4 bg-gradient-to-r from-emerald-50 to-green-50 p-4 rounded-xl border border-emerald-200 shadow-sm flex flex-col items-center text-center">
                        <div class="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-2xl mb-2"><i class="fas fa-file-excel"></i></div>
                        <p class="text-emerald-900 text-sm font-bold mb-3">הקובץ מוכן: ${fname}</p>
                        <button onclick="HybridAI.downloadExcel('${safeData}', '${fname}')" class="bg-emerald-600 text-white px-6 py-2 rounded-lg text-sm font-bold shadow hover:bg-emerald-700 w-full transition flex justify-center items-center gap-2">
                            <i class="fas fa-download"></i> הורד אקסל
                        </button>
                    </div>
                `;
                responseHtml = responseHtml.replace(excelMatch[0], card);
            } catch(e) { console.error("שגיאת JSON באקסל", e); }
        }

        // מציאת בלוק JSON לייצור PDF
        const pdfRegex = /\[PDF_START\]([\s\S]*?)\[PDF_END\]/i;
        const pdfMatch = responseHtml.match(pdfRegex);
        if (pdfMatch && window.html2pdf) {
            try {
                const jsonStr = pdfMatch[1].replace(/```json/g, '').replace(/```/g, '').trim();
                const pdfData = JSON.parse(jsonStr);
                const safeHtml = encodeURIComponent(pdfData.html);
                const fname = pdfData.filename || 'report.pdf';
                
                const card = `
                    <div class="mt-4 bg-gradient-to-r from-rose-50 to-red-50 p-4 rounded-xl border border-rose-200 shadow-sm flex flex-col items-center text-center">
                        <div class="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center text-2xl mb-2"><i class="fas fa-file-pdf"></i></div>
                        <p class="text-rose-900 text-sm font-bold mb-3">הדו"ח מוכן: ${fname}</p>
                        <button onclick="HybridAI.downloadPDF('${safeHtml}', '${fname}')" class="bg-rose-600 text-white px-6 py-2 rounded-lg text-sm font-bold shadow hover:bg-rose-700 w-full transition flex justify-center items-center gap-2">
                            <i class="fas fa-download"></i> הורד מסמך PDF
                        </button>
                    </div>
                `;
                responseHtml = responseHtml.replace(pdfMatch[0], card);
            } catch(e) { console.error("שגיאת JSON ב-PDF", e); }
        }

        return responseHtml.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    },

    downloadExcel(encodedData, filename) {
        try {
            const data = JSON.parse(decodeURIComponent(encodedData));
            const worksheet = XLSX.utils.json_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            // הגדרת כיוון ימין-שמאל בתוך האקסל
            if(!worksheet['!views']) worksheet['!views'] = [];
            worksheet['!views'].push({rightToLeft: true});
            
            XLSX.utils.book_append_sheet(workbook, worksheet, "נתונים");
            XLSX.writeFile(workbook, filename);
        } catch(e) { alert("שגיאה בהורדת האקסל."); }
    },

    downloadPDF(encodedHtml, filename) {
        try {
            const html = decodeURIComponent(encodedHtml);
            const wrapper = document.createElement('div');
            wrapper.innerHTML = html;
            wrapper.style.padding = '30px';
            wrapper.style.direction = 'rtl';
            wrapper.style.fontFamily = 'Heebo, sans-serif';
            wrapper.style.color = '#1e293b';
            
            html2pdf().set({
                margin: 10,
                filename: filename,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            }).from(wrapper).save();
        } catch(e) { alert("שגיאה בהורדת ה-PDF."); }
    },

    // --- מערכת ההזרקה: מתן מידע למודל על המערכת ---
    getSystemDataSummary() {
        // לוקח את נתוני המערכת הקיימים (בהנחה ש-Store.data קיים מ-store.js)
        if (!window.Store || !Store.data) return "אין נתונים במערכת.";
        
        try {
            const students = Object.values(Store.data.students || {}).map(s => ({id: s.id, name: s.firstName+' '+s.lastName, class: s.className, goal: s.targetAmount}));
            const donors = Object.values(Store.data.donors || {}).map(d => ({id: d.id, name: d.fullName, group: d.assignedGroup}));
            const finance = Object.values(Store.data.finance || {}).slice(-50); // 50 תנועות אחרונות

            return JSON.stringify({
                totalStudents: students.length,
                totalDonors: donors.length,
                studentsSample: students.slice(0, 100), // עד 100 בחורים כדי לא לחנוק טוקנים
                financeSample: finance
            });
        } catch(e) {
            return "שגיאה בשליפת נתוני מערכת.";
        }
    },

    // --- שליחה ל-API ---
    async send() {
        if (this.isUploading) { alert("אנא המתן לסיום טעינת הקובץ."); return; }
        if (!this.checkApiKey()) return;

        const inp = document.getElementById('ai-input');
        const text = inp.value.trim();
        if (!text && !this.currentAttachment) return;

        let displayHtml = text;
        if (this.currentAttachment) {
            displayHtml = `<div class="bg-indigo-50 text-indigo-700 text-xs p-1.5 rounded-lg inline-block mb-2 font-bold border border-indigo-100"><i class="fas fa-paperclip"></i> ${this.currentAttachment.name}</div>\n` + text;
        }

        this.addMsg(displayHtml, 'user');
        inp.value = '';
        inp.style.height = 'auto'; // איפוס גובה שדה הקלט

        const loadingId = 'loading-' + Date.now();
        this.addMsg(`<div id="${loadingId}" class="flex items-center gap-2"><i class="fas fa-circle-notch fa-spin text-indigo-500"></i> חושב וכותב תשובה...</div>`, 'ai');
        
        try {
            // הזרקת כל החוקים הרלוונטיים (איך לייצר פלט וכו') והמידע מהמערכת
            const sysData = this.getSystemDataSummary();
            const sysInstruction = `
            You are an advanced AI assistant integrated inside a Yeshiva/Charity management system.
            Speak ONLY in Hebrew.
            
            Current System Data (JSON format):
            ${sysData}

            RULES FOR GENERATING FILES:
            1. If the user asks to create, download, or generate an EXCEL file, you MUST reply with this EXACT format containing the data:
            [EXCEL_START]
            {
              "filename": "Report.xlsx",
              "data": [
                 {"שם": "משה", "סכום": 100},
                 {"שם": "דוד", "סכום": 200}
              ]
            }
            [EXCEL_END]

            2. If the user asks for a PDF file or a designed report, reply with this EXACT format:
            [PDF_START]
            {
              "filename": "Summary.pdf",
              "html": "<h1 style='text-align:center; color:#4f46e5;'>דו''ח סיכום</h1><table border='1' width='100%'><tr><th>שם</th><th>נתון</th></tr><tr><td>דוגמה</td><td>123</td></tr></table>"
            }
            [PDF_END]
            `;

            let key = localStorage.getItem('gemini_manual_key');

            const userParts = [];
            if (this.currentAttachment && this.currentAttachment.type === 'text') {
                userParts.push({ text: `הנה תוכן הקובץ המצורף:\n${this.currentAttachment.data}\n\n` });
            } else if (this.currentAttachment && this.currentAttachment.type === 'media') {
                userParts.push({ inline_data: { mime_type: this.currentAttachment.mime_type, data: this.currentAttachment.data } });
            }
            if (text) userParts.push({ text: text });

            this.updateActiveContext("user", userParts);

            const requestBody = {
                system_instruction: { parts: { text: sysInstruction } },
                contents: this.getActiveSession().context
            };

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.currentModel}:generateContent?key=${key}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (this.currentAttachment) this.clearAttachment();

            const data = await response.json();
            
            const loader = document.getElementById(loadingId);
            if (loader) loader.parentElement.remove(); // מחיקת הודעת הטעינה

            if (data.error) throw new Error(data.error.message || "שגיאה בשרת");
            
            const rawReply = data.candidates?.[0]?.content?.parts?.[0]?.text || "לא התקבלה תשובה מילולית.";
            
            this.updateActiveContext("model", [{ text: rawReply }]);

            // עיבוד התשובה: הפיכת תגיות לכפתורי הורדה והצגה
            const finalHtml = this.executeAICommand(rawReply);
            this.addMsg(finalHtml, 'ai');

        } catch (e) {
            console.error(e);
            const loader = document.getElementById(loadingId);
            if (loader) loader.parentElement.remove();
            
            if(e.message.includes('API key') || e.message.includes('400')) {
                 this.addMsg(`שגיאת אימות. יתכן שהמפתח שגוי.`, 'ai');
                 this.showKeyInputUI(true);
            } else {
                 this.addMsg(`<span class="text-red-500 font-bold"><i class="fas fa-exclamation-triangle"></i> שגיאה:</span> ${e.message}`, 'ai');
            }
            
            const session = this.getActiveSession();
            if(session) session.context.pop(); // ביטול השאלה מהזיכרון כדי לא לתקוע אותו
            this.saveSessions();
        }
    }
};

window.HybridAI = HybridAI;
document.addEventListener('DOMContentLoaded', () => setTimeout(() => HybridAI.init(), 1000));
