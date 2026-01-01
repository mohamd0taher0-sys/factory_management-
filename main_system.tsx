import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Package, ShoppingCart, Users, DollarSign, AlertCircle, Box, Truck, Download, Edit2, Trash2, Save, X, Bell, Search, LogOut, Moon, Sun, FileText, Briefcase, ClipboardList, Settings as SettingsIcon, BellRing } from 'lucide-react';

const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const FactorySystem = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(localStorage.getItem('darkMode') === 'true');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [user, setUser] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    lowStock: { enabled: true, threshold: 10 },
    criticalStock: { enabled: true, threshold: 5 },
    overdueOrders: { enabled: true },
    pendingPayments: { enabled: true },
    dailySummary: { enabled: false, time: '18:00' }
  });
  
  const [data, setData] = useState({
    suppliers: [], customers: [], employees: [],
    materialInventory: [], productInventory: [],
    materialPurchases: [], productPurchases: [],
    production: [], sales: [], expenses: [], orders: []
  });

  useEffect(() => {
    checkAuth();
    setupPWA();
    registerServiceWorker();
    loadNotificationSettings();
  }, []);

  useEffect(() => {
    localStorage.setItem('darkMode', darkMode);
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const setupPWA = () => {
    // التحقق من التثبيت
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // معالج تثبيت PWA
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    });

    // معالج بعد التثبيت
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowInstallPrompt(false);
      showNotification('تم التثبيت بنجاح!', 'يمكنك الآن استخدام التطبيق من الشاشة الرئيسية');
    });
  };

  const registerServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        console.log('Service Worker registered:', registration);

        // طلب إذن الإشعارات
        if ('Notification' in window && Notification.permission === 'default') {
          await Notification.requestPermission();
        }
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  };

  const installPWA = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('PWA installed');
    }
    
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const loadNotificationSettings = () => {
    const saved = localStorage.getItem('notificationSettings');
    if (saved) {
      setNotificationSettings(JSON.parse(saved));
    }
  };

  const saveNotificationSettings = (newSettings) => {
    setNotificationSettings(newSettings);
    localStorage.setItem('notificationSettings', JSON.stringify(newSettings));
  };

  const showNotification = (title, body) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SHOW_NOTIFICATION',
          title,
          body
        });
      } else {
        new Notification(title, {
          body,
          icon: '/icon-192x192.png',
          badge: '/icon-72x72.png',
          vibrate: [200, 100, 200]
        });
      }
    }
  };

  const checkAuth = async () => {
    if (SUPABASE_URL === 'YOUR_SUPABASE_URL') {
      alert('⚠️ يرجى تحديث بيانات Supabase في الكود أولاً!');
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setUser(session.user);
      loadAllData();
    }
  };

  const handleLogin = async (email, password) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert('خطأ في تسجيل الدخول: ' + error.message);
    } else {
      setUser(data.user);
      loadAllData();
      showNotification('مرحباً بك!', 'تم تسجيل الدخول بنجاح');
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setData({
      suppliers: [], customers: [], employees: [],
      materialInventory: [], productInventory: [],
      materialPurchases: [], productPurchases: [],
      production: [], sales: [], expenses: [], orders: []
    });
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [suppliers, customers, employees, materialInventory, productInventory, 
             materialPurchases, productPurchases, production, sales, expenses, orders] = 
      await Promise.all([
        supabase.from('suppliers').select('*').order('created_at', { ascending: false }),
        supabase.from('customers').select('*').order('created_at', { ascending: false }),
        supabase.from('employees').select('*').order('name'),
        supabase.from('material_inventory').select('*').order('name'),
        supabase.from('product_inventory').select('*').order('name'),
        supabase.from('material_purchases').select('*').order('date', { ascending: false }),
        supabase.from('product_purchases').select('*').order('date', { ascending: false }),
        supabase.from('production').select('*').order('date', { ascending: false }),
        supabase.from('sales').select('*').order('date', { ascending: false }),
        supabase.from('expenses').select('*').order('date', { ascending: false }),
        supabase.from('orders').select('*').order('order_date', { ascending: false })
      ]);

      setData({
        suppliers: suppliers.data || [],
        customers: customers.data || [],
        employees: employees.data || [],
        materialInventory: materialInventory.data || [],
        productInventory: productInventory.data || [],
        materialPurchases: materialPurchases.data || [],
        productPurchases: productPurchases.data || [],
        production: production.data || [],
        sales: sales.data || [],
        expenses: expenses.data || [],
        orders: orders.data || []
      });

      checkNotifications(materialInventory.data || [], productInventory.data || [], orders.data || []);
    } catch (error) {
      console.error('خطأ في تحميل البيانات:', error);
      alert('خطأ في الاتصال بقاعدة البيانات. تأكد من إعدادات Supabase.');
    }
    setLoading(false);
  };

  const checkNotifications = (materials, products, orders) => {
    const alerts = [];
    
    // تنبيهات الخامات
    if (notificationSettings.criticalStock.enabled || notificationSettings.lowStock.enabled) {
      materials.forEach(m => {
        const qty = parseFloat(m.quantity);
        if (notificationSettings.criticalStock.enabled && qty < notificationSettings.criticalStock.threshold) {
          alerts.push({ 
            type: 'danger', 
            message: `🚨 ${m.name}: متبقي ${qty} ${m.unit} - اطلب ${m.reorder_quantity} ${m.unit} فوراً!`,
            action: () => setActiveTab('materialPurchases')
          });
          showNotification('تنبيه مخزون حرج!', `${m.name} على وشك النفاد`);
        } else if (notificationSettings.lowStock.enabled && qty < notificationSettings.lowStock.threshold) {
          alerts.push({ 
            type: 'warning', 
            message: `⚠️ ${m.name}: متبقي ${qty} ${m.unit} - مخزون منخفض`,
            action: () => setActiveTab('inventory')
          });
        }
      });
    }

    // تنبيهات المنتجات
    if (notificationSettings.lowStock.enabled) {
      products.forEach(p => {
        if (parseInt(p.quantity) < p.min_quantity) {
          alerts.push({ 
            type: 'warning', 
            message: `⚠️ ${p.name}: متبقي ${p.quantity} قطعة`,
            action: () => setActiveTab('inventory')
          });
        }
      });
    }

    // تنبيهات الطلبات
    const pendingOrders = orders.filter(o => o.status !== 'مسلّم' && o.status !== 'ملغي');
    if (pendingOrders.length > 0) {
      alerts.push({ 
        type: 'info', 
        message: `📦 ${pendingOrders.length} طلب نشط`,
        action: () => setActiveTab('orders')
      });
    }

    // تنبيهات الطلبات المتأخرة
    if (notificationSettings.overdueOrders.enabled) {
      const overdueOrders = orders.filter(o => {
        if (!o.delivery_date || o.status === 'مسلّم' || o.status === 'ملغي') return false;
        return new Date(o.delivery_date) < new Date();
      });
      if (overdueOrders.length > 0) {
        alerts.push({ 
          type: 'danger', 
          message: `🚨 ${overdueOrders.length} طلب متأخر عن موعد التسليم!`,
          action: () => setActiveTab('orders')
        });
        showNotification('طلبات متأخرة!', `${overdueOrders.length} طلب تجاوز موعد التسليم`);
      }
    }

    // تنبيهات المدفوعات المعلقة
    if (notificationSettings.pendingPayments.enabled) {
      const pendingPayments = [...data.materialPurchases, ...data.productPurchases, ...data.sales]
        .filter(item => item.payment_status === 'معلق' || item.payment_status === 'جزئي');
      if (pendingPayments.length > 0) {
        alerts.push({ 
          type: 'warning', 
          message: `💰 ${pendingPayments.length} دفعة معلقة`,
          action: null
        });
      }
    }

    setNotifications(alerts);
  };

  const calculateStats = () => {
    const totalSales = data.sales.reduce((s, sale) => s + parseFloat(sale.total_amount || 0), 0);
    const totalMaterialCost = data.materialPurchases.reduce((s, p) => s + parseFloat(p.total_cost || 0), 0);
    const totalProductCost = data.productPurchases.reduce((s, p) => s + parseFloat(p.total_cost || 0), 0);
    const totalExpenses = data.expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
    const totalCosts = totalMaterialCost + totalProductCost + totalExpenses;
    const profit = totalSales - totalCosts;

    const productSales = {};
    data.sales.forEach(sale => {
      if (!productSales[sale.product_code]) {
        productSales[sale.product_code] = { name: sale.product_name, revenue: 0, quantity: 0 };
      }
      productSales[sale.product_code].revenue += parseFloat(sale.total_amount);
      productSales[sale.product_code].quantity += parseInt(sale.quantity);
    });

    return {
      totalSales,
      totalCosts,
      profit,
      profitMargin: totalSales > 0 ? ((profit / totalSales) * 100).toFixed(2) : 0,
      topProducts: Object.values(productSales).sort((a, b) => b.revenue - a.revenue).slice(0, 5)
    };
  };

  const stats = calculateStats();

  const generateCode = (prefix, array) => {
    if (array.length === 0) return `${prefix}001`;
    const lastCode = array[0].code;
    const num = parseInt(lastCode.replace(prefix, '')) + 1;
    return `${prefix}${num.toString().padStart(3, '0')}`;
  };

  const exportToExcel = (dataArray, fileName, columns) => {
    if (dataArray.length === 0) {
      alert('لا توجد بيانات للتصدير');
      return;
    }
    let csv = columns.map(c => c.label).join(',') + '\n';
    dataArray.forEach(row => {
      csv += columns.map(col => {
        let v = row[col.key] || '';
        if (typeof v === 'string' && (v.includes(',') || v.includes('"'))) {
          v = '"' + v.replace(/"/g, '""') + '"';
        }
        return v;
      }).join(',') + '\n';
    });
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${fileName}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditForm({ ...item });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async (tableName) => {
    setLoading(true);
    const { error } = await supabase.from(tableName).update(editForm).eq('id', editingId);
    if (error) alert('خطأ: ' + error.message);
    else {
      await loadAllData();
      cancelEdit();
      showNotification('تم التحديث', 'تم حفظ التعديلات بنجاح');
    }
    setLoading(false);
  };

  const deleteItem = async (tableName, id, name) => {
    if (!confirm(`حذف "${name}"؟\n\n⚠️ هذا الإجراء لا يمكن التراجع عنه!`)) return;
    setLoading(true);
    const { error } = await supabase.from(tableName).delete().eq('id', id);
    if (error) alert('خطأ: ' + error.message);
    else {
      await loadAllData();
      showNotification('تم الحذف', `تم حذف ${name}`);
    }
    setLoading(false);
  };

  if (!user) {
    return <LoginPage onLogin={handleLogin} loading={loading} darkMode={darkMode} />;
  }

  const LoginPage = ({ onLogin, loading, darkMode }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    return (
      <div className={`min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4 ${darkMode ? 'dark' : ''}`}>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="bg-blue-100 dark:bg-blue-900 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package size={40} className="text-blue-600 dark:text-blue-300" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">نظام إدارة المصنع</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">PWA • يعمل على الهاتف والكمبيوتر</p>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); onLogin(email, password); }}>
            <div className="space-y-4">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} 
                placeholder="البريد الإلكتروني" required 
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} 
                placeholder="كلمة المرور" required 
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white" />
              <button type="submit" disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-bold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition">
                {loading ? 'جاري الدخول...' : 'دخول'}
              </button>
            </div>
          </form>
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg text-sm text-blue-800 dark:text-blue-200">
            <p className="font-bold mb-1">للتجربة:</p>
            <p>admin@factory.com / Admin123456!</p>
          </div>
        </div>
      </div>
    );
  };

  const NotificationBar = () => (
    notifications.length > 0 && (
      <div className="space-y-2 mb-4">
        {notifications.slice(0, 5).map((n, i) => (
          <div key={i} className={`p-3 rounded-lg flex items-center gap-2 cursor-pointer hover:opacity-80 transition ${
            n.type === 'danger' ? 'bg-red-100 text-red-800 border-r-4 border-red-500 dark:bg-red-900 dark:text-red-200' :
            n.type === 'warning' ? 'bg-yellow-100 text-yellow-800 border-r-4 border-yellow-500 dark:bg-yellow-900 dark:text-yellow-200' :
            'bg-blue-100 text-blue-800 border-r-4 border-blue-500 dark:bg-blue-900 dark:text-blue-200'
          }`} onClick={n.action}>
            <Bell size={18} />
            <span className="text-sm flex-1">{n.message}</span>
          </div>
        ))}
        {notifications.length > 5 && (
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">+ {notifications.length - 5} تنبيه آخر</p>
        )}
      </div>
    )
  );

  const NotificationSettingsModal = ({ show, onClose }) => {
    if (!show) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2">
                <BellRing size={24} />
                إعدادات التنبيهات
              </h2>
              <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <label className="font-bold dark:text-white">تنبيهات المخزون الحرج</label>
                  <input 
                    type="checkbox" 
                    checked={notificationSettings.criticalStock.enabled}
                    onChange={(e) => saveNotificationSettings({
                      ...notificationSettings,
                      criticalStock: { ...notificationSettings.criticalStock, enabled: e.target.checked }
                    })}
                    className="w-5 h-5"
                  />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">تنبيه عندما يقل المخزون عن:</p>
                <input 
                  type="number" 
                  value={notificationSettings.criticalStock.threshold}
                  onChange={(e) => saveNotificationSettings({
                    ...notificationSettings,
                    criticalStock: { ...notificationSettings.criticalStock, threshold: parseInt(e.target.value) }
                  })}
                  className="w-full p-2 border rounded dark:bg-gray-600 dark:text-white dark:border-gray-500"
                  placeholder="5"
                />
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <label className="font-bold dark:text-white">تنبيهات المخزون المنخفض</label>
                  <input 
                    type="checkbox" 
                    checked={notificationSettings.lowStock.enabled}
                    onChange={(e) => saveNotificationSettings({
                      ...notificationSettings,
                      lowStock: { ...notificationSettings.lowStock, enabled: e.target.checked }
                    })}
                    className="w-5 h-5"
                  />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">تنبيه عندما يقل المخزون عن:</p>
                <input 
                  type="number" 
                  value={notificationSettings.lowStock.threshold}
                  onChange={(e) => saveNotificationSettings({
                    ...notificationSettings,
                    lowStock: { ...notificationSettings.lowStock, threshold: parseInt(e.target.value) }
                  })}
                  className="w-full p-2 border rounded dark:bg-gray-600 dark:text-white dark:border-gray-500"
                  placeholder="10"
                />
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-bold dark:text-white">الطلبات المتأخرة</label>
                    <p className="text-sm text-gray-600 dark:text-gray-300">تنبيه عند تجاوز موعد التسليم</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={notificationSettings.overdueOrders.enabled}
                    onChange={(e) => saveNotificationSettings({
                      ...notificationSettings,
                      overdueOrders: { enabled: e.target.checked }
                    })}
                    className="w-5 h-5"
                  />
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-bold dark:text-white">المدفوعات المعلقة</label>
                    <p className="text-sm text-gray-600 dark:text-gray-300">تنبيه بالمدفوعات غير المكتملة</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={notificationSettings.pendingPayments.enabled}
                    onChange={(e) => saveNotificationSettings({
                      ...notificationSettings,
                      pendingPayments: { enabled: e.target.checked }
                    })}
                    className="w-5 h-5"
                  />
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <label className="font-bold dark:text-white">ملخص يومي</label>
                  <input 
                    type="checkbox" 
                    checked={notificationSettings.dailySummary.enabled}
                    onChange={(e) => saveNotificationSettings({
                      ...notificationSettings,
                      dailySummary: { ...notificationSettings.dailySummary, enabled: e.target.checked }
                    })}
                    className="w-5 h-5"
                  />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">وقت الإرسال:</p>
                <input 
                  type="time" 
                  value={notificationSettings.dailySummary.time}
                  onChange={(e) => saveNotificationSettings({
                    ...notificationSettings,
                    dailySummary: { ...notificationSettings.dailySummary, time: e.target.value }
                  })}
                  className="w-full p-2 border rounded dark:bg-gray-600 dark:text-white dark:border-gray-500"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button onClick={onClose} className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700">
                حفظ الإعدادات
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const Dashboard = () => {
    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    const [showSettings, setShowSettings] = useState(false);
    
    return (
      <div className="space-y-6">
        {showInstallPrompt && !isInstalled && (
          <div className="bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900 dark:to-blue-900 border-r-4 border-purple-500 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package className="text-purple-600 dark:text-purple-300" size={24} />
                <div>
                  <h4 className="font-bold text-purple-900 dark:text-purple-100">ثبت التطبيق!</h4>
                  <p className="text-sm text-purple-800 dark:text-purple-200">استخدمه كتطبيق مستقل على هاتفك أو كمبيوترك</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={installPWA} className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 font-bold">
                  تثبيت
                </button>
                <button onClick={() => setShowInstallPrompt(false)} className="text-purple-600 dark:text-purple-300 px-4 py-2">
                  لاحقاً
                </button>
              </div>
            </div>
          </div>
        )}

        <NotificationBar />
        
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold dark:text-white">لوحة التحكم</h2>
          <button onClick={() => setShowSettings(true)} className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
            <BellRing size={20} />
            <span className="hidden md:inline">إعدادات التنبيهات</span>
          </button>
        </div>

        <NotificationSettingsModal show={showSettings} onClose={() => setShowSettings(false)} />
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg hover:scale-105 transition cursor-pointer">
            <DollarSign size={32} className="opacity-80 mb-2" />
            <p className="text-sm opacity-90">إجمالي المبيعات</p>
            <p className="text-3xl font-bold">{stats.totalSales.toFixed(0)}</p>
            <p className="text-xs opacity-75 mt-1">{data.sales.length} عملية</p>
          </div>
          
          <div className="bg-gradient-to-br from-red-500 to-red-600 text-white p-6 rounded-xl shadow-lg hover:scale-105 transition cursor-pointer">
            <ShoppingCart size={32} className="opacity-80 mb-2" />
            <p className="text-sm opacity-90">التكاليف</p>
            <p className="text-3xl font-bold">{stats.totalCosts.toFixed(0)}</p>
            <p className="text-xs opacity-75 mt-1">جميع المصروفات</p>
          </div>
          
          <div className={`bg-gradient-to-br ${stats.profit >= 0 ? 'from-green-500 to-green-600' : 'from-orange-500 to-orange-600'} text-white p-6 rounded-xl shadow-lg hover:scale-105 transition cursor-pointer`}>
            <TrendingUp size={32} className="opacity-80 mb-2" />
            <p className="text-sm opacity-90">صافي الربح</p>
            <p className="text-3xl font-bold">{stats.profit.toFixed(0)}</p>
            <p className="text-xs opacity-75 mt-1">هامش {stats.profitMargin}%</p>
          </div>
          
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-xl shadow-lg hover:scale-105 transition cursor-pointer">
            <Package size={32} className="opacity-80 mb-2" />
            <p className="text-sm opacity-90">الطلبات النشطة</p>
            <p className="text-3xl font-bold">{data.orders.filter(o => o.status !== 'مسلّم' && o.status !== 'ملغي').length}</p>
            <p className="text-xs opacity-75 mt-1">من أصل {data.orders.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
            <h3 className="font-bold text-lg mb-4 dark:text-white">أكثر المنتجات مبيعاً</h3>
            {stats.topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats.topProducts}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-20} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="#3b82f6" name="الإيرادات" />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-center py-20 text-gray-500 dark:text-gray-400">لا توجد بيانات بعد</p>}
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
            <h3 className="font-bold text-lg mb-4 dark:text-white">توزيع المصروفات</h3>
            {data.expenses.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={Object.entries(data.expenses.reduce((acc, exp) => {
                      acc[exp.category] = (acc[exp.category] || 0) + parseFloat(exp.amount);
                      return acc;
                    }, {})).map(([name, value]) => ({ name, value }))}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={(entry) => entry.name}
                  >
                    {data.expenses.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-center py-20 text-gray-500 dark:text-gray-400">لا توجد مصروفات بعد</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow hover:shadow-lg transition">
            <Users className="text-blue-600 mb-3" size={24} />
            <h3 className="font-bold mb-3 dark:text-white">الأشخاص</h3>
            <div className="space-y-2">
              <div className="flex justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer" onClick={() => setActiveTab('customers')}>
                <span className="dark:text-gray-300">العملاء</span>
                <span className="font-bold text-blue-600">{data.customers.length}</span>
              </div>
              <div className="flex justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer" onClick={() => setActiveTab('suppliers')}>
                <span className="dark:text-gray-300">الموردين</span>
                <span className="font-bold text-green-600">{data.suppliers.length}</span>
              </div>
              <div className="flex justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer" onClick={() => setActiveTab('employees')}>
                <span className="dark:text-gray-300">الموظفين</span>
                <span className="font-bold text-purple-600">{data.employees.length}</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow hover:shadow-lg transition">
            <Box className="text-green-600 mb-3" size={24} />
            <h3 className="font-bold mb-3 dark:text-white">المخزون</h3>
            <div className="space-y-2">
              <div className="flex justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer" onClick={() => setActiveTab('inventory')}>
                <span className="dark:text-gray-300">خامات</span>
                <span className="font-bold">{data.materialInventory.length}</span>
              </div>
              <div className="flex justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer" onClick={() => setActiveTab('inventory')}>
                <span className="dark:text-gray-300">منتجات</span>
                <span className="font-bold">{data.productInventory.length}</span>
              </div>
              <div className="flex justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer" onClick={() => setActiveTab('production')}>
                <span className="dark:text-gray-300">إنتاج</span>
                <span className="font-bold">{data.production.length}</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow hover:shadow-lg transition">
            <Truck className="text-purple-600 mb-3" size={24} />
            <h3 className="font-bold mb-3 dark:text-white">العمليات</h3>
            <div className="space-y-2">
              <div className="flex justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer" onClick={() => setActiveTab('materialPurchases')}>
                <span className="dark:text-gray-300">مشتريات خامات</span>
                <span className="font-bold">{data.materialPurchases.length}</span>
              </div>
              <div className="flex justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer" onClick={() => setActiveTab('sales')}>
                <span className="dark:text-gray-300">مبيعات</span>
                <span className="font-bold">{data.sales.length}</span>
              </div>
              <div className="flex justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer" onClick={() => setActiveTab('expenses')}>
                <span className="dark:text-gray-300">مصروفات</span>
                <span className="font-bold">{data.expenses.length}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900 dark:to-purple-900 border-r-4 border-blue-500 p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-blue-600 dark:text-blue-300 mt-1" size={20} />
            <div>
              <h4 className="font-bold text-blue-900 dark:text-blue-100">تطبيق PWA نشط ✅</h4>
              <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                • يعمل على الهاتف والكمبيوتر • مزامنة فورية • إشعارات ذكية • يعمل Offline
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // باقي الصفحات (استخدم نفس الكود من Artifact السابق)
  const SupplierPage = () => {
    const [form, setForm] = useState({ code: generateCode('SU', data.suppliers), name: '', type: 'خامات', phone: '', email: '', address: '', notes: '' });
    
    const handleSubmit = async (e) => {
      e.preventDefault();
      setLoading(true);
      const { error } = await supabase.from('suppliers').insert([{ ...form, created_by: user.email }]);
      if (error) alert('خطأ: ' + error.message);
      else {
        await loadAllData();
        showNotification('تم الإضافة', `تم إضافة المورد ${form.name}`);
        setForm({ code: generateCode('SU', data.suppliers), name: '', type: 'خامات', phone: '', email: '', address: '', notes: '' });
      }
      setLoading(false);
    };

    const cols = [{ key: 'code', label: 'الكود' }, { key: 'name', label: 'الاسم' }, { key: 'type', label: 'النوع' }, { key: 'phone', label: 'الهاتف' }];
    const filtered = data.suppliers.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.code.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <div className="flex justify-between mb-4">
          <h2 className="text-2xl font-bold dark:text-white">الموردين ({data.suppliers.length})</h2>
          <button onClick={() => exportToExcel(data.suppliers, 'الموردين', cols)} 
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
            <Download size={18} /> تصدير Excel
          </button>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input type="text" value={form.code} disabled className="p-2 border rounded bg-gray-200 dark:bg-gray-600 dark:text-white" />
            <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required className="p-2 border rounded dark:bg-gray-600 dark:text-white dark:border-gray-500" placeholder="الاسم *" />
            <select value={form.type} onChange={(e) => setForm({...form, type: e.target.value})} className="p-2 border rounded dark:bg-gray-600 dark:text-white dark:border-gray-500">
              <option value="خامات">خامات</option>
              <option value="منتجات جاهزة">منتجات جاهزة</option>
              <option value="كلاهما">كلاهما</option>
            </select>
            <input type="tel" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} className="p-2 border rounded dark:bg-gray-600 dark:text-white dark:border-gray-500" placeholder="الهاتف" />
            <input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className="p-2 border rounded dark:bg-gray-600 dark:text-white dark:border-gray-500" placeholder="البريد" />
            <input type="text" value={form.address} onChange={(e) => setForm({...form, address: e.target.value})} className="p-2 border rounded dark:bg-gray-600 dark:text-white dark:border-gray-500" placeholder="العنوان" />
            <textarea value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} className="p-2 border rounded col-span-full dark:bg-gray-600 dark:text-white dark:border-gray-500" rows="2" placeholder="ملاحظات"></textarea>
          </div>
          <button type="submit" disabled={loading} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'جاري الحفظ...' : '➕ إضافة مورد'}
          </button>
        </form>

        <div className="mb-4">
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 p-2 rounded-lg">
            <Search size={20} className="dark:text-gray-400" />
            <input type="text" placeholder="بحث بالاسم أو الكود..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} 
              className="flex-1 bg-transparent border-none outline-none dark:text-white" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border dark:border-gray-600 text-sm">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="border dark:border-gray-600 p-2 dark:text-white">الكود</th>
                <th className="border dark:border-gray-600 p-2 dark:text-white">الاسم</th>
                <th className="border dark:border-gray-600 p-2 dark:text-white">النوع</th>
                <th className="border dark:border-gray-600 p-2 dark:text-white">الهاتف</th>
                <th className="border dark:border-gray-600 p-2 dark:text-white">البريد</th>
                <th className="border dark:border-gray-600 p-2 dark:text-white">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} className="dark:text-gray-300">
                  <td className="border dark:border-gray-600 p-2 font-mono">{s.code}</td>
                  <td className="border dark:border-gray-600 p-2 font-semibold">{s.name}</td>
                  <td className="border dark:border-gray-600 p-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      s.type === 'خامات' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                      s.type === 'منتجات جاهزة' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                      'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                    }`}>{s.type}</span>
                  </td>
                  <td className="border dark:border-gray-600 p-2">{s.phone}</td>
                  <td className="border dark:border-gray-600 p-2">{s.email}</td>
                  <td className="border dark:border-gray-600 p-2">
                    <div className="flex gap-2 justify-center">
                      <button onClick={() => startEdit(s)} className="text-blue-600 hover:text-blue-800 dark:text-blue-400" title="تعديل">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => deleteItem('suppliers', s.id, s.name)} className="text-red-600 hover:text-red-800 dark:text-red-400" title="حذف">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const tabs = [
    { id: 'dashboard', name: 'لوحة التحكم', icon: <TrendingUp size={20} />, component: <Dashboard /> },
    { id: 'suppliers', name: 'الموردين', icon: <Truck size={20} />, component: <SupplierPage /> }
  ];

  const currentTab = tabs.find(t => t.id === activeTab);

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-gray-100'}`} dir="rtl">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 shadow-lg">
        <div className="container mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <Package size={24} />
              نظام إدارة المصنع
              {isInstalled && <span className="text-xs bg-white/20 px-2 py-1 rounded">PWA</span>}
            </h1>
            <p className="text-sm opacity-90">{user?.email}</p>
          </div>
          <div className="flex gap-2 md:gap-3">
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition">
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button onClick={handleLogout} className="flex items-center gap-2 px-3 md:px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition">
              <LogOut size={18} />
              <span className="hidden md:inline">خروج</span>
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {loading && (
          <div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 p-3 rounded-lg mb-4 text-center">
            جاري التحميل...
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow mb-6 overflow-x-auto">
          <div className="flex">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 md:px-6 py-4 font-medium whitespace-nowrap border-b-2 transition ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 bg-blue-50 dark:bg-blue-900'
                    : 'border-transparent text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {tab.icon}
                <span className="hidden md:inline">{tab.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          {currentTab.component}
        </div>
      </div>
    </div>
  );
};

export default FactorySystem;