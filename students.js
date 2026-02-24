// 1 משיכת בחורים במינות
const Students = {
    limit: 30,
    
    // 2 טעינת עוד בחורים
    loadMore(reset = false) {
        return new Promise((resolve) => {
            if (reset) {
                Store.cursors.students = null;
                Store.loadedAll.students = false;
            }
            const loader = document.getElementById('students-loader-more');
            if(loader) {
                loader.style.display = 'block';
                loader.innerHTML = '<span class="text-gray-500 font-bold"><i class="fas fa-spinner fa-spin"></i> טוען נתונים...</span>';
            }

            let query = db.ref('global/students').orderByKey().limitToLast(this.limit);
            if (Store.cursors.students) query = query.endBefore(Store.cursors.students);

            query.once('value', snap => {
                const data = snap.val();
                if (!data) {
                    Store.loadedAll.students = true;
                    this.render(); 
                    resolve();
                    return;
                }
                const keys = Object.keys(data).sort();
                Store.cursors.students = keys[0];
                Object.assign(Store.data.students, data);
                OfflineManager.saveState('students', Store.data.students);
                
                if (keys.length < this.limit) Store.loadedAll.students = true;
                
                this.render(); 
                resolve();
            });
        });
    },
    
    // 3 סנכרון חדשים
    syncNewest() {
        db.ref('global/students').orderByKey().limitToLast(10).once('value', snap => {
            const data = snap.val();
            if(data) {
                Object.assign(Store.data.students, data);
                OfflineManager.saveState('students', Store.data.students);
                if(Router.current === 'students') this.render();
            }
        });
    },
    
    // 4 רינדור רשימה
    render(searchTerm = null) {
        const term = searchTerm || (document.getElementById('student-search') ? document.getElementById('student-search').value.trim() : '');
        const tbody = document.getElementById('students-tbody');
        if(!tbody) return;
        
        tbody.innerHTML = '';
        let list = Object.values(Store.data.students).filter(s => s).map(s => {
            const fullName = s.firstName && s.lastName ? `${s.firstName} ${s.lastName}` : (s.name || 'ללא שם');
            return { ...s, displayName: fullName };
        });
        
        list.sort((a,b) => (a.displayName||'').localeCompare(b.displayName||''));
        const baseGoal = Store.data.config.baseStudentGoal || 0;
        
        list = list.map(s => {
            const yData = (Store.data.yearData[Store.currentYear]?.students || {})[s.id] || {};
            let effective = baseGoal;
            if (yData.personalGoal !== undefined && yData.personalGoal !== null && yData.personalGoal !== '') {
                effective = parseInt(yData.personalGoal);
            }
            // משיכת סך ההכנסות שחושב מראש
            const raised = yData.totalRaised || 0; 
            return { ...s, ...yData, effectiveGoal: effective, totalRaised: raised }; 
        });
        
        if(term) {
            list = list.filter(s => (s.displayName || '').includes(term) || (s.phone || '').includes(term) || (s.grade && s.grade.includes(term)) || (s.studentNum && s.studentNum.includes(term)));
        }
        
        const displayList = list.slice(0, 100); 
        const loader = document.getElementById('students-loader-more');

        if (loader) {
            loader.style.display = 'block';
            if (displayList.length === 0) {
                 loader.innerHTML = '<span class="text-gray-400 font-bold bg-gray-50 px-4 py-2 rounded-full border">לא נמצאו בחורים</span>';
            } else if (Store.loadedAll.students || term) {
                 loader.innerHTML = '<span class="text-gray-400 font-bold bg-gray-50 px-4 py-2 rounded-full border">סוף רשימה</span>';
            } else {
                 loader.innerHTML = `
                    <button onclick="Students.loadMore()" class="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-6 py-2 rounded-full text-sm font-bold transition shadow-sm w-full sm:w-auto">
                        <i class="fas fa-chevron-down ml-2"></i> טען עוד בחורים...
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
            
            // תצוגת היעד לצד הסכום שנאסף בפועל (סעיף 3 בבקשה החדשה)
            const goalDisplay = `<div class="flex items-center justify-end gap-2">
                <span class="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 font-bold" title="סך הכל הוכנס השנה">₪${s.totalRaised.toLocaleString()}</span>
                <span class="text-slate-400 text-xs">מתוך</span>
                <span class="font-bold text-slate-800">₪${parseInt(s.effectiveGoal).toLocaleString()}</span>
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
    
    // 5 הוספה מהירה
    openBatchDonation(id, name) {
        const html = `
            <div class="space-y-4">
                <div class="bg-green-50 p-3 rounded-lg border border-green-200 flex justify-between items-center">
                    <div>
                        <div class="font-bold text-green-900">הוספת תרומות עבור: ${name}</div>
                        <div class="text-xs text-green-700">כל שורה מייצגת תרומה נפרדת</div>
                    </div>
                </div>
                
                <table class="w-full text-right" id="batch-add-table">
                    <thead>
                        <tr class="text-xs text-gray-500 border-b">
                            <th class="p-2">סכום</th>
                            <th class="p-2">מקור</th>
                            <th class="p-2">הערות</th>
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
                const amount = parseFloat(tr.querySelector('.input-amount').value);
                if (!amount) return;
                
                const method = tr.querySelector('.input-method').value;
                const notes = tr.querySelector('.input-notes').value;
                
                const txId = 'tx' + Date.now() + Math.random().toString(36).substr(2,5);
                
                const txData = System.cleanObject({ 
                    id: txId, date: now, type: 'income', amount: amount,
                    category: method, desc: notes, studentId: id, isPurim: true
                });
                
                OfflineManager.write(`years/${Store.currentYear}/finance/${txId}`, txData);
                if(OfflineManager.isOnline) {
                     db.ref(`years/${Store.currentYear}/stats/income`).transaction(curr => (curr || 0) + amount);
                }
                
                totalAdded += amount;
                count++;
            });
            
            if (count > 0) {
                System.checkStudentProgress(id, totalAdded);
                Notify.show(`${count} תרומות בסך ₪${totalAdded} נוספו בהצלחה`, 'success');
                Modal.close();
                // רענון מיידי לתצוגת הסכום
                if(Router.current === 'students') setTimeout(() => this.render(), 300);
            } else { alert('לא הוזנו סכומים'); }
        }, 'max-w-3xl w-full');
    },

    // 6 HTML לשורה
    getBatchRowHtml() {
        return `
            <tr class="border-b last:border-0">
                <td class="p-2"><input type="number" class="input-amount border rounded p-1 w-full" placeholder="₪"></td>
                <td class="p-2">
                    <select class="input-method border rounded p-1 w-full text-sm">
                        <option>תרומה כללית</option><option>מזומן</option><option>צק</option><option>אשראי</option>
                    </select>
                </td>
                <td class="p-2"><input type="text" class="input-notes border rounded p-1 w-full" placeholder="הערה..."></td>
                <td class="p-2 text-center"><button onclick="this.closest('tr').remove()" class="text-red-400 hover:text-red-600"><i class="fas fa-times"></i></button></td>
            </tr>
        `;
    },

    // 7 הוספת שורה
    addBatchRow() {
        const tbody = document.getElementById('batch-add-tbody');
        tbody.insertAdjacentHTML('beforeend', this.getBatchRowHtml());
    },

    // 8 שדות הוספה
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
    
    // 9 טופס הוספה
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
    
    // 10 הוספה מרובה
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
    
    // 11 טופס עריכה
    openEdit(id) {
        const s = Store.data.students[id];
        if(!s) return Notify.show('שגיאה בטעינת הבחור', 'error');
        const yData = (Store.data.yearData[Store.currentYear]?.students || {})[id] || {};
        const currentGoal = yData.personalGoal; 
        const baseGoal = Store.data.config.baseStudentGoal || 0;
        const fields = this.getFormFields().map(f => ({ ...f, v: s[f.id] || '' }));
        const tiers = (Store.data.config.studentTiers || []).sort((a,b) => a.amount - b.amount);
        
        let isCustom = false; let selectedValue = "";
        if (currentGoal === undefined || currentGoal === null || currentGoal === '') selectedValue = ""; 
        else {
            const match = tiers.find(t => t.amount == currentGoal);
            if (match) selectedValue = match.amount;
            else { isCustom = true; selectedValue = "custom"; }
        }
        
        let goalOptions = `<option value="">יעד מערכת בסיסי (${baseGoal})</option>`;
        tiers.forEach(t => { goalOptions += `<option value="${t.amount}" ${!isCustom && selectedValue == t.amount ? 'selected' : ''}>${t.amount} (${t.reward})</option>`; });

        const extraHtml = `
            <div class="mb-4 bg-amber-50 p-3 rounded border border-amber-200">
                <label class="block text-sm font-bold text-amber-900 mb-1">יעד אישי לשנת ${Store.currentYear}</label>
                <select id="student-goal-select" class="w-full border border-amber-300 p-2 rounded mb-2 bg-white" onchange="document.getElementById('custom-goal-wrap').style.display = this.value === 'custom' ? 'block' : 'none'">
                    ${goalOptions}
                    <option value="custom" ${isCustom ? 'selected' : ''}>יעד מותאם אישית...</option>
                </select>
                <div id="custom-goal-wrap" style="display: ${isCustom ? 'block' : 'none'}">
                    <input type="number" id="student-custom-goal" value="${isCustom ? currentGoal : ''}" placeholder="הכנס סכום יעד..." class="w-full border border-amber-300 p-2 rounded">
                </div>
            </div>
        `;
        Modal.render('עריכת פרטי בחור', fields, (data) => {
            const updates = {};
            Object.keys(data).forEach(k => { updates[k] = data[k]; });
            if(data.firstName || data.lastName) updates.name = `${data.firstName || ''} ${data.lastName || ''}`.trim();
            
            OfflineManager.write(`global/students/${id}`, System.cleanObject(updates), 'update');
            
            const selectVal = document.getElementById('student-goal-select').value;
            let finalGoal = null;
            if(selectVal === 'custom') {
                const customVal = document.getElementById('student-custom-goal').value;
                if(customVal !== '') finalGoal = parseInt(customVal);
            } else if(selectVal !== "") {
                finalGoal = parseInt(selectVal);
            }
            
            if(finalGoal !== null && !isNaN(finalGoal)) {
                OfflineManager.write(`years/${Store.currentYear}/studentData/${id}/personalGoal`, finalGoal);
            } else {
                OfflineManager.write(`years/${Store.currentYear}/studentData/${id}/personalGoal`, null, 'remove');
            }
            Notify.show('פרטים עודכנו', 'success');
            this.render(); 
        }, extraHtml);
    },
    
    // 12 העברה לארכיון
    toggleArchive(id, shouldArchive) {
        if(shouldArchive && !confirm('האם להעביר בחור זה לארכיון?')) return;
        OfflineManager.write(`global/students/${id}/isArchived`, shouldArchive ? true : null);
        if (Store.data.students[id]) Store.data.students[id].isArchived = shouldArchive ? true : false;
        this.render(); 
        Notify.show(shouldArchive ? 'הועבר לארכיון' : 'שוחזר מהארכיון', 'info');
    },
    
    // 13 מחיקת בחור
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