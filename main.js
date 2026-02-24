// 1 אתחול מערכת ובקרות כלליות
document.addEventListener('DOMContentLoaded', () => {
    console.log('System Loaded: Waiting for Auth...');
    
    // 2 טיפול בטעינת תמונות שנכשלה
    window.addEventListener('error', function(e) {
        if(e.target.tagName === 'IMG') {
            e.target.style.display = 'none';
            if(e.target.classList.contains('logo-img-login') || e.target.classList.contains('logo-img-sidebar')) {
                const parent = e.target.parentElement;
                if(parent && !parent.querySelector('.fallback-text')) {
                    const text = document.createElement('h2');
                    text.className = 'fallback-text font-bold text-xl text-indigo-700';
                    text.innerText = 'עזר חתנים';
                    parent.appendChild(text);
                }
            }
        }
    }, true);
    
    // 3 טיפול ברענון מודול חכם
    System.refreshModule = function() {
        const current = Router.current;
        if (current === 'students' || current === 'donors') {
            Notify.show('מרענן ' + (current==='students'?'בחורים':'תורמים') + '...', 'info'); // Notify(utils.js)
            
            // איפוס הנתונים בזיכרון (סעיף 9)
            Store.data[current] = {};
            Store.cursors[current] = null;
            Store.loadedAll[current] = false;
            
            // איפוס הנתונים באחסון המקומי של המודול
            localStorage.removeItem('cache_' + current);
            
            if (current === 'students') Students.loadMore(true);
            else Donors.loadMore(true);
        } else {
            location.reload();
        }
    };
    
    // 4 פונקציית חזור חכמה
    System.goBack = function() {
        if (Router.current === 'donors' && Donors.viewMode === 'manager') {
             Donors.toggleQuickManager(); 
             return;
        }
        
        if (Router.current === 'groups' && Groups.activeGroupId) {
            Groups.activeGroupId = null;
            Groups.render(); // סעיף 7
            return;
        }

        const financeVouchers = document.getElementById('finance-vouchers-view');
        if (Router.current === 'finance' && financeVouchers && !financeVouchers.classList.contains('hidden')) {
            Finance.closeVouchersView();
            return;
        }
        
        const financeStore = document.getElementById('finance-store-debts-view');
        if (Router.current === 'finance' && financeStore && !financeStore.classList.contains('hidden')) {
            Finance.closeStoreDebtsView();
            return;
        }

        history.back();
    };
    
    // 5 חיבור כפתור החזור ב-HTML
    const backBtn = document.querySelector('button[title="חזור"]');
    if(backBtn) backBtn.onclick = System.goBack;

    // 6 חיבור לחיצות "אנטר" בשורות חיפוש (סעיף 16)
    setTimeout(() => {
        System.handleSearchEnter('student-search');
        System.handleSearchEnter('donor-search-input');
        System.handleSearchEnter('rep-entity-search');
    }, 1000);
});