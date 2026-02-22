const Groups = {
    currentDay: 'night14',
    activeGroupId: null,
    sortableInstance: null, 
    
    setDay(d) {
        try {
            this.currentDay = d;
            document.querySelectorAll('.group-tab').forEach(b => {
                if(b.dataset.day === d) b.classList.add('active');
                else b.classList.remove('active');
            });
            this.activeGroupId = null;
            this.render();
        } catch(e) {
            console.error("Error in Groups.setDay:", e);
        }
    },
    
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
                        <div class="text-xs text-gray-400 mt-1">${(g.members||[]).length} בחורים | ${(g.route||[]).length} תורמים</div>
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
        } catch(e) {
            console.error("Error in Groups.render:", e);
        }
    },
    
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
        } catch(e) {
            console.error("Error in Groups.selectGroup:", e);
        }
    },
    
    renderEditor(group) {
        if (!group) return;
        const memList = document.getElementById('group-members-list');
        if(memList) {
            memList.innerHTML = '';
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
                    <div class="bg-white p-2 border rounded shadow-sm text-sm flex justify-between items-center mb-1">
                        <div class="flex items-center">
                            <span class="font-bold text-slate-700 ml-2">${name}</span>
                            ${roleSelect}
                        </div>
                        <button onclick="Groups.removeMember(${idx})" class="text-red-300 hover:text-red-500"><i class="fas fa-times"></i></button>
                    </div>`;
            });
        }
        
        const routeList = document.getElementById('group-route-list');
        if(!routeList) return;
        
        routeList.innerHTML = `
            <div class="mb-3 flex justify-center border-b pb-3">
                <button onclick="Groups.addRouteNote()" class="text-xs text-indigo-700 font-bold border border-indigo-300 bg-indigo-50 px-4 py-2 rounded-lg hover:bg-indigo-100 shadow-sm transition"><i class="fas fa-sticky-note ml-1"></i> הוסף הערת מסלול (טקסט חופשי)</button>
            </div>`;
        
        (group.route || []).forEach((did, i) => {
            if (did.startsWith('NOTE:')) {
                const noteText = did.substring(5);
                const el = document.createElement('div');
                el.className = "bg-yellow-50 p-3 border border-yellow-200 rounded-lg shadow-sm text-sm mb-2 flex justify-between items-center cursor-grab active:cursor-grabbing hover:border-yellow-300 transition";
                el.dataset.id = did;
                el.innerHTML = `
                    <div class="flex items-center gap-3 w-full">
                        <span class="bg-yellow-200 text-yellow-800 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold"><i class="fas fa-sticky-note"></i></span>
                        <div class="flex-1 font-bold text-yellow-900">${noteText}</div>
                        <button onclick="Groups.removeFromRoute('${this.currentDay}','${this.activeGroupId}','${did}')" class="text-red-300 hover:text-red-500"><i class="fas fa-times"></i></button>
                    </div>
                `;
                routeList.appendChild(el);
            } else {
                const d = Store.data.donors[did];
                if(!d) return;
                const el = document.createElement('div');
                el.className = "bg-white p-3 border rounded-lg shadow-sm text-sm mb-2 flex justify-between items-center cursor-grab active:cursor-grabbing hover:border-emerald-200 transition";
                el.dataset.id = did;
                el.innerHTML = `
                    <div class="flex items-center gap-3 w-full">
                        <span class="bg-emerald-100 text-emerald-700 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold">${i+1}</span>
                        <div class="flex-1 overflow-hidden">
                            <div class="font-bold text-slate-800 truncate">${d.name}</div>
                            <div class="text-xs text-gray-500 truncate">${d.city || ''} ${d.street || d.address || ''}</div>
                        </div>
                        <i class="fas fa-grip-lines text-gray-300"></i>
                    </div>
                `;
                routeList.appendChild(el);
            }
        });
        
        if(this.sortableInstance) {
            try { this.sortableInstance.destroy(); } catch(e) {}
            this.sortableInstance = null;
        }
        
        try {
            this.sortableInstance = new Sortable(routeList, {
                animation: 150,
                ghostClass: 'bg-emerald-50',
                handle: '.cursor-grab', 
                onEnd: () => {
                    const newOrder = Array.from(routeList.children).filter(c => c.dataset.id).map(c => c.dataset.id);
                    OfflineManager.write(`years/${Store.currentYear}/groups/${this.currentDay}/${this.activeGroupId}/route`, newOrder);
                }
            });
        } catch(e) {
            console.warn("Sortable init failed in Groups:", e);
        }
        
        this.filterStudents('');
    },

    addRouteNote() {
        const text = prompt("הכנס טקסט להערה במסלול (לדוגמה: 'הפסקה', 'מעבר לרחוב הבא'):");
        if(text) {
             const path = `years/${Store.currentYear}/groups/${this.currentDay}/${this.activeGroupId}/route`;
             db.ref(path).once('value', s => {
                const list = s.val() || [];
                list.push(`NOTE:${text}`);
                OfflineManager.write(path, list);
             });
        }
    },
    
    addNewGroup() {
        const n = prompt("שם הקבוצה:");
        if(n) {
            const newRef = db.ref(`years/${Store.currentYear}/groups/${this.currentDay}`).push();
            OfflineManager.write(`years/${Store.currentYear}/groups/${this.currentDay}/${newRef.key}`, {name: n, members: [], route: []});
        }
    },
    
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
    
    deleteGroup() {
         if(confirm('האם אתה בטוח שברצונך למחוק קבוצה זו?')) {
             OfflineManager.write(`years/${Store.currentYear}/groups/${this.currentDay}/${this.activeGroupId}`, null, 'remove');
             this.activeGroupId = null;
             this.render();
         }
    },
    
    filterStudents(term) {
        const pool = document.getElementById('pool-students');
        if(!pool) return;
        pool.innerHTML = '';
        
        let list = Object.values(Store.data.students).filter(s => s && !s.isArchived);
        list = list.map(s => ({
            ...s, 
            fullName: s.firstName && s.lastName ? `${s.firstName} ${s.lastName}` : (s.name || '')
        }));
        
        const dayGroups = (Store.data.yearData[Store.currentYear]?.groups || {})[this.currentDay] || {};
        const assignedInDay = new Set();
        Object.values(dayGroups).forEach(g => (g.members||[]).forEach(m => assignedInDay.add(m.id)));
        list = list.filter(s => !assignedInDay.has(s.id));

        if(term) {
            list = list.filter(s => s.fullName.includes(term));
        }
        
        list.slice(0, 50).forEach(s => {
            pool.innerHTML += `<div onclick="Groups.addMember('${s.id}')" class="p-2 border-b cursor-pointer hover:bg-indigo-50 flex justify-between text-sm"><span class="font-medium">${s.fullName}</span><i class="fas fa-plus text-indigo-500"></i></div>`;
        });
        if (list.length > 50) pool.innerHTML += `<div class="text-center text-xs text-gray-400 p-2">ישנן עוד תוצאות...</div>`;
    },
    
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
    
    removeMember(idx) {
        const path = `years/${Store.currentYear}/groups/${this.currentDay}/${this.activeGroupId}/members`;
        db.ref(path).once('value', s => {
            const l = s.val() || []; 
            if(l.length > idx) l.splice(idx,1); 
            OfflineManager.write(path, l);
        });
    },
    
    updateMemberRole(idx, newRole) {
        const path = `years/${Store.currentYear}/groups/${this.currentDay}/${this.activeGroupId}/members/${idx}/role`;
        OfflineManager.write(path, newRole);
    },
    
    removeFromRoute(day, gid, did) {
        const path = `years/${Store.currentYear}/groups/${day}/${gid}/route`;
        db.ref(path).once('value', s => {
            let l = s.val() || [];
            l = l.filter(x => x !== did);
            OfflineManager.write(path, l);
        });
    },
    
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
            setTimeout(() => Finance.loadMore(true), 1000);
        });
    },
    
    copyFromPreviousYear() {
        const mapRev = {'תשפ״ח':5788, 'תשפ״ז':5787, 'תשפ״ו':5786, 'תשפ״ה':5785, 'תשפ״ד':5784, 'תשפ״ג':5783, 'תשפ״ב':5782, 'תשפ״א':5781, 'תש״פ':5780};
        const map = {5788:'תשפ״ח', 5787:'תשפ״ז', 5786:'תשפ״ו', 5785:'תשפ״ה', 5784:'תשפ״ד', 5783:'תשפ״ג', 5782:'תשפ״ב', 5781:'תשפ״א', 5780:'תש״פ'};
        
        const currNum = mapRev[Store.currentYear];
        if(!currNum) return alert('לא ניתן לזהות את השנה הנוכחית');
        const prevYear = map[currNum - 1];
        if(!prevYear) return alert('לא ניתן לזהות את השנה הקודמת');

        if(!confirm(`האם לייבא קבוצות משנת ${prevYear}? הפעולה תייבא את מבנה הקבוצות ואת כל התורמים שהיו משובצים אליהן (ללא בחורים).`)) return;

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
                    <div>
                        <h1 style="margin: 0; font-size: 24px; font-weight: 900;">דוח קבוצה: ${g.name}</h1>
                        <h3 style="margin: 5px 0 0 0; color: #555;">שנת הפקה: ${Store.currentYear}</h3>
                    </div>
                    <img src="1.JPG" alt="לוגו" style="height: 70px;">
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <thead style="background: #e2e8f0; -webkit-print-color-adjust: exact;">
                        <tr>
                            <th style="padding: 10px; border: 1px solid #000; width: 5%;">#</th>
                            <th style="padding: 10px; border: 1px solid #000; width: 20%;">שם התורם</th>
                            <th style="padding: 10px; border: 1px solid #000; width: 25%;">כתובת</th>
                            <th style="padding: 10px; border: 1px solid #000; width: 15%;">טלפון</th>
                            <th style="padding: 10px; border: 1px solid #000; width: 20%;">הערות</th>
                            <th style="padding: 10px; border: 1px solid #000; width: 15%;">תרומות השנה</th>
                        </tr>
                    </thead>
                    <tbody>${htmlRows}</tbody>
                </table>
            </div>`;

            const pa = document.getElementById('print-area');
            pa.innerHTML = html;
            window.print();
        }
    },
    
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

            for(let j = chunk.length; j < 3; j++) {
                 html += `<div style="flex: 1;"></div>`;
            }
            html += `</div>`; 
        }
        html += '</div>';
        
        const pa = document.getElementById('print-area');
        if(pa) {
            pa.innerHTML = `<div class="print-header no-print-bg"><img src="1.JPG" alt="לוגו"><h1>רשימת קבוצות - ${dayName}</h1><h3>שנה: ${Store.currentYear}</h3></div>${html}`;
            window.print();
        }
    },
    
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
            const yearMapRev = {'תשפ״ח':5788, 'תשפ״ז':5787, 'תשפ״ו':5786, 'תשפ״ה':5785, 'תשפ״ד':5784, 'תשפ״ג':5783, 'תשפ״ב':5782, 'תשפ״א':5781, 'תש״פ':5780};
            const yearMap = {5788:'תשפ״ח', 5787:'תשפ״ז', 5786:'תשפ״ו', 5785:'תשפ״ה', 5784:'תשפ״ד', 5783:'תשפ״ג', 5782:'תשפ״ב', 5781:'תשפ״א', 5780:'תש״פ'};
            
            let currNum = yearMapRev[Store.currentYear] || 5785;
            const prev1 = yearMap[currNum-1] || (currNum-1).toString();
            const prev2 = yearMap[currNum-2] || (currNum-2).toString();
            const prev3 = yearMap[currNum-3] || (currNum-3).toString();

            const getHistory = async (year) => {
                const snap = await db.ref(`years/${year}/finance`).once('value');
                const val = snap.val() || {};
                const totals = {};
                Object.values(val).forEach(tx => {
                    if (tx.type === 'income' && tx.donorId) {
                        if (!totals[tx.donorId]) totals[tx.donorId] = 0;
                        totals[tx.donorId] += (isNaN(parseFloat(tx.amount)) ? 0 : parseFloat(tx.amount));
                    }
                });
                return totals;
            };

            const [hist1, hist2, hist3] = await Promise.all([getHistory(prev1), getHistory(prev2), getHistory(prev3)]);

            const headers = ['#', 'שם', 'רחוב', 'קומה', 'הערות', prev3, prev2, prev1, 'סכום לשנה זו'];
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
                        const val1 = hist1[did] ? '₪'+hist1[did] : '';
                        const val2 = hist2[did] ? '₪'+hist2[did] : '';
                        const val3 = hist3[did] ? '₪'+hist3[did] : '';
                        
                        currentSegment.push({
                            name: d.name,
                            street: d.street || d.address || '',
                            floor: d.floor || '',
                            notes: d.notes || '',
                            hist3: val3,
                            hist2: val2,
                            hist1: val1,
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
    }
};

window.Groups = Groups;