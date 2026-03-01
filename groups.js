// 1 אובייקט ניהול קבוצות
const Groups = {
    currentDay: 'night14',
    activeGroupId: null,
    
    // 2 הגדרת יום פעיל
    setDay(d) {
        try {
            this.currentDay = d;
            document.querySelectorAll('.group-tab').forEach(b => {
                if(b.dataset.day === d) b.classList.add('active');
                else b.classList.remove('active');
            });
            this.activeGroupId = null;
            this.render(); 
        } catch(e) { console.error(e); }
    },

    // 2.5 הדפסת כל הקבוצות ליום הנוכחי (דף נקי)
    printAllGroups() {
        const groups = (Store.data.yearData[Store.currentYear]?.groups || {})[this.currentDay] || {};
        if (Object.keys(groups).length === 0) return Notify.show('אין קבוצות ליום זה', 'info');

        let customHtml = `
            <div class="p-4" style="direction: rtl;">
                <div class="grid grid-cols-2 gap-6 mt-4">
        `;

        Object.values(groups).forEach(g => {
            customHtml += `
                <div class="border border-black rounded shadow-sm bg-white">
                    <h3 class="font-bold bg-gray-200 p-2 text-center border-b border-black text-lg">${g.name} <span class="text-sm font-normal">(${(g.members||[]).length})</span></h3>
                    <ul class="list-none p-3 m-0 text-sm space-y-1">`;
            
            let sortedMembers = [...(g.members || [])];
            const roleWeight = { 'ראש צוות': 1, 'סגן': 2, 'חבר': 3 };
            sortedMembers.sort((a,b) => roleWeight[a.role] - roleWeight[b.role]);

            sortedMembers.forEach(m => {
                const s = Store.data.students[m.id];
                if(s) {
                    const name = s.firstName && s.lastName ? `${s.firstName} ${s.lastName}` : s.name;
                    let roleBadge = '';
                    if (m.role === 'ראש צוות') roleBadge = '<span class="bg-blue-100 text-blue-800 px-1 rounded text-xs mr-2 border border-blue-200">רקב"צ</span>';
                    else if (m.role === 'סגן') roleBadge = '<span class="bg-yellow-100 text-yellow-800 px-1 rounded text-xs mr-2 border border-yellow-200">סגן</span>';
                    customHtml += `<li class="border-b border-gray-100 pb-1 last:border-0">${name} ${roleBadge}</li>`;
                }
            });
            customHtml += `</ul></div>`;
        });

        customHtml += `</div></div>`;
        Reports.openEditor('custom', customHtml);
    },
    
    // 3 רינדור רשימת קבוצות
    render() {
        try {
            const listEl = document.getElementById('groups-list');
            if(!listEl) return;
            
            listEl.innerHTML = '';
            const groups = (Store.data.yearData[Store.currentYear]?.groups || {})[this.currentDay] || {};
            
            Object.entries(groups).forEach(([gid, g]) => {
                const isActive = gid === this.activeGroupId;
                const el = document.createElement('div');
                el.dataset.groupId = gid; 
                el.className = `p-4 border-b cursor-pointer transition flex justify-between items-center group-item ${isActive ? 'bg-indigo-50 border-r-4 border-r-indigo-600' : 'hover:bg-slate-50'}`;
                el.onclick = () => this.selectGroup(gid, g);
                el.innerHTML = `
                    <div>
                        <div class="font-bold text-slate-700 text-sm">${g.name}</div>
                        <div class="text-xs text-gray-400 mt-1">${(g.members||[]).length} בחורים בקבוצה</div>
                    </div>
                    <i class="fas fa-chevron-left text-xs text-gray-300 ${isActive?'text-indigo-500':''}"></i>
                `;
                listEl.appendChild(el);
            });
            
            const ph = document.getElementById('group-placeholder');
            const editor = document.getElementById('group-editor');
            
            if(this.activeGroupId && groups[this.activeGroupId]) {
                if(ph) ph.classList.add('hidden');
                if(editor) editor.classList.remove('hidden');
                this.renderEditor(groups[this.activeGroupId]);
            } else {
                if(ph) ph.classList.remove('hidden');
                if(editor) editor.classList.add('hidden');
            }
        } catch(e) { console.error(e); }
    },
    
    // 4 בחירת קבוצה ספציפית
    selectGroup(gid, g) {
        try {
            this.activeGroupId = gid;
            document.querySelectorAll('.group-item').forEach(el => {
                el.classList.remove('bg-indigo-50', 'border-r-4', 'border-r-indigo-600');
                el.classList.add('hover:bg-slate-50');
                const icon = el.querySelector('i');
                if(icon) icon.classList.remove('text-indigo-500');
            });
            
            const activeEl = document.querySelector(`div[data-group-id="${gid}"]`);
            if(activeEl) {
                activeEl.classList.remove('hover:bg-slate-50');
                activeEl.classList.add('bg-indigo-50', 'border-r-4', 'border-r-indigo-600');
                const icon = activeEl.querySelector('i');
                if(icon) icon.classList.add('text-indigo-500');
            }

            const nameEl = document.getElementById('active-group-name');
            if(nameEl) nameEl.innerText = g.name;
            
            const dayText = document.querySelector(`.group-tab[data-day="${this.currentDay}"]`)?.innerText || '';
            const detailsEl = document.getElementById('active-group-details');
            if(detailsEl) detailsEl.innerText = `${dayText} | ${(g.members||[]).length} בחורים`;
            
            const ph = document.getElementById('group-placeholder');
            const editor = document.getElementById('group-editor');
            if(ph) ph.classList.add('hidden');
            if(editor) editor.classList.remove('hidden');
            
            this.renderEditor(g);
        } catch(e) { console.error(e); }
    },
    
    // 5 עיצוב עורך לקבוצה
    renderEditor(group) {
        if (!group) return;

        const memList = document.getElementById('group-members-list');
        if(memList) {
            memList.innerHTML = '';
            if (!group.members || group.members.length === 0) {
                memList.innerHTML = '<div class="text-center text-gray-400 p-4">אין בחורים בקבוצה זו. חפש במאגר משמאל והוסף.</div>';
            }
            
            let sortedMembers = [...(group.members || [])];
            const roleWeight = { 'ראש צוות': 1, 'סגן': 2, 'חבר': 3 };
            const getShiurWeight = (grade) => {
                const idx = window.SHIURIM_ORDER.indexOf(grade);
                return idx === -1 ? 99 : (window.SHIURIM_ORDER.length - idx); 
            };
            
            sortedMembers.sort((a,b) => {
                if (roleWeight[a.role] !== roleWeight[b.role]) return roleWeight[a.role] - roleWeight[b.role];
                const gradeA = Store.data.students[a.id]?.grade;
                const gradeB = Store.data.students[b.id]?.grade;
                return getShiurWeight(gradeA) - getShiurWeight(gradeB);
            });

            sortedMembers.forEach((m) => {
                const s = Store.data.students[m.id];
                if(!s) return;
                const originalIdx = group.members.findIndex(x => x.id === m.id);
                const name = s.firstName && s.lastName ? `${s.firstName} ${s.lastName}` : s.name;
                const roleSelect = `
                    <select onchange="Groups.updateMemberRole(${originalIdx}, this.value)" class="text-xs border rounded p-1 mr-2 bg-gray-50 outline-none">
                        <option value="חבר" ${m.role === 'חבר' ? 'selected' : ''}>חבר</option>
                        <option value="ראש צוות" ${m.role === 'ראש צוות' ? 'selected' : ''}>ראש צוות</option>
                        <option value="סגן" ${m.role === 'סגן' ? 'selected' : ''}>סגן</option>
                    </select>
                `;
                memList.innerHTML += `
                    <div class="bg-white p-3 border rounded-xl shadow-sm text-sm flex justify-between items-center mb-2 hover:border-indigo-200 transition">
                        <div class="flex items-center">
                            <span class="font-bold text-slate-800 ml-3 w-32 truncate">${name} <span class="text-[10px] text-gray-400 font-normal">(${s.grade||''})</span></span>
                            ${roleSelect}
                        </div>
                        <button onclick="Groups.removeMember(${originalIdx})" class="text-red-400 hover:text-red-600 bg-red-50 px-2 py-1 rounded transition"><i class="fas fa-times"></i> הסר</button>
                    </div>`;
            });
        }
        
        this.filterStudents(document.getElementById('pool-search-input')?.value || '');
    },

    // 6 קבוצה חדשה
    addNewGroup() {
        const n = prompt("שם הקבוצה:");
        if(n) {
            const cleanName = n.trim();
            const groups = (Store.data.yearData[Store.currentYear]?.groups || {})[this.currentDay] || {};
            const exists = Object.values(groups).some(g => g.name === cleanName);
            if (exists) return Notify.show('שגיאה: שם קבוצה זה כבר קיים ביום זה', 'error'); 
            
            const newRef = db.ref(`years/${Store.currentYear}/groups/${this.currentDay}`).push();
            OfflineManager.write(`years/${Store.currentYear}/groups/${this.currentDay}/${newRef.key}`, {name: cleanName, members: [], route: []});
        }
    },
    
    // 7 שינוי שם
    renameGroup() {
        const nameEl = document.getElementById('active-group-name');
        if(!nameEl) return;
        const old = nameEl.innerText;
        const n = prompt("שם חדש לקבוצה:", old);
        if(n && n.trim() !== old) {
            const cleanName = n.trim();
            const groups = (Store.data.yearData[Store.currentYear]?.groups || {})[this.currentDay] || {};
            const exists = Object.values(groups).some(g => g.name === cleanName);
            if (exists) return Notify.show('שגיאה: שם קבוצה זה כבר קיים', 'error'); 
            
            OfflineManager.write(`years/${Store.currentYear}/groups/${this.currentDay}/${this.activeGroupId}/name`, cleanName);
            nameEl.innerText = cleanName;
            const listItem = document.querySelector(`div[data-group-id="${this.activeGroupId}"] .font-bold`);
            if(listItem) listItem.innerText = cleanName;
        }
    },
    
    // 8 מחיקת קבוצה
    deleteGroup() {
         if(confirm('האם אתה בטוח שברצונך למחוק קבוצה זו?')) {
             OfflineManager.write(`years/${Store.currentYear}/groups/${this.currentDay}/${this.activeGroupId}`, null, 'remove');
             this.activeGroupId = null;
             this.render(); 
         }
    },
    
    // 9 מנהל זמינות
    openAvailabilityManager() {
        let html = `
            <div class="bg-indigo-50 p-4 rounded-xl mb-4 text-indigo-900 text-sm font-bold border border-indigo-200">
                <i class="fas fa-info-circle ml-1"></i> סמן אלו בחורים פנויים וזמינים לאיזה יום. הסימון ישפיע על התצוגה בעת שיבוץ בחורים לקבוצות.
            </div>
            <div class="flex gap-2 mb-3 relative">
                <div class="relative flex-1">
                    <input type="text" id="avail-search" placeholder="חפש בחור..." class="w-full border p-2 rounded-lg pl-8 outline-none focus:border-indigo-400" oninput="Groups.filterAvailabilityList(this.value)">
                    <i class="fas fa-search absolute left-3 top-3 text-gray-400"></i>
                </div>
                <button onclick="Groups.printAvailability()" class="btn-secondary text-sm shrink-0 bg-white border-indigo-200 hover:bg-indigo-50"><i class="fas fa-print ml-1 text-indigo-500"></i> הדפס דוח זמינות</button>
            </div>
            <div class="max-h-96 overflow-y-auto custom-scroll border rounded-xl shadow-sm">
                <table class="w-full text-right text-sm">
                    <thead class="bg-gray-100 sticky top-0 shadow-sm z-10">
                        <tr>
                            <th class="p-3 border-b">שם הבחור</th>
                            <th class="p-3 border-b text-center">ליל י"ד</th>
                            <th class="p-3 border-b text-center">יום י"ד</th>
                            <th class="p-3 border-b text-center">יום ט"ו</th>
                        </tr>
                    </thead>
                    <tbody id="avail-tbody" class="divide-y divide-gray-100 bg-white"></tbody>
                </table>
            </div>
        `;
        Modal.renderRaw('מנהל זמינות בחורים לפורים', html, () => { Modal.close(); Groups.render(); }, 'max-w-4xl w-full');
        document.querySelector('#modal-form .btn-primary').parentElement.style.display = 'none';
        this.filterAvailabilityList('');
    },

    // 9.5 שליחת נתוני הזמינות להדפסה (דף נקי)
    printAvailability() {
        let list = Object.values(Store.data.students).filter(s => s && !s.isArchived);
        
        list.sort((a,b) => {
            const nameA = a.firstName && a.lastName ? `${a.firstName} ${a.lastName}` : (a.name || '');
            const nameB = b.firstName && b.lastName ? `${b.firstName} ${b.lastName}` : (b.name || '');
            return nameA.localeCompare(nameB);
        });

        let rows = '';
        list.forEach((s, i) => {
            const name = s.firstName && s.lastName ? `${s.firstName} ${s.lastName}` : (s.name || '');
            const avail = ((Store.data.yearData[Store.currentYear]?.students || {})[s.id] || {}).availability || {};
            
            const n14 = avail['night14'] ? 'V' : '';
            const d14 = avail['day14'] ? 'V' : '';
            const d15 = avail['day15'] ? 'V' : '';
            
            rows += `
            <tr class="border-b border-gray-200">
                <td class="border-l border-r border-black p-2 text-center w-10">${i+1}</td>
                <td class="border-l border-r border-black p-2 font-bold">${name}</td>
                <td class="border-l border-r border-black p-2 text-center font-bold text-emerald-600">${n14}</td>
                <td class="border-l border-r border-black p-2 text-center font-bold text-emerald-600">${d14}</td>
                <td class="border-l border-r border-black p-2 text-center font-bold text-emerald-600">${d15}</td>
            </tr>`;
        });

        const html = `
            <div class="p-4" style="direction: rtl;">
                <table class="w-full border-collapse text-right text-sm border-2 border-black">
                    <thead class="bg-gray-200">
                        <tr>
                            <th class="border border-black p-2 text-center">#</th>
                            <th class="border border-black p-2">שם הבחור</th>
                            <th class="border border-black p-2 text-center">ליל י"ד</th>
                            <th class="border border-black p-2 text-center">יום י"ד</th>
                            <th class="border border-black p-2 text-center">יום ט"ו</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>`;
            
        Reports.openEditor('custom', html);
    },

    // 10 סינון רשימת זמינות
    filterAvailabilityList(term) {
        const tbody = document.getElementById('avail-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        
        let list = Object.values(Store.data.students).filter(s => s && !s.isArchived);
        list = list.map(s => ({
            ...s, 
            fullName: s.firstName && s.lastName ? `${s.firstName} ${s.lastName}` : (s.name || ''),
            yData: (Store.data.yearData[Store.currentYear]?.students || {})[s.id] || {}
        }));

        if (term) list = list.filter(s => s.fullName.includes(term));
        
        list.sort((a,b) => a.fullName.localeCompare(b.fullName)).forEach(s => {
            const avail = s.yData.availability || {};
            const n14 = avail['night14'] ? 'checked' : '';
            const d14 = avail['day14'] ? 'checked' : '';
            const d15 = avail['day15'] ? 'checked' : '';

            tbody.innerHTML += `
                <tr class="hover:bg-slate-50 transition">
                    <td class="p-3 font-bold">${s.fullName} <span class="text-xs font-normal text-gray-400">(${s.grade||''})</span></td>
                    <td class="p-3 text-center"><input type="checkbox" ${n14} onchange="Groups.toggleStudentAvailability('${s.id}', 'night14', this.checked)" class="w-5 h-5 accent-indigo-600 cursor-pointer"></td>
                    <td class="p-3 text-center"><input type="checkbox" ${d14} onchange="Groups.toggleStudentAvailability('${s.id}', 'day14', this.checked)" class="w-5 h-5 accent-indigo-600 cursor-pointer"></td>
                    <td class="p-3 text-center"><input type="checkbox" ${d15} onchange="Groups.toggleStudentAvailability('${s.id}', 'day15', this.checked)" class="w-5 h-5 accent-indigo-600 cursor-pointer"></td>
                </tr>
            `;
        });
    },

    // 11 שמירת זמינות
    toggleStudentAvailability(sid, dayId, isChecked) {
        const path = `years/${Store.currentYear}/studentData/${sid}/availability/${dayId}`;
        OfflineManager.write(path, isChecked ? true : null);
        
        if(!Store.data.yearData[Store.currentYear]) Store.data.yearData[Store.currentYear] = {students:{}};
        if(!Store.data.yearData[Store.currentYear].students[sid]) Store.data.yearData[Store.currentYear].students[sid] = {availability:{}};
        if(!Store.data.yearData[Store.currentYear].students[sid].availability) Store.data.yearData[Store.currentYear].students[sid].availability = {};
        Store.data.yearData[Store.currentYear].students[sid].availability[dayId] = isChecked ? true : null;

        const poolInput = document.getElementById('pool-search-input');
        if (poolInput) this.filterStudents(poolInput.value);
    },

    // 12 סינון בחורים לקבוצה
    filterStudents(term) {
        const pool = document.getElementById('pool-students');
        if(!pool) return;
        pool.innerHTML = '';
        
        let list = Object.values(Store.data.students).filter(s => s && !s.isArchived);
        list = list.map(s => ({
            ...s, 
            fullName: s.firstName && s.lastName ? `${s.firstName} ${s.lastName}` : (s.name || ''),
            yData: (Store.data.yearData[Store.currentYear]?.students || {})[s.id] || {}
        }));
        
        const dayGroups = (Store.data.yearData[Store.currentYear]?.groups || {})[this.currentDay] || {};
        const assignedInDay = new Set();
        Object.values(dayGroups).forEach(g => (g.members||[]).forEach(m => assignedInDay.add(m.id)));
        list = list.filter(s => !assignedInDay.has(s.id));

        if(term) {
            const t = term.trim();
            list = list.filter(s => 
                s.fullName.includes(t) || 
                (s.studentNum && s.studentNum.toString().includes(t)) || 
                (s.idNum && s.idNum.toString().includes(t))
            );
        }
        
        const filterType = document.getElementById('student-pool-filter')?.value || 'all';
        if (filterType === 'ready') {
            list = list.filter(s => s.yData.availability && s.yData.availability[this.currentDay]);
        }

        list.slice(0, 60).forEach(s => {
            const isReady = s.yData.availability && s.yData.availability[this.currentDay];
            const readyBadge = isReady ? '<span class="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold">זמין ליום זה</span>' : '';
            const numBadge = s.studentNum ? `<span class="text-xs text-gray-400">#${s.studentNum}</span>` : '';
            
            pool.innerHTML += `
            <div onclick="Groups.addMember('${s.id}')" class="cursor-pointer p-3 border-b hover:bg-indigo-50 flex justify-between items-center text-sm transition bg-white mb-1 rounded-lg border border-slate-100 shadow-sm group">
                <div class="flex items-center gap-2">
                    <span class="font-medium text-slate-800">${s.fullName} ${numBadge}</span>
                    ${readyBadge}
                </div>
                <i class="fas fa-plus text-indigo-300 group-hover:text-indigo-600 transition"></i>
            </div>`;
        });
        if (list.length > 60) pool.innerHTML += `<div class="text-center text-xs text-gray-400 p-2">ישנן עוד תוצאות, חפש למעלה.</div>`;
    },
    
    // 13 הוספת חבר לקבוצה
    addMember(sid) {
        const path = `years/${Store.currentYear}/groups/${this.currentDay}/${this.activeGroupId}/members`;
        db.ref(path).once('value', snap => {
            const list = snap.val() || [];
            if(!list.some(x => x.id === sid)) {
                list.push({id: sid, role: 'חבר'});
                OfflineManager.write(path, list);
                
                const g = ((Store.data.yearData[Store.currentYear]?.groups || {})[this.currentDay] || {})[this.activeGroupId];
                if(g) g.members = list;
                this.renderEditor(g);
            }
        });
    },
    
    // 14 הסרת חבר
    removeMember(idx) {
        const path = `years/${Store.currentYear}/groups/${this.currentDay}/${this.activeGroupId}/members`;
        db.ref(path).once('value', s => {
            const l = s.val() || []; 
            if(l.length > idx) l.splice(idx,1); 
            OfflineManager.write(path, l);
            
            const g = ((Store.data.yearData[Store.currentYear]?.groups || {})[this.currentDay] || {})[this.activeGroupId];
            if(g) g.members = l;
            this.renderEditor(g); 
        });
    },
    
    // 15 עדכון תפקיד בחור
    updateMemberRole(idx, newRole) {
        const path = `years/${Store.currentYear}/groups/${this.currentDay}/${this.activeGroupId}/members/${idx}/role`;
        OfflineManager.write(path, newRole);
        
        const g = ((Store.data.yearData[Store.currentYear]?.groups || {})[this.currentDay] || {})[this.activeGroupId];
        if(g && g.members && g.members[idx]) {
            g.members[idx].role = newRole;
            this.renderEditor(g); 
        }
    },
    
    // 16 הסרה ממסלול קבוצה
    removeFromRoute(day, gid, did) {
        const path = `years/${Store.currentYear}/groups/${day}/${gid}/route`;
        db.ref(path).once('value', s => {
            let l = s.val() || [];
            l = l.filter(x => x !== did);
            OfflineManager.write(path, l);
            if (document.getElementById('ext-group-tbody')) this.expandGroupDetails(day, gid);
            if (Router.current === 'donors') setTimeout(() => { if (Donors.renderManager) Donors.renderManager(); }, 100);
        });
    },
    
    // 17 תרומה קבוצתית כספית
    openGroupDonationModal() {
        const g = ((Store.data.yearData[Store.currentYear]?.groups || {})[this.currentDay] || {})[this.activeGroupId];
        if (!g) return Notify.show('שגיאה בטעינת הקבוצה', 'error');

        const html = `
            <div class="mb-4">
                <label class="block text-sm font-bold text-slate-700 mb-1">סכום תרומה קבוצתי</label>
                <input type="number" id="group-total-amount" class="input-field w-full" placeholder="לדוגמה: 1000">
                <p class="text-xs text-gray-500 mt-1">הסכום יירשם לזכות הקבוצה ולא יחולק בין הבחורים.</p>
            </div>
        `;
        Modal.renderRaw('הוספת תרומה קבוצתית', html, () => {
            const total = parseInt(document.getElementById('group-total-amount').value);
            if (!total || total <= 0) return;
            const id = 'tx' + Date.now();
            OfflineManager.write(`years/${Store.currentYear}/finance/${id}`, {
                id, date: Date.now(), type: 'income',
                amount: total, category: 'תרומה קבוצתית',
                desc: `תרומה לקבוצה: ${g.name}`,
                isGroup: true, groupId: this.activeGroupId, groupName: g.name, isPurim: true 
            });
            if(OfflineManager.isOnline) db.ref(`years/${Store.currentYear}/stats/income`).transaction(curr => (curr || 0) + total);
            Notify.show(`תרומה של ${total} ש"ח נרשמה לקבוצה בהצלחה!`, 'success'); 
            Modal.close();
            setTimeout(() => { if(window.Finance) Finance.loadMore(true); }, 500);
        });
    },
    
    // 18 ייבוא קבוצות משנה קודמת
    copyFromPreviousYear() {
        const mapRev = {};
        Object.keys(window.HEBREW_YEARS_MAPPING).forEach(k => mapRev[window.HEBREW_YEARS_MAPPING[k]] = k);
        const currNum = parseInt(window.HEBREW_YEARS_MAPPING[Store.currentYear] || 5785);
        const prevYear = mapRev[currNum - 1];
        if(!prevYear) return alert('לא ניתן לזהות את השנה הקודמת');

        if(!confirm(`האם לייבא קבוצות משנת ${prevYear}? הפעולה תייבא את מבנה הקבוצות וכל התורמים המשובצים (ללא בחורים).`)) return;

        Notify.show('מייבא נתונים...', 'info'); 
        
        const prevYear2 = mapRev[currNum - 2];
        const p1 = db.ref(`years/${prevYear}/groups`).once('value');
        const p2 = prevYear2 ? db.ref(`years/${prevYear2}/groups`).once('value') : Promise.resolve({val:()=>({})});

        Promise.all([p1, p2]).then(snaps => {
            const old1 = snaps[0].val() || {};
            const old2 = snaps[1].val() || {};
            
            const newGroups = {};
            const merge = (target, source) => {
                Object.keys(source).forEach(day => {
                    if(!target[day]) target[day] = {};
                    Object.keys(source[day]).forEach(gid => {
                        if(!target[day][gid]) target[day][gid] = { name: source[day][gid].name, route: [], members: [] };
                        const existingRoute = new Set(target[day][gid].route);
                        (source[day][gid].route || []).forEach(did => {
                            if(!existingRoute.has(did)) target[day][gid].route.push(did);
                        });
                    });
                });
            };

            merge(newGroups, old1);
            merge(newGroups, old2);

            db.ref(`years/${Store.currentYear}/groups`).update(newGroups, (err) => {
                if(err) Notify.show('שגיאה בהעתקה', 'error');
                else {
                    Notify.show('הקבוצות והמסלולים יובאו בהצלחה!', 'success'); 
                    setTimeout(() => location.reload(), 1500);
                }
            });
        });
    },

    // 19 ייצוא נתוני קבוצה (מתעלם ממושהים)
    async exportGroupData(format) {
        const g = ((Store.data.yearData[Store.currentYear]?.groups || {})[this.currentDay] || {})[this.activeGroupId];
        if(!g) return;

        await Store.ensureAllLoaded('donors');
        Notify.show('מכין נתונים לייצוא...', 'info');

        const snap = await db.ref(`years/${Store.currentYear}/finance`).once('value');
        const finances = Object.values(snap.val() || {});
        
        const currentYearTotals = {};
        finances.forEach(tx => {
            if (tx.type === 'income' && tx.donorId) {
                if (!currentYearTotals[tx.donorId]) currentYearTotals[tx.donorId] = 0;
                currentYearTotals[tx.donorId] += (isNaN(parseFloat(tx.amount)) ? 0 : parseFloat(tx.amount));
            }
        });

        // סינון תורמים מושהים
        const donors = (g.route || [])
            .filter(x => !x.startsWith('NOTE:'))
            .map(did => Store.data.donors[did])
            .filter(d => d && !d.isSuspended);

        if (format === 'excel') {
            const rows = donors.map(d => ({
                "שם התורם": d.name,
                "כתובת": `${d.city||''} ${d.street||''} ${d.floor ? 'קומה '+d.floor : ''}`,
                "טלפון": d.phone || '',
                "הערות": d.notes || '',
                "תרומות השנה": currentYearTotals[d.id] || 0
            }));

            const ws = XLSX.utils.json_to_sheet(rows);
            ws['!cols'] = [{wch: 20}, {wch: 30}, {wch: 15}, {wch: 30}, {wch: 15}];
            if(!ws['!views']) ws['!views'] = [];
            ws['!views'].push({ rightToLeft: true });
            
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "נתוני קבוצה");
            wb.Workbook = { Views: [{ RTL: true }] };
            XLSX.writeFile(wb, `Group_${g.name}_${Store.currentYear}.xlsx`);
            Notify.show('קובץ האקסל נוצר בהצלחה', 'success');

        } else if (format === 'pdf') {
            let htmlRows = '';
            donors.forEach((d, idx) => {
                const total = currentYearTotals[d.id] ? `₪${currentYearTotals[d.id].toLocaleString()}` : '-';
                htmlRows += `
                <tr style="border-bottom: 1px solid #ccc;">
                    <td style="padding: 8px; border: 1px solid #000; text-align: center;">${idx+1}</td>
                    <td style="padding: 8px; border: 1px solid #000; font-weight: bold;">${d.name}</td>
                    <td style="padding: 8px; border: 1px solid #000;">${d.city||''} ${d.street||''}</td>
                    <td style="padding: 8px; border: 1px solid #000;">${d.phone || ''}</td>
                    <td style="padding: 8px; border: 1px solid #000;">${d.notes || ''}</td>
                    <td style="padding: 8px; border: 1px solid #000; text-align: center; font-weight: bold; background: #f8fafc;">${total}</td>
                </tr>`;
            });

            const html = `
            <div style="direction: rtl; font-family: sans-serif; padding: 20px; background: white; width: 100%;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #000; padding-bottom: 10px; margin-bottom: 20px;">
                    <div><h1 style="margin: 0; font-size: 24px; font-weight: 900;">דוח קבוצה: ${g.name}</h1><h3 style="margin: 5px 0 0 0; color: #555;">שנת הפקה: ${Store.currentYear}</h3></div>
                    <img src="1.JPG" alt="לוגו" style="height: 70px;">
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <thead style="background: #e2e8f0; -webkit-print-color-adjust: exact;"><tr>
                        <th style="padding: 10px; border: 1px solid #000; width: 5%;">#</th>
                        <th style="padding: 10px; border: 1px solid #000; width: 20%;">שם התורם</th>
                        <th style="padding: 10px; border: 1px solid #000; width: 25%;">כתובת</th>
                        <th style="padding: 10px; border: 1px solid #000; width: 15%;">טלפון</th>
                        <th style="padding: 10px; border: 1px solid #000; width: 20%;">הערות</th>
                        <th style="padding: 10px; border: 1px solid #000; width: 15%;">תרומות השנה</th>
                    </tr></thead>
                    <tbody>${htmlRows}</tbody>
                </table>
            </div>`;

            const pa = document.getElementById('print-area');
            pa.innerHTML = html;
            window.print();
        }
    },
    
    // 20 הדפסת דף פנימי או מסלול (מתעלם ממושהים)
    async printSheet(type) {
        const g = ((Store.data.yearData[Store.currentYear]?.groups || {})[this.currentDay] || {})[this.activeGroupId];
        if(!g) return;
        
        const dayMap = {'night14': 'ליל י"ד', 'day14': 'יום י"ד', 'day15': 'יום ט"ו'};
        const dayName = dayMap[this.currentDay] || this.currentDay;
        
        if(type === 'members') {
            await Store.ensureAllLoaded('students');
            const members = g.members || [];
            const commanders = members.filter(m => m.role === 'ראש צוות');
            const deputies = members.filter(m => m.role === 'סגן');
            const regulars = members.filter(m => m.role !== 'ראש צוות' && m.role !== 'סגן');

            const renderMemberRow = (m, idx) => {
                const s = Store.data.students[m.id];
                if (!s) return '';
                const name = s.firstName && s.lastName ? `${s.firstName} ${s.lastName}` : s.name;
                let roleBadge = '', rowClass = '';
                if (m.role === 'ראש צוות') { roleBadge = '<span class="font-bold text-blue-600 bg-blue-100 px-1 rounded text-xs ml-1">רקב"צ</span>'; rowClass = 'font-bold bg-blue-50'; }
                else if (m.role === 'סגן') { roleBadge = '<span class="font-bold text-yellow-600 bg-yellow-100 px-1 rounded text-xs ml-1">סגן</span>'; rowClass = 'bg-yellow-50'; }
                
                return `<tr class="${rowClass}"><td class="text-center border border-black p-1">${idx+1}</td><td class="border border-black p-1"><b>${name}</b> ${roleBadge}</td><td class="border border-black p-1">${s.grade || ''}</td></tr>`;
            };
            
            let customHtml = `
                <div class="p-4" style="direction: rtl;">
                    <div class="text-center mb-4 border-b-2 border-black pb-2">
                         <h1 class="text-2xl font-black">דף קבוצה: ${g.name}</h1>
                         <h3>${dayName} | שנה: ${Store.currentYear}</h3>
                    </div>
                    <table class="w-full border-collapse text-right text-sm">
                        <thead class="bg-gray-200">
                            <tr><th class="border border-black p-1 w-10">#</th><th class="border border-black p-1">שם הבחור</th><th class="border border-black p-1">שיעור</th></tr>
                        </thead>
                        <tbody>`;
            
            let count = 0;
            commanders.forEach(m => customHtml += renderMemberRow(m, count++));
            deputies.forEach(m => customHtml += renderMemberRow(m, count++));
            regulars.forEach(m => customHtml += renderMemberRow(m, count++));
            customHtml += `</tbody></table></div>`;
            
            Reports.openEditor('custom', customHtml); 
            
        } else {
            await Store.ensureAllLoaded('donors');
            Notify.show('מכין נתונים להדפסה...', 'info'); 
            
            const mapRev = {};
            Object.keys(window.HEBREW_YEARS_MAPPING).forEach(k => mapRev[window.HEBREW_YEARS_MAPPING[k]] = k);
            const currNum = parseInt(window.HEBREW_YEARS_MAPPING[Store.currentYear] || 5785);
            
            const y3 = mapRev[currNum - 3] || (currNum - 3).toString();
            const y2 = mapRev[currNum - 2] || (currNum - 2).toString();
            const y1 = mapRev[currNum - 1] || (currNum - 1).toString();

            const getHistory = async (year) => {
                const snap = await db.ref(`years/${year}/finance`).once('value');
                const val = snap.val() || {};
                const totals = {};
                Object.values(val).forEach(tx => {
                    if (tx.donorId) {
                        if (!totals[tx.donorId]) totals[tx.donorId] = [];
                        let display = '';
                        if(tx.amount !== undefined && tx.amount !== null && !isNaN(tx.amount)) display += `₪${tx.amount}`;
                        if(tx.textNote) display += (display ? ' ' : '') + `<span style="font-size:10px; color:gray; display:block; line-height:1;">${tx.textNote}</span>`;
                        if(!display && tx.type === 'note' && tx.desc) display = `<span style="font-size:10px; color:gray; display:block; line-height:1;">${tx.desc}</span>`;
                        if(display) totals[tx.donorId].push(display);
                    }
                });
                return totals;
            };

            const [hist1, hist2, hist3] = await Promise.all([getHistory(y1), getHistory(y2), getHistory(y3)]);

            const headers = ['#', 'שם', 'רחוב', 'קומה', 'הערות', y3, y2, y1, 'סכום לשנה זו'];
            const colsVisible = headers.map(() => true);
            const headersOrder = headers.map((_, i) => i);

            const routeData = [];
            let currentSegment = [];

            (g.route||[]).forEach((did) => {
                if(did.startsWith('NOTE:')) {
                     if(currentSegment.length > 0) {
                         routeData.push({ type: 'table', rows: currentSegment });
                         currentSegment = [];
                     }
                     routeData.push({ type: 'note', text: did.substring(5) });
                } else {
                    const d = Store.data.donors[did];
                    // סינון התורם המושהה מהדפסת המסלול!
                    if(d && !d.isSuspended) {
                        currentSegment.push({
                            name: d.name,
                            street: d.street || d.address || '',
                            floor: d.floor || '',
                            notes: d.notes || '',
                            hist3: (hist3[did]||[]).join(', ') || '',
                            hist2: (hist2[did]||[]).join(', ') || '',
                            hist1: (hist1[did]||[]).join(', ') || '',
                            currentYearBlank: ''
                        });
                    }
                }
            });
            if(currentSegment.length > 0) routeData.push({ type: 'table', rows: currentSegment });

            Reports.openEditor('route', { 
                title: `דף מסלול: ${g.name}`, 
                subTitle: `${dayName} | שנה: ${Store.currentYear}`,
                data: routeData,
                headers: headers,
                colsVisible: colsVisible,
                headersOrder: headersOrder
            }); 
        }
    },

    // 21 הרחבת קבוצה (מנהל מסלולים - עם השהיה וניווט מקלדת)
    async expandGroupDetails(day, gid) {
        if (!day || !gid) return Notify.show('בחר קבוצה קודם', 'error');
        const g = ((Store.data.yearData[Store.currentYear]?.groups || {})[day] || {})[gid];
        if (!g) return Notify.show('קבוצה לא נמצאה', 'error');

        Notify.show('מלקט נתוני היסטוריה...', 'info'); 

        const mapRev = {};
        Object.keys(window.HEBREW_YEARS_MAPPING).forEach(k => mapRev[window.HEBREW_YEARS_MAPPING[k]] = k);
        const currNum = parseInt(window.HEBREW_YEARS_MAPPING[Store.currentYear] || 5785);
        
        const y3 = mapRev[currNum - 3] || (currNum - 3).toString();
        const y2 = mapRev[currNum - 2] || (currNum - 2).toString();
        const y1 = mapRev[currNum - 1] || (currNum - 1).toString();

        const getHist = async (yearName) => {
            const snap = await db.ref(`years/${yearName}/finance`).once('value');
            const data = snap.val() || {};
            const res = {};
            Object.values(data).forEach(tx => {
                if(tx.donorId) {
                    if(!res[tx.donorId]) res[tx.donorId] = [];
                    let display = '';
                    if(tx.amount !== undefined && tx.amount !== null && !isNaN(tx.amount)) display += `<span class="font-bold text-emerald-700">₪${tx.amount}</span>`;
                    if(tx.textNote) display += (display ? '<br>' : '') + `<span class="text-[10px] text-gray-500 bg-gray-100 px-1 rounded">${tx.textNote}</span>`;
                    if(!display && tx.type === 'note' && tx.desc) display = `<span class="text-[10px] text-gray-500 bg-gray-100 px-1 rounded">${tx.desc}</span>`;
                    if(display) res[tx.donorId].push(display);
                }
            });
            return res;
        };

        const [h3, h2, h1] = await Promise.all([getHist(y3), getHist(y2), getHist(y1)]);

        let html = `
        <div class="overflow-x-auto" dir="rtl">
            <p class="text-xs text-indigo-600 mb-2 font-bold bg-indigo-50 p-2 rounded">
                <i class="fas fa-info-circle"></i> 
                ניתן לעבור בין השדות עם מקש ה-<b>Enter</b>. <br>
                כדי להשהות תורם לחץ על סמל ההשהיה או הקלד את הספרה <b>0</b>. התורם יעבור לסוף הרשימה ולא יודפס.
            </p>
            <table class="w-full text-sm border-collapse text-right">
                <thead class="bg-gray-100 sticky top-0 shadow-sm z-10">
                    <tr>
                        <th class="p-3 border w-20">סדר</th>
                        <th class="p-3 border">שם / הערה</th>
                        <th class="p-3 border">כתובת</th>
                        <th class="p-3 border text-indigo-700">${y3}</th>
                        <th class="p-3 border text-indigo-700">${y2}</th>
                        <th class="p-3 border text-indigo-700">${y1}</th>
                        <th class="p-3 border text-center">פעולה</th>
                    </tr>
                </thead>
                <tbody id="ext-group-tbody">
        `;

        let activeRows = '';
        let suspendedRows = '';
        let activeIndex = 1;

        (g.route || []).forEach((did) => {
            if(did.startsWith('NOTE:')) {
                const noteText = did.substring(5);
                activeRows += `
                <tr class="route-row bg-yellow-50 transition" data-id="${did}">
                    <td class="p-2 border"><input type="number" value="${activeIndex++}" class="w-full border text-center rounded order-input p-1" onkeydown="Groups.handleOrderKeydown(event, this)"></td>
                    <td class="p-2 border font-bold text-yellow-800" colspan="5"><i class="fas fa-sticky-note"></i> ${noteText}</td>
                    <td class="p-2 border text-center"><button onclick="Groups.deleteNoteFromExpanded(this)" title="מחק הערה" class="text-red-500 font-bold bg-white p-2 rounded border border-red-200 transition hover:bg-red-50"><i class="fas fa-trash"></i></button></td>
                </tr>`;
            } else {
                const d = Store.data.donors[did];
                if(d) {
                    const isSuspended = d.isSuspended;
                    const orderVal = isSuspended ? 0 : activeIndex++;
                    const rowClass = isSuspended ? 'bg-gray-200 opacity-60' : 'hover:bg-gray-50';
                    const iconClass = isSuspended ? 'fa-play text-emerald-500' : 'fa-pause text-orange-500';
                    const titleText = isSuspended ? 'החזר לפעילות' : 'השהה תורם';
                    
                    const v3 = (h3[did]||[]).join(', ') || '-';
                    const v2 = (h2[did]||[]).join(', ') || '-';
                    const v1 = (h1[did]||[]).join(', ') || '-';
                    
                    const rowHtml = `
                    <tr class="route-row ${rowClass} transition" data-id="${did}" data-type="donor">
                        <td class="p-2 border"><input type="number" value="${orderVal}" class="w-full border text-center rounded order-input p-1" onkeydown="Groups.handleOrderKeydown(event, this)" oninput="Groups.handleOrderChange(this)"></td>
                        <td class="p-2 border font-bold">${d.name} ${isSuspended ? '<span class="text-[10px] bg-white px-1 rounded ml-2">מושהה</span>' : ''}</td>
                        <td class="p-2 border text-xs text-gray-500">${d.city||''} ${d.street||''}</td>
                        <td class="p-2 border text-xs font-medium">${v3}</td>
                        <td class="p-2 border text-xs font-medium">${v2}</td>
                        <td class="p-2 border text-xs font-medium">${v1}</td>
                        <td class="p-2 border text-center"><button onclick="Groups.suspendFromExpanded(this)" title="${titleText}" class="font-bold bg-white p-2 rounded border transition shadow-sm"><i class="fas ${iconClass} suspend-icon"></i></button></td>
                    </tr>`;

                    if (isSuspended) suspendedRows += rowHtml;
                    else activeRows += rowHtml;
                }
            }
        });

        html += activeRows + suspendedRows + `</tbody></table></div>`;
        const saveBtn = `<div class="flex gap-4 mt-6 pt-4 border-t sticky bottom-0 bg-white"><button id="btn-save-route" onclick="Groups.saveExpandedRoute('${day}', '${gid}')" class="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition">שמור שינויים (סדר והשהיות)</button><button onclick="Modal.close()" class="bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-bold hover:bg-gray-200 transition border border-gray-200">ביטול ומחיקת שינויים</button></div>`;

        Modal.renderRaw(`פרטי קבוצה/מסלול: ${g.name}`, html + saveBtn, () => {}, 'max-w-6xl w-full');
        document.querySelector('#modal-form .btn-primary').parentElement.style.display = 'none';
    },

    // 21.1 ניווט באנטר
    handleOrderKeydown(e, input) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const inputs = Array.from(document.querySelectorAll('#ext-group-tbody .order-input'));
            const currentIndex = inputs.indexOf(input);
            if (currentIndex > -1 && currentIndex < inputs.length - 1) {
                inputs[currentIndex + 1].focus();
                inputs[currentIndex + 1].select();
            } else if (currentIndex === inputs.length - 1) {
                document.getElementById('btn-save-route').focus();
            }
        }
    },

    // 21.2 שינוי עיצוב חי בהקלדת 0
    handleOrderChange(input) {
        const row = input.closest('tr');
        const icon = row.querySelector('.suspend-icon');
        if (parseInt(input.value) === 0) {
            row.classList.add('bg-gray-200', 'opacity-60');
            row.classList.remove('hover:bg-gray-50');
            if(icon) { icon.classList.replace('fa-pause', 'fa-play'); icon.classList.replace('text-orange-500', 'text-emerald-500'); }
        } else {
            row.classList.remove('bg-gray-200', 'opacity-60');
            row.classList.add('hover:bg-gray-50');
            if(icon) { icon.classList.replace('fa-play', 'fa-pause'); icon.classList.replace('text-emerald-500', 'text-orange-500'); }
        }
    },

    // 21.3 כפתור השהיה/הפעלה מהיר
    suspendFromExpanded(btn) {
        const row = btn.closest('tr');
        const input = row.querySelector('.order-input');
        if (parseInt(input.value) === 0) {
            input.value = 99; 
            this.handleOrderChange(input);
        } else {
            input.value = 0;
            this.handleOrderChange(input);
        }
    },

    // 21.4 מחיקת הערת מסלול
    deleteNoteFromExpanded(btn) {
        const row = btn.closest('tr');
        row.classList.toggle('opacity-30'); 
        row.classList.toggle('marked-remove');
    },

    // 22 שמירת מסלול מורחב והשהיות
    saveExpandedRoute(day, gid) {
        const rows = document.querySelectorAll('#ext-group-tbody .route-row');
        const activeRoute = [];
        const suspendedRoute = [];
        const donorUpdates = {};

        rows.forEach(row => {
            if(row.classList.contains('marked-remove')) return; 

            const isNote = !row.dataset.type; 
            const order = parseFloat(row.querySelector('.order-input').value) || 0;
            const did = row.dataset.id;

            if (order === 0) {
                if (!isNote) {
                    suspendedRoute.push({ id: did, order: 9999 }); 
                    donorUpdates[`global/donors/${did}/isSuspended`] = true;
                }
            } else {
                activeRoute.push({ id: did, order: order });
                if (!isNote) {
                    donorUpdates[`global/donors/${did}/isSuspended`] = null; 
                }
            }
        });
        
        activeRoute.sort((a,b) => a.order - b.order);
        const finalRoute = [...activeRoute.map(r => r.id), ...suspendedRoute.map(r => r.id)];
        
        OfflineManager.write(`years/${Store.currentYear}/groups/${day}/${gid}/route`, finalRoute);
        
        if (Object.keys(donorUpdates).length > 0) {
            db.ref().update(donorUpdates);
            Object.keys(donorUpdates).forEach(path => {
                const id = path.split('/')[2];
                if(Store.data.donors[id]) Store.data.donors[id].isSuspended = donorUpdates[path] === true;
            });
        }

        Notify.show('המסלול עודכן בהצלחה', 'success'); 
        Modal.close();
        
        if(Router.current === 'groups' && Groups.activeGroupId === gid) {
             Groups.renderEditor(((Store.data.yearData[Store.currentYear]?.groups || {})[day] || {})[gid]);
        }
        if(Router.current === 'donors') {
             setTimeout(() => { if(Donors.renderManager) Donors.renderManager(); Donors.renderList(); }, 200);
        }
    }
};

window.Groups = Groups;