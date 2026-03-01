
const Notify = {
    // 1 הצגת התראת מערכת
    show(msg, type = 'info') {
        const con = document.getElementById('toast-container');
        if (!con) return alert(msg);
        const el = document.createElement('div');
        el.className = `toast ${type}`;
        const icon = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';
        el.innerHTML = `<i class="fas ${icon} toast-icon"></i><span class="font-medium text-slate-800 text-sm">${msg}</span>`;
        con.appendChild(el);
        setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 3000);
    }
};

const Modal = {
    // 2 רינדור מודאל דינמי
    render(title, fields, onSave, extraHtml='', widthClass = '') {
        let html = '';
        fields.forEach(f => {
            html += `<div class="mb-4"><label class="block text-sm font-bold text-slate-700 mb-1">${f.l} ${f.r?'<span class="text-red-500">*</span>':''}</label>`;
            if(f.t === 'select') {
                html += `<select id="field-${f.id}" class="w-full border border-slate-300 p-2.5 rounded-lg bg-white outline-none">`;
                f.opts.forEach(o => html += `<option value="${o}" ${f.v===o?'selected':''}>${o}</option>`);
                html += `</select>`;
            } else if(f.t === 'checkbox') {
                 html += `<div class="flex items-center gap-2"><input type="checkbox" id="field-${f.id}" ${f.v?'checked':''} class="h-5 w-5 rounded text-indigo-600"> <span class="text-sm">פעיל</span></div>`;
            } else if(f.t === 'textarea') {
                html += `<textarea id="field-${f.id}" class="w-full border border-slate-300 p-2.5 rounded-lg outline-none h-24">${f.v||''}</textarea>`;
            } else if(f.t === 'referrer_select') {
                const opts = Object.values(Store.data.students).map(s => {
                    const n = s.firstName && s.lastName ? `${s.firstName} ${s.lastName}` : s.name;
                    return `<option value="${s.id}" ${f.v===s.id?'selected':''}>${n}</option>`;
                }).join('');
                html += `<select id="field-${f.id}" class="w-full border border-slate-300 p-2.5 rounded-lg bg-white"><option value="" ${!f.v?'selected':''}>-- בחר --</option>${opts}</select>`;
            } else {
                html += `<input id="field-${f.id}" type="${f.t||'text'}" value="${f.v||''}" class="w-full border border-slate-300 p-2.5 rounded-lg outline-none" ${f.r?'required':''}>`;
            }
            html += `</div>`;
        });
        html += extraHtml;
        this.renderRaw(title, html, () => {
            const data = {};
            fields.forEach(f => {
                const el = document.getElementById(`field-${f.id}`);
                data[f.id] = f.t === 'checkbox' ? el.checked : el.value;
            });
            onSave(System.cleanObject(data)); 
            this.close();
        }, widthClass);
    },
    
    // 3 רינדור מודאל חופשי
    renderRaw(title, bodyHtml, onSaveAction, widthClass = '') {
        document.getElementById('modal-title').innerText = title;
        document.getElementById('modal-body').innerHTML = bodyHtml;
        const modalContainer = document.querySelector('#modal-form > div');
        modalContainer.classList.remove('w-[550px]', 'max-w-4xl', 'w-full', 'max-w-7xl');
        if (widthClass) widthClass.split(' ').forEach(c => modalContainer.classList.add(c));
        else modalContainer.classList.add('w-[550px]');
        
        document.getElementById('modal-form').classList.remove('hidden-screen');
        const btnContainer = document.querySelector('#modal-form .btn-primary').parentElement;
        if(btnContainer) btnContainer.style.display = 'flex';
        
        modalContainer.classList.remove('scale-95', 'opacity-0');
        
        const btn = document.getElementById('modal-save-btn');
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.onclick = onSaveAction;
    },
    
    // 4 סגירת חלון מודאל
    close() { 
        const el = document.querySelector('#modal-form > div');
        if(el) el.classList.add('scale-95'); 
        setTimeout(() => document.getElementById('modal-form').classList.add('hidden-screen'), 100); 
    }
};

const ListenerManager = {
    activeListeners: [],
    // 5 הוספת מאזין פיירבייס
    add(ref, eventType, callback) {
        ref.on(eventType, callback);
        this.activeListeners.push({ ref, eventType, callback });
    },
    // 6 הסרת מאזין פיירבייס
    remove(ref, eventType, callback) {
        ref.off(eventType, callback);
        this.activeListeners = this.activeListeners.filter(l => l.callback !== callback);
    },
    // 7 ניקוי כל המאזינים
    clearAll() {
        this.activeListeners.forEach(l => l.ref.off(l.eventType, l.callback));
        this.activeListeners = [];
    }
};

// 8 קבלת שנה עברית
const getHebrewYear = () => {
    const d = new Date();
    const y = d.getFullYear();
    const hYear = d.getMonth() > 8 ? y + 3761 : y + 3760; 
    const map = {5780:'תש״פ', 5781:'תשפ״א', 5782:'תשפ״ב', 5783:'תשפ״ג', 5784:'תשפ״ד', 5785:'תשפ״ה', 5786:'תשפ״ו', 5787:'תשפ״ז', 5788:'תשפ״ח'};
    return map[hYear] || hYear.toString();
};

const System = {
    searchTimeout: null,
    
    // 9 אתחול ממשק מערכת
    initUI() {
        const sel = document.getElementById('year-selector');
        if(!sel) return;
        sel.innerHTML = '';
        const d = new Date();
        const currG = d.getFullYear();
        const currH = d.getMonth() > 8 ? currG + 3761 : currG + 3760; 
        const yearsList = [];
        for(let i = -7; i <= 2; i++) {
            const hYear = currH + i;
            const map = {5780:'תש״פ', 5781:'תשפ״א', 5782:'תשפ״ב', 5783:'תשפ״ג', 5784:'תשפ״ד', 5785:'תשפ״ה', 5786:'תשפ״ו', 5787:'תשפ״ז', 5788:'תשפ״ח'};
            yearsList.push(map[hYear] || hYear.toString());
        }
        yearsList.forEach(y => {
            const op = document.createElement('option');
            op.value = y; op.innerText = y;
            if(y === Store.currentYear) op.selected = true;
            sel.appendChild(op);
        });
        document.querySelectorAll('.curr-year').forEach(s => s.innerText = Store.currentYear);
    },
    
    // 10 שינוי שנת פעילות
    changeYear(y) {
        const currentView = Router.current;
        ListenerManager.clearAll(); 
        Store.currentYear = y;
        Store.data.yearData = {};
        Store.data.stats = { income: 0, expense: 0 };
        Store.loadConfig();
        Store.loadStats();
        Store.loadGroups();
        if(window.Finance) Finance.reset();
        document.querySelectorAll('.curr-year').forEach(s => s.innerText = y);
        Router.go(currentView || 'dashboard'); 
    },
    
    // 11 הוספת שנה ידנית
    addCustomYear() {
        const y = prompt("הכנס שנה חדשה (לדוגמה: תשצ״ט או 5800):");
        if (y) {
            const sel = document.getElementById('year-selector');
            const op = document.createElement('option');
            op.value = y; op.innerText = y; op.selected = true;
            sel.appendChild(op);
            this.changeYear(y);
        }
    },
    
    // 12 בדיקת התקדמות יעד
    checkStudentProgress(studentId, addedAmount) {
        if(!studentId) return;
        db.ref(`years/${Store.currentYear}/finance`).orderByChild('studentId').equalTo(studentId).once('value', snap => {
            let total = 0;
            if(snap.val()) {
                Object.values(snap.val()).forEach(tx => {
                    if(tx.type === 'income' && !isNaN(parseFloat(tx.amount))) total += parseFloat(tx.amount);
                });
            }
            
            OfflineManager.write(`years/${Store.currentYear}/studentData/${studentId}/totalRaised`, total);

            const tiers = (Store.data.config.studentTiers || []).sort((a,b) => b.amount - a.amount);
            const reachedTier = tiers.find(t => total >= t.amount);
            if(reachedTier) {
                const previousTotal = total - addedAmount;
                if(previousTotal < reachedTier.amount) {
                    this.showCelebration(Store.data.students[studentId]?.name || 'הבחור', total, reachedTier.reward);
                }
            }
        });
    },
    
    // 13 תצוגת חגיגת יעד
    showCelebration(name, amount, reward) {
        const modal = document.getElementById('celebration-modal');
        document.getElementById('celebration-name').innerText = name;
        document.getElementById('celebration-amount').innerText = amount.toLocaleString();
        document.getElementById('celebration-reward').innerText = reward;
        modal.classList.remove('hidden-screen');
        const container = document.getElementById('confetti-container');
        container.innerHTML = '';
        const colors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#6366F1', '#8B5CF6'];
        for(let i=0; i<100; i++) {
            const c = document.createElement('div');
            c.style.cssText = `position: absolute; width: ${Math.random()*10+5}px; height: ${Math.random()*10+5}px; background: ${colors[Math.floor(Math.random()*colors.length)]}; left: ${Math.random()*100}%; top: -20px; animation: confetti-fall ${Math.random()*2+2}s linear forwards;`;
            container.appendChild(c);
        }
    },
    
    // 14 חיפוש חכם במסד
    searchFirebase(term, type) {
        clearTimeout(this.searchTimeout);
        if(!term && !type) { location.reload(); return; }
        if(!term || term.length < 2) {
             if(type === 'students') Students.render();
             if(type === 'donors') Donors.render();
             return;
        }
        
        // חיפוש מקומי מיידי
        if(type === 'students') Students.render(term); else Donors.render(term);

        // אם מדובר בבחורים - סיימנו כאן, אין צורך לחפש בשרת כי כל הבחורים יורדים מיד במלואם.
        if (type === 'students') return;

        // אם מדובר בתורמים - המתנה של חצי שניה מחוסר הקלדה ורק אז פנייה לשרת (Firebase)
        this.searchTimeout = setTimeout(() => {
            const path = 'global/donors';
            const targetStore = Store.data.donors;
            
            db.ref(path).orderByChild('name').startAt(term).endAt(term + "\uf8ff").once('value').then(snapName => {
                if(snapName.val()) {
                    Object.assign(targetStore, snapName.val());
                    OfflineManager.saveState(type, targetStore);
                    Donors.render(term);
                }
            });

            if (!isNaN(term)) {
                db.ref(path).orderByChild('studentNum').equalTo(term).once('value').then(snapNum => {
                    if(snapNum.val()) {
                        Object.assign(targetStore, snapNum.val());
                        OfflineManager.saveState(type, targetStore);
                        Donors.render(term);
                    }
                });
            }
        }, 500); 
    },
    // 15 הפעלת בועת בינה
    toggleAI(enabled) {
        const aiContainer = document.getElementById('ai-bubble-container');
        const aiCheck = document.getElementById('conf-enable-ai');
        if (Store.role === 'admin' && enabled) {
            if(aiContainer) aiContainer.classList.remove('hidden-screen');
            if(aiCheck) aiCheck.checked = true;
        } else {
            if(aiContainer) aiContainer.classList.add('hidden-screen');
            if(aiCheck) aiCheck.checked = false;
        }
    },

    // 16 עיצוב תאריך עברי
    toHebrewDate(dateInput) {
        try {
            const date = new Date(dateInput);
            if (isNaN(date.getTime())) return dateInput;
            const dd = String(date.getDate()).padStart(2, '0');
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const yyyy = date.getFullYear();
            return `${dd}/${mm}/${yyyy}`; 
        } catch (e) { return dateInput; }
    },
    
    // 17 פענוח תאריך אקסל
    parseExcelDate(val) {
        if (!val) return null;
        if (!isNaN(val) && typeof val === 'number') return new Date(Math.round((val - 25569) * 86400 * 1000));
        if (typeof val === 'string') {
            let dStr = val.split(' ')[0].trim();
            let parts = dStr.split(/[-/]/); 
            if (parts.length === 3) {
                if (parts[0].length === 4) return new Date(`${parts[0]}-${parts[1]}-${parts[2]}T12:00:00`); 
                return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00`); 
            }
            return new Date(dStr);
        }
        return new Date(val);
    },
    
    // 18 חילוץ שנה מתאריך
    getHebrewYearFromDate(dateInput) {
        try {
            const date = this.parseExcelDate(dateInput);
            if (!date || isNaN(date.getTime())) return null;
            const y = date.getFullYear();
            const hYear = date.getMonth() > 8 ? y + 3761 : y + 3760; 
            const map = {5780:'תש״פ', 5781:'תשפ״א', 5782:'תשפ״ב', 5783:'תשפ״ג', 5784:'תשפ״ד', 5785:'תשפ״ה', 5786:'תשפ״ו', 5787:'תשפ״ז', 5788:'תשפ״ח'};
            return map[hYear] || hYear.toString();
        } catch(e) { return null; }
    },
// 18.5 פירוק חכם של קלט - מפריד סכום כספי מטקסט (למשל: "200 צ'ק דחוי" או "ל''ה")
    parseFinancialInput(rawVal) {
        if (rawVal === null || rawVal === undefined || rawVal === '') return { amount: null, textNote: null };
        const str = String(rawVal).trim();
        
        // חיפוש המספר הראשון בתוך המחרוזת
        const numMatch = str.match(/-?\d+(\.\d+)?/);
        if (numMatch) {
            const amount = parseFloat(numMatch[0]);
            // הטקסט הוא כל מה שנשאר אחרי שהסרנו את המספר
            let textNote = str.replace(numMatch[0], '').trim();
            // ניקוי תווים מיותרים שנשארו (כמו מקף או פסיק)
            textNote = textNote.replace(/^[-,\s]+|[-,\s]+$/g, '').trim();
            return { amount: amount, textNote: textNote || null };
        }
        // אם אין בכלל מספר, הכל נחשב כטקסט
        return { amount: null, textNote: str };
    },
    // 19 ניקוי אובייקט ריק
    cleanObject(obj) {
        const cleaned = {};
        Object.keys(obj).forEach(key => {
            let val = obj[key];
            if (typeof val === 'string') val = val.trim(); 
            if (val !== null && val !== undefined && val !== '') {
                cleaned[key] = val;
            }
        });
        return cleaned;
    },

    // 20 טיפול באנטר בחיפוש
    handleSearchEnter(inputId) {
        const input = document.getElementById(inputId);
        if(!input) return;
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                input.blur();
                setTimeout(() => input.value = '', 100); 
            }
        });
    },

    // 21 ניקוי מטמון דפדפן
    clearLocalCache() {
        if(confirm('פעולה זו תמחק את כל המטמון המקומי מהדפדפן שלך ותטען את כל הנתונים מחדש. האם להמשיך?')) {
            localStorage.clear(); 
            Notify.show('מטמון דפדפן נוקה. טוען מחדש...', 'success');
            setTimeout(() => location.reload(), 1500);
        }
    }
};

const UI = {
    // 22 עדכון תצוגה פעילה
    updateIfVisible(module) {
        if(Router.current === module) {
            if(module === 'students') Students.render();
            if(module === 'donors') Donors.render();
            if(module === 'groups') Groups.render();
            if(module === 'finance') Finance.render();
        }
        if(module === 'finance' && Router.current === 'dashboard') Dashboard.render();
    }
};

window.Notify = Notify;
window.Modal = Modal;
window.ListenerManager = ListenerManager;
window.System = System;
window.UI = UI;