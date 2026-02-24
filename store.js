// 1 ניהול מצב המערכת
const Store = {
    currentYear: getHebrewYear(), // getHebrewYear(utils.js)
    user: null,
    role: 'user',
    data: {
        students: {}, 
        donors: {},   
        yearData: {}, 
        config: { fields: {}, goals: [], studentTiers: [], customFieldsDefs: {}, groupDiscounts: {}, bonusTiers: [], vouchers: [] },
        donorGroupMap: {},
        stats: { income: 0, expense: 0 } 
    },
    cursors: { students: null, donors: null, finance: null },
    loadedAll: { students: false, donors: false },

    // 2 אתחול ראשי (2)
    init() {
        this.cleanOldCaches(); // סעיף 2: ניקוי זיכרון מיותר
        
        const cachedStudents = OfflineManager.loadState('students');
        const cachedDonors = OfflineManager.loadState('donors');
        
        if(cachedStudents) this.data.students = cachedStudents;
        if(cachedDonors) this.data.donors = cachedDonors;
        
        this.loadConfig();
        this.loadStats();
        
        if (!cachedStudents || Object.keys(cachedStudents).length === 0) {
            Students.loadMore(true); 
        } else {
            Students.syncNewest();
        }

        if (!cachedDonors || Object.keys(cachedDonors).length === 0) {
            Donors.loadMore(true);
        } else {
            Donors.syncNewest();
        }

        this.loadGroups();
    },

    // 3 ניקוי מטמון מיותר (2)
    cleanOldCaches() {
        // סעיף 2: שומר רק נתונים בסיסיים, אם יש זיכרון ישן מאוד - הוא נמחק.
        // נתונים של שנים קודמות נמשכים רק לפי דרישה בדוחות ולא נשמרים במטמון.
        try {
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('cache_year_') && key !== `cache_year_${this.currentYear}`) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(k => localStorage.removeItem(k));
        } catch(e) { console.warn("Clean cache failed:", e); }
    },

    // 4 טעינת סטטיסטיקות קופה
    loadStats() {
        if (Store.role === 'user') return; 
        const ref = db.ref(`years/${this.currentYear}/stats`);
        ListenerManager.add(ref, 'value', s => { // ListenerManager(utils.js)
            this.data.stats = s.val() || { income: 0, expense: 0 };
            if(Router.current === 'dashboard') Dashboard.render();
        });
    },
    
    // 5 טעינת קבוצות לשנה הנוכחית (9)
    loadGroups() {
        const refGroups = db.ref(`years/${this.currentYear}/groups`);
        ListenerManager.add(refGroups, 'value', snap => {
            if(!this.data.yearData[this.currentYear]) this.data.yearData[this.currentYear] = {};
            const groupsData = snap.val() || {};
            this.data.yearData[this.currentYear].groups = groupsData;
            
            this.data.donorGroupMap = {};
            Object.values(groupsData).forEach(dayGroups => {
                Object.values(dayGroups).forEach(g => {
                    if(g.route) g.route.forEach(did => {
                        if (!did.startsWith('NOTE:')) {
                            this.data.donorGroupMap[did] = g.name;
                        }
                    });
                });
            });
            
            UI.updateIfVisible('groups'); // UI(utils.js) סעיף 7
            if(Router.current === 'donors') Donors.render(); 
        });

        const refStudents = db.ref(`years/${this.currentYear}/studentData`);
        ListenerManager.add(refStudents, 'value', snap => {
            if(!this.data.yearData[this.currentYear]) this.data.yearData[this.currentYear] = {};
            this.data.yearData[this.currentYear].students = snap.val() || {};
            if(Router.current === 'students') Students.render(); // סעיף 7
        });
    },

    // 6 טעינת הגדרות מערכת
    loadConfig() {
        const ref = db.ref('settings');
        ListenerManager.add(ref, 'value', s => {
            this.data.config = s.val() || {};
            if(!this.data.config.fields) this.data.config.fields = {};
            if(Router.current === 'settings') {
                 Settings.renderFieldsEditor();
                 Settings.renderVouchers();
            }
            System.toggleAI(this.data.config.enableAI); // System(utils.js)
        });
    },

    // 7 טעינה מלאה להדפסות (9)
    async ensureAllLoaded(types = ['students', 'donors']) {
        if (!Array.isArray(types)) types = [types];
        
        for (const type of types) {
            if (this.loadedAll[type]) continue;

            Notify.show(`טוען את כל ה-${type === 'students' ? 'בחורים' : 'תורמים'} להדפסה...`, 'info');
            
            while (!this.loadedAll[type]) {
                if (type === 'students') await Students.loadMore();
                else if (type === 'donors') await Donors.loadMore();
            }
        }
        Notify.show('הנתונים נטענו בהצלחה', 'success');
    }
};

window.Store = Store;