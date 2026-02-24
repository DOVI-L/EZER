// 1 משיכת תורמים במינות
const Donors = {
    limit: 40,
    viewMode: 'list', 
    viewTab: 'all',
    donorSortables: [], 
    poolSortable: null,
    
    // 2 טעינת עוד
    loadMore(reset = false) {
        return new Promise((resolve) => {
            if(reset) { Store.cursors.donors = null; Store.loadedAll.donors = false; }
            const loader = document.getElementById('donors-loader-more');
            if(loader) {
                 loader.style.display = 'block';
                 loader.innerHTML = '<span class="text-gray-500 font-bold"><i class="fas fa-spinner fa-spin"></i> טוען...</span>';
            }
            
            let query = db.ref('global/donors').orderByKey().limitToLast(this.limit);
            if(Store.cursors.donors) query = query.endBefore(Store.cursors.donors);
            
            query.once('value', snap => {
                const data = snap.val();
                if(!data) {
                    Store.loadedAll.donors = true;
                    this.render(); 
                    resolve();
                    return;
                }
                const keys = Object.keys(data).sort();
                Store.cursors.donors = keys[0];
                Object.assign(Store.data.donors, data);
                OfflineManager.saveState('donors', Store.data.donors);
                
                if (keys.length < this.limit) Store.loadedAll.donors = true;
                
                this.render(); 
                resolve();
            });
        });
    },
    
    // 3 סנכרון חדשים
    syncNewest() {
        db.ref('global/donors').orderByKey().limitToLast(10).once('value', snap => {
            const data = snap.val();
            if(data) {
                Object.assign(Store.data.donors, data);
                OfflineManager.saveState('donors', Store.data.donors);
                if(Router.current === 'donors') this.render();
            }
        });
    },
    
    // 4 רינדור ראשי
    render(searchTerm = null) {
        try {
            const listView = document.getElementById('donors-list-view');
            const managerView = document.getElementById('donors-quick-manager');

            if(listView) listView.style.display = '';
            if(managerView) managerView.style.display = '';

            this.buildTopMenu();

            if(this.viewMode === 'list') {
                if(listView) listView.classList.remove('hidden');
                if(managerView) managerView.classList.add('hidden');
                this.renderList(searchTerm);
            } else {
                if(listView) listView.classList.add('hidden');
                if(managerView) managerView.classList.remove('hidden');
                this.renderManager();
            }
        } catch(e) { console.error("Error in Donors.render:", e); }
    },

    // 5 תפריט עליון
    buildTopMenu() {
        const topBar = document.getElementById('donors-top-bar');
        if(!topBar) {
            const container = document.getElementById('view-donors');
            const headerHtml = `
                <div id="donors-top-bar" class="p-4 bg-white rounded-t-2xl shadow-sm border-b flex flex-col gap-3 shrink-0 z-20 relative">
                    <div class="flex justify-between items-center w-full flex-wrap gap-2">
                        <div class="flex gap-2 items-center overflow-x-auto pb-1 custom-scroll">
                            <button onclick="Donors.openAddModal()" class="shrink-0 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold shadow hover:bg-emerald-700 transition">
                                <i class="fas fa-plus"></i> <span class="hidden sm:inline">הוספה</span>
                            </button>
                            <button onclick="Donors.toggleQuickManager()" id="donor-view-toggle-btn" class="shrink-0 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-emerald-100 transition">
                                <i class="fas fa-th"></i> <span class="hidden sm:inline">מצב שיבוץ ומסלול</span>
                            </button>
                            <button onclick="Importer.init('donors')" class="shrink-0 bg-white text-green-600 border border-green-200 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-green-50 transition">
                                <i class="fas fa-file-excel"></i> <span class="hidden sm:inline">אקסל</span>
                            </button>
                            <select id="donor-group-select" onchange="Donors.renderList()" class="shrink-0 hidden border-emerald-300 border text-emerald-800 bg-emerald-50 text-sm rounded-lg px-2 py-1.5 outline-none font-bold min-w-[120px]">
                                <option value="">- כל הקבוצות -</option>
                            </select>
                            <button id="donor-expand-btn" onclick="Groups.expandGroupDetails(Donors.viewTab, document.getElementById('donor-group-select').value)" class="shrink-0 hidden bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold shadow hover:bg-indigo-700 transition">
                                <i class="fas fa-expand-arrows-alt"></i> <span class="hidden sm:inline">הרחבה מפורטת</span>
                            </button>
                        </div>
                        <div class="relative w-full sm:w-56 mt-2 sm:mt-0 shrink-0" id="donor-search-wrapper">
                            <input type="text" id="donor-search-input" oninput="Donors.renderList(this.value)" placeholder="חפש תורם..." class="input-field w-full pl-4 pr-10 py-1.5 text-sm">
                            <i class="fas fa-search absolute left-3 top-2.5 text-gray-400 text-xs"></i>
                        </div>
                    </div>
                    <div class="flex gap-2 border-t pt-3 overflow-x-auto whitespace-nowrap custom-scroll" id="donors-tabs-container">
                        <button onclick="Donors.setViewTab('all')" class="tab-modern donor-view-tab active text-xs px-3 py-1.5" data-tab="all">כל התורמים</button>
                        <button onclick="Donors.setViewTab('unassigned')" class="tab-modern donor-view-tab text-xs px-3 py-1.5" data-tab="unassigned">לא משובצים</button>
                        <button onclick="Donors.setViewTab('night14')" class="tab-modern donor-view-tab text-xs px-3 py-1.5" data-tab="night14">ליל י"ד</button>
                        <button onclick="Donors.setViewTab('day14')" class="tab-modern donor-view-tab text-xs px-3 py-1.5" data-tab="day14">יום י"ד</button>
                        <button onclick="Donors.setViewTab('day15')" class="tab-modern donor-view-tab text-xs px-3 py-1.5" data-tab="day15">יום ט"ו</button>
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('afterbegin', headerHtml);
            const oldHeader = container.querySelector('.p-4.bg-white.rounded-t-2xl.shadow-sm.border-b.flex.flex-col.gap-4.mb-0');
            if(oldHeader && oldHeader.id !== 'donors-top-bar') oldHeader.remove();
        }
    },
    
    // 6 מצב ניהול
    toggleQuickManager() {
        this.viewMode = this.viewMode === 'list' ? 'manager' : 'list';
        
        const toggleBtn = document.getElementById('donor-view-toggle-btn');
        const searchWrap = document.getElementById('donor-search-wrapper');
        const expandBtn = document.getElementById('donor-expand-btn');
        const groupSelect = document.getElementById('donor-group-select');
        
        if (this.viewMode === 'manager') {
            toggleBtn.innerHTML = '<i class="fas fa-list"></i> <span class="hidden sm:inline">חזור לרשימה</span>';
            toggleBtn.classList.replace('bg-emerald-50', 'bg-indigo-50');
            toggleBtn.classList.replace('text-emerald-700', 'text-indigo-700');
            toggleBtn.classList.replace('border-emerald-200', 'border-indigo-200');
            if(searchWrap) searchWrap.style.display = 'none';
            if(expandBtn) expandBtn.style.display = 'none';
            if(groupSelect) groupSelect.style.display = 'none';
            
            if (this.viewTab === 'all' || this.viewTab === 'unassigned') {
                this.setViewTab('night14'); 
            } else {
                this.render();
            }
        } else {
            toggleBtn.innerHTML = '<i class="fas fa-th"></i> <span class="hidden sm:inline">מצב שיבוץ ומסלול</span>';
            toggleBtn.classList.replace('bg-indigo-50', 'bg-emerald-50');
            toggleBtn.classList.replace('text-indigo-700', 'text-emerald-700');
            toggleBtn.classList.replace('border-indigo-200', 'border-emerald-200');
            if(searchWrap) searchWrap.style.display = 'block';
            if(groupSelect && this.viewTab !== 'all' && this.viewTab !== 'unassigned') groupSelect.style.display = 'inline-block';
            this.render();
        }
    },
    
    // 7 החלפת טאב
    setViewTab(tab) {
        try {
            this.viewTab = tab;
            document.querySelectorAll('.donor-view-tab').forEach(b => {
                if(b.dataset.tab === tab) b.classList.add('active');
                else b.classList.remove('active');
            });
            
            const subSelect = document.getElementById('donor-group-select');
            const expandBtn = document.getElementById('donor-expand-btn');

            if (this.viewMode === 'manager') {
                if(subSelect) subSelect.style.display = 'none';
                if(expandBtn) expandBtn.style.display = 'none';
                if (tab === 'all' || tab === 'unassigned') {
                    Notify.show('במצב שיבוץ יש לבחור יום ספציפי', 'info');
                    this.setViewTab('night14');
                    return;
                }
                this.renderManager(); 
                return;
            }

            if(subSelect) {
                subSelect.innerHTML = '<option value="">- כל הקבוצות -</option>';
                if (tab !== 'all' && tab !== 'unassigned') {
                    subSelect.style.display = 'inline-block';
                    subSelect.classList.remove('hidden');
                    const groupsInDay = (Store.data.yearData[Store.currentYear]?.groups || {})[tab] || {};
                    Object.entries(groupsInDay).forEach(([gid, g]) => {
                        subSelect.innerHTML += `<option value="${gid}">${g.name}</option>`;
                    });
                } else {
                    subSelect.style.display = 'none';
                    if(expandBtn) expandBtn.style.display = 'none';
                }
            }
            this.renderList(); 
        } catch(e) { console.error(e); }
    },
    
    // 8 רינדור רשימה וכפתור דינמי (סעיף 12)
    renderList(searchTerm) {
        const term = searchTerm || (document.getElementById('donor-search-input') ? document.getElementById('donor-search-input').value.trim() : '');
        const tbody = document.getElementById('donors-tbody');
        if(!tbody) return;
        
        const groupSelectEl = document.getElementById('donor-group-select');
        const selectedGroupId = groupSelectEl ? groupSelectEl.value : '';
        const expandBtn = document.getElementById('donor-expand-btn');
        
        if (expandBtn) {
            if (selectedGroupId && this.viewTab !== 'all' && this.viewTab !== 'unassigned' && this.viewMode === 'list') {
                expandBtn.classList.remove('hidden');
                expandBtn.style.display = 'inline-block';
            }
            else { expandBtn.style.display = 'none'; }
        }
        
        tbody.innerHTML = '';
        let list = Object.values(Store.data.donors).filter(d => d).sort((a,b) => (a.name||'').localeCompare(b.name||''));
        
        if(this.viewTab === 'unassigned') {
            const assignedDonors = new Set(Object.keys(Store.data.donorGroupMap || {}));
            list = list.filter(d => !assignedDonors.has(d.id));
        } else if (this.viewTab !== 'all') {
            const groupsInDay = (Store.data.yearData[Store.currentYear]?.groups || {})[this.viewTab] || {};
            if (selectedGroupId) {
                const g = groupsInDay[selectedGroupId];
                const donorsInGroup = new Set(g?.route || []);
                list = list.filter(d => donorsInGroup.has(d.id));
            } else {
                const donorsInDay = new Set();
                Object.values(groupsInDay).forEach(g => (g.route || []).forEach(id => {
                     if(!id.startsWith('NOTE:')) donorsInDay.add(id);
                }));
                list = list.filter(d => donorsInDay.has(d.id));
            }
        }

        if(term) list = list.filter(d => (d.name || '').includes(term) || (d.address||'').includes(term) || (d.city||'').includes(term));
        
        const displayList = list.slice(0, 50);
        const loader = document.getElementById('donors-loader-more');

        if (loader) {
            loader.style.display = 'block';
            if (displayList.length === 0) {
                 loader.innerHTML = '<span class="text-gray-400 font-bold bg-gray-50 px-4 py-2 rounded-full border">לא נמצאו תורמים</span>';
            } else if (Store.loadedAll.donors || term) {
                 loader.innerHTML = '<span class="text-gray-400 font-bold bg-gray-50 px-4 py-2 rounded-full border">סוף רשימה</span>';
            } else {
                 loader.innerHTML = `
                    <button onclick="Donors.loadMore()" class="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-6 py-2 rounded-full text-sm font-bold transition shadow-sm w-full sm:w-auto">
                        <i class="fas fa-chevron-down ml-2"></i> טען עוד תורמים...
                    </button>`;
            }
        }

        if(displayList.length === 0) return;

        displayList.forEach(d => {
            const groupName = Store.data.donorGroupMap[d.id];
            const tr = document.createElement('tr');
            tr.className = "hover:bg-slate-50 border-b border-slate-50 transition cursor-pointer group";
            tr.onclick = (e) => { if(!e.target.closest('button')) this.openEdit(d.id); }; 
            
            tr.innerHTML = `
                <td class="p-3 text-right font-medium text-slate-800">
                     ${d.name} ${d.vip ? '<span class="mr-2 text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-100">VIP</span>' : ''}
                </td>
                <td class="p-3 text-right text-gray-500 text-sm">${d.city || ''} ${d.street || d.address || ''} ${d.floor ? '(קומה '+d.floor+')' : ''}</td>
                <td class="p-3 text-right text-gray-500 text-sm">${d.phone || ''}</td>
                <td class="p-3 text-right text-sm">${groupName ? `<span class="bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-bold border border-amber-100">${groupName}</span>` : '-'}</td>
                <td class="p-3">
                    <div class="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-1 custom-scroll">
                        <button onclick="Donors.openBatchDonation('${d.id}', '${d.name}')" class="bg-green-100 text-green-600 hover:bg-green-200 hover:text-green-800 transition shrink-0 p-2 rounded-full font-bold" title="הוסף תרומות"><i class="fas fa-plus"></i></button>
                        <button onclick="Donors.openEdit('${d.id}')" class="text-indigo-400 hover:text-indigo-600 bg-indigo-50 hover:bg-indigo-100 shrink-0 p-2 rounded-full transition"><i class="fas fa-pen"></i></button>
                        <button onclick="Donors.delete('${d.id}')" class="text-red-300 hover:text-red-600 hover:bg-red-50 shrink-0 p-2 rounded-full transition admin-only"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    // 9 HTML לשורה
    getBatchRowHtml() {
        return `
            <tr class="border-b last:border-0">
                <td class="p-2"><input type="text" class="input-amount border rounded p-1 w-full text-sm" placeholder="סכום / טקסט"></td>
                <td class="p-2">
                    <select class="input-method border rounded p-1 w-full text-sm">
                        <option>תרומה כללית</option><option>מזומן</option><option>צק</option><option>אשראי</option>
                    </select>
                </td>
                <td class="p-2"><input type="text" class="input-notes border rounded p-1 w-full text-sm" placeholder="הערה..."></td>
                <td class="p-2 text-center"><button onclick="this.closest('tr').remove()" class="text-red-400 hover:text-red-600"><i class="fas fa-times"></i></button></td>
            </tr>
        `;
    },

    // 10 חלון תרומה מרובה
    openBatchDonation(id, name) {
        const html = `
            <div class="space-y-4">
                <div class="bg-green-50 p-3 rounded-lg border border-green-200 flex justify-between items-center">
                    <div>
                        <div class="font-bold text-green-900">הוספת נתונים עבור: ${name}</div>
                        <div class="text-xs text-green-700">ניתן להזין סכום כספי, או טקסט שיישמר כהערה.</div>
                    </div>
                </div>
                <table class="w-full text-right" id="batch-add-table">
                    <thead><tr class="text-xs text-gray-500 border-b"><th class="p-2">סכום / טקסט</th><th class="p-2">מקור</th><th class="p-2">הערות</th><th class="p-2 w-8"></th></tr></thead>
                    <tbody id="batch-add-tbody">${this.getBatchRowHtml()}${this.getBatchRowHtml()}</tbody>
                </table>
                <button onclick="Donors.addBatchRow()" class="text-indigo-600 text-sm font-bold hover:underline">+ הוסף שורה</button>
            </div>
        `;
        Modal.renderRaw(`הוספת תרומות/הערות - ${name}`, html, () => {
            const rows = document.querySelectorAll('#batch-add-tbody tr');
            let count = 0; const now = Date.now();
            rows.forEach(tr => {
                const rawVal = tr.querySelector('.input-amount').value.trim();
                if (!rawVal) return;
                const amount = parseFloat(rawVal); const isText = isNaN(amount);
                const method = tr.querySelector('.input-method').value;
                const notes = tr.querySelector('.input-notes').value;
                const txId = 'tx' + Date.now() + Math.random().toString(36).substr(2,5);
                
                const txData = System.cleanObject({ 
                    id: txId, date: now, type: isText ? 'note' : 'income', 
                    amount: isText ? rawVal : amount, category: isText ? 'הערת מסלול' : method, 
                    desc: notes || (isText ? rawVal : ''), donorId: id, isPurim: true
                });
                
                OfflineManager.write(`years/${Store.currentYear}/finance/${txId}`, txData);
                if(OfflineManager.isOnline && !isText) db.ref(`years/${Store.currentYear}/stats/income`).transaction(curr => (curr || 0) + amount);
                count++;
            });
            if (count > 0) { Notify.show(`${count} רשומות נוספו בהצלחה`, 'success'); Modal.close(); } 
            else { alert('לא הוזנו נתונים'); }
        }, 'max-w-3xl w-full');
    },
    
    // 11 הוספת שורה לטבלה
    addBatchRow() { document.getElementById('batch-add-tbody').insertAdjacentHTML('beforeend', this.getBatchRowHtml()); },
    
    // 12 הערת מסלול מנהל
    addRouteNoteManager(day, gid) {
        const text = prompt("הכנס טקסט להערה במסלול (לדוגמה: 'הפסקה', 'מעבר לרחוב הבא'):");
        if(text) {
             const path = `years/${Store.currentYear}/groups/${day}/${gid}/route`;
             db.ref(path).once('value', s => {
                const list = s.val() || [];
                list.push(`NOTE:${text}`);
                OfflineManager.write(path, list);
                this.renderManager(); 
             });
        }
    },

    // 13 מודאל שיבוץ מהיר
    quickAssignModal(donorId, donorName) {
        const currentDay = this.viewTab;
        const groupsData = Store.data.yearData[Store.currentYear]?.groups || {};
        const dayGroups = groupsData[currentDay] || {};
        
        if(Object.keys(dayGroups).length === 0) return Notify.show('אין קבוצות ביום זה לשיבוץ', 'error');

        let html = `<div class="space-y-2"><p class="text-sm mb-3 text-gray-600">בחר לאיזו קבוצה להעביר את <b>${donorName}</b>:</p>`;
        Object.entries(dayGroups).forEach(([gid, g]) => {
            html += `<button onclick="Donors.assignToGroup('${donorId}', '${currentDay}', '${gid}')" class="w-full text-right p-3 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded font-bold text-indigo-900 transition"><i class="fas fa-plus-circle ml-2"></i> ${g.name}</button>`;
        });
        html += `</div>`;

        Modal.renderRaw(`שיבוץ תורם: ${donorName}`, html, () => {}, 'max-w-md');
        document.querySelector('#modal-form .btn-primary').parentElement.style.display = 'none';
    },

    // 14 אישור שיבוץ
    assignToGroup(donorId, day, gid) {
        const path = `years/${Store.currentYear}/groups/${day}/${gid}/route`;
        db.ref(path).once('value', s => {
            const list = s.val() || [];
            if(!list.includes(donorId)) {
                list.push(donorId);
                OfflineManager.write(path, list);
                Notify.show('שובץ בהצלחה (לסוף המסלול)', 'success');
                Modal.close();
                this.renderManager(); 
            }
        });
    },
    
    // 15 רינדור מסך מנהל מסלולים
    renderManager() {
        if(this.poolSortable) { try { this.poolSortable.destroy(); } catch(e){} this.poolSortable = null; }
        if(this.donorSortables && this.donorSortables.length > 0) {
            this.donorSortables.forEach(s => { try { s.destroy(); } catch(e){} });
        }
        this.donorSortables = [];

        const poolEl = document.getElementById('donor-pool-list');
        if(!poolEl) return;
        
        const currentDay = this.viewTab;
        poolEl.innerHTML = '';
        const currentDayGroups = [];
        const groupsData = Store.data.yearData[Store.currentYear]?.groups || {};
        if (groupsData[currentDay]) {
             Object.entries(groupsData[currentDay]).forEach(([gid, g]) => {
                currentDayGroups.push({id: gid, day: currentDay, ...g});
            });
        }
        
        const assignedDonors = new Set(Object.keys(Store.data.donorGroupMap || {}));
        const unassigned = Object.values(Store.data.donors).filter(d => d && !assignedDonors.has(d.id));
        
        const countEl = document.getElementById('pool-count');
        if(countEl) countEl.innerText = unassigned.length;
        
        unassigned.sort((a,b) => a.name.localeCompare(b.name)).forEach(d => {
            const el = document.createElement('div');
            el.className = "bg-white p-2 border rounded shadow-sm text-sm cursor-pointer hover:bg-indigo-50 hover:border-indigo-300 transition flex justify-between flex-col group";
            el.onclick = () => this.quickAssignModal(d.id, d.name);
            el.innerHTML = `
                <div class="font-medium flex justify-between items-center text-slate-800 group-hover:text-indigo-700">
                    <span>${d.name}</span> <i class="fas fa-arrow-left text-indigo-400 opacity-0 group-hover:opacity-100 transition"></i>
                </div>
                <div class="text-xs text-gray-500 mt-1"><i class="fas fa-map-marker-alt"></i> ${d.city || ''} ${d.street || d.address || ''}</div>
            `;
            poolEl.appendChild(el);
        });
        
        const container = document.getElementById('groups-kanban-container');
        if(!container) return;
        
        container.innerHTML = '';
        if (currentDayGroups.length === 0) container.innerHTML = `<div class="text-gray-400 text-sm">אין קבוצות מוגדרות ליום זה</div>`;

        currentDayGroups.forEach(g => {
            const col = document.createElement('div');
            col.className = "shrink-0 w-80 h-full bg-white rounded-lg shadow-sm border flex flex-col";
            col.innerHTML = `
                <div class="p-3 border-b bg-indigo-50 flex justify-between items-center shrink-0">
                    <span class="font-bold text-sm text-indigo-900">${g.name}</span>
                    <div class="flex gap-1">
                        <button onclick="Donors.addRouteNoteManager('${g.day}', '${g.id}')" class="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-200 transition" title="הוסף הערת מסלול"><i class="fas fa-sticky-note"></i></button>
                        <button onclick="Groups.expandGroupDetails('${g.day}', '${g.id}')" class="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-200 transition" title="הרחבה ועריכת סדר במספרים"><i class="fas fa-expand-arrows-alt"></i></button>
                    </div>
                </div>
                <div class="p-1 bg-gray-100 text-[10px] text-center text-gray-500 border-b">גרור כדי לשנות סדר. הסדר נשמר אוטומטית.</div>
                <div class="flex-1 overflow-y-auto p-2 space-y-2 bg-slate-50 kanban-group-list custom-scroll" data-gid="${g.id}"></div>
            `;
            const listEl = col.querySelector('.kanban-group-list');
            (g.route || []).forEach((did, i) => {
                if(did.startsWith('NOTE:')) {
                    const noteText = did.substring(5);
                    const item = document.createElement('div');
                    item.className = "bg-yellow-50 p-2 border border-yellow-200 rounded shadow-sm text-sm flex flex-col justify-between cursor-grab hover:border-yellow-300 transition group";
                    item.dataset.id = did;
                    item.innerHTML = `<div class="flex justify-between items-center font-bold text-yellow-800"><span class="truncate w-56"><i class="fas fa-sticky-note ml-1 text-yellow-600"></i> ${noteText}</span><button onclick="Groups.removeFromRoute('${g.day}','${g.id}','${did}')" class="text-red-400 hover:text-red-600 hidden group-hover:block"><i class="fas fa-times"></i></button></div>`;
                    listEl.appendChild(item);
                } else {
                    const d = Store.data.donors[did];
                    if(d) {
                        const item = document.createElement('div');
                        item.className = "bg-white p-2 border rounded shadow-sm text-sm flex flex-col justify-between cursor-grab hover:border-emerald-200 transition group";
                        item.dataset.id = did;
                        item.innerHTML = `<div class="flex justify-between items-start"><div class="flex items-center gap-2"><span class="bg-emerald-100 text-emerald-700 w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold">${i+1}</span><span class="truncate w-48 font-bold">${d.name}</span></div><button onclick="Groups.removeFromRoute('${g.day}','${g.id}','${did}')" class="text-red-400 hover:text-red-600 hidden group-hover:block"><i class="fas fa-times"></i></button></div><div class="text-xs text-gray-500 mt-1 truncate mr-7">${d.city||''} ${d.street||d.address||''}</div>`;
                        listEl.appendChild(item);
                    }
                }
            });
            container.appendChild(col);

            try {
                const sInst = new Sortable(listEl, {
                    animation: 150,
                    ghostClass: 'bg-emerald-50',
                    handle: '.cursor-grab',
                    onEnd: () => {
                         const newOrder = Array.from(listEl.children).map(c => c.dataset.id);
                         OfflineManager.write(`years/${Store.currentYear}/groups/${g.day}/${g.id}/route`, newOrder);
                    }
                });
                this.donorSortables.push(sInst);
            } catch(e) { console.warn("Sortable group failed:", e); }
        });
    },
    
    // 16 סינון בריכת מנהל
    filterPool(v) {
        const list = document.getElementById('donor-pool-list');
        if(!list) return;
        Array.from(list.children).forEach(el => { el.style.display = el.innerText.includes(v) ? 'flex' : 'none'; });
    },
    
    // 17 שדות הוספה
    getFormFields() {
        const activeKeys = (Store.data.config.fields || {}).donors || window.DEFAULT_ACTIVE_FIELDS.donors;
        const fields = [];
        activeKeys.forEach(k => {
            let def = window.PREDEFINED_FIELDS.donors.find(p => p.k === k);
            if (!def && Store.data.config.customFieldsDefs && Store.data.config.customFieldsDefs[k]) {
                def = { k: k, l: Store.data.config.customFieldsDefs[k].l, t: 'text' };
            }
            if(def) fields.push({id:k, l:def.l, t:def.t, opts:def.opts, r:def.r});
        });
        return fields;
    },
    
    // 18 הוספת תורם
    openAddModal() {
        let preselectDay = null, preselectGid = null;
        if (this.viewTab !== 'all' && this.viewTab !== 'unassigned') {
            preselectDay = this.viewTab;
            const groupSelect = document.getElementById('donor-group-select');
            if(groupSelect && groupSelect.value) preselectGid = groupSelect.value;
        } else if (Router.current === 'groups' && window.Groups && Groups.activeGroupId) {
            preselectDay = Groups.currentDay; preselectGid = Groups.activeGroupId;
        }

        const allGroups = [];
        const gData = Store.data.yearData[Store.currentYear]?.groups || {};
        Object.entries(gData).forEach(([d, dayG]) => Object.entries(dayG).forEach(([gid, g]) => allGroups.push({id: gid, day:d, name: g.name})));
        
        const groupSelectHtml = `
            <div class="mb-3 p-3 bg-emerald-50 rounded border border-emerald-100">
                <label class="block text-sm font-bold text-emerald-800 mb-1">שיוך לקבוצה (אופציונלי)</label>
                <select id="new-donor-group" class="w-full border p-2 rounded bg-white text-sm">
                    <option value="">-- ללא שיוך למסלול --</option>
                    ${allGroups.map(g => `<option value="${g.day}|${g.id}" ${(g.day === preselectDay && g.id === preselectGid) ? 'selected' : ''}>${g.name} (${g.day})</option>`).join('')}
                </select>
            </div>
        `;
        
        Modal.render('הוספת תורם חדש', this.getFormFields(), (data) => {
            if (!data.firstName || !data.lastName) return Notify.show('שגיאה: חובה שם פרטי ומשפחה', 'error');
            const id = db.ref('global/donors').push().key || ('don' + Date.now());
            if(data.firstName || data.lastName) data.name = `${data.firstName || ''} ${data.lastName || ''}`.trim();
            if(!data.name) data.name = 'ללא שם';
            
            const cleanData = System.cleanObject({ id, joinYear: Store.currentYear, ...data });
            OfflineManager.write(`global/donors/${id}`, cleanData);
            
            const groupVal = document.getElementById('new-donor-group').value;
            if(groupVal) {
                const [day, gid] = groupVal.split('|');
                const ref = db.ref(`years/${Store.currentYear}/groups/${day}/${gid}/route`);
                ref.once('value', s => {
                    const list = s.val() || [];
                    list.push(id);
                    OfflineManager.write(`years/${Store.currentYear}/groups/${day}/${gid}/route`, list);
                });
            }
            Notify.show('תורם נוסף בהצלחה', 'success');
            this.render(); 
        }, groupSelectHtml);
    },
    
    // 19 עריכת תורם
    openEdit(id) {
        const d = Store.data.donors[id];
        if (!d) return Notify.show('תורם לא נמצא', 'error');
        const fields = this.getFormFields().map(f => ({ ...f, v: d[f.id] }));
        Modal.render('עריכת תורם', fields, (data) => {
            if(data.firstName || data.lastName) data.name = `${data.firstName || ''} ${data.lastName || ''}`.trim();
            OfflineManager.write(`global/donors/${id}`, System.cleanObject(data), 'update');
            Notify.show('פרטי תורם עודכנו', 'success');
            this.render(); 
        });
    },
    
    // 20 מחיקת תורם
    delete(id) {
        if(confirm('אזהרה: למחוק תורם זה?')) {
            OfflineManager.write(`global/donors/${id}`, null, 'remove');
            delete Store.data.donors[id];
            this.render(); 
            Notify.show('התורם נמחק', 'info');
        }
    }
};
window.Donors = Donors;