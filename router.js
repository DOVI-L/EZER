// 1 מערכת ניווט
const Router = {
    current: null,
    
    // 2 מעבר בין מסכים
    go(view) {
        if (view === 'finance' && Store.role === 'user') return Notify.show('אין לך הרשאה לצפות בנתונים כספיים', 'error'); // Notify(utils.js)
        if (view === 'settings' && Store.role === 'user') return Notify.show('אין לך הרשאה להגדרות', 'error'); // Notify(utils.js)
        
        this.current = view;
        localStorage.setItem('currentView', view);
        
        document.querySelectorAll('.view-section').forEach(el => { 
            el.classList.add('hidden'); 
            el.classList.remove('fade-in'); 
        });
        
        const el = document.getElementById('view-' + view);
        el.classList.remove('hidden');
        
        // סעיף 7: זירוז האנימציה כדי שלא תרגיש איתית
        setTimeout(() => el.classList.add('fade-in'), 5); 
        
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        const navBtn = document.getElementById('nav-' + view);
        if(navBtn) navBtn.classList.add('active');
        
        const titles = {
            dashboard:'לוח מחוונים', students:'ניהול בחורים', 
            donors:'ניהול תורמים', groups:'קבוצות ומסלולים', 
            finance:'ניהול קופה', reports:'דוחות', settings:'הגדרות'
        };
        document.getElementById('page-title').innerText = titles[view] || view;

        // 3 קריאה מיידית לרינדור של המודול
        if(view === 'students') Students.render();
        if(view === 'donors') Donors.render();
        if(view === 'finance') Finance.loadMore(true);
        if(view === 'dashboard') Dashboard.render();
        if(view === 'settings') Settings.init();
    }
};
window.Router = Router;