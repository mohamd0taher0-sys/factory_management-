// ⬇⬇⬇ ابدأ النسخ من هنا ⬇⬇⬇
// auth-system.js - نظام المصادقة المتكامل

class AuthSystem {
    constructor() {
        this.API_URL = '/api/auth';
        this.init();
    }
    
    init() {
        // التحقق من الجلسة عند تحميل النظام
        this.checkSession();
        
        // إعداد انتهاء الجلسة التلقائي بعد 8 ساعات
        this.setupAutoLogout();
    }
    
    async checkSession() {
        const token = localStorage.getItem('factory_token');
        const user = localStorage.getItem('factory_user');
        
        if (!token || !user) {
            return false;
        }
        
        try {
            // التحقق من صحة التوكن
            const userData = JSON.parse(user);
            const tokenParts = atob(token).split(':');
            
            if (tokenParts.length !== 2) {
                this.logout();
                return false;
            }
            
            const [username, timestamp] = tokenParts;
            const loginTime = parseInt(timestamp);
            const currentTime = Date.now();
            const eightHours = 8 * 60 * 60 * 1000;
            
            // إذا مرت أكثر من 8 ساعات
            if (currentTime - loginTime > eightHours) {
                this.logout();
                this.showMessage('انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى');
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('Session check error:', error);
            this.logout();
            return false;
        }
    }
    
    async login(username, password) {
        try {
            // في المرحلة الأولى: استخدام التحقق المحلي
            // لاحقاً سنتصل بـ API
            
            const response = {
                success: true,
                token: btoa(username + ':' + Date.now()),
                user: {
                    username: username,
                    name: this.getUserName(username),
                    role: this.getUserRole(username),
                    permissions: this.getUserPermissions(username)
                }
            };
            
            if (response.success) {
                localStorage.setItem('factory_token', response.token);
                localStorage.setItem('factory_user', JSON.stringify(response.user));
                
                // تسجيل عملية الدخول
                this.logActivity('login', `تم تسجيل دخول ${username}`);
                
                return response;
            } else {
                // تسجيل محاولة دخول فاشلة
                this.logActivity('failed_login', `محاولة دخول فاشلة لـ ${username}`);
                throw new Error('بيانات الدخول غير صحيحة');
            }
        } catch (error) {
            throw error;
        }
    }
    
    logout() {
        const user = this.getCurrentUser();
        if (user) {
            this.logActivity('logout', `تم تسجيل خروج ${user.username}`);
        }
        
        localStorage.removeItem('factory_token');
        localStorage.removeItem('factory_user');
        localStorage.removeItem('auth_activities');
        
        window.location.href = 'login.html';
    }
    
    getCurrentUser() {
        const userData = localStorage.getItem('factory_user');
        return userData ? JSON.parse(userData) : null;
    }
    
    hasPermission(permission) {
        const user = this.getCurrentUser();
        if (!user) return false;
        
        if (user.permissions.includes('all') || user.role === 'admin') {
            return true;
        }
        
        return user.permissions.includes(permission);
    }
    
    isAdmin() {
        const user = this.getCurrentUser();
        return user && user.role === 'admin';
    }
    
    // الدوال المساعدة
    getUserName(username) {
        const names = {
            'admin': 'المدير العام',
            'user1': 'محمد أحمد',
            'user2': 'علي محمود'
        };
        return names[username] || username;
    }
    
    getUserRole(username) {
        return username === 'admin' ? 'admin' : 'user';
    }
    
    getUserPermissions(username) {
        const permissions = {
            'admin': ['all'],
            'user1': ['view', 'add', 'edit'],
            'user2': ['view']
        };
        return permissions[username] || ['view'];
    }
    
    logActivity(type, message) {
        const activities = JSON.parse(localStorage.getItem('auth_activities') || '[]');
        
        activities.push({
            timestamp: new Date().toISOString(),
            type: type,
            message: message,
            user: this.getCurrentUser()?.username || 'unknown',
            ip: 'local' // في الإنتاج سنحصل على IP حقيقي
        });
        
        // حفظ آخر 100 نشاط فقط
        if (activities.length > 100) {
            activities.shift();
        }
        
        localStorage.setItem('auth_activities', JSON.stringify(activities));
        
        // إذا كانت عملية مهمة، إشعار المدير
        if (type === 'failed_login' || type === 'sensitive_operation') {
            this.notifyAdmin(message);
        }
    }
    
    notifyAdmin(message) {
        // في الإنتاج: إرسال إشعار للمدير
        console.log('🔔 إشعار للمدير:', message);
        
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('نظام المصنع - تنبيه', {
                body: message,
                icon: '/icons/icon-192x192.png'
            });
        }
    }
    
    showMessage(message, type = 'info') {
        // إظهار رسالة للمستخدم
        const messageDiv = document.createElement('div');
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'error' ? '#f87171' : '#60a5fa'};
            color: white;
            border-radius: 5px;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        
        messageDiv.textContent = message;
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => messageDiv.remove(), 300);
        }, 3000);
    }
    
    setupAutoLogout() {
        // التحقق كل دقيقة من مدة الجلسة
        setInterval(() => {
            this.checkSession();
        }, 60000);
        
        // تنبيه قبل انتهاء الجلسة بـ 5 دقائق
        setInterval(() => {
            const token = localStorage.getItem('factory_token');
            if (token) {
                try {
                    const tokenParts = atob(token).split(':');
                    if (tokenParts.length === 2) {
                        const loginTime = parseInt(tokenParts[1]);
                        const currentTime = Date.now();
                        const sevenHours55Minutes = (7 * 60 + 55) * 60 * 1000;
                        
                        if (currentTime - loginTime > sevenHours55Minutes) {
                            this.showMessage('⏳ الجلسة ستنتهي خلال 5 دقائق', 'warning');
                        }
                    }
                } catch (error) {
                    // تجاهل الخطأ
                }
            }
        }, 60000); // كل دقيقة
    }
}

// إنشاء نسخة عالمية من النظام
window.authSystem = new AuthSystem();

// إضافة أنماط CSS للرسائل
const authStyles = document.createElement('style');
authStyles.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(authStyles);

// تصدير النظام لاستخدامه في الملفات الأخرى
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthSystem;
}
// ⬆⬆⬆ انتهى النسخ هنا ⬆⬆⬆