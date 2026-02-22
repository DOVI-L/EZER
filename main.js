document.addEventListener('DOMContentLoaded', () => {
    console.log('System Loaded: Waiting for Auth...');
    
    // טיפול בטעינת תמונות שנכשלה
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
    
    // סעיף 2: טיפול ברענון מודול
    System.refreshModule = function() {
        const current = Router.current;
        if (current === 'students' || current === 'donors') {
            Notify.show('מרענן ' + (current==='students'?'בחורים':'תורמים') + '...', 'info');
            
            // איפוס הנתונים בזיכרון
            Store.data[current] = {};
            Store.cursors[current] = null;
            Store.loadedAll[current] = false;
            
            // איפוס הנתונים באחסון המקומי
            localStorage.removeItem('cache_' + current);
            
            // טעינה מחדש של ה-Batch הראשון
            if (current === 'students') Students.loadMore(true);
            else Donors.loadMore(true);
        } else {
            location.reload();
        }
    };
    
    // סעיף 3: פונקציית חזור חכמה
    System.goBack = function() {
        // מצב תורמים - חזור לטאב רשימה
        if (Router.current === 'donors' && Donors.viewMode === 'manager') {
             Donors.toggleQuickManager(); // חוזר לרשימה
             return;
        }
        
        // מצב קבוצות - חזור לרשימת הקבוצות (אם יש קבוצה פעילה)
        if (Router.current === 'groups' && Groups.activeGroupId) {
            Groups.activeGroupId = null;
            Groups.render();
            return;
        }

        // אם אנחנו במודל מימוש תלושים בתוך finance
        const financeVouchers = document.getElementById('finance-vouchers-view');
        if (Router.current === 'finance' && financeVouchers && !financeVouchers.classList.contains('hidden')) {
            Finance.closeVouchersView();
            return;
        }
        
        // אם לא נתפס באף חוק מיוחד - חזור אחורה בהיסטוריה
        history.back();
    };
    
    // עדכון כפתור החזור ב-HTML
    const backBtn = document.querySelector('button[title="חזור"]');
    if(backBtn) {
        backBtn.onclick = System.goBack;
    }
});