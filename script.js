
// ==========================================
// CLIENT SIDE SCRIPT - GOOGLE SHEETS API
// ==========================================

// ⚠️ هام جداً: استبدل هذا الرابط بالرابط الذي ستحصل عليه بعد نشر كود Google Apps Script
// مثال: https://script.google.com/macros/s/AKfycbx.../exec
const API_URL = "https://script.google.com/macros/s/AKfycby0h6bKE6ghXfWQWQWnEgJRKekAtirsGPT9WdHpsptZrlOlnDAxLZGf9SBR7aQnHe5p/exec";

// 1. State Management
let employees = [];
let tasks = [];
let currentUser = null;
const ADMIN_NAME = 'م.م علي حسين عبد';

// 2. Core Logic (Navigation)
window.showSection = function (sectionId) {
    document.querySelectorAll('section').forEach(sec => {
        sec.style.display = 'none';
        sec.classList.remove('active-section');
    });

    const target = document.getElementById(`section-${sectionId}`);
    if (target) {
        target.style.display = 'block';
        requestAnimationFrame(() => {
            target.classList.add('active-section');
        });

        // Specific Refresh Logic
        if (sectionId === 'admin') showAdminTab('employees');
        if (sectionId === 'employee') {
            if (!currentUser) { window.showSection('employee-login'); return; }
            renderMyTasks();
        }

        // Auto-refresh data if empty
        if (['leave', 'time-leave', 'employee-login', 'admin'].includes(sectionId)) {
            if (employees.length === 0) fetchEmployees();
        }
    }
};

window.showAdminTab = function (tabName, btnRef) {
    document.querySelectorAll('.admin-tab-content').forEach(c => c.style.display = 'none');
    document.querySelectorAll('.admin-tabs .nav-btn').forEach(b => b.classList.remove('active'));

    const target = document.getElementById(`admin-tab-${tabName}`);
    if (target) target.style.display = 'block';

    if (btnRef) {
        btnRef.classList.add('active');
    } else {
        const btn = document.querySelector(`.admin-tabs button[onclick*="${tabName}"]`);
        if (btn) btn.classList.add('active');
    }

    if (tabName === 'tasks') fetchTasks(); // Refresh tasks when tab opens
    updateEmployeeDatalists();
};

window.showEmpTab = function (tabName, btn) {
    const container = document.getElementById('section-employee');
    if (!container) return;
    container.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    container.querySelectorAll('.sub-nav button').forEach(b => b.classList.remove('active'));

    if (btn) btn.classList.add('active');

    const target = document.getElementById(`emp-tab-${tabName}`);
    if (target) target.style.display = 'block';

    if (tabName === 'tasks') renderMyTasks();
    if (tabName === 'profile') renderMyProfile();
};

// 3. API Communicator (The Bridge to Google Sheets)
async function callApi(action, data = {}, method = 'GET') {
    if (API_URL.includes("REPLACE_ME")) {
        alert("⚠️ تنبيه: لم يتم ربط النظام بـ Google Apps Script بعد.\nيرجى اتباع تعليمات المطور لنشر الكود والحصول على الرابط.");
        return null;
    }

    // Prepare URL for GET
    let url = `${API_URL}?action=${action}`;

    // Prepare Options
    const options = {
        method: method,
    };

    if (method === 'POST') {
        // user 'no-cors' mode is tricky with GAS. 
        // Standard GAS Web App usage usually requires sending POST data as stringified body.
        // And we use 'text/plain' to avoid CORS preflight issues sometimes, 
        // though modern browsers handle GAS CORS better now if deployed correctly.
        options.body = JSON.stringify({ ...data, action: action });
        // GAS doPost reads body.
    }

    try {
        const response = await fetch(url, options);
        const json = await response.json();
        return json;
    } catch (e) {
        console.error("API Error:", e);
        // Sometimes JSON parsing fails if GAS returns HTML error page
        return { status: "error", message: "حدث خطأ في الاتصال بالسيرفر" };
    }
}

// 4. Data Operations (Replaced Firestore with API Calls)

// --- Employees ---
async function fetchEmployees() {
    // Show loading state if needed
    const res = await callApi("getEmployees");
    if (res && Array.isArray(res)) {
        employees = res;
    } else if (res && res.status === 'ready') {
        employees = []; // Server is new/empty
    }

    renderEmployeesTable();
    updateEmployeeDatalists();
}

async function addEmployeeToAPI(empData) {
    alert('⏳ جاري الحفظ... يرجى الانتظار (قد يستغرق رفع الصورة دقيقة)');
    const res = await callApi("addEmployee", empData, "POST");

    if (res && res.status === "success") {
        alert("✅ تم إضافة الموظف بنجاح");
        document.getElementById('admin-add-emp-form').reset();
        fetchEmployees();
        showAdminTab('employees');
    } else {
        alert("❌ فشل الحفظ: " + (res ? res.message : "خطأ غير مفسر"));
    }
}

async function updateEmployeeAPICall(updateData) {
    alert('⏳ جاري تحديث البيانات...');
    const res = await callApi("updateEmployee", updateData, "POST");
    if (res && res.status === "success") {
        alert("✅ تم التحديث بنجاح");
        finishUpdate();
    } else {
        alert("❌ فشل التحديث: " + (res?.message || ""));
    }
}

window.deleteEmployee = async function (id) {
    if (confirm('⚠️ هل أنت متأكد من حذف هذا الموظف؟ لا يمكن التراجع.')) {
        alert('⏳ جاري الحذف...');
        const res = await callApi("deleteEmployee", { id: id }, "POST");
        if (res && res.status === "success") {
            alert("✅ تم الحذف");
            fetchEmployees();
        } else {
            alert("❌ فشل الحذف");
        }
    }
};

// --- Tasks ---
async function fetchTasks() {
    const res = await callApi("getTasks");
    if (res && Array.isArray(res)) {
        tasks = res;
        renderAllTasks();
        if (currentUser) renderMyTasks();
    }
}

async function addTaskToAPI(taskData) {
    alert('⏳ جاري الإرسال...');
    const res = await callApi("addTask", taskData, "POST");
    if (res && res.status === "success") {
        alert("✅ تم إرسال المهمة");
        fetchTasks();
    } else {
        alert("❌ فشل الإرسال");
    }
}

async function updateTaskStatus(taskId, newStatus) {
    // Optimistic UI update
    const res = await callApi("updateTaskStatus", { taskId, status: newStatus }, "POST");
    if (res && res.status === "success") {
        // Sync
        fetchTasks();
    } else {
        alert("فشل تحديث الحالة في السيرفر");
    }
}

// 5. UI Renderers & Helpers (Mostly Unchanged)

function renderEmployeesTable() {
    const container = document.getElementById('employees-grid');
    if (!container) return;
    container.innerHTML = '';

    employees.forEach(emp => {
        const card = document.createElement('div');
        card.className = 'glass-card';
        card.innerHTML = `
            <div style="display:flex; align-items:center; gap:15px; justify-content: space-between; width: 100%;">
                <div style="display:flex; align-items:center; gap:15px;">
                    <img src="${emp.image || 'assets/user-placeholder.png'}" style="width:60px; height:60px; border-radius:50%; object-fit:cover;">
                    <div>
                        <h4>${emp.fullName}</h4>
                        <p style="color:#7f8c8d; font-size:0.9rem;">${emp.specialization}</p>
                    </div>
                </div>
                <div style="display:flex; gap: 5px;">
                    <button onclick="showQRCard('${emp.id}')" style="background: #34495e; color: white; border: none; padding: 5px 8px; border-radius: 5px;" title="طباعة البطاقة"><i class="fa-solid fa-id-card"></i></button>
                    <button onclick="openEditModal('${emp.id}')" style="background: #f1c40f; color: black; border: none; padding: 5px 8px; border-radius: 5px;" title="تعديل"><i class="fa-solid fa-pen"></i></button>
                    <button onclick="deleteEmployee('${emp.id}')" style="background: #e74c3c; color: white; border: none; padding: 5px 8px; border-radius: 5px;" title="حذف"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function updateEmployeeDatalists() {
    const loginSelect = document.getElementById('empLoginUser');
    if (loginSelect) {
        loginSelect.innerHTML = '<option value="" disabled selected>-- اختر اسمك --</option>';
        employees.forEach(emp => {
            const opt = document.createElement('option');
            opt.value = emp.username; // Assuming username matches
            opt.textContent = emp.fullName;
            loginSelect.appendChild(opt);
        });
    }

    const populate = (id) => {
        const el = document.getElementById(id);
        if (el) {
            el.innerHTML = `<option value="" disabled selected>-- اختر موظف --</option>`;
            employees.forEach(emp => {
                const opt = document.createElement('option');
                opt.value = emp.fullName;
                opt.textContent = emp.fullName;
                el.appendChild(opt);
            });
        }
    }
    populate('leaveName');
    populate('timeLeaveName');
    populate('taskAssignedTo');
}

window.openEditModal = function (id) {
    const emp = employees.find(e => e.id === id);
    if (!emp) return;

    document.getElementById('editEmpId').value = emp.id;
    document.getElementById('editFullName').value = emp.fullName;
    document.getElementById('editSpecialization').value = emp.specialization;
    document.getElementById('editAge').value = emp.age;
    document.getElementById('editTitle').value = emp.title || '';
    document.getElementById('editPhone').value = emp.phone || '';
    document.getElementById('editAddress').value = emp.address || '';
    document.getElementById('editInsta').value = emp.instagram || '';

    const form = document.getElementById('edit-emp-form');
    form.onsubmit = async (e) => {
        e.preventDefault();

        const updateData = {
            id: emp.id,
            fullName: document.getElementById('editFullName').value,
            specialization: document.getElementById('editSpecialization').value,
            age: document.getElementById('editAge').value,
            title: document.getElementById('editTitle').value,
            phone: document.getElementById('editPhone').value,
            address: document.getElementById('editAddress').value,
            instagram: document.getElementById('editInsta').value
        };

        const pass = document.getElementById('editNewPass').value;
        if (pass && pass.trim() !== "") updateData.password = pass;

        const file = document.getElementById('editProfilePic').files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) { alert("حجم الصورة كبير جداً (اكبر من 2MB)"); return; }
            const reader = new FileReader();
            reader.onload = function (ev) {
                updateData.image = ev.target.result;
                updateEmployeeAPICall(updateData);
            };
            reader.readAsDataURL(file);
        } else {
            updateEmployeeAPICall(updateData);
        }
    };
    document.getElementById('edit-employee-modal').style.display = 'block';
};

function finishUpdate() {
    document.getElementById('edit-employee-modal').style.display = 'none';
    fetchEmployees();
}

// 6. Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Initial Route
    const params = new URLSearchParams(window.location.search);
    if (params.get('portal') === 'employee') window.showSection('employee-login');
    else window.showSection('landing');

    // --- Wire up Forms ---

    // Add Employee
    const addForm = document.getElementById('admin-add-emp-form');
    if (addForm) {
        addForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const file = document.getElementById('addProfilePic').files[0];

            const empData = {
                fullName: document.getElementById('addFullName').value,
                specialization: document.getElementById('addSpecialization').value,
                age: document.getElementById('addAge').value,
                title: document.getElementById('addTitle').value || '',
                phone: document.getElementById('addPhone').value || '',
                address: document.getElementById('addAddress').value || '',
                instagram: document.getElementById('addInsta').value || '',
                action: 'addEmployee'
            };

            if (file) {
                if (file.size > 2 * 1024 * 1024) { alert("حجم الصورة كبير جداً"); return; }
                const reader = new FileReader();
                reader.onload = function (ev) {
                    empData.image = ev.target.result; // Base64
                    addEmployeeToAPI(empData);
                };
                reader.readAsDataURL(file);
            } else {
                alert("يرجى اختيار صورة");
            }
        });
    }

    // Admin Login (Local Check)
    const adminForm = document.getElementById('admin-access-form');
    if (adminForm) {
        adminForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const pw = document.getElementById('accessPass').value;
            // In real production, verify with server. Here we keep it simple as requested previously or move key to sheet settings later.
            if (pw === '199611' || pw === '123') {
                window.showSection('admin');
                fetchEmployees(); // Get fresh data
            } else {
                alert('رمز المرور خاطئ');
            }
        });
    }

    // Employee Login
    const empLogin = document.getElementById('employee-login-form');
    if (empLogin) {
        empLogin.addEventListener('submit', (e) => {
            e.preventDefault();
            const user = document.getElementById('empLoginUser').value;
            const pass = document.getElementById('empLoginPass').value;
            const found = employees.find(e => e.username === user);
            if (found && found.password == pass) {
                currentUser = found;
                fetchTasks().then(() => {
                    window.showSection('employee');
                });
            } else {
                alert('خطأ في البيانات للدخول');
            }
        });
    }

    // Add Task
    const taskForm = document.getElementById('assign-task-form');
    if (taskForm) {
        taskForm.addEventListener('submit', (e) => {
            e.preventDefault();
            addTaskToAPI({
                title: document.getElementById('taskTitle').value,
                details: '', // Field could be added to HTML
                assignedTo: document.getElementById('taskAssignedTo').value,
                sender: ADMIN_NAME,
                deadline: document.getElementById('taskDeadline').value
            });
        });
    }

    // Printing
    const leaveForm = document.getElementById('leave-form');
    if (leaveForm) leaveForm.onsubmit = (e) => { e.preventDefault(); window.printDailyLeave(); };

    const timeForm = document.getElementById('time-leave-form');
    if (timeForm) timeForm.onsubmit = (e) => { e.preventDefault(); window.printTimeLeave(); };

    // Initial Fetch
    // Don't auto-fetch if we don't have the API URL yet to avoid errors in console unless user set it.
    if (!API_URL.includes("REPLACE_ME")) {
        fetchEmployees();
    }
});


// 7. Render Functions needed for new scope
function renderAllTasks() {
    const grid = document.getElementById('all-tasks-grid');
    if (!grid) return;
    grid.innerHTML = '';
    tasks.forEach(task => {
        const div = document.createElement('div');
        div.className = 'task-card';
        div.innerHTML = `
            <h4>${task.title}</h4>
            <div class="task-meta">
                <span>إلى: ${task.assignedTo}</span>
                <span class="status-badge ${task.status}">${task.status === 'completed' ? 'منجز' : 'انتظار'}</span>
            </div>
        `;
        grid.appendChild(div);
    });
}

function renderMyTasks() {
    if (!currentUser) return;
    const grid = document.getElementById('my-tasks-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const myTasks = tasks.filter(t => t.assignedTo === currentUser.fullName);

    if (myTasks.length === 0) { grid.innerHTML = '<p>لا توجد مهام.</p>'; return; }

    myTasks.forEach(task => {
        const div = document.createElement('div');
        div.className = 'task-card';
        const isDone = task.status === 'completed';
        div.innerHTML = `
            <h4>${task.title}</h4>
            <div class="task-meta">
                <span>${task.status}</span>
                <span>${task.date || ''}</span>
            </div>
            ${!isDone ? `<button onclick="completeTask('${task.id}')" class="submit-btn" style="background:#2ecc71;">إتمام</button>` : ''}
        `;
        grid.appendChild(div);
    });
}

window.completeTask = function (id) {
    if (confirm('هل أتممت المهمة؟')) {
        updateTaskStatus(id, 'completed');
    }
};



// --- Helper: Official Layout Style ---
function getOfficialPrintStyle() {
    return `
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;800&display=swap');
        @page { size: A4; margin: 0; }
        body { 
            font-family: 'Cairo', sans-serif; 
            margin: 0; 
            padding: 20px; 
            box-sizing: border-box; 
            height: 100vh;
            direction: rtl;
            background: white;
            -webkit-print-color-adjust: exact;
        }
        .outer-border {
            border: 3px double #4b2c73; /* Purple-ish dark blue */
            height: 96%;
            padding: 10px;
            position: relative;
            box-sizing: border-box;
        }
        .inner-border {
            border: 1px solid #4b2c73;
            height: 100%;
            padding: 20px;
            position: relative;
            box-sizing: border-box;
        }
        
        /* Watermark */
        .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 60%;
            opacity: 0.08;
            pointer-events: none;
            z-index: 0;
        }

        /* Header Layout */
        .header-grid {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #4b2c73;
            padding-bottom: 15px;
            margin-bottom: 40px; /* Increased margin since date is here now */
            position: relative;
            z-index: 2;
        }
        .header-right {
            text-align: center;
            font-weight: bold;
            font-size: 14px;
            color: #000;
            line-height: 1.6;
            width: 250px;
        }
        .header-left {
            text-align: center;
            font-weight: bold;
            font-size: 14px;
            color: #000;
            line-height: 1.6;
            width: 250px;
        }
        .header-center {
            text-align: center;
        }
        .header-center img {
            width: 90px;
        }
        .date-line {
            color: #3498db;
            margin-top: 10px;
            font-weight: bold;
        }

        /* Body Content */
        .form-body {
            position: relative;
            z-index: 2;
            padding: 0 20px;
        }
        .addressee {
            font-weight: 800;
            font-size: 18px;
            margin-bottom: 20px;
        }
        .greeting {
            margin-bottom: 30px;
            font-size: 16px;
        }
        .subject-line {
            text-align: center;
            font-weight: 800;
            font-size: 18px;
            text-decoration: underline;
            text-underline-offset: 5px;
            margin: 20px 0 40px 0;
        }
        .main-text {
            font-size: 18px;
            line-height: 2.2;
            text-align: justify;
            margin-bottom: 50px;
        }
        .closing {
            font-size: 18px;
            margin-bottom: 80px;
            text-align: center;
        }

        /* Footer / Signatures */
        .signatures {
            display: flex;
            justify-content: space-between;
            padding: 0 40px;
            margin-top: 50px;
            position: relative;
            z-index: 2;
        }
        .sig-block {
            text-align: center;
            font-weight: bold;
            font-size: 16px;
            display: flex;
            flex-direction: column;
            gap: 5px; /* Close spacing */
        }
        .sig-title {
            margin-bottom: 5px;
        }
        .sig-name {
            font-weight: 800;
        }

        .english-footer {
            text-align: center;
            color: #bdc3c7;
            font-size: 12px;
            margin-top: 50px;
            font-family: sans-serif;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .field-highlight {
            color: black;
            font-weight: bold;
        }
    </style>
    `;
}

window.printDailyLeave = function () {
    const name = document.getElementById('leaveName').value;
    const days = document.getElementById('leaveDays').value;
    const date = document.getElementById('leaveDate').value;
    const reason = document.getElementById('leaveReason').value;

    if (!name || !days || !date || !reason) { alert('يرجى ملء كافة الحقول'); return; }

    const formattedDate = new Date(date).toLocaleDateString('en-GB');

    const win = window.open('', '', 'height=900,width=800');
    win.document.write(`
        <html>
        <head><title>طلب إجازة اعتيادية</title>${getOfficialPrintStyle()}</head>
        <body>
            <div class="outer-border">
                <div class="inner-border">
                    <img src="logo.png" class="watermark" alt="Watermark">
                    
                    <div class="header-grid">
                        <div class="header-right">
                            جمهورية العراق<br>
                            وزارة التعليم العالي والبحث العلمي<br>
                            كلية الأمل للعلوم الطبية التخصصية
                        </div>
                        <div class="header-center">
                            <img src="logo.png" alt="Logo">
                        </div>
                        <div class="header-left">
                            شعبة الاعلام<br>
                            مذكرة داخلية<br>
                            <div class="date-line">التاريخ: ${formattedDate}</div>
                        </div>
                    </div>

                    <div class="form-body">
                        <div class="addressee">السيد مسؤول شعبة الاعلام المحترم..</div>
                        <div class="greeting">تحية طيبة..</div>
                        
                        <div class="subject-line">م/ طلب اجازة</div>

                        <div class="main-text">
                            يرجى التفضل بالموافقة على منحي إجازة اعتيادية لمدة (<span class="field-highlight">${days}</span>) يوم واحد فقط، وذلك لـ: <span class="field-highlight">${reason}</span>.
                        </div>

                        <div class="closing">
                            راجين تفضلكم بالموافقة مع وافر الاحترام والتقدير
                        </div>
                    </div>

                    <div class="signatures">
                        <div class="sig-block">
                            <div class="sig-title">مقدم الطلب</div>
                            <div class="sig-name">${name}</div>
                        </div>
                        <div class="sig-block">
                            <div class="sig-title">مسؤول شعبة الاعلام</div>
                            <div class="sig-name">م.م علي حسين عبد</div>
                        </div>
                    </div>

                    <div class="english-footer">
                        AL-Amal College for Specialized Medical Sciences
                    </div>
                </div>
            </div>
        </body>
        </html>
    `);
    win.document.close();
    win.onload = function () { setTimeout(() => win.print(), 500); };
};

window.printTimeLeave = function () {
    const name = document.getElementById('timeLeaveName').value;
    const tFrom = document.getElementById('timeFrom').value;
    const tTo = document.getElementById('timeTo').value;
    const dateInput = document.getElementById('timeLeaveDate').value;
    const reason = document.getElementById('timeLeaveReason').value;

    if (!name || !tFrom || !tTo || !reason) { alert('يرجى ملء كافة الحقول'); return; }

    const formattedDate = dateInput ? new Date(dateInput).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');

    const formatTime = (t) => {
        let [h, m] = t.split(':');
        let ampm = h >= 12 ? 'م' : 'ص';
        h = h % 12 || 12;
        return `${h}:${m} ${ampm}`;
    };

    const win = window.open('', '', 'height=900,width=800');
    win.document.write(`
        <html>
        <head><title>طلب إجازة زمنية</title>${getOfficialPrintStyle()}</head>
        <body>
            <div class="outer-border">
                <div class="inner-border">
                    <img src="logo.png" class="watermark" alt="Watermark">
                    
                    <div class="header-grid">
                        <div class="header-right">
                            جمهورية العراق<br>
                            وزارة التعليم العالي والبحث العلمي<br>
                            كلية الأمل للعلوم الطبية التخصصية
                        </div>
                        <div class="header-center">
                            <img src="logo.png" alt="Logo">
                        </div>
                        <div class="header-left">
                            شعبة الاعلام<br>
                            مذكرة داخلية<br>
                            <div class="date-line">التاريخ: ${formattedDate}</div>
                        </div>
                    </div>

                    <div class="form-body">
                        <div class="addressee">السيد مسؤول شعبة الاعلام المحترم..</div>
                        <div class="greeting">تحية طيبة..</div>
                        
                        <div class="subject-line">م/ طلب اجازة زمنية</div>

                        <div class="main-text">
                            يرجى التفضل بالموافقة على منحي إجازة زمنية من الساعة (<span class="field-highlight">${formatTime(tFrom)}</span>) إلى الساعة (<span class="field-highlight">${formatTime(tTo)}</span>)، وذلك لـ: <span class="field-highlight">${reason}</span>.
                        </div>

                        <div class="closing">
                            راجين تفضلكم بالموافقة مع وافر الاحترام والتقدير
                        </div>
                    </div>

                    <div class="signatures">
                         <div class="sig-block">
                            <div class="sig-title">مقدم الطلب</div>
                            <div class="sig-name">${name}</div>
                        </div>
                        <div class="sig-block">
                            <div class="sig-title">مسؤول شعبة الاعلام</div>
                            <div class="sig-name">م.م علي حسين عبد</div>
                        </div>
                    </div>

                    <div class="english-footer">
                        AL-Amal College for Specialized Medical Sciences
                    </div>
                </div>
            </div>
        </body>
        </html>
    `);
    win.document.close();
    win.onload = function () { setTimeout(() => win.print(), 500); };
};

// Global Exposure
window.refreshData = function (btn) {
    if (btn) btn.disabled = true;
    fetchEmployees().then(() => fetchTasks()).finally(() => { if (btn) btn.disabled = false; alert('تم التحديث'); });
};


// Global Exposure
window.renderMyProfile = function () {
    if (!currentUser) return;
    document.getElementById('profile-name-display').innerText = currentUser.fullName;
    document.getElementById('profile-img-display').src = currentUser.image || 'assets/user-placeholder.png';
    // ... Fill other fields ...
};

// 9. Seeding Helper
window.seedDatabase = async function () {
    if (!confirm('هل تريد إضافة بيانات تجريبية (محمد، سارة، علي)؟')) return;

    // Tiny base64 placeholder for avatars
    const DUMMY_IMG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

    const dummyEmployees = [
        { fullName: "محمد أحمد", specialization: "مصمم جرافيك", age: 25, title: "موظف", phone: "07700000001", address: "بغداد", instagram: "@mohammed", image: DUMMY_IMG },
        { fullName: "سارة علي", specialization: "كاتب محتوى", age: 24, title: "موظفة", phone: "07700000002", address: "البصرة", instagram: "@sara", image: DUMMY_IMG },
        { fullName: "علي حسين عبد", specialization: "مسؤول شعبة الاعلام", age: 30, title: "مدير", phone: "07800000000", address: "كربلاء", instagram: "@ali", image: DUMMY_IMG }
    ];

    alert('⏳ جاري الإضافة... قد يستغرق دقيقة');

    for (const emp of dummyEmployees) {
        await callApi("addEmployee", emp, "POST");
    }

    alert('✅ تم إضافة البيانات التجريبية! سيتم تحديث الصفحة.');
    fetchEmployees();
};
