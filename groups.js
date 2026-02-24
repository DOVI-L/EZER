
const Groups = {
    currentDay: 'night14',
    activeGroupId: null,
    
    // 1 הגדרת יום
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
    
    // 2 רינדור קבוצות
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
    
    // 3 בחירת קבוצה (2)
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
    
    // 4 רינדור עורך (3)
    renderEditor(group) {
        if (!group) return;
        const memList = document.getElementById('group-members-list');
        if(memList) {
            memList.innerHTML = '';
            if (!group.members || group.members.length === 0) {
                memList.innerHTML = '<div class="text-center text-gray-400 p-4">אין בחורים בקבוצה זו. חפש במאגר והוסף.</div>';
            }
            
            (group.members || []).forEach((m, idx) => {
                const s = Store.data.students[m.id];
                if(!s) return;
                const name = s.firstName && s.lastName ? `${s.firstName} ${s.lastName}` : s.name;
                const roleSelect = `
                    <select onchange="Groups.updateMemberRole(${idx}, this.value)" class="text-xs border rounded p-1 mr-2 bg-gray-50">
                        <option value="חבר" ${m.role === 'חבר' ? 'selected' : ''}>חבר</option>
                        <option value="ראש צוות" ${m.role === 'ראש צוות' ? 'selected' : ''}>ראש צוות</option>
                        <option value="סגן" ${m.role === 'סגן' ? 'selected' : ''}>סגן</option>
                    </select>
                `;
                memList.innerHTML += `
                    <div class="bg-white p-3 border rounded-xl shadow-sm text-sm flex justify-between items-center mb-2">
                        <div class="flex items-center">
                            <span class="font-bold text-slate-800 ml-3">${name}</span>
                            ${roleSelect}
                        </div>
                        <button onclick="Groups.removeMember(${idx})" class="text-red-400 hover:text-red-600 bg-red-50 px-2 py-1 rounded transition"><i class="fas fa-times"></i> הסר</button>
                    </div>`;
            });
        }
        
        this.filterStudents('');
    },

    // 5 קבוצה חדשה
    addNewGroup() {
        const n = prompt("שם הקבוצה:");
        if(n) {
            const newRef = db.ref(`years/${Store.currentYear}/groups/${this.currentDay}`).push();
            OfflineManager.write(`years/${Store.currentYear}/groups/${this.currentDay}/${newRef.key}`, {name: n, members: [], route: []});
        }
    },
    
    // 6 שינוי שם
    renameGroup() {
        const nameEl = document.getElementById('active-group-name');
        if(!nameEl) return;
        const old = nameEl.innerText;
        const n = prompt("שם חדש לקבוצה:", old);
        if(n && n !== old) {
            OfflineManager.write(`years/${Store.currentYear}/groups/${this.currentDay}/${this.activeGroupId}/name`, n);
            nameEl.innerText = n;
            const listItem = document.querySelector(`div[data-group-id="${this.activeGroupId}"] .font-bold`);
            if(listItem) listItem.innerText = n;
        }
    },
    
    // 7 מחיקת קבוצה
    deleteGroup() {
         if(confirm('האם אתה בטוח שברצונך למחוק קבוצה זו?')) {
             OfflineManager.write(`years/${Store.currentYear}/groups/${this.currentDay}/${this.activeGroupId}`, null, 'remove');
             this.activeGroupId = null;
             this.render();
         }
    },
    
    // 8 פתיחת מנהל זמינות (חדש)
    openAvailabilityManager() {
        let html = `
            <div class="bg-indigo-50 p-4 rounded-xl mb-4 text-indigo-900 text-sm font-bold border border-indigo-200">
                <i class="fas fa-info-circle ml-1"></i> סמן אלו בחורים פנויים וזמינים לאיזה יום. הסימון ישפיע על התצוגה בעת שיבוץ בחורים לקבוצות.
            </div>
            <div class="mb-3 relative">
                <input type="text" id="avail-search" placeholder="חפש בחור..." class="w-full border p-2 rounded-lg pl-8" oninput="Groups.filterAvailabilityList(this.value)">
                <i class="fas fa-search absolute left-3 top-3 text-gray-400"></i>
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
                    <tbody id="avail-tbody" class="divide-y divide-gray-100 bg-white">
                        <!-- יוזרק ב-JS -->
                    </tbody>
                </table>
            </div>
        `;
        Modal.renderRaw('מנהל זמינות בחורים לפורים', html, () => { Modal.close(); Groups.render(); }, 'max-w-4xl w-full');
        document.querySelector('#modal-form .btn-primary').parentElement.style.display = 'none';
        this.filterAvailabilityList('');
    },

    // 9 סינון מנהל זמינות (8)
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

    // 10 עדכון זמינות במסד (9)
    toggleStudentAvailability(sid, dayId, isChecked) {
        const path = `years/${Store.currentYear}/studentData/${sid}/availability/${dayId}`;
        OfflineManager.write(path, isChecked ? true : null);
        
        // ריענון רשימת בריכת הבחורים אם היא פתוחה בתוך הקבוצה
        setTimeout(() => {
            const poolInput = document.getElementById('pool-search-input');
            if (poolInput) this.filterStudents(poolInput.value);
        }, 100);
    },

    // 11 סינון בחורים לקבוצה (4)
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

        if(term) list = list.filter(s => s.fullName.includes(term));
        
        const filterType = document.getElementById('student-pool-filter')?.value || 'all';
        if (filterType === 'ready') {
            list = list.filter(s => s.yData.availability && s.yData.availability[this.currentDay]);
        }

        list.slice(0, 60).forEach(s => {
            const isReady = s.yData.availability && s.yData.availability[this.currentDay];
            const readyBadge = isReady ? '<span class="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold">זמין ליום זה</span>' : '';
            
            pool.innerHTML += `
            <div class="p-3 border-b hover:bg-indigo-50 flex justify-between items-center text-sm transition bg-white mb-1 rounded-lg border border-slate-100 shadow-sm">
                <div class="flex items-center gap-2">
                    <span class="font-medium text-slate-800">${s.fullName}</span>
                    ${readyBadge}
                </div>
                <button onclick="Groups.addMember('${s.id}')" class="bg-indigo-100 text-indigo-700 px-3 py-1 hover:bg-indigo-600 hover:text-white rounded-lg transition font-bold text-xs"><i class="fas fa-plus"></i> צרף</button>
            </div>`;
        });
        if (list.length > 60) pool.innerHTML += `<div class="text-center text-xs text-gray-400 p-2">ישנן עוד תוצאות, חפש בשורת החיפוש.</div>`;
    },
    
    // 12 הוספת חבר
    addMember(sid) {
        const path = `years/${Store.currentYear}/groups/${this.currentDay}/${this.activeGroupId}/members`;
        db.ref(path).once('value', snap => {
            const list = snap.val() || [];
            if(!list.some(x => x.id === sid)) {
                list.push({id: sid, role: 'חבר'});
                OfflineManager.write(path, list);
            }
        });
    },
    
    // 13 הסרת חבר
    removeMember(idx) {
        const path = `years/${Store.currentYear}/groups/${this.currentDay}/${this.activeGroupId}/members`;
        db.ref(path).once('value', s => {
            const l = s.val() || []; 
            if(l.length > idx) l.splice(idx,1); 
            OfflineManager.write(path, l);
        });
    },
    
    // 14 עדכון תפקיד
    updateMemberRole(idx, newRole) {
        const path = `years/${Store.currentYear}/groups/${this.currentDay}/${this.activeGroupId}/members/${idx}/role`;
        OfflineManager.write(path, newRole);
    },
    
    // 15 הסרה ממסלול
    removeFromRoute(day, gid, did) {
        const path = `years/${Store.currentYear}/groups/${day}/${gid}/route`;
        db.ref(path).once('value', s => {
            let l = s.val() || [];
            l = l.filter(x => x !== did);
            OfflineManager.write(path, l);
            if (document.getElementById('ext-group-tbody')) this.expandGroupDetails(day, gid);
            if (Router.current === 'donors') setTimeout(() => { if (Donors.renderManager) Donors.renderManager(); }, 200);
        });
    },
    
    // 16 תרומה קבוצתית
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
            setTimeout(() => { if(window.Finance) Finance.loadMore(true); }, 1000);
        });
    },
    
    // 17 ייבוא קבוצות
    copyFromPreviousYear() {
        const mapRev = {'תשפ״ח':5788, 'תשפ״ז':5787, 'תשפ״ו':5786, 'תשפ״ה':5785, 'תשפ״ד':5784, 'תשפ״ג':5783, 'תשפ״ב':5782, 'תשפ״א':5781, 'תש״פ':5780};
        const map = {5788:'תשפ״ח', 5787:'תשפ״ז', 5786:'תשפ״ו', 5785:'תשפ״ה', 5784:'תשפ״ד', 5783:'תשפ״ג', 5782:'תשפ״ב', 5781:'תשפ״א', 5780:'תש״פ'};
        
        const currNum = mapRev[Store.currentYear];
        if(!currNum) return alert('לא ניתן לזהות את השנה הנוכחית');
        const prevYear = map[currNum - 1];
        if(!prevYear) return alert('לא ניתן לזהות את השנה הקודמת');

        if(!confirm(`האם לייבא קבוצות משנת ${prevYear}? הפעולה תייבא את מבנה הקבוצות וכל התורמים המשובצים (ללא בחורים).`)) return;

        Notify.show('מייבא נתונים...', 'info');
        
        const prevYear2 = map[currNum - 2];
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

    // 18 ייצוא נתונים
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

        const donors = (g.route || []).filter(x => !x.startsWith('NOTE:')).map(did => Store.data.donors[did]).filter(x => x);

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
    
    // 19 הדפסה מרוכזת
    async printAllGroups() {
        Notify.show('מכין הדפסה מרוכזת...', 'info');
        await Store.ensureAllLoaded('students');

        const groups = (Store.data.yearData[Store.currentYear]?.groups || {})[this.currentDay] || {};
        const dayName = this.currentDay.replace('night','ליל ').replace('day','יום ');

        if (Object.keys(groups).length === 0) return Notify.show('אין קבוצות להדפסה ביום זה', 'info');

        let html = `<div style="direction: rtl;">`;
        const groupsArray = Object.values(groups);

        for (let i = 0; i < groupsArray.length; i += 3) {
            const chunk = groupsArray.slice(i, i + 3);
            html += `<div style="display: flex; gap: 15px; margin-bottom: 15px; page-break-inside: avoid; align-items: stretch;">`;

            chunk.forEach(g => {
                html += `
                    <div class="group-box" style="flex: 1; border: 2px solid #000; display: flex; flex-direction: column; background: #fff;">
                        <div class="group-box-header" style="background: #e2e8f0; border-bottom: 2px solid #000; padding: 5px; text-align: center; font-weight: 900; font-size: 14pt; -webkit-print-color-adjust: exact;">${g.name} - ${dayName}</div>
                        <div class="group-box-content" style="padding: 5px; flex: 1;">
                `;
                const members = g.members || [];
                const commanders = members.filter(m => m.role === 'ראש צוות');
                const deputies = members.filter(m => m.role === 'סגן');
                const regulars = members.filter(m => m.role !== 'ראש צוות' && m.role !== 'סגן');
                
                const renderRow = (m, roleText) => {
                    const s = Store.data.students[m.id];
                    if (!s) return '';
                    const name = s.firstName && s.lastName ? `${s.firstName} ${s.lastName}` : s.name;
                    return `
                        <div class="group-box-row" style="display: flex; justify-content: space-between; border-bottom: 1px dashed #ccc; padding: 3px 0; font-size: 11pt;">
                            <span class="box-name">${name} ${roleText ? `<span class="box-role" style="font-weight:bold;">(${roleText})</span>` : ''}</span>
                            <span class="box-grade">${s.grade || ''}</span>
                        </div>
                    `;
                };
                commanders.forEach(m => html += renderRow(m, 'רקב"צ')); 
                deputies.forEach(m => html += renderRow(m, 'סגן'));
                regulars.forEach(m => html += renderRow(m, ''));
                html += `</div></div>`;
            });

            for(let j = chunk.length; j < 3; j++) { html += `<div style="flex: 1;"></div>`; }
            html += `</div>`; 
        }
        html += '</div>';
        
        const pa = document.getElementById('print-area');
        if(pa) {
            pa.innerHTML = `<div class="print-header no-print-bg"><img src="1.JPG" alt="לוגו"><h1>רשימת קבוצות - ${dayName}</h1><h3>שנה: ${Store.currentYear}</h3></div>${html}`;
            window.print();
        }
    },
    
    // 20 הדפסת דף
    async printSheet(type) {
        const g = ((Store.data.yearData[Store.currentYear]?.groups || {})[this.currentDay] || {})[this.activeGroupId];
        if(!g) return;
        
        const dayMap = {'night14': 'ליל י"ד', 'day14': 'יום י"ד', 'day15': 'יום ט"ו'};
        const dayName = dayMap[this.currentDay] || this.currentDay;
        
        if(type === 'members') await Store.ensureAllLoaded('students');
        if(type === 'route') await Store.ensureAllLoaded('donors');
        
        if(type === 'members') {
            const members = g.members || [];
            const commanders = members.filter(m => m.role === 'ראש צוות');
            const deputies = members.filter(m => m.role === 'סגן');
            const regulars = members.filter(m => m.role !== 'ראש צוות' && m.role !== 'סגן');

            const renderMemberRow = (m, idx) => {
                const s = Store.data.students[m.id];
                if (!s) return '';
                const name = s.firstName && s.lastName ? `${s.firstName} ${s.lastName}` : s.name;
                let roleBadge = '', rowClass = '';
                if (m.role === 'ראש צוות') { roleBadge = '<span class="role-badge role-commander">רקב"צ</span>'; rowClass = 'font-bold bg-blue-50'; }
                else if (m.role === 'סגן') { roleBadge = '<span class="role-badge role-deputy">סגן</span>'; rowClass = 'bg-yellow-50'; }
                
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
            Notify.show('מכין נתונים להדפסה...', 'info');
            
            const mapRev = {};
            Object.keys(HEBREW_YEARS_MAPPING).forEach(k => mapRev[HEBREW_YEARS_MAPPING[k]] = k);
            const currNum = parseInt(HEBREW_YEARS_MAPPING[Store.currentYear] || 5785);
            
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
                        if(tx.type === 'note' || isNaN(parseFloat(tx.amount))) totals[tx.donorId].push(tx.amount || tx.desc);
                        else totals[tx.donorId].push('₪'+tx.amount);
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
                    if(d) {
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

    // 21 הרחבת קבוצה
    async expandGroupDetails(day, gid) {
        if (!day || !gid) return Notify.show('בחר קבוצה קודם', 'error');
        const g = ((Store.data.yearData[Store.currentYear]?.groups || {})[day] || {})[gid];
        if (!g) return Notify.show('קבוצה לא נמצאה', 'error');

        Notify.show('מלקט נתוני היסטוריה...', 'info');

        const mapRev = {};
        Object.keys(HEBREW_YEARS_MAPPING).forEach(k => mapRev[HEBREW_YEARS_MAPPING[k]] = k);
        const currNum = parseInt(HEBREW_YEARS_MAPPING[Store.currentYear] || 5785);
        
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
                    if(tx.type === 'note' || isNaN(parseFloat(tx.amount))) res[tx.donorId].push(tx.amount || tx.desc);
                    else res[tx.donorId].push('₪' + tx.amount);
                }
            });
            return res;
        };

        const [h3, h2, h1] = await Promise.all([getHist(y3), getHist(y2), getHist(y1)]);

        let html = `
        <div class="overflow-x-auto" dir="rtl">
            <p class="text-xs text-red-500 mb-2 font-bold">* שינוי סדר ומחיקה יישמרו רק בלחיצה על 'שמור שינויים' למטה. הקלדת מספר חדש תכניס את התורם למיקום הרצוי.</p>
            <table class="w-full text-sm border-collapse text-right">
                <thead class="bg-gray-100 sticky top-0 shadow-sm z-10">
                    <tr>
                        <th class="p-3 border w-16">סדר</th>
                        <th class="p-3 border">שם / הערה</th>
                        <th class="p-3 border">כתובת</th>
                        <th class="p-3 border text-indigo-700">${y3}</th>
                        <th class="p-3 border text-indigo-700">${y2}</th>
                        <th class="p-3 border text-indigo-700">${y1}</th>
                        <th class="p-3 border text-center">הסר</th>
                    </tr>
                </thead>
                <tbody id="ext-group-tbody">
        `;

        (g.route || []).forEach((did, index) => {
            if(did.startsWith('NOTE:')) {
                const noteText = did.substring(5);
                html += `
                <tr class="route-row bg-yellow-50 transition" data-id="${did}">
                    <td class="p-2 border"><input type="number" value="${index+1}" class="w-full border text-center rounded order-input p-1"></td>
                    <td class="p-2 border font-bold text-yellow-800" colspan="5"><i class="fas fa-sticky-note"></i> ${noteText}</td>
                    <td class="p-2 border text-center"><button onclick="this.closest('tr').classList.toggle('opacity-30'); this.closest('tr').classList.toggle('marked-remove');" class="text-red-500 font-bold bg-white p-2 rounded border border-red-200 transition hover:bg-red-50"><i class="fas fa-trash"></i></button></td>
                </tr>`;
            } else {
                const d = Store.data.donors[did];
                if(d) {
                    const v3 = (h3[did]||[]).join(', ') || '-';
                    const v2 = (h2[did]||[]).join(', ') || '-';
                    const v1 = (h1[did]||[]).join(', ') || '-';
                    html += `
                    <tr class="route-row hover:bg-gray-50 transition" data-id="${did}">
                        <td class="p-2 border"><input type="number" value="${index+1}" class="w-full border text-center rounded order-input p-1"></td>
                        <td class="p-2 border font-bold">${d.name}</td>
                        <td class="p-2 border text-xs text-gray-500">${d.city||''} ${d.street||''}</td>
                        <td class="p-2 border text-xs font-medium">${v3}</td>
                        <td class="p-2 border text-xs font-medium">${v2}</td>
                        <td class="p-2 border text-xs font-medium">${v1}</td>
                        <td class="p-2 border text-center"><button onclick="this.closest('tr').classList.toggle('opacity-30'); this.closest('tr').classList.toggle('marked-remove');" class="text-red-500 font-bold bg-white p-2 rounded border border-red-200 transition hover:bg-red-50"><i class="fas fa-trash"></i></button></td>
                    </tr>`;
                }
            }
        });

        html += `</tbody></table></div>`;
        const saveBtn = `<div class="flex gap-4 mt-6 pt-4 border-t sticky bottom-0 bg-white"><button onclick="Groups.saveExpandedRoute('${day}', '${gid}')" class="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition">שמור שינויים (סדר ומחיקות)</button><button onclick="Modal.close()" class="bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-bold hover:bg-gray-200 transition border border-gray-200">ביטול ומחיקת שינויים</button></div>`;

        Modal.renderRaw(`פרטי קבוצה/מסלול: ${g.name}`, html + saveBtn, () => {}, 'max-w-6xl w-full');
        document.querySelector('#modal-form .btn-primary').parentElement.style.display = 'none';
    },

    // 22 שמירת מסלול מורחב (21)
    saveExpandedRoute(day, gid) {
        const rows = document.querySelectorAll('#ext-group-tbody .route-row');
        const newRouteData = [];
        rows.forEach(row => {
            if(!row.classList.contains('marked-remove')) {
                const order = parseFloat(row.querySelector('.order-input').value) || 999;
                newRouteData.push({ id: row.dataset.id, order: order });
            }
        });
        
        newRouteData.sort((a,b) => a.order - b.order);
        const finalRoute = newRouteData.map(r => r.id);
        
        OfflineManager.write(`years/${Store.currentYear}/groups/${day}/${gid}/route`, finalRoute);
        Notify.show('המסלול עודכן בהצלחה', 'success');
        Modal.close();
        
        if(Router.current === 'groups' && Groups.activeGroupId === gid) {
             Groups.renderEditor(((Store.data.yearData[Store.currentYear]?.groups || {})[day] || {})[gid]);
        }
        if(Router.current === 'donors') {
             setTimeout(() => { if(Donors.renderManager) Donors.renderManager(); }, 200);
        }
    }
};

window.Groups = Groups;