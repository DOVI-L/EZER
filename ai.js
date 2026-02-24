// 1 מערכת בינה מלאכותית חכמה (תומכת קבצים ופקודות שרת)
const HybridAI = {
    mode: 'offline',
    keyTimer: null,
    TIMEOUT_MS: 15 * 60 * 1000, 
    currentAttachment: null, 

    // 2 אתחול
    init() {
        const btnContainer = document.getElementById('ai-bubble-container');
        if (btnContainer) {
            btnContainer.classList.remove('hidden-screen', 'hidden');
            btnContainer.style.display = 'block';
        }

        this.checkApiKey();
        window.addEventListener('online', () => this.handleNetworkChange(true));
        window.addEventListener('offline', () => this.handleNetworkChange(false));
        
        ['mousemove', 'keydown', 'click'].forEach(ev => document.addEventListener(ev, () => this.resetKeyExpiration()));
        this.resetKeyExpiration();
    },

    // 3 ניהול זמן מפתח ידני (אבטחה)
    resetKeyExpiration() {
        clearTimeout(this.keyTimer);
        this.keyTimer = setTimeout(() => {
            if (localStorage.getItem('gemini_manual_key')) {
                localStorage.removeItem('gemini_manual_key');
                this.setOffline("המפתח נמחק עקב חוסר פעילות (אבטחה)");
            }
        }, this.TIMEOUT_MS);
    },

    // 4 תצוגת הזנת מפתח (קובץ) מתוך הצ'אט
    showKeyInputUI() {
        const container = document.getElementById('ai-messages');
        if(!container) return;
        container.innerHTML = `
            <div class="bg-indigo-50 p-6 rounded-3xl border border-indigo-200 text-center mt-4 shadow-inner">
                <div class="w-16 h-16 bg-white rounded-full mx-auto flex items-center justify-center shadow-md mb-4 text-indigo-500 text-3xl animate-bounce-slight">
                    <i class="fas fa-lock"></i>
                </div>
                <h4 class="font-black text-lg mb-2 text-indigo-900">העלה קובץ מפתח</h4>
                <p class="text-xs text-indigo-700 mb-6 font-medium">המערכת נעולה. אנא העלה קובץ .key או .txt המכיל את המפתח הסודי לפתיחת העוזר החכם.</p>
                <button onclick="document.getElementById('ai-key-file-input').click()" class="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl py-3 text-sm font-bold shadow-lg hover:shadow-xl transition transform hover:-translate-y-1">
                    <i class="fas fa-upload mr-1"></i> בחר קובץ מפתח...
                </button>
            </div>
        `;
    },

    // 5 קריאת קובץ המפתח
    handleKeyFileUpload(input) {
        const file = input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const keyText = e.target.result.trim();
            if (keyText.length > 20) { 
                localStorage.setItem('gemini_manual_key', keyText);
                document.getElementById('ai-messages').innerHTML = `
                    <div class="text-center py-10 fade-in">
                        <i class="fas fa-unlock-alt text-6xl text-emerald-500 mb-4 drop-shadow-md"></i>
                        <h3 class="font-black text-emerald-800 text-xl">המערכת נפתחה!</h3>
                    </div>
                `;
                setTimeout(() => {
                    document.getElementById('ai-messages').innerHTML = '';
                    if(this.checkApiKey()) this.addMsg("התחברתי בהצלחה! אני יכול לקרוא קבצי נתונים, תמונות, ולעדכן נתונים במערכת. במה אפשר לעזור?", 'ai');
                }, 1500);
            } else {
                alert("הקובץ לא נראה כמו מפתח תקין.");
            }
        };
        reader.readAsText(file);
    },

    // 6 בדיקת מפתח פעיל
    checkApiKey() {
        let key = localStorage.getItem('gemini_manual_key') || window.GEMINI_API_KEY;
        if (!key || key.includes('PLACEHOLDER') || key.includes('__GEMINI')) {
            this.setOffline("דרוש קובץ מפתח");
            return false;
        }
        this.setOnline();
        return true;
    },

    setOnline() {
        this.mode = 'online';
        const dot = document.getElementById('ai-status-dot');
        const text = document.getElementById('ai-status-text');
        if (dot) dot.className = "w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shadow-lg";
        if (text) text.innerText = "פעיל (Gemini AI)";
    },

    setOffline(reason) {
        this.mode = 'offline';
        const dot = document.getElementById('ai-status-dot');
        const text = document.getElementById('ai-status-text');
        if (dot) dot.className = "w-2.5 h-2.5 rounded-full bg-red-500";
        if (text) text.innerText = `נעול (${reason})`;
        if (reason.includes("מפתח")) this.showKeyInputUI();
    },

    handleNetworkChange(isOnline) {
        if (isOnline) this.checkApiKey();
        else this.setOffline("אין חיבור רשת");
    },

    // 7 ניהול קבצים מצורפים לצ'אט
    handleFileUpload(input) {
        const file = input.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64Data = e.target.result.split(',')[1]; 
            this.currentAttachment = {
                mime_type: file.type,
                data: base64Data,
                name: file.name
            };
            
            const preview = document.getElementById('ai-attachment-preview');
            const nameEl = document.getElementById('ai-attachment-name');
            nameEl.innerText = file.name;
            preview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    },

    clearAttachment() {
        this.currentAttachment = null;
        document.getElementById('ai-attachment-preview').classList.add('hidden');
        document.getElementById('ai-file-upload').value = '';
    },

    // 8 הוספת הודעה למסך
    addMsg(html, role) {
        const container = document.getElementById('ai-messages');
        if (!container) return;
        const div = document.createElement('div');
        div.className = role === 'user' 
            ? "bg-indigo-600 text-white self-end p-2.5 rounded-2xl rounded-tr-sm mb-2 text-sm max-w-[85%] shadow-md" 
            : role === 'system'
            ? "text-center text-xs text-amber-600 my-2 font-bold bg-amber-50 p-2 rounded-lg"
            : "bg-white border border-indigo-50 text-gray-800 self-start p-3 rounded-2xl rounded-tl-sm mb-2 text-sm max-w-[95%] shadow-sm leading-relaxed overflow-hidden";
        div.innerHTML = html;
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    },

    // 9 מנוע פקודות AI (כולל פענוח פקודת מסד נתונים)
    executeAICommand(commandString) {
        let responseHtml = commandString;

        // פענוח פקודות DB מה-AI
        const dbMatch = responseHtml.match(/\[DB_UPDATE\]([\s\S]*?)\[\/DB_UPDATE\]/);
        if (dbMatch) {
            try {
                const dbAction = JSON.parse(dbMatch[1].trim());
                const actionId = 'db-act-' + Date.now();
                
                const safeData = encodeURIComponent(JSON.stringify(dbAction));

                const approveCard = `
                    <div class="mt-3 bg-blue-50 border border-blue-200 p-3 rounded-xl shadow-sm">
                        <div class="flex items-center gap-2 text-blue-800 font-bold mb-2">
                            <i class="fas fa-database text-lg text-blue-500"></i> פעולת מערכת ממתינה לאישור
                        </div>
                        <p class="text-xs text-blue-700 mb-3">${dbAction.description}</p>
                        <div class="flex gap-2" id="${actionId}">
                            <button onclick="HybridAI.confirmDBUpdate('${actionId}', '${safeData}')" class="flex-1 bg-blue-600 text-white p-2 rounded-lg text-xs font-bold shadow-md hover:bg-blue-700 transition">אשר ושמור במסד</button>
                            <button onclick="document.getElementById('${actionId}').innerHTML = '<span class=\\'text-gray-500 text-xs font-bold\\'>הפעולה בוטלה ע\\'י המשתמש.</span>'" class="bg-white border border-gray-300 text-gray-600 p-2 rounded-lg text-xs font-bold hover:bg-gray-100 transition">בטל</button>
                        </div>
                    </div>
                `;
                responseHtml = responseHtml.replace(dbMatch[0], approveCard);
            } catch (e) {
                console.error("Failed to parse DB command from AI", e);
                responseHtml = responseHtml.replace(dbMatch[0], `<div class="text-xs text-red-500 bg-red-50 p-2 rounded">שגיאה בפיענוח פקודת הנתונים שהרכבתי.</div>`);
            }
        }

        const routeMatch = responseHtml.match(/\[ROUTE:(.*?)\]/);
        if (routeMatch) {
            Router.go(routeMatch[1]);
            responseHtml = responseHtml.replace(routeMatch[0], `<div class="mt-2 text-xs bg-indigo-50 text-indigo-700 p-2 rounded font-bold"><i class="fas fa-location-arrow"></i> העברתי אותך למסך המבוקש.</div>`);
        }

        const reportMatch = responseHtml.match(/\[ACTION:REPORT_EDITOR(.*?)\]/);
        if (reportMatch) {
            let title = 'דוח מיוחד (נוצר ע"י AI)';
            if (reportMatch[1] && reportMatch[1].startsWith('|')) title = reportMatch[1].substring(1);
            
            Reports.openEditor('visual');
            Reports.updateTitle(title);
            responseHtml = responseHtml.replace(reportMatch[0], `<div class="mt-3"><button onclick="Reports.openEditor('visual'); Reports.updateTitle('${title}');" class="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-2 rounded-lg font-bold text-xs shadow-md"><i class="fas fa-magic"></i> פתח את העורך שהכנתי לך</button></div>`);
        }

        if (responseHtml.includes('[ACTION:IMPORT_EXCEL]')) {
            responseHtml = responseHtml.replace('[ACTION:IMPORT_EXCEL]', `
                <div class="mt-3 bg-green-50 border border-green-200 p-2 rounded-lg">
                    <p class="text-xs text-green-800 mb-2 font-bold">מערכת הייבוא מוכנה. מה תרצה לעשות?</p>
                    <div class="flex gap-2">
                        <button onclick="Importer.init('students')" class="flex-1 bg-green-600 text-white p-1.5 rounded text-xs">ייבוא לבחורים</button>
                        <button onclick="Importer.init('donors')" class="flex-1 bg-teal-600 text-white p-1.5 rounded text-xs">ייבוא לתורמים</button>
                    </div>
                </div>
            `);
        }

        return responseHtml.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    },

    // 10 אישור וביצוע פעולת מסד מתוך הצ'אט
    confirmDBUpdate(elementId, encodedData) {
        try {
            const dbAction = JSON.parse(decodeURIComponent(encodedData));
            
            OfflineManager.write(dbAction.path, System.cleanObject(dbAction.data), dbAction.type || 'set');
            
            document.getElementById(elementId).innerHTML = `<div class="bg-emerald-100 text-emerald-800 p-2 rounded text-xs font-bold text-center w-full"><i class="fas fa-check-circle"></i> נשמר בהצלחה במסד הנתונים!</div>`;
            
            if (dbAction.path.includes('students') && Router.current === 'students') Students.render();
            if (dbAction.path.includes('donors') && Router.current === 'donors') Donors.render();
            if (dbAction.path.includes('finance') && window.Finance) Finance.loadMore(true);

        } catch (e) {
            alert("שגיאה בשמירה: " + e.message);
        }
    },

    // 11 תקשורת מול גוגל (עדכון ל-gemini-2.5-flash)
    async send() {
        const inp = document.getElementById('ai-input');
        const text = inp.value.trim();
        if (!text && !this.currentAttachment) return;

        let displayHtml = text;
        if (this.currentAttachment) {
            displayHtml = `<div class="ai-file-badge"><i class="fas fa-file"></i> ${this.currentAttachment.name}</div><br>` + text;
        }

        this.addMsg(displayHtml, 'user');
        inp.value = '';

        if (this.mode === 'offline') {
            setTimeout(() => this.addMsg("המערכת נעולה. אנא העלה קובץ מפתח.", 'ai'), 500); 
            return;
        }

        this.addMsg('<i class="fas fa-spinner fa-spin text-indigo-500"></i> מנתח נתונים...', 'ai');
        
        try {
            const sysInstruction = `
            You are an advanced AI assistant for 'Ezer Chatanim', a Yeshiva donation management system.
            Current screen: ${Router.current}. Current Hebrew Year: ${Store.currentYear}.
            
            ABILITIES & RULES:
            1. You can read images, PDFs, and any file sent by the user. Extract its details if asked.
            2. If the user asks you to ADD or UPDATE a student, donor, or finance transaction, you MUST respond with a JSON block. 
               Format exactly like this:
               [DB_UPDATE]
               {
                 "path": "global/students/NEW_ID_OR_EXISTING",
                 "type": "set",
                 "data": { "name": "FullName", "grade": "שיעור א", "phone": "050" },
                 "description": "הוספת בחור למאגר: FullName"
               }
               [/DB_UPDATE]
               (Use path global/donors for donors, or years/YEAR/finance/ID for finance).
            3. If the user asks you to update data but crucial info is missing (like what Shiur), ASK THEM FIRST.
            4. Speak ONLY in Hebrew. Be concise.
            5. UI Navigation: Use [ROUTE:page_name] to move screens.
            6. Excel Import: Use [ACTION:IMPORT_EXCEL] to open the import tool.
            `;

            let key = localStorage.getItem('gemini_manual_key') || window.GEMINI_API_KEY;

            const requestBody = {
                system_instruction: { parts: { text: sysInstruction } },
                contents: [{ parts: [] }]
            };

            if (text) requestBody.contents[0].parts.push({ text: text });
            if (this.currentAttachment) {
                requestBody.contents[0].parts.push({
                    inline_data: {
                        mime_type: this.currentAttachment.mime_type,
                        data: this.currentAttachment.data
                    }
                });
            }

            // עדכון המודל הנכון (2.5 תומך בבטא ללא שגיאות)
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (this.currentAttachment) this.clearAttachment();

            const data = await response.json();
            
            const msgs = document.getElementById('ai-messages');
            if (msgs.lastElementChild.innerHTML.includes('fa-spinner')) msgs.lastElementChild.remove();

            if (data.error) {
                if (data.error.code === 400 || data.error.message.includes('API key')) {
                    localStorage.removeItem('gemini_manual_key');
                    this.setOffline("מפתח פג תוקף, המערכת ננעלה.");
                    return;
                }
                throw new Error(data.error.message);
            }
            
            const rawReply = data.candidates?.[0]?.content?.parts?.[0]?.text || "בוצעה פעולה (ללא מלל).";
            const finalHtml = this.executeAICommand(rawReply);
            this.addMsg(finalHtml, 'ai');

        } catch (e) {
            console.error(e);
            this.addMsg(`שגיאה בתקשורת עם ה-AI. <br><span class="text-[10px] text-red-500">${e.message}</span>`, 'ai');
        }
    }
};

window.HybridAI = HybridAI;
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => HybridAI.init(), 1000);
});
