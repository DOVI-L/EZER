
const Students = {
    showAll: false, // הגדרה חדשה המנטרת האם להציג את כולם
    
    // 1 טעינת כל הבחורים במכה אחת (ולא במנות)
    loadMore(reset = false) {
        return new Promise((resolve) => {
            if (reset) {
                this.showAll = false;
            }
            const loader = document.getElementById('students-loader-more');
            if(loader) {
                loader.style.display = 'block';
                loader.innerHTML = '<span class="text-gray-500 font-bold"><i class="fas fa-spinner fa-spin"></i> טוען את כל הבחורים למערכת...</span>';
            }

            // משיכה של כלל הבחורים ללא לימיט כדי לאפשר חיפוש וגלילה תקינים תמיד
            db.ref('global/students').once('value', snap => {
                const data = snap.val() || {};
                Store.data.students = data;
                Store.loadedAll.students = true; // נסמן שירדו כולם
                OfflineManager.saveState('students', Store.data.students);
                
                this.render(); 
                resolve();
            });
        });
    },
    
    // 2 סנכרון בחורים חדשים
    syncNewest() {
        // היות ואנו מורידים את כולם, הסנכרון יבצע פשוט ריענון כללי מהיר ברקע
        this.loadMore();
    },
    
    // 3 רינדור רשימת בחורים
    render(searchTerm = null) {
        const term = searchTerm || (document.getElementById('student-search') ? document.getElementById('student-search').value.trim() : '');
        const tbody = document.getElementById('students-tbody');
        if(!tbody) return;
        
        tbody.innerHTML = '';
        let list = Object.values(Store.data.students).filter(s => s).map(s => {
            const fullName = s.firstName && s.lastName ? `${s.firstName} ${s.lastName}` : (s.name || 'ללא שם');
            return { ...s, displayName: fullName };
        });
        
        // תיקון מיון בטוח שימנע קריסות במקרים של נתונים פגומים מה-JSON
        list.sort((a,b) => (a.displayName||'').localeCompare(b.displayName||''));
        const baseGoal = Store.data.config.baseStudentGoal || 0;
        
        list = list.map(s => {
            const yData = (Store.data.yearData[Store.currentYear]?.students || {})[s.id] || {};
            let effective = baseGoal;
            if (yData.personalGoal !== undefined && yData.personalGoal !== null && yData.personalGoal !== '') {
                effective = parseInt(yData.personalGoal);
            }
            const raised = yData.totalRaised || 0; 
            return { ...s, ...yData, effectiveGoal: effective, totalRaised: raised }; 
        });
        
        if(term) {
            list = list.filter(s => (s.displayName || '').includes(term) || (s.studentNum && s.studentNum.includes(term)));
        }
        
        // חיתוך הרשימה לתצוגה ראשונית מהירה (30) אלא אם חיפשנו משהו או לחצנו "הצג הכל"
        let displayList;
        if (term || this.showAll) {
            displayList = list;
        } else {
            displayList = list.slice(0, 30);
        }

        const loader = document.getElementById('students-loader-more');

        if (loader) {
            loader.style.display = 'block';
            if (list.length === 0) {
                 loader.innerHTML = '<span class="text-gray-400 font-bold bg-gray-50 px-4 py-2 rounded-full border">לא נמצאו בחורים</span>';
            } else if (displayList.length >= list.length) {
                 loader.innerHTML = `<span class="text-gray-400 font-bold bg-gray-50 px-4 py-2 rounded-full border">סוף רשימה (${list.length} בחורים)</span>`;
            } else {
                 loader.innerHTML = `
                    <button onclick="Students.showAll = true; Students.render();" class="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-6 py-2 rounded-full text-sm font-bold transition shadow-sm w-full sm:w-auto">
                        <i class="fas fa-list ml-2"></i> הצג את כל השאר... (${list.length - 30} בחורים נוספים)
                    </button>`;
            }
        }
        
        if (displayList.length === 0) return;

        displayList.forEach(s => {
            const row = document.createElement('tr');
            if(s.isArchived) {
                row.className = "hover:bg-gray-200 border-b border-gray-100 transition cursor-pointer group archived-student";
            } else {
                row.className = "hover:bg-slate-50 border-b border-slate-50 transition cursor-pointer group";
            }
            
            row.onclick = (e) => { if(!e.target.closest('button')) this.openEdit(s.id); };
            
            const archiveIcon = s.isArchived ? 'fa-box-open' : 'fa-archive';
            const archiveTitle = s.isArchived ? 'שחזר מהיסטוריה' : 'העבר להיסטוריה';
            
            const pct = s.effectiveGoal > 0 ? Math.min(100, Math.round((s.totalRaised / s.effectiveGoal) * 100)) : 0;
            const goalDisplay = `
                <div class="flex flex-col gap-1 items-end w-32 mr-auto">
                    <div class="flex justify-between w-full text-[10px] font-bold">
                        <span class="text-emerald-600">₪${s.totalRaised.toLocaleString()}</span>
                        <span class="text-slate-400">₪${parseInt(s.effectiveGoal).toLocaleString()}</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div class="bg-emerald-500 h-2 rounded-full transition-all" style="width: ${pct}%"></div>
                    </div>
                </div>`;

            row.innerHTML = `
                <td class="p-3 text-right font-medium text-slate-700 group-hover:text-indigo-600 transition">
                    ${s.displayName} ${s.studentNum ? `<span class="text-xs bg-gray-100 px-1 rounded ml-1 text-gray-500">#${s.studentNum}</span>` : ''} ${s.isArchived?'(ארכיון)':''}
                </td>
                <td class="p-3 text-right text-gray-500">${s.grade || '-'}</td>
                <td class="p-3 text-right text-gray-400">${s.entryYear || '-'}</td>
                <td class="p-3 text-right" dir="ltr">${goalDisplay}</td>
                <td class="p-3">
                    <div class="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-1 custom-scroll">
                        <button onclick="Students.openBatchDonation('${s.id}', '${s.displayName}')" class="bg-green-100 text-green-600 hover:bg-green-200 hover:text-green-800 transition shrink-0 p-2 rounded-full font-bold" title="הוסף תרומות"><i class="fas fa-plus"></i></button>
                        <button onclick="Reports.generateIndividual('${s.id}', '${s.displayName}')" class="text-green-500 hover:text-green-700 transition shrink-0 p-2 hover:bg-green-50 rounded-full" title="הפק דוח אקסל"><i class="fas fa-file-excel"></i></button>
                        <button onclick="Reports.printStudentSlip('${s.id}', '${s.displayName}')" class="text-red-500 hover:text-red-700 transition shrink-0 p-2 hover:bg-red-50 rounded-full" title="הדפס דף בחור"><i class="fas fa-print"></i></button>
                        <button onclick="Students.openEdit('${s.id}')" class="text-indigo-400 hover:text-indigo-600 transition shrink-0 p-2 hover:bg-indigo-50 rounded-full"><i class="fas fa-pen"></i></button>
                        <button onclick="Students.toggleArchive('${s.id}', ${!s.isArchived})" class="text-gray-400 hover:text-gray-600 transition shrink-0 p-2 hover:bg-gray-100 rounded-full" title="${archiveTitle}"><i class="fas ${archiveIcon}"></i></button>
                        <button onclick="Students.delete('${s.id}')" class="text-red-300 hover:text-red-600 transition shrink-0 p-2 hover:bg-red-50 rounded-full admin-only"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    },

   // 4 פתיחת הוספה מהירה (בחורים - שימוש במפצל החכם לשדה הסכום)
    openBatchDonation(id, name) {
        const html = `
            <div class="space-y-4">
                <div class="bg-green-50 p-3 rounded-lg border border-green-200 flex justify-between items-center">
                    <div>
                        <div class="font-bold text-green-900">הוספת תרומות עבור: ${name}</div>
                        <div class="text-xs text-green-700">ניתן להזין סכום, טקסט, או שניהם יחד.</div>
                    </div>
                </div>
                
                <table class="w-full text-right" id="batch-add-table">
                    <thead>
                        <tr class="text-xs text-gray-500 border-b">
                            <th class="p-2">סכום / טקסט משולב</th>
                            <th class="p-2">הערה נוספת (אופציונלי)</th>
                            <th class="p-2">מקור</th>
                            <th class="p-2 w-8"></th>
                        </tr>
                    </thead>
                    <tbody id="batch-add-tbody">
                        ${this.getBatchRowHtml()}
                        ${this.getBatchRowHtml()}
                        ${this.getBatchRowHtml()}
                    </tbody>
                </table>
                
                <button onclick="Students.addBatchRow()" class="text-indigo-600 text-sm font-bold hover:underline">+ הוסף שורה</button>
            </div>
        `;

        Modal.renderRaw(`הוספת תרומות - ${name}`, html, () => {
            const rows = document.querySelectorAll('#batch-add-tbody tr');
            let count = 0;
            const now = Date.now();
            let totalAdded = 0;
            
            rows.forEach(tr => {
                const amountRaw = tr.querySelector('.input-amount').value;
                const textNote = tr.querySelector('.input-textnote').value.trim();
                
                if (!amountRaw && !textNote) return;
                
                const parsed = System.parseFinancialInput(amountRaw);
                const method = tr.querySelector('.input-method').value;
                const txId = 'tx' + Date.now() + Math.random().toString(36).substr(2,5);
                
                // חיבור הטקסט שהגיע משדה הסכום (אם היה שם) יחד עם שדה ההערה הייעודי
                const finalNote = [parsed.textNote, textNote].filter(Boolean).join(" | ");

                const txData = System.cleanObject({ 
                    id: txId, date: now, type: 'income', 
                    amount: parsed.amount, 
                    textNote: finalNote || null,
                    category: method, studentId: id, isPurim: true
                });
                
                OfflineManager.write(`years/${Store.currentYear}/finance/${txId}`, txData);
                if(OfflineManager.isOnline && parsed.amount !== null) {
                     db.ref(`years/${Store.currentYear}/stats/income`).transaction(curr => (curr || 0) + parsed.amount);
                     totalAdded += parsed.amount;
                }
                count++;
            });
            
            if (count > 0) {
                if(totalAdded > 0) System.checkStudentProgress(id, totalAdded);
                Notify.show(`${count} רשומות נוספו בהצלחה`, 'success');
                Modal.close();
                if(Router.current === 'students') setTimeout(() => this.render(), 300);
            } else { alert('לא הוזנו נתונים'); }
        }, 'max-w-3xl w-full');
    },
    // 5 יצירת שורת הוספה
    getBatchRowHtml() {
        return `
            <tr class="border-b last:border-0">
                <td class="p-2"><input type="number" class="input-amount border rounded p-1 w-full" placeholder="₪"></td>
                <td class="p-2"><input type="text" class="input-textnote border rounded p-1 w-full" placeholder="הערה..."></td>
                <td class="p-2">
                    <select class="input-method border rounded p-1 w-full text-sm">
                        <option>תרומה כללית</option><option>מזומן</option><option>צק</option><option>אשראי</option>
                    </select>
                </td>
                <td class="p-2 text-center"><button onclick="this.closest('tr').remove()" class="text-red-400 hover:text-red-600"><i class="fas fa-times"></i></button></td>
            </tr>
        `;
    },

    // 6 הוספת שורה לטבלה
    addBatchRow() {
        const tbody = document.getElementById('batch-add-tbody');
        tbody.insertAdjacentHTML('beforeend', this.getBatchRowHtml());
    },

    // 7 יצירת שדות טופס
    getFormFields() {
        const activeKeys = (Store.data.config.fields || {}).students || window.DEFAULT_ACTIVE_FIELDS.students;
        const fields = [];
        activeKeys.forEach(k => {
            let def = window.PREDEFINED_FIELDS.students.find(p => p.k === k);
            if (!def && Store.data.config.customFieldsDefs && Store.data.config.customFieldsDefs[k]) {
                def = { k: k, l: Store.data.config.customFieldsDefs[k].l, t: 'text' };
            }
            if(def) fields.push({id:k, l:def.l, t:def.t, opts:def.opts, r:def.r});
        });
        return fields;
    },
    
    // 8 פתיחת מודאל הוספה
    openAddModal() {
        Modal.render('הוספת בחור חדש', this.getFormFields(), (data) => {
            if (!data.firstName || !data.lastName) return Notify.show('שגיאה: חובה להזין שם ומשפחה', 'error');
            const id = db.ref('global/students').push().key || ('stu' + Date.now());
            if(data.firstName && data.lastName) data.name = `${data.firstName} ${data.lastName}`;
            
            const studentData = System.cleanObject({ id, lastUpdatedYear: Store.currentYear, ...data });
            OfflineManager.write(`global/students/${id}`, studentData);
            Notify.show('בחור נוסף בהצלחה', 'success');
            this.render(); 
        });
    },
    
    // 9 פתיחת הוספה מרובה
    openQuickAdd() {
        const html = `
            <div class="mb-4">
                <label class="block text-sm font-bold text-slate-700 mb-1">הדבק רשימת שמות (כל בחור בשורה נפרדת)</label>
                <p class="text-xs text-gray-500 mb-2">פורמט: שם פרטי שם משפחה</p>
                <textarea id="quick-add-list" class="w-full border p-2 rounded h-40 text-sm" placeholder="משה כהן\nדוד לוי\n..."></textarea>
            </div>
        `;
        Modal.renderRaw('הוספה מהירה', html, () => {
            const txt = document.getElementById('quick-add-list').value;
            const lines = txt.split('\n').map(l => l.trim()).filter(l => l);
            if(lines.length === 0) return;
            const batch = {};
            lines.forEach(line => {
                const id = db.ref('global/students').push().key || ('stu' + Math.random().toString(36).substr(2, 9));
                const parts = line.split(' ');
                batch[id] = System.cleanObject({ 
                    id, name: line, firstName: parts[0], lastName: parts.slice(1).join(' '),
                    lastUpdatedYear: Store.currentYear, grade: 'שיעור א' 
                });
            });
            db.ref('global/students').update(batch);
            Object.assign(Store.data.students, batch);
            OfflineManager.saveState('students', Store.data.students);
            this.render(); 
            Notify.show(`${lines.length} בחורים נוספו בהצלחה`, 'success');
            Modal.close();
        });
    },
    
 // 10 פתיחת מודאל עריכה
    openEdit(id) {
        const s = Store.data.students[id];
        if(!s) return Notify.show('שגיאה בטעינת הבחור', 'error');
        
        const yData = (Store.data.yearData[Store.currentYear]?.students || {})[id] || {};
        const currentPersonalGoal = yData.personalGoal; // יכול להיות ריק
        const baseGoal = Store.data.config.baseStudentGoal || 0;
        
        const fields = this.getFormFields().map(f => ({ ...f, v: s[f.id] || '' }));
        const tiers = (Store.data.config.studentTiers || []).sort((a,b) => a.amount - b.amount);
        
        // מה שמוצג כרגע בתיבת הטקסט (אם יש לו יעד אישי נציג אותו, אחרת ריק)
        const displayGoal = (currentPersonalGoal !== undefined && currentPersonalGoal !== null && currentPersonalGoal !== '') ? currentPersonalGoal : '';
        
        let tierOptions = `<option value="">-- בחר יעד מוכן מראש (או הקלד למטה) --</option>`;
        tierOptions += `<option value="BASE">יעד מערכת בסיסי (${baseGoal})</option>`;
        tiers.forEach(t => { 
            tierOptions += `<option value="${t.amount}">${t.amount} ש"ח (${t.reward})</option>`; 
        });

        const extraHtml = `
            <div class="mb-4 bg-amber-50 p-4 rounded-xl border border-amber-200 shadow-sm">
                <label class="block text-sm font-bold text-amber-900 mb-2">יעד אישי לשנת ${Store.currentYear}</label>
                
                <select id="quick-goal-select" class="w-full border border-amber-300 p-2 rounded mb-3 bg-white text-sm outline-none" 
                        onchange="if(this.value === 'BASE') { document.getElementById('student-custom-goal').value = ''; } else if(this.value !== '') { document.getElementById('student-custom-goal').value = this.value; }">
                    ${tierOptions}
                </select>
                
                <div class="relative">
                    <input type="number" id="student-custom-goal" value="${displayGoal}" placeholder="השאר ריק כדי שהבחור יקבל את יעד הבסיס (${baseGoal})" class="w-full border border-amber-300 p-2.5 rounded outline-none focus:border-amber-500 font-bold text-lg shadow-inner pr-8">
                    <span class="absolute right-3 top-3 text-gray-400 font-bold">₪</span>
                </div>
                <p class="text-[10px] text-amber-700 mt-2 font-medium">ניתן להקליד כל סכום, גם נמוך מהבסיס (למשל 500). <br>השאר את התיבה ריקה אם ברצונך שהבחור יתעדכן אוטומטית לפי יעד המערכת הכללי.</p>
            </div>
        `;

        Modal.render('עריכת פרטי בחור', fields, (data) => {
            const updates = {};
            Object.keys(data).forEach(k => { updates[k] = data[k]; });
            if(data.firstName || data.lastName) updates.name = `${data.firstName || ''} ${data.lastName || ''}`.trim();
            
            OfflineManager.write(`global/students/${id}`, System.cleanObject(updates), 'update');
            
            // טיפול בשמירת היעד מהתיבה החדשה
            const customGoalStr = document.getElementById('student-custom-goal').value.trim();
            
            if (customGoalStr !== '') {
                // נשמר יעד אישי ספציפי (גם אם הוא נמוך)
                const finalGoal = parseInt(customGoalStr);
                OfflineManager.write(`years/${Store.currentYear}/studentData/${id}/personalGoal`, finalGoal);
                
                if(!Store.data.yearData[Store.currentYear]) Store.data.yearData[Store.currentYear] = {students:{}};
                if(!Store.data.yearData[Store.currentYear].students[id]) Store.data.yearData[Store.currentYear].students[id] = {};
                Store.data.yearData[Store.currentYear].students[id].personalGoal = finalGoal;
            } else {
                // התיבה ריקה - מחיקת היעד האישי וחזרה ליעד בסיס
                OfflineManager.write(`years/${Store.currentYear}/studentData/${id}/personalGoal`, null, 'remove');
                
                if(Store.data.yearData[Store.currentYear] && Store.data.yearData[Store.currentYear].students[id]) {
                    delete Store.data.yearData[Store.currentYear].students[id].personalGoal;
                }
            }
            
            Notify.show('פרטים עודכנו בהצלחה', 'success');
            this.render(); 
        }, extraHtml);
    },
    // 11 העברה לארכיון
    toggleArchive(id, shouldArchive) {
        if(shouldArchive && !confirm('האם להעביר בחור זה לארכיון?')) return;
        OfflineManager.write(`global/students/${id}/isArchived`, shouldArchive ? true : null);
        if (Store.data.students[id]) Store.data.students[id].isArchived = shouldArchive ? true : false;
        this.render(); 
        Notify.show(shouldArchive ? 'הועבר לארכיון' : 'שוחזר מהארכיון', 'info');
    },
    
    // 12 מחיקת בחור לצמיתות
    delete(id) {
        if(confirm('למחוק לגמרי? יוסר מכל הקבוצות.')) {
            OfflineManager.write(`global/students/${id}`, null, 'remove');
            delete Store.data.students[id];
            this.render(); 
            Notify.show('הבחור נמחק', 'info');
        }
    }
};

window.Students = Students;