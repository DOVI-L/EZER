// 1 מנהל אופליין ותקשורת
const OfflineManager = {
    isOnline: navigator.onLine,
    queue: [],
    
    // 2 אתחול שירות אופליין
    init() {
        try {
            const q = localStorage.getItem('offlineQueue');
            this.queue = q ? JSON.parse(q) : [];
        } catch (e) {
            console.error("Error parsing offline queue:", e);
            this.queue = [];
        }
        
        window.addEventListener('online', () => this.updateStatus(true));
        window.addEventListener('offline', () => this.updateStatus(false));
        this.updateStatus(this.isOnline);
    },
    
    // 3 שמירת מטמון מקומי
    saveState(key, data) {
        try {
            localStorage.setItem('cache_' + key, JSON.stringify(data));
        } catch(e) { console.warn('Cache full or invalid', e); }
    },
    
    // 4 טעינת מטמון מקומי
    loadState(key) {
        try {
            const item = localStorage.getItem('cache_' + key);
            return item ? JSON.parse(item) : null;
        } catch(e) { return null; }
    },

    // 5 עדכון נראות סטטוס
    updateStatus(online) {
        this.isOnline = online;
        const ind = document.getElementById('connection-status');
        const txt = document.getElementById('conn-text');
        
        if(online) {
            if(this.queue.length > 0) {
                ind.className = 'status-syncing';
                txt.innerText = `מסנכרן ${this.queue.length}...`;
                this.processQueue();
            } else {
                ind.className = 'status-connected';
                txt.innerText = 'מחובר';
            }
        } else {
            ind.className = 'status-offline';
            txt.innerText = 'מנותק (שמירה מקומית)';
        }
    },
    
    // 6 כתיבה חכמה (אונליין/אופליין) (1)
    write(path, data, type = 'set') {
        this.updateLocalStore(path, data, type);

        if(this.isOnline) {
            if(type === 'set') return db.ref(path).set(data);
            if(type === 'update') return db.ref(path).update(data);
            if(type === 'remove') return db.ref(path).remove();
            if(type === 'transaction') return db.ref(path).transaction(data);
        } else {
            // סעיף 1: תמיכה מינימלית באופליין גם לדברים כבדים (הסתמכות על כפתור הסנכרון בהמשך)
            if(type === 'transaction') {
                Notify.show('שים לב: העדכון יישמר מקומית. לחץ על כפתור "חישוב מחדש" בהגדרות כשיחזור האינטרנט.', 'info');
                return;
            }
            this.queue.push({path, data, type, ts: Date.now()});
            localStorage.setItem('offlineQueue', JSON.stringify(this.queue));
            Notify.show('נשמר בתור לסינכרון', 'info');
            this.updateStatus(false);
        }
    },

    // 7 עדכון נתונים מקומי מהיר (7)
    updateLocalStore(path, data, type) {
        const parts = path.split('/');
        let storeKey = null;
        let itemId = null;

        if (path.includes('global/students')) { storeKey = 'students'; itemId = parts[2]; }
        else if (path.includes('global/donors')) { storeKey = 'donors'; itemId = parts[2]; }
        else if (path.includes('/finance/')) {
            const txId = parts[parts.length - 1];
            if (type === 'remove') {
                if (Finance.financeData[txId]) delete Finance.financeData[txId];
            } else {
                 const txData = type === 'update' ? { ...(Finance.financeData[txId]||{}), ...data } : data;
                 Finance.financeData[txId] = txData;
            }
            // סעיף 1: עדכון סטטוס קופה מקומי בעת אופליין
            if (!this.isOnline && data.amount && !isNaN(parseFloat(data.amount))) {
                 const amt = parseFloat(data.amount);
                 if (data.type === 'income') Store.data.stats.income += amt;
                 if (data.type === 'expense') Store.data.stats.expense += amt;
                 if (Router.current === 'dashboard') Dashboard.render();
            }

            if (Router.current === 'finance') Finance.render(); // סעיף 7
            return;
        }

        if (storeKey && itemId) {
            if (type === 'remove') {
                if (Store.data[storeKey][itemId]) {
                    delete Store.data[storeKey][itemId];
                }
            } else if (type === 'set' || type === 'update') {
                const existing = Store.data[storeKey][itemId] || {};
                Store.data[storeKey][itemId] = type === 'update' ? { ...existing, ...data } : data;
            }
            this.saveState(storeKey, Store.data[storeKey]);
            
            if (Router.current === storeKey) {
                if(storeKey === 'students') Students.render();
                else Donors.render();
            }
        }
        
        if (path.includes('studentData') && path.includes('personalGoal')) {
            const year = parts[1];
            const sid = parts[3];
            if(!Store.data.yearData[year]) Store.data.yearData[year] = {};
            if(!Store.data.yearData[year].students) Store.data.yearData[year].students = {};
            if(!Store.data.yearData[year].students[sid]) Store.data.yearData[year].students[sid] = {};
            
            if (type === 'remove') delete Store.data.yearData[year].students[sid].personalGoal;
            else Store.data.yearData[year].students[sid].personalGoal = data;
            
            if(Router.current === 'students') Students.render(); // סעיף 7
        }
    },
    
    // 8 סנכרון תור המתנה (1)
    async processQueue() {
        const q = [...this.queue];
        this.queue = [];
        localStorage.setItem('offlineQueue', '[]');
        
        for (const item of q) {
            try {
                if(item.type === 'set') await db.ref(item.path).set(item.data);
                if(item.type === 'update') await db.ref(item.path).update(item.data);
                if(item.type === 'remove') await db.ref(item.path).remove();
            } catch (err) {
                console.error("שגיאה בסנכרון פריט אופליין:", item.path, err);
            }
        }
        
        setTimeout(() => {
            Notify.show('הנתונים מהאופליין סונכרנו בהצלחה', 'success');
            this.updateStatus(true);
        }, 1000);
    }
};

// 9 מערכת AI אופליין מגבה
const OfflineAI = {
    context: null, 
    
    addMsg(text, isUser = false) {
        const div = document.createElement('div');
        div.className = `p-2 rounded mb-2 text-xs ${isUser ? 'bg-indigo-100 self-end text-left' : 'bg-gray-100 self-start'}`;
        div.innerHTML = text;
        const container = document.getElementById('ai-messages');
        if(container) {
            container.appendChild(div);
            container.scrollTop = container.scrollHeight;
        }
    },
    
    send() {
        const inp = document.getElementById('ai-input');
        const txt = inp.value.trim();
        if(!txt) return;
        this.addMsg(txt, true);
        inp.value = '';
        
        setTimeout(() => {
            const response = this.processQuery(txt);
            this.addMsg(response);
        }, 600);
    },
    
    processQuery(txt) {
        txt = txt.toLowerCase();

        if (txt.includes('עזרה') || txt.includes('help') || txt.includes('פקודות')) {
            return `<b>פקודות:</b><br>- "דוח כספי"<br>- "דוח תצוגה"<br>- "נתונים על [שם]"<br>- "כמה כסף בקופה"`;
        }
        if (this.context === 'report_type') {
            this.context = null;
            if (txt.includes('כספ') || txt.includes('הכנס')) { Reports.generateStandard(); return "מפיק דוח כספי..."; }
            if (txt.includes('תצוג') || txt.includes('פורים')) { Reports.openEditor(); return "פותח עורך דוחות..."; }
        }
        if (txt.includes('דוח') && !txt.includes('בחור')) {
            this.context = 'report_type';
            return "איזה דוח? (כספי / תצוגה)";
        }
        if (txt.includes('על') || txt.includes('בחור')) {
            const cleanName = txt.replace('נתונים על', '').replace('בחור', '').trim();
            if(!cleanName) return "איזה בחור לחפש?";
            const students = Object.values(Store.data.students).filter(s => s);
            let found = students.find(s => (s.name||'').includes(cleanName));
            if (found) {
                return `מצאתי: <b>${found.name}</b>.<br><button onclick="Reports.generateIndividual('${found.id}', '${found.name}')" class="text-indigo-600 font-bold hover:underline">הפק דוח</button>`;
            } else {
                return "לא זיהיתי את שם הבחור.";
            }
        }
        if(txt.includes('כמה') && (txt.includes('כסף') || txt.includes('קופה'))) {
            return `הכנסות לשנה זו: ₪${(Store.data.stats.income || 0).toLocaleString()}`;
        }
        return "מצב אופליין. הקש 'עזרה' לפקודות מוכרות.";
    }
};

window.OfflineManager = OfflineManager;
window.OfflineAI = OfflineAI;
OfflineManager.init();