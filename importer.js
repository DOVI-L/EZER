// 1 מנהל ייבוא
const Importer = {
    currentType: null,
    fileData: null,
    pendingImport: [],

    // 2 אתחול מערכת (1)
    init(type) {
        this.pendingImport = [];
        if (type === 'students') {
            const html = `
                <div class="space-y-4">
                    <button onclick="Importer.startImport('students_new')" class="w-full bg-blue-50 p-4 rounded-xl border border-blue-200 hover:bg-blue-100 flex items-center gap-4 text-right">
                        <div class="bg-blue-500 text-white w-10 h-10 rounded-full flex items-center justify-center shrink-0"><i class="fas fa-user-plus"></i></div>
                        <div><div class="font-bold text-blue-900">יבוא בחורים חדשים</div><div class="text-xs text-blue-700">הוספת בחורים למאגר המערכת מקובץ אקסל</div></div>
                    </button>
                    <button onclick="Importer.startImport('students_donations')" class="w-full bg-emerald-50 p-4 rounded-xl border border-emerald-200 hover:bg-emerald-100 flex items-center gap-4 text-right">
                        <div class="bg-emerald-500 text-white w-10 h-10 rounded-full flex items-center justify-center shrink-0"><i class="fas fa-hand-holding-usd"></i></div>
                        <div><div class="font-bold text-emerald-900">יבוא תרומות לבחורים</div><div class="text-xs text-emerald-700">קליטת תרומות/הערות לפי מספר מזהה/שם ותאריך</div></div>
                    </button>
                </div>
            `;
            Modal.renderRaw('בחר סוג יבוא', html, () => {});
            document.querySelector('#modal-form .btn-primary').parentElement.style.display = 'none';
        } else {
            this.startImport(type);
        }
    },
    
    // 3 בחירת קובץ (1)
    startImport(type) {
        this.currentType = type; 
        Modal.close();
        setTimeout(() => {
            const input = document.getElementById('excel-upload-input');
            input.value = '';
            input.click();
        }, 300);
    },
    
    // 4 קריאת קובץ (1)
    handleFileSelect(input) {
        const file = input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            this.fileData = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });
            if (this.fileData.length === 0) { Notify.show('הקובץ ריק', 'error'); return; }
            this.openMappingModal();
        };
        reader.readAsArrayBuffer(file);
    },
    
    // 5 מיפוי שדות (1)
    openMappingModal() {
        const excelHeaders = Object.keys(this.fileData[0]);
        let systemFields = [];
        let isDonationImport = false;

        if (this.currentType === 'students_new') systemFields = PREDEFINED_FIELDS.students;
        else if (this.currentType === 'donors') { systemFields = PREDEFINED_FIELDS.donors; isDonationImport = true; }
        else if (this.currentType === 'students_donations') {
            systemFields = [
                {k:'studentNum', l:'מספר מזהה (ת.ז / פנימי)', t:'text', r:true},
                {k:'fullName', l:'שם מלא (אם אין מזהה)', t:'text'}, 
                {k:'firstName', l:'שם פרטי', t:'text'}, 
                {k:'lastName', l:'שם משפחה', t:'text'}
            ];
            isDonationImport = true;
        }
        
        const customDefs = Store.data.config.customFieldsDefs || {};
        const allFields = [...systemFields];
        if (this.currentType !== 'students_donations') {
            Object.entries(customDefs).forEach(([k, def]) => {
                 if(!allFields.find(f => f.k === k)) allFields.push({k:k, l:def.l});
            });
        }

        let html = `<div dir="rtl" class="text-right">`;

        if (this.currentType === 'donors') {
            let preselectGroupVal = '';
            if (window.Donors && Donors.viewTab !== 'all' && Donors.viewTab !== 'unassigned') {
                const groupSelect = document.getElementById('donor-group-select');
                if(groupSelect && groupSelect.value) preselectGroupVal = `${Donors.viewTab}|${groupSelect.value}`;
            }

            const allGroups = [];
            const gData = Store.data.yearData[Store.currentYear]?.groups || {};
            Object.entries(gData).forEach(([d, dayG]) => Object.entries(dayG).forEach(([gid, g]) => allGroups.push({id: gid, day:d, name: g.name})));
            
            html += `<div class="bg-emerald-50 text-emerald-900 p-3 rounded mb-4 text-sm font-bold border border-emerald-200">
                <label class="block mb-1"><i class="fas fa-users"></i> שיוך תורמים לקבוצה (ייכנסו לסוף המסלול):</label>
                <select id="import-donor-group" class="w-full p-2 border border-emerald-300 rounded bg-white font-normal">
                    <option value="">-- ללא שיוך (ייכנסו ל'לא משובצים') --</option>
                    ${allGroups.map(g => `<option value="${g.day}|${g.id}" ${preselectGroupVal === `${g.day}|${g.id}` ? 'selected' : ''}>${g.name} (${g.day})</option>`).join('')}
                </select>
            </div>`;
        }

        html += `<div class="bg-blue-50 p-4 rounded mb-4 text-sm text-blue-800">נמצאו ${this.fileData.length} רשומות. אנא התאם את עמודות האקסל לשדות המערכת:</div>`;
        html += `<div class="grid grid-cols-2 gap-4 font-bold border-b pb-2 mb-2"><div>שדה במערכת</div><div>עמודה באקסל</div></div>`;
        
        allFields.forEach(field => {
            let options = `<option value="">-- אל תייבא --</option>`;
            excelHeaders.forEach(header => {
                const isMatch = header.includes(field.l) || field.l.includes(header);
                options += `<option value="${header}" ${isMatch ? 'selected' : ''}>${header}</option>`;
            });
            html += `<div class="grid grid-cols-2 gap-4 items-center mb-2"><div class="text-sm font-bold">${field.l} ${field.r ? '*' : ''}</div><select id="map-${field.k}" class="border rounded p-1 w-full text-sm bg-white shadow-sm">${options}</select></div>`;
        });

        if (isDonationImport) {
            html += `<div class="mt-4 pt-4 border-t border-dashed border-gray-400"><h4 class="font-bold mb-2 text-indigo-700"><i class="fas fa-history ml-1"></i> יבוא תרומות / היסטוריה (דינמי)</h4><p class="text-xs text-gray-600 mb-4 bg-gray-50 p-2 rounded border">בחר "עמודת תאריך" ו"עמודת סכום", המערכת תזהה את התאריך והשעה, תמיר לשנה העברית ותשייך לתיקייה הנכונה.</p>`;
            
            let dateOptions = `<option value="">-- ללא זיהוי דינמי --</option>`;
            excelHeaders.forEach(header => {
                const isMatch = header.includes('תאריך') || header.includes('date');
                dateOptions += `<option value="${header}" ${isMatch ? 'selected' : ''}>${header}</option>`;
            });
            html += `<div class="grid grid-cols-2 gap-4 items-center mb-2"><div class="text-sm font-bold text-indigo-800">עמודת תאריך (לועזי/מלא)</div><select id="map-finance-date" class="border border-indigo-300 rounded p-1 w-full text-sm bg-indigo-50">${dateOptions}</select></div>`;
            
            let amountOptions = `<option value="">-- בחר עמודת סכום --</option>`;
            excelHeaders.forEach(header => { amountOptions += `<option value="${header}">${header}</option>`; });
            html += `<div class="grid grid-cols-2 gap-4 items-center mb-4 pb-4 border-b border-gray-200"><div class="text-sm font-bold text-indigo-800">עמודת סכום (אם נבחר תאריך)</div><select id="map-finance-amount-general" class="border border-indigo-300 rounded p-1 w-full text-sm bg-indigo-50">${amountOptions}</select></div>`;

            html += `<p class="text-xs text-gray-500 mb-2"><b>או</b> שייך עמודות באופן ידני לפי שנה עברית ספציפית:</p><div class="space-y-1">`;
            
            const years = Object.keys(HEBREW_YEARS_MAPPING);
            if(!years.includes(Store.currentYear)) years.push(Store.currentYear);
            
            years.forEach(hYear => {
                const numYear = HEBREW_YEARS_MAPPING[hYear] || hYear; 
                let options = `<option value="">-- ללא יבוא --</option>`;
                excelHeaders.forEach(header => {
                    const isMatch = header.includes(hYear) || header.includes(String(numYear)); 
                    options += `<option value="${header}" ${isMatch ? 'selected' : ''}>${header}</option>`;
                });
                html += `<div class="grid grid-cols-2 gap-4 items-center bg-gray-50 p-1 rounded"><div class="text-xs font-bold text-gray-700">תרומות ${hYear}</div><select id="map-finance-${numYear}" class="border rounded p-1 w-full text-xs bg-white history-selector" data-hyear="${hYear}">${options}</select></div>`;
            });
            html += `</div></div>`;
        }
        html += `</div>`; 

        const customBtn = `<button onclick="Importer.executeImport()" class="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold mt-4 shadow-lg hover:bg-indigo-700">המשך לעיבוד ותצוגה מקדימה</button>`;
        Modal.renderRaw(`יבוא נתונים מאקסל - הגדרת שדות`, html + customBtn, () => {}, 'max-w-2xl');
        document.querySelector('#modal-form .btn-primary').parentElement.style.display = 'none';
    },
    
    // 6 עיבוד נתונים (1)
    executeImport() {
        const mapping = {};
        const historyMapping = {};
        let fieldsToCheck = [];
        
        if (this.currentType === 'students_new') fieldsToCheck = PREDEFINED_FIELDS.students;
        else if (this.currentType === 'donors') fieldsToCheck = PREDEFINED_FIELDS.donors;
        else fieldsToCheck = [{k:'studentNum'},{k:'firstName'},{k:'lastName'},{k:'fullName'}];

        if (this.currentType !== 'students_donations') {
             const customDefs = Store.data.config.customFieldsDefs || {};
             Object.keys(customDefs).forEach(k => fieldsToCheck.push({k}));
        }

        fieldsToCheck.forEach(f => {
            const el = document.getElementById(`map-${f.k}`);
            if(el && el.value) mapping[f.k] = el.value;
        });

        // איסוף מדוייק של שנות היסטוריה מהשדות הידניים
        const years = Object.keys(HEBREW_YEARS_MAPPING);
        if(!years.includes(Store.currentYear)) years.push(Store.currentYear);
        years.forEach(hYear => {
            const numYear = HEBREW_YEARS_MAPPING[hYear] || hYear;
            const selectEl = document.getElementById(`map-finance-${numYear}`);
            if (selectEl && selectEl.value) {
                historyMapping[hYear] = selectEl.value; 
            }
        });

        const dateCol = document.getElementById('map-finance-date')?.value;
        const genAmountCol = document.getElementById('map-finance-amount-general')?.value;

        if (this.currentType === 'students_donations' && !mapping.studentNum && !mapping.fullName && (!mapping.firstName || !mapping.lastName)) {
            Notify.show('חובה למפות "מספר מזהה" או "שם" לזיהוי הבחור', 'error');
            return;
        }

        const selectedGroup = document.getElementById('import-donor-group') ? document.getElementById('import-donor-group').value : null;
        
        Notify.show('מעבד נתונים ומכין תצוגה מקדימה...', 'info');
        const dbPath = (this.currentType === 'donors') ? 'global/donors' : 'global/students';
        
        db.ref(dbPath).once('value', snapshot => {
            const existingData = snapshot.val() || {};
            const nameMap = {};
            const numMap = {};

            Object.values(existingData).forEach(item => {
                if (item.studentNum) numMap[item.studentNum.toString().trim()] = item.id;
                if (item.idNum) numMap[item.idNum.toString().trim()] = item.id;
                
                if (item.name) {
                    nameMap[item.name.trim()] = item.id;
                    const reversedName = item.name.split(' ').reverse().join(' ');
                    nameMap[reversedName] = item.id;
                }
            });

            this.pendingImport = [];

            this.fileData.forEach((row, idx) => {
                const tempObj = {};
                Object.keys(mapping).forEach(sysKey => { tempObj[sysKey] = row[mapping[sysKey]]; });
                
                let fullName = tempObj.fullName;
                if (!fullName && (tempObj.firstName || tempObj.lastName)) {
                    fullName = `${tempObj.firstName || ''} ${tempObj.lastName || ''}`.trim();
                }
                
                let entityId = null;
                let isNewEntity = false;
                const possibleNum = tempObj.studentNum ? tempObj.studentNum.toString().trim() : null;

                // בדיקה נוקשה ראשונה לפי מספר מזהה
                if (possibleNum && numMap[possibleNum]) {
                    entityId = numMap[possibleNum];
                } 
                // בדיקה משנית לפי שם
                else if (!entityId && fullName && nameMap[fullName]) {
                    entityId = nameMap[fullName];
                }

                if (this.currentType !== 'students_donations') {
                    if (!entityId) {
                        entityId = db.ref(dbPath).push().key;
                        isNewEntity = true;
                        if(fullName) nameMap[fullName] = entityId; 
                        if(possibleNum) numMap[possibleNum] = entityId;
                    }
                }

                // ביבוא הכנסות אם לא זוהה הבחור - מדלגים ורושמים שגיאה לתצוגה
                if (!entityId && this.currentType === 'students_donations') {
                     this.pendingImport.push({
                         originalIdx: idx, entityId: null, isNewEntity: false,
                         fullName: fullName || possibleNum || 'נתון לא מזוהה',
                         finances: [], errors: ['לא נמצא בחור התואם למספר המזהה או לשם']
                     });
                     return;
                }

                const processedRow = {
                    originalIdx: idx, entityId, isNewEntity,
                    fullName: fullName || 'מזוהה לפי מספר: ' + possibleNum,
                    entityData: tempObj, groupTarget: selectedGroup, finances: [], errors: []
                };

                // עיבוד דינמי לפי עמודת תאריך
                if (dateCol && genAmountCol && row[dateCol] && row[genAmountCol]) {
                    const hYear = System.getHebrewYearFromDate(row[dateCol]);
                    if (hYear) {
                        const val = row[genAmountCol];
                        const isText = isNaN(parseFloat(val));
                        processedRow.finances.push({ targetYear: hYear, val: val, isText: isText, dateStr: row[dateCol] });
                    } else {
                        processedRow.errors.push(`תאריך לא תקין או חסר: ${row[dateCol]}`);
                    }
                }

                // עיבוד היסטוריה ידנית מרובה
                Object.entries(historyMapping).forEach(([hYear, colName]) => {
                    let val = row[colName];
                    if (val !== undefined && val !== null && val !== '') {
                        const isText = isNaN(parseFloat(val));
                        processedRow.finances.push({ targetYear: hYear, val: val, isText: isText });
                    }
                });

                if (processedRow.isNewEntity || processedRow.finances.length > 0 || processedRow.errors.length > 0) {
                    this.pendingImport.push(processedRow);
                }
            });

            this.showPreviewModal();
        });
    },
    
    // 7 תצוגה מקדימה (6)
    showPreviewModal() {
        const allYearsSet = new Set();
        this.pendingImport.forEach(r => r.finances.forEach(f => allYearsSet.add(f.targetYear)));
        const yearsArr = Array.from(allYearsSet).sort(); 
        
        let headersHtml = yearsArr.map(y => `<th class="p-2 border text-center whitespace-nowrap min-w-[100px] text-indigo-700">${y}</th>`).join('');

        let html = `<div class="bg-blue-50 p-4 rounded mb-4 text-sm text-blue-800 font-bold border border-blue-200">תצוגה מקדימה ואישור סופי לפני שמירת נתונים:</div>`;
        
        html += `<div class="max-h-[50vh] overflow-auto custom-scroll border rounded shadow-sm" dir="rtl"><table class="w-full text-right text-sm border-collapse">`;
        html += `<thead class="bg-gray-100 sticky top-0 z-10 shadow-sm"><tr>
                    <th class="p-2 border whitespace-nowrap bg-gray-100">שם / מזהה</th>
                    <th class="p-2 border whitespace-nowrap bg-gray-100 text-center">סטטוס</th>
                    ${headersHtml}
                    <th class="p-2 border text-center bg-gray-100">הערות/שגיאה</th>
                    <th class="p-2 border text-center bg-gray-100 sticky left-0 z-20">פעולה</th>
                </tr></thead><tbody>`;
        
        this.pendingImport.forEach((row, i) => {
            const errClass = row.errors.length > 0 ? 'bg-red-50' : 'hover:bg-gray-50';
            const status = row.errors.length > 0 ? '<span class="text-red-600 font-bold">תקלה</span>' : (row.isNewEntity ? '<span class="text-green-600 font-bold">הוספה</span>' : '<span class="text-blue-600 font-bold">עדכון/זיהוי</span>');
            const errStr = row.errors.length > 0 ? `<div class="text-xs text-red-600 font-bold">${row.errors.join('<br>')}</div>` : '<span class="text-green-500"><i class="fas fa-check"></i></span>';
            
            let yearsTds = yearsArr.map(y => {
                const fin = row.finances.find(f => f.targetYear === y);
                if (!fin) return `<td class="p-2 border text-center text-gray-300">-</td>`;
                const display = fin.isText ? `<span class="text-yellow-700 italic text-xs">${fin.val}</span>` : `<span class="text-emerald-600 font-bold" dir="ltr">₪${fin.val}</span>`;
                return `<td class="p-2 border text-center bg-green-50/30">${display}</td>`;
            }).join('');
            
            html += `<tr class="border-b ${errClass} transition" id="prev-row-${i}">
                <td class="p-2 border font-bold whitespace-nowrap">${row.fullName}</td>
                <td class="p-2 border text-center">${status}</td>
                ${yearsTds}
                <td class="p-2 border">${errStr}</td>
                <td class="p-2 border text-center sticky left-0 bg-white shadow-[-4px_0_10px_-5px_rgba(0,0,0,0.1)]">
                    <button onclick="document.getElementById('prev-row-${i}').style.opacity='0.3'; Importer.pendingImport[${i}].skip=true;" class="text-red-500 hover:text-red-700 text-xs font-bold px-3 py-1.5 bg-red-50 border border-red-200 rounded transition">דלג</button>
                </td>
            </tr>`;
        });
        
        html += `</tbody></table></div>`;
        const customBtn = `<button onclick="Importer.commitImport()" class="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold mt-6 shadow-lg hover:bg-emerald-700 text-lg transition transform hover:scale-[1.01]">אשר ושמור נתונים למערכת</button>`;
        
        Modal.renderRaw(`אישור נתוני ייבוא (${this.pendingImport.length} רשומות)`, html + customBtn, () => {}, 'max-w-7xl w-full');
        document.querySelector('#modal-form .btn-primary').parentElement.style.display = 'none';
    },
    
    // 8 שמירה סופית (7)
    commitImport() {
        Modal.close();
        Notify.show('שומר נתונים למערכת...', 'info');
        
        const dbPath = (this.currentType === 'donors') ? 'global/donors' : 'global/students';
        let countNew = 0, countFinance = 0;
        const updates = {}, financeUpdates = {};
        const newDonorIdsForGroup = [];
        let groupTargetStr = null;

        this.pendingImport.forEach(row => {
            if (row.skip || row.errors.length > 0) return;

            if (row.isNewEntity) {
                const newObj = { id: row.entityId, ...row.entityData, name: row.fullName };
                if (this.currentType === 'students_new') newObj.lastUpdatedYear = Store.currentYear;
                else newObj.joinYear = Store.currentYear; 
                
                updates[`${dbPath}/${row.entityId}`] = newObj;
                countNew++;
                
                if (this.currentType === 'donors' && row.groupTarget) {
                    newDonorIdsForGroup.push(row.entityId);
                    groupTargetStr = row.groupTarget;
                }
            }

            row.finances.forEach(fin => {
                const txId = 'imp' + Date.now() + Math.random().toString(36).substr(2, 5);
                const dObj = fin.dateStr ? System.parseExcelDate(fin.dateStr) : new Date();
                
                const tx = {
                    id: txId,
                    date: dObj.getTime(),
                    type: fin.isText ? 'note' : 'income',
                    category: 'יבוא אקסל',
                    desc: fin.isText ? fin.val : 'יבוא סכום',
                    amount: fin.isText ? fin.val : parseFloat(fin.val),
                    isPurim: true,
                    importedYear: fin.targetYear
                };
                
                if (this.currentType === 'donors') tx.donorId = row.entityId;
                else tx.studentId = row.entityId;
                
                financeUpdates[`years/${fin.targetYear}/finance/${txId}`] = tx;
                countFinance++;
            });
        });

        const promises = [];
        if (Object.keys(updates).length > 0) promises.push(db.ref().update(updates));
        if (Object.keys(financeUpdates).length > 0) promises.push(db.ref().update(financeUpdates));
        
        if (newDonorIdsForGroup.length > 0 && groupTargetStr) {
            const [day, gid] = groupTargetStr.split('|');
            const groupRef = db.ref(`years/${Store.currentYear}/groups/${day}/${gid}/route`);
            const groupPromise = groupRef.once('value').then(gs => {
                const currentRoute = gs.val() || [];
                const newRoute = [...currentRoute, ...newDonorIdsForGroup];
                return groupRef.set(newRoute);
            });
            promises.push(groupPromise);
        }

        Promise.all(promises).then(() => {
            let msg = 'הפעולה הסתיימה. ';
            if (countNew > 0) msg += `נוספו ${countNew} רשומות חדשות. `;
            if (countFinance > 0) msg += `נקלטו ${countFinance} נתונים לשנים.`;
            if (newDonorIdsForGroup.length > 0) msg += ` ${newDonorIdsForGroup.length} משובצים.`;
            if (countNew === 0 && countFinance === 0) msg = 'לא בוצעו שינויים.';
            
            Notify.show(msg, countFinance > 0 || countNew > 0 ? 'success' : 'info');
            if (this.currentType.includes('students')) Students.loadMore(true); else Donors.loadMore(true);
            if (countFinance > 0 && window.Finance) Finance.loadMore(true);
        }).catch(err => {
            console.error(err);
            Notify.show('שגיאה בשמירת הנתונים', 'error');
        });
    }
};
window.Importer = Importer;