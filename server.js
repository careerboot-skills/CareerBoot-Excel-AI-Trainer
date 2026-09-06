<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CareerBoot - Master Excel</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        body, html {
            width: 100%;
            height: 100%;
            overflow-x: hidden;
            background-color: #0f172a;
            color: #f8fafc;
        }

        .page {
            display: none;
            width: 100vw;
            min-height: 100vh;
            position: absolute;
            top: 0;
            left: 0;
        }

        .page.active {
            display: flex;
            flex-direction: column;
        }

        /* --- PAGE 1: LOGIN STAGING --- */
        #page1 {
            height: 100vh;
            overflow: hidden;
        }

        .section-top {
            height: 35vh;
            background: linear-gradient(135deg, #1e293b, #0f172a);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 10px;
            border-bottom: 2px solid #334155;
        }

        .logo-container {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 1.8rem;
            font-weight: bold;
            color: #10b981;
        }

        .journey-container {
            width: 80%;
            max-width: 600px;
            margin-top: 15px;
            position: relative;
        }

        .journey-svg {
            width: 100%;
            height: 60px;
        }

        .section-mid {
            height: 15vh;
            background: #1e293b;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            position: relative;
            z-index: 10;
        }

        .key-input {
            padding: 12px 20px;
            font-size: 1.1rem;
            border-radius: 8px;
            border: 2px solid #3b82f6;
            background: #0f172a;
            color: #ffffff;
            outline: none;
            width: 260px;
            text-align: center;
            letter-spacing: 2px;
        }

        .submit-btn {
            padding: 12px 24px;
            font-size: 1rem;
            font-weight: bold;
            background: #10b981;
            color: #ffffff;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            transition: transform 0.2s, background 0.2s;
        }

        .submit-btn:hover {
            background: #059669;
            transform: scale(1.05);
        }

        .section-bottom {
            height: 50vh;
            background: #0f172a;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
        }

        /* Animated Cloud Element */
        .cloud {
            position: absolute;
            width: 30px;
            height: 20px;
            background: #cbd5e1;
            border-radius: 10px;
            opacity: 0;
            pointer-events: none;
            z-index: 5;
        }

        @keyframes cloudTravel {
            0% {
                top: 40vh;
                left: 50%;
                opacity: 1;
                transform: scale(0.5) translateX(-50%);
            }
            50% {
                opacity: 0.8;
                transform: scale(1.2) translateX(-20px);
            }
            100% {
                top: 70vh;
                left: 50%;
                opacity: 0;
                transform: scale(0.2) translateX(0);
            }
        }

        .cloud-active {
            animation: cloudTravel 2s forwards ease-in-out;
        }

        .status-message {
            position: absolute;
            bottom: 20px;
            font-size: 1.2rem;
            font-weight: bold;
            height: 25px;
        }

        /* --- GLOBAL HEADER & NAVIGATION --- */
        .app-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 30px;
            background: #1e293b;
            border-bottom: 2px solid #334155;
        }

        .nav-controls {
            display: flex;
            gap: 10px;
        }

        .nav-btn {
            padding: 8px 16px;
            background: #3b82f6;
            color: #ffffff;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
        }

        .nav-btn:hover {
            background: #2563eb;
        }

        .nav-btn.home-btn {
            background: #64748b;
        }

        .nav-btn.home-btn:hover {
            background: #475569;
        }

        /* --- DASHBOARD & CATEGORY GRID LAYOUTS --- */
        .container {
            padding: 40px;
            max-width: 1200px;
            margin: 0 auto;
            width: 100%;
        }

        .grid-layout {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 20px;
            margin-top: 25px;
        }

        .card-btn {
            background: #1e293b;
            border: 2px solid #334155;
            padding: 25px;
            border-radius: 12px;
            color: #ffffff;
            font-size: 1.1rem;
            font-weight: bold;
            cursor: pointer;
            text-align: center;
            transition: all 0.25s ease;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 10px;
        }

        .card-btn:hover {
            border-color: #10b981;
            transform: translateY(-5px);
            box-shadow: 0 10px 20px rgba(16, 185, 129, 0.15);
        }

        .admin-card {
            border-color: #f59e0b;
            background: #271e0c;
        }

        .admin-card:hover {
            border-color: #fbbf24;
            box-shadow: 0 10px 20px rgba(245, 158, 11, 0.2);
        }

        .content-box {
            background: #1e293b;
            border-radius: 12px;
            padding: 30px;
            margin-top: 20px;
            border: 1px solid #334155;
        }
    </style>
</head>
<body>

    <!-- PAGE 1: AUTHENTICATION & ANIMATION -->
    <div id="page1" class="page active">
        <div class="section-top">
            <div class="logo-container">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                    <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
                </svg>
                <span>CareerBoot</span>
            </div>
            <p style="color: #94a3b8; margin-top: 5px;">Unlock Advanced Excel Mastery</p>
            
            <div class="journey-container">
                <svg class="journey-svg" viewBox="0 0 500 60">
                    <line x1="50" y1="40" x2="450" y2="40" stroke="#334155" stroke-width="4" stroke-dasharray="6,6"></line>
                    <circle cx="50" cy="40" r="10" fill="#3b82f6"></circle>
                    <text x="50" y="20" fill="#3b82f6" font-size="12" text-anchor="middle" font-weight="bold">Interest</text>
                    
                    <circle cx="450" cy="40" r="10" fill="#10b981"></circle>
                    <text x="450" y="20" fill="#10b981" font-size="12" text-anchor="middle" font-weight="bold">Success</text>

                    <g id="walker" transform="translate(50, 0)">
                        <circle cx="0" cy="25" r="5" fill="#f59e0b"></circle>
                        <line x1="0" y1="30" x2="0" y2="38" stroke="#f59e0b" stroke-width="2"></line>
                        <line x1="0" y1="38" x2="-3" y2="45" stroke="#f59e0b" stroke-width="2"></line>
                        <line x1="0" y1="38" x2="3" y2="45" stroke="#f59e0b" stroke-width="2"></line>
                    </g>
                </svg>
            </div>
        </div>

        <div class="section-mid">
            <input type="password" id="secretKey" class="key-input" placeholder="Enter Secret Key" autocomplete="off">
            <button class="submit-btn" id="submitBtn">Unlock Portal</button>
        </div>

        <div class="section-bottom">
            <div id="cloudElement" class="cloud"></div>
            
            <svg width="220" height="180" viewBox="0 0 200 160">
                <rect x="20" y="120" width="160" height="8" rx="2" fill="#64748b"></rect>
                <rect x="70" y="50" width="60" height="45" rx="4" fill="#334155" stroke="#475569" stroke-width="2"></rect>
                <rect id="screenGlow" x="73" y="53" width="54" height="39" rx="2" fill="#1e293b"></rect>
                <rect x="95" y="95" width="10" height="25" fill="#475569"></rect>
                <rect x="85" y="118" width="30" height="3" fill="#475569"></rect>
                
                <circle cx="150" cy="70" r="12" fill="#cbd5e1"></circle>
                <path d="M 150 82 L 150 115 L 135 120" stroke="#cbd5e1" stroke-width="10" stroke-linecap="round" fill="none"></path>
            </svg>

            <div id="statusMsg" class="status-message"></div>
        </div>
    </div>

    <!-- PAGE 2: MAIN DASHBOARD -->
    <div id="page2" class="page">
        <header class="app-header">
            <h2>CareerBoot Dashboard</h2>
            <div class="nav-controls">
                <button class="nav-btn home-btn" onclick="navigateTo('page1')">Home (Exit)</button>
            </div>
        </header>
        <div class="container">
            <h3>Select Learning Module</h3>
            <div class="grid-layout" id="dashboard-grid">
                <button class="card-btn" onclick="openCategory('formulas')">
                    <span>📐</span> All Formulas
                </button>
                <button class="card-btn" onclick="openCategory('shortcuts')">
                    <span>⌨️</span> Pro Shortcut Keys
                </button>
                <button class="card-btn" onclick="openCategory('functions')">
                    <span>⚡</span> Advanced Functions
                </button>
                <button class="card-btn" onclick="openCategory('pivots')">
                    <span>📊</span> Pivot Tables & Dashboards
                </button>
                <button class="card-btn" onclick="openCategory('vba')">
                    <span>🤖</span> Power Query & VBA
                </button>
            </div>
        </div>
    </div>

    <!-- PAGE 3: CATEGORY DRILL-DOWN -->
    <div id="page3" class="page">
        <header class="app-header">
            <h2 id="categoryTitle">Category Details</h2>
            <div class="nav-controls">
                <button class="nav-btn" onclick="navigateTo('page2')">Back</button>
                <button class="nav-btn home-btn" onclick="navigateTo('page1')">Home</button>
            </div>
        </header>
        <div class="container">
            <div id="categoryContentGrid" class="grid-layout"></div>
            <div class="content-box" id="learningMaterialPlaceholder">
                <p style="color: #94a3b8; text-align: center;">Select a sub-topic above to view complete step-by-step guides and interactive examples.</p>
            </div>
        </div>
    </div>

    <!-- PAGE 4: ADMIN PANEL -->
    <div id="pageAdmin" class="page">
        <header class="app-header" style="border-bottom-color: #f59e0b;">
            <h2 style="color: #f59e0b;">Admin Control Center</h2>
            <div class="nav-controls">
                <button class="nav-btn" onclick="navigateTo('page2')">Dashboard</button>
                <button class="nav-btn home-btn" onclick="navigateTo('page1')">Home</button>
            </div>
        </header>
        <div class="container">
            <div class="content-box" style="border-color: #f59e0b;">
                <h3>System Administration & Content Manager</h3>
                <p style="margin-top: 10px; color: #cbd5e1;">Manage active security keys, update category structures, and inspect portal analytics.</p>
            </div>
        </div>
    </div>

    <script>
        // Constants
        var USER_KEY = "EXCEL2026";
        var ADMIN_KEY = "ADMIN2026";

        // Navigation Controller
        function navigateTo(pageId) {
            var pages = document.querySelectorAll('.page');
            for (var i = 0; i < pages.length; i++) {
                pages[i].classList.remove('active');
            }
            var targetPage = document.getElementById(pageId);
            if (targetPage) {
                targetPage.classList.add('active');
            }
        }

        // Walker Animation
        var walkerPos = 50;
        setInterval(function() {
            var walker = document.getElementById('walker');
            if (walker) {
                walkerPos += 0.5;
                if (walkerPos > 450) {
                    walkerPos = 50;
                }
                walker.setAttribute('transform', 'translate(' + walkerPos + ', 0)');
            }
        }, 30);

        // Key Validation Logic
        function validateKey() {
            var keyInput = document.getElementById('secretKey').value.trim();
            var cloud = document.getElementById('cloudElement');
            var screen = document.getElementById('screenGlow');
            var status = document.getElementById('statusMsg');

            if (!keyInput) {
                status.style.color = '#ef4444';
                status.innerText = "Please enter a key!";
                return;
            }

            status.innerText = "";
            cloud.classList.remove('cloud-active');
            void cloud.offsetWidth; 
            cloud.classList.add('cloud-active');

            setTimeout(function() {
                if (keyInput === USER_KEY || keyInput === ADMIN_KEY) {
                    screen.setAttribute('fill', '#10b981');
                    status.style.color = '#10b981';
                    status.innerText = "Access Granted! Welcome.";

                    if (keyInput === ADMIN_KEY) {
                        injectAdminTile();
                    }

                    setTimeout(function() {
                        screen.setAttribute('fill', '#1e293b');
                        status.innerText = "";
                        document.getElementById('secretKey').value = "";
                        navigateTo('page2');
                    }, 1000);

                } else {
                    screen.setAttribute('fill', '#ef4444');
                    status.style.color = '#ef4444';
                    status.innerText = "Invalid Key! Access Denied.";

                    setTimeout(function() {
                        screen.setAttribute('fill', '#1e293b');
                    }, 1200);
                }
            }, 2000);
        }

        function injectAdminTile() {
            if (document.getElementById('adminTile')) return;
            var grid = document.getElementById('dashboard-grid');
            if (!grid) return;
            
            var adminBtn = document.createElement('button');
            adminBtn.id = 'adminTile';
            adminBtn.className = 'card-btn admin-card';
            adminBtn.onclick = function() { navigateTo('pageAdmin'); };
            adminBtn.innerHTML = '<span>⚙️</span> Admin Panel';
            grid.appendChild(adminBtn);
        }

        function openCategory(categoryType) {
            var titleElement = document.getElementById('categoryTitle');
            var gridElement = document.getElementById('categoryContentGrid');
            if (!gridElement || !titleElement) return;

            gridElement.innerHTML = '';

            var categoryData = {
                formulas: {
                    title: "All Excel Formulas",
                    items: ["Math & Trig", "Logical (IF, AND, OR)", "Lookup & Ref (XLOOKUP)", "Text Manipulation", "Financial Functions", "Date & Time"]
                },
                shortcuts: {
                    title: "Pro Level Shortcuts",
                    items: ["Basic Formatting", "Ribbon Navigation (Alt+H)", "Conditional Formatting (Alt+H+L)", "Pivot Creation (Alt+N+V)", "Data Filtering (Alt+A+T)"]
                },
                functions: {
                    title: "Advanced Excel Functions",
                    items: ["INDEX & MATCH Mastery", "DYNAMIC ARRAYS (SORT, FILTER)", "LAMBDA & Custom Functions", "Nested Statements"]
                },
                pivots: {
                    title: "Pivot Tables & Dashboards",
                    items: ["Data Modeling", "Calculated Fields", "Slicers & Timelines", "Interactive Charts"]
                },
                vba: {
                    title: "Power Query & Automation",
                    items: ["ETL Data Cleaning", "M Code Basics", "VBA Macro Recording", "Automating Reports"]
                }
            };

            var data = categoryData[categoryType] || { title: "Category", items: [] };
            titleElement.innerText = data.title;

            data.items.forEach(function(item) {
                var btn = document.createElement('button');
                btn.className = 'card-btn';
                btn.innerText = item;
                btn.onclick = function() {
                    var placeholder = document.getElementById('learningMaterialPlaceholder');
                    if (placeholder) {
                        placeholder.innerHTML = '<h4 style="color: #10b981; margin-bottom: 10px;">' + item + '</h4>' +
                            '<p style="color: #cbd5e1;">Detailed lessons, formula breakdowns, shortcuts, and copyable syntax examples for <strong>' + item + '</strong> will load here in the next step.</p>';
                    }
                };
                gridElement.appendChild(btn);
            });

            navigateTo('page3');
        }

        // Event Listener Initialization
        document.addEventListener('DOMContentLoaded', function() {
            var submitBtn = document.getElementById('submitBtn');
            if (submitBtn) {
                submitBtn.addEventListener('click', validateKey);
            }

            var secretKeyInput = document.getElementById('secretKey');
            if (secretKeyInput) {
                secretKeyInput.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter') {
                        validateKey();
                    }
                });
            }
        });
    </script>
</body>
</html>
