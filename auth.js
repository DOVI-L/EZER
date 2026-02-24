// 1 ניהול התחברות ואבטחה
const Auth = {
    // 2 התחברות ממשתמש
    login(e) {
        e.preventDefault();
        const em = document.getElementById('email').value;
        const pw = document.getElementById('password').value;

        auth.signInWithEmailAndPassword(em, pw).catch(err => {
            const msg = document.getElementById('login-msg');
            msg.innerText = "שגיאה: פרטים שגויים";
            msg.classList.remove('hidden');
        });
    },
    
    // 3 התנתקות (2)
    logout() { 
        ListenerManager.clearAll(); // ניקוי מאזינים למניעת דליפת זיכרון
        localStorage.removeItem('currentView');
        auth.signOut(); 
        location.reload(); 
    },
    
    // 4 מעקב אחרי שינוי מצב אבטחה
    onStateChange(u) {
        document.getElementById('loader').classList.add('hidden-screen');
        if(u) {
            Store.user = u;
            document.getElementById('user-email-display').innerText = u.email;
            document.getElementById('login-screen').classList.add('hidden-screen');
            document.getElementById('sidebar').classList.remove('hidden-screen');
            document.getElementById('main-content').classList.remove('hidden-screen');
            
            db.ref(`users/${u.uid}`).once('value', s => {
                const val = s.val() || {};
                Store.role = val.role || 'user';
                document.body.className = `role-${Store.role}`; // ניהול הרשאות ב-CSS
                
                Store.init(); // טעינת המערכת
                System.initUI(); // טעינת תפריטים
                
                const savedView = localStorage.getItem('currentView');
                Router.go(savedView || 'dashboard');
                InactivityTimer.init();
            });
        } else {
            document.getElementById('login-screen').classList.remove('hidden-screen');
            document.getElementById('sidebar').classList.add('hidden-screen');
            document.getElementById('main-content').classList.add('hidden-screen');
            clearTimeout(InactivityTimer.timer);
        }
    }
};

// 5 מנהל חוסר פעילות
const InactivityTimer = {
    timer: null,
    warningTimer: null,
    LIMIT: 30 * 60 * 1000, // 30 דקות ניתוק
    WARNING: 60,
    
    // 6 אתחול טיימר
    init() {
        ['mousemove', 'keydown', 'click', 'scroll'].forEach(ev => document.addEventListener(ev, () => this.reset()));
        this.reset();
    },
    
    // 7 איפוס טיימר
    reset() {
        if(!Store.user) return;
        clearTimeout(this.timer);
        clearInterval(this.warningTimer);
        document.getElementById('timeout-modal').classList.add('hidden-screen');
        this.timer = setTimeout(() => this.showWarning(), this.LIMIT);
    },
    
    // 8 התראת ניתוק קרובה
    showWarning() {
        const modal = document.getElementById('timeout-modal');
        const countEl = document.getElementById('timeout-countdown');
        modal.classList.remove('hidden-screen');
        
        let left = this.WARNING;
        countEl.innerText = left;
        
        this.warningTimer = setInterval(() => {
            left--;
            countEl.innerText = left;
            if(left <= 0) {
                clearInterval(this.warningTimer);
                Auth.logout();
            }
        }, 1000);
    },
    
    stayLoggedIn() { this.reset(); }
};

window.Auth = Auth;
window.InactivityTimer = InactivityTimer;
auth.onAuthStateChanged(Auth.onStateChange);