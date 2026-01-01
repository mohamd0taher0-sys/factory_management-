// ⬇⬇⬇ ابدأ النسخ من هنا ⬇⬇⬇
// service-worker.js - للإدارة الداخلية فقط

const CACHE_NAME = 'factory-internal-v1.0';
const OFFLINE_PAGE = '/offline.html';

// الملفات التي سيتم تخزينها في الكاش
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/login.html',
    '/offline.html',
    '/auth-system.js',
    '/manifest.json',
    '/icons/icon-72x72.png',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png'
];

// ============ التثبيت ============
self.addEventListener('install', (event) => {
    console.log('[Service Worker] التثبيت');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] تخزين الملفات الأساسية');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('[Service Worker] تخطي الانتظار');
                return self.skipWaiting();
            })
    );
});

// ============ التنشيط ============
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] التنشيط');
    
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // حذف الكاش القديم
                    if (cacheName !== CACHE_NAME) {
                        console.log('[Service Worker] حذف الكاش القديم:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('[Service Worker] المطالبة بالعملاء');
            return self.clients.claim();
        })
    );
});

// ============ اعتراض الطلبات ============
self.addEventListener('fetch', (event) => {
    // تجاهل طلبات POST وغير GET
    if (event.request.method !== 'GET') {
        return;
    }
    
    const url = new URL(event.request.url);
    
    // تجاهل طلبات API (نريدها مباشرة من الشبكة)
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    return new Response(
                        JSON.stringify({ error: 'لا يوجد اتصال بالإنترنت' }),
                        { 
                            status: 503,
                            headers: { 'Content-Type': 'application/json' }
                        }
                    );
                })
        );
        return;
    }
    
    // استراتيجية Cache First للملفات الثابتة
    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    // تحديث الكاش في الخلفية
                    fetchAndCache(event.request);
                    return cachedResponse;
                }
                
                // طلب من الشبكة
                return fetch(event.request)
                    .then((response) => {
                        // تخزين في الكاش
                        if (response.ok && response.status === 200) {
                            const responseToCache = response.clone();
                            caches.open(CACHE_NAME)
                                .then((cache) => {
                                    cache.put(event.request, responseToCache);
                                });
                        }
                        return response;
                    })
                    .catch(() => {
                        // صفحة عدم الاتصال
                        if (event.request.headers.get('accept').includes('text/html')) {
                            return caches.match(OFFLINE_PAGE);
                        }
                        
                        // للصور وغيرها، إرجاع بيانات افتراضية
                        if (event.request.url.includes('.png') || 
                            event.request.url.includes('.jpg')) {
                            return caches.match('/icons/icon-192x192.png');
                        }
                        
                        return new Response('لا يوجد اتصال بالإنترنت', {
                            status: 503,
                            headers: { 'Content-Type': 'text/plain' }
                        });
                    });
            })
    );
});

// ============ تحديث الكاش في الخلفية ============
function fetchAndCache(request) {
    fetch(request)
        .then((response) => {
            if (response.ok) {
                caches.open(CACHE_NAME)
                    .then((cache) => {
                        cache.put(request, response);
                    });
            }
        })
        .catch(() => {
            // لا شيء، مجرد محاولة تحديث
        });
}

// ============ معالجة الإشعارات ============
self.addEventListener('push', (event) => {
    console.log('[Service Worker] إشعار جديد');
    
    // في نظام داخلي، الإشعارات للمدير فقط
    const options = {
        body: 'لديك تنبيه جديد في النظام',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        vibrate: [200, 100, 200],
        tag: 'factory-alert',
        requireInteraction: true,
        actions: [
            { action: 'open', title: 'فتح النظام' },
            { action: 'dismiss', title: 'تجاهل' }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('نظام المصنع', options)
    );
});

// ============ النقر على الإشعار ============
self.addEventListener('notificationclick', (event) => {
    console.log('[Service Worker] نقر على الإشعار');
    event.notification.close();
    
    if (event.action === 'open' || !event.action) {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// ============ المزامنة ============
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-activities') {
        event.waitUntil(syncActivities());
    }
});

async function syncActivities() {
    // مزامنة سجلات النشاط عند العودة للاتصال
    const activities = JSON.parse(localStorage.getItem('auth_activities') || '[]');
    
    if (activities.length > 0) {
        try {
            await fetch('/api/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ activities })
            });
            
            console.log('[Service Worker] تمت مزامنة النشاطات');
        } catch (error) {
            console.error('[Service Worker] فشلت المزامنة:', error);
        }
    }
}

console.log('[Service Worker] تم التحميل للنظام الداخلي');
// ⬆⬆⬆ انتهى النسخ هنا ⬆⬆⬆