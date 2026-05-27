// Modal elements
const loginBtn = document.getElementById('loginBtn');
const modal = document.getElementById('loginModal');
const closeBtn = modal ? modal.querySelector('.close') : null;
const loginTab = document.getElementById('loginTab');
const signupTab = document.getElementById('signupTab');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');

// Admin access
window.isAdmin = false;
window.username = "";

// Initialize everything when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    // Initial setup
    initSections();
    attachCheckboxListeners();
    loadCheckboxesAndProgress();
    toggleAddButton();
    
    // Update global progress after everything loads
    setTimeout(() => {
        updateGlobalProgress();
        updateCalendar();
    }, 100);
});

// Initialize sections visibility
function initSections() {
    document.querySelectorAll('.section').forEach(section => {
        if (section.dataset.category !== 'Arrays') {
            section.style.display = 'none';
        }
        updateProgress(section);
    });
}

// Attach event listeners to ALL checkboxes (including dynamically added ones)
function attachCheckboxListeners() {
    document.querySelectorAll('.done input[type="checkbox"], .revision input[type="checkbox"]').forEach(chk => {
        // Remove existing listeners to prevent duplicates
        chk.removeEventListener('change', handleCheckboxChange);
        chk.addEventListener('change', handleCheckboxChange);
    });
}

// 🔥 FIXED: Handle checkbox changes - saves to localStorage AND updates calendar
function handleCheckboxChange() {
    const chk = this;
    const problem = chk.closest('.problem');
    const section = chk.closest('.section');
    
    if (!problem || !section) return;

    // Get clean titles without extra whitespace/newlines
    const sectionName = section.querySelector('.section-header span').innerText.trim();
    const problemTitle = problem.querySelector('.title')?.innerText.trim() || 
                         problem.querySelector('span')?.innerText.trim();
    
    const type = chk.closest('.done') ? 'done' : 'revision';
    
    // Create CONSISTENT key (no newlines!)
    const key = `${sectionName}||${problemTitle}||${type}`;
    
    // Save to localStorage
    let data = JSON.parse(localStorage.getItem('dsa_checkbox_data')) || {};
    data[key] = chk.checked;
    data['lastUpdated'] = new Date().toISOString(); // Track last activity date
    
    localStorage.setItem('dsa_checkbox_data', JSON.stringify(data));
    
    // If checked as "done", save today's date to calendar
    if (chk.checked && type === 'done') {
        saveDateToCalendar(problemTitle);
    }
    
    // Update UI
    updateProgress(section);
    updateGlobalProgress();
    updateCalendar(); // 🗓️ UPDATE CALENDAR VISUALLY
}

// 📅 Save completion date
function saveDateToCalendar(problemName) {
    let calendarData = JSON.parse(localStorage.getItem('dsa_calendar_data')) || [];
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Check if today already recorded for this problem
    const exists = calendarData.some(entry => entry.date === today && entry.problem === problemName);
    
    if (!exists) {
        calendarData.push({
            date: today,
            problem: problemName,
            timestamp: Date.now()
        });
        localStorage.setItem('dsa_calendar_data', JSON.stringify(calendarData));
    }
}

// 🗓️ UPDATE CALENDAR VISUALIZATION
function updateCalendar() {
    const calendarDays = document.querySelectorAll('.calendar-day');
    const calendarData = JSON.parse(localStorage.getItem('dsa_calendar_data')) || [];
    
    // Get all unique dates where problems were completed
    const activeDates = [...new Set(calendarData.map(d => d.date))];
    
    // Get today's date to highlight
    const today = new Date().toISOString().split('T')[0];
    
    calendarDays.forEach(dayEl => {
        const dayNum = parseInt(dayEl.innerText);
        if (!dayNum) return;
        
        // Determine year/month from calendar header (assuming "May 2026" format)
        const header = document.querySelector('.calendar-header, .calendar-title');
        const [monthStr, yearStr] = header ? header.textContent.split(' ') : ['May', '2026'];
        
        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const monthIdx = monthNames.indexOf(monthStr);
        const year = parseInt(yearStr);
        
        // Create date string matching our stored format
        const dateStr = `${year}-${String(monthIdx + 1).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`;
        
        // Check if this date has any completions
        const hasCompletion = activeDates.includes(dateStr);
        const isToday = dateStr === today;
        
        // Visual update
        if (hasCompletion) {
            dayEl.classList.add('completed-day'); // Add green background class
            dayEl.style.backgroundColor = '#22c55e'; // Green color
            dayEl.style.color = '#fff';
            dayEl.style.borderRadius = '50%';
        }
        
        if (isToday) {
            dayEl.classList.add('today-marker');
            dayEl.style.boxShadow = '0 0 0 2px #fff, 0 0 0 4px #22c55e';
        }
    });
    
    // Also update streak counter if exists
    updateStreakCounter(calendarData);
}

// Calculate and display streak
function updateStreakCounter(data) {
    const streakEl = document.getElementById('streakCount');
    if (!streakEl) return;
    
    if (data.length === 0) {
        streakEl.textContent = '0';
        return;
    }
    
    // Sort by date descending
    const sortedDates = [...new Set(data.map(d => d.date))].sort().reverse();
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    let streak = 0;
    if (sortedDates[0] === today || sortedDates[0] === yesterday) {
        streak = 1;
        let currentDate = new Date(sortedDates[0]);
        
        for (let i = 1; i < sortedDates.length; i++) {
            const prevDate = new Date(currentDate.getTime() - 86400000).toISOString().split('T')[0];
            if (sortedDates[i] === prevDate) {
                streak++;
                currentDate = new Date(prevDate);
            } else {
                break;
            }
        }
    }
    
    streakEl.textContent = streak;
}

// ✅ FIXED LOAD FUNCTION (No newlines in keys!)
function loadCheckboxesAndProgress() {
    // Use consistent key name
    const data = JSON.parse(localStorage.getItem('dsa_checkbox_data')) || {};
    
    console.log('Loading saved data:', data); // Debug helper
    
    document.querySelectorAll('.section').forEach(section => {
        section.querySelectorAll('.problem').forEach(prob => {
            // Get clean names
            const sectionName = section.querySelector('.section-header span')?.innerText?.trim() || '';
            
            // Try multiple selectors for title
            const titleEl = prob.querySelector('.title') || prob.querySelector('h3, h4, p, span:first-child');
            const problemTitle = titleEl?.innerText?.trim() || '';
            
            if (!sectionName || !problemTitle) {
                console.warn('Missing data:', { sectionName, problemTitle });
                return;
            }

            ['done', 'revision'].forEach(type => {
                // Construct key EXACTLY same way as save (no newlines)
                const key = `${sectionName}||${problemTitle}||${type}`;
                
                const container = prob.querySelector(`.${type}`);
                const checkbox = container?.querySelector('input[type="checkbox"]');
                
                if (checkbox) {
                    // Check if this key exists in saved data
                    if (data[key] !== undefined) {
                        checkbox.checked = data[key];
                        console.log(`Restored: ${key} = ${data[key]}`);
                    } else {
                        // Fallback: try old format without || separator (migration)
                        const oldKey = `${sectionName}-${problemTitle}-${type}`;
                        if (data[oldKey] !== undefined) {
                            checkbox.checked = data[oldKey];
                        }
                    }
                }
            });
        });

        // Update bars AFTER restoring states
        updateProgress(section);
    });
    
    // Update calendar after loading
    updateCalendar();
}

// Progress calculation
function updateProgress(section) {
    const doneBar = section.querySelector('.done-bar');
    const revisionBar = section.querySelector('.revision-bar');
    
    if (!doneBar || !revisionBar) return;

    const problems = section.querySelectorAll('.problem');
    const total = problems.length;
    if (total === 0) return;

    let doneCount = 0;
    let revisionCount = 0;

    problems.forEach(p => {
        const doneCheckbox = p.querySelector('.done input[type="checkbox"]');
        const revisionCheckbox = p.querySelector('.revision input[type="checkbox"]');
        if (doneCheckbox && doneCheckbox.checked) doneCount++;
        if (revisionCheckbox && revisionCheckbox.checked) revisionCount++;
    });

    const donePercent = (doneCount / total) * 100;
    const revisionPercent = (revisionCount / total) * 100;

    doneBar.style.width = donePercent + '%';
    revisionBar.style.width = revisionPercent + '%';

    // Update header count (e.g., "3/9")
    const headerCount = section.querySelector('.section-header span:nth-child(2)');
    if (headerCount) {
        headerCount.textContent = `${doneCount}/${total}`;
    }
}

// Global progress update
function updateGlobalProgress() {
    const activeTab = document.querySelector('.tab.active');
    if (!activeTab) return;
    
    const category = activeTab.textContent.replace(/\s/g, '');
    const sections = document.querySelectorAll(`.section[data-category="${category}"]`);

    let total = 0;
    let done = 0;

    sections.forEach(section => {
        const problems = section.querySelectorAll('.problem');
        total += problems.length;

        problems.forEach(p => {
            const doneCheckbox = p.querySelector('.done input[type="checkbox"]');
            if (doneCheckbox && doneCheckbox.checked) done++;
        });
    });

    const progressText = document.getElementById("progressText");
    if (progressText) {
        progressText.innerText = `${done}/${total}`;
    }
}

// --- Navigation Functions ---

function goHome() {
    document.querySelector('.tabs').style.display = 'block';
    document.getElementById('notesPage').style.display = 'none';
    document.getElementById('linksPage').style.display = 'none';
    document.getElementById('booksPage').style.display = 'none';

    document.querySelectorAll('.section').forEach(section => {
        section.style.display = (section.dataset.category === 'Arrays') ? 'block' : 'none';
    });

    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab')[0]?.classList.add('active');
    updateGlobalProgress();
}

function openNotes() {
    document.querySelectorAll('.section').forEach(sec => sec.style.display = 'none');
    document.querySelector('.tabs').style.display = 'none';
    document.getElementById('notesPage').style.display = 'block';
    document.getElementById('linksPage').style.display = 'none';
    document.getElementById('booksPage').style.display = 'none';
    loadNotesLinksBooks();
}

function openLinks() {
    document.querySelectorAll('.section').forEach(sec => sec.style.display = 'none');
    document.querySelector('.tabs').style.display = 'none';
    document.getElementById('notesPage').style.display = 'none';
    document.getElementById('linksPage').style.display = 'block';
    document.getElementById('booksPage').style.display = 'none';
    loadNotesLinksBooks();
}

function openBooks() {
    document.querySelectorAll('.section').forEach(sec => sec.style.display = 'none');
    document.querySelector('.tabs').style.display = 'none';
    document.getElementById('notesPage').style.display = 'none';
    document.getElementById('linksPage').style.display = 'none';
    document.getElementById('booksPage').style.display = 'block';
    loadNotesLinksBooks();
}

function switchTab(tab) {
    const category = tab.textContent.replace(/\s/g, '');

    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    document.querySelectorAll('.section').forEach(section => {
        section.style.display = (section.dataset.category === category) ? 'block' : 'none';
    });

    updateGlobalProgress();
}

function toggleSection(section, event) {
    if (event.target.tagName === 'INPUT') return;
    const content = section.querySelector('.content');
    if (content) {
        content.style.display = content.style.display === 'block' ? 'none' : 'block';
    }
}

// --- Upload/Save Functions ---

function uploadFile() {
    const input = document.getElementById("fileInput");
    if (!input.files.length) {
        alert("Select a file first!");
        return;
    }

    const file = input.files[0];
    const container = document.getElementById("notesContainer");
    const url = URL.createObjectURL(file);

    const card = document.createElement("div");
    card.className = "card note-card";

    if (file.type.startsWith("image")) {
        card.innerHTML = `
            <img src="${url}" style="max-width:100%; border-radius:8px; margin-bottom:10px;">
            <p>${file.name}</p>
            <div class="card-buttons">
                <a href="${url}" target="_blank">View Image</a>
                <button onclick="this.closest('.card').remove()">Remove</button>
            </div>
        `;
    } else {
        card.innerHTML = `
            <p>${file.name}</p>
            <div class="card-buttons">
                <a href="${url}" target="_blank">Open PDF</a>
                <button onclick="this.closest('.card').remove()">Remove</button>
            </div>
        `;
    }

    container.appendChild(card);
    input.value = "";
    saveNotesLinksBooks();
}

function addLink() {
    const input = document.getElementById("linkInput");
    const url = input.value.trim();
    if (!url) { alert("Enter a link!"); return; }

    const container = document.getElementById("linksContainer");

    const card = document.createElement("div");
    card.className = "card note-card";
    card.innerHTML = `
        <p>${url}</p>
        <div class="card-buttons">
            <a href="${url}" target="_blank">Open Link</a>
            <button onclick="this.closest('.card').remove(); saveNotesLinksBooks();">Remove</button>
        </div>
    `;
    container.appendChild(card);
    input.value = "";
    saveNotesLinksBooks();
}

function addBook() {
    const nameInput = document.getElementById("bookNameInput");
    const fileInput = document.getElementById("bookFileInput");
    const name = nameInput.value.trim();
    const file = fileInput.files[0];

    if (!name) { alert("Enter book name!"); return; }
    if (!file) { alert("Select file!"); return; }

    const container = document.getElementById("booksContainer");
    const url = URL.createObjectURL(file);

    const card = document.createElement("div");
    card.className = "card book-card";
    card.innerHTML = `
        <p>${name}</p>
        <div class="card-buttons">
            <a href="${url}" target="_blank">Open PDF</a>
            <button onclick="this.closest('.card').remove(); saveNotesLinksBooks();">Remove</button>
        </div>
    `;
    container.appendChild(card);

    nameInput.value = "";
    fileInput.value = "";
    saveNotesLinksBooks();
}

function saveNotesLinksBooks() {
    const notes = [], links = [], books = [];
    
    document.querySelectorAll('#notesContainer .note-card')?.forEach(n => notes.push(n.innerHTML));
    document.querySelectorAll('#linksContainer .note-card')?.forEach(l => links.push(l.innerHTML));
    document.querySelectorAll('#booksContainer .book-card')?.forEach(b => books.push(b.innerHTML));

    localStorage.setItem('dsa_notes', JSON.stringify(notes));
    localStorage.setItem('dsa_links', JSON.stringify(links));
    localStorage.setItem('dsa_books', JSON.stringify(books));
}

function loadNotesLinksBooks() {
    const notes = JSON.parse(localStorage.getItem('dsa_notes') || '[]');
    const links = JSON.parse(localStorage.getItem('dsa_links') || '[]');
    const books = JSON.parse(localStorage.getItem('dsa_books') || '[]');

    const notesContainer = document.getElementById('notesContainer');
    const linksContainer = document.getElementById('linksContainer');
    const booksContainer = document.getElementById('booksContainer');

    notes.forEach(n => { 
        const div = document.createElement('div'); 
        div.className = 'note-card'; 
        div.innerHTML = n; 
        if(notesContainer) notesContainer.appendChild(div); 
    });
    
    links.forEach(l => { 
        const div = document.createElement('div'); 
        div.className = 'note-card'; 
        div.innerHTML = l; 
        if(linksContainer) linksContainer.appendChild(div); 
    });
    
    books.forEach(b => { 
        const div = document.createElement('div'); 
        div.className = 'book-card'; 
        div.innerHTML = b; 
        if(booksContainer) booksContainer.appendChild(div); 
    });
}

// --- Admin Functions ---

if (loginBtn) {
    loginBtn.addEventListener('click', () => modal.style.display = 'block');
}
if (closeBtn) {
    closeBtn.addEventListener('click', () => modal.style.display = 'none');
}
window.addEventListener('click', e => { 
    if (e.target == modal) modal.style.display = 'none'; 
});

if (loginTab && loginForm && signupTab && signupForm) {
    loginTab.addEventListener('click', () => {
        loginTab.classList.add('active');
        signupTab.classList.remove('active');
        loginForm.style.display = 'flex';
        signupForm.style.display = 'none';
    });
    
    signupTab.addEventListener('click', () => {
        signupTab.classList.add('active');
        loginTab.classList.remove('active');
        signupForm.style.display = 'flex';
        loginForm.style.display = 'none';
    });

    loginForm.addEventListener('submit', async e => {
        e.preventDefault();
        const username = document.getElementById("loginUsername").value;
        const password = document.getElementById("loginPassword").value;

        try {
            const res = await fetch("http://localhost:5000/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            });

            if (res.ok) {
                alert("Admin logged in");
                window.isAdmin = true;
                toggleAddButton();
            } else {
                alert("Invalid credentials");
            }
        } catch (err) {
            console.error(err);
            alert("Connection error");
        }
    });
}

function adminLogin(username, password) {
    fetch("http://localhost:5000/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            window.isAdmin = data.role === "admin";
            window.username = username;
            alert("Login successful!");
            toggleAddButton();
        } else {
            alert("Login failed");
        }
    });
}

function toggleAddButton() {
    const btn = document.getElementById("addProblemBtn");
    if (btn) btn.style.display = window.isAdmin ? "block" : "none";
}

function addProblem() {
    if (!window.isAdmin) { alert("Admin only"); return; }

    const title = prompt("Problem name");
    const link = prompt("Problem link");
    const category = prompt("Category (Arrays / Strings / DP)");
    const section = prompt("Section name (same as header)");

    fetch("http://localhost:5000/add-problem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, link, category, section })
    }).then(() => loadProblems());
}

function loadProblems() {
    fetch("/problems")
    .then(res => res.json())
    .then(data => {
        data.forEach(p => {
            const sections = document.querySelectorAll(`.section[data-category="${p.category}"]`);
            sections.forEach(sec => {
                const header = sec.querySelector(".section-header span").innerText;
                if (header === p.section) {
                    const container = sec.querySelector(".content");
                    const div = document.createElement("div");
                    div.className = "problem";
                    
                    // Standard HTML structure for new problem
                    div.innerHTML = `
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span class='title'>${p.title}</span>
                            <a href='${p.link}' target='_blank'>🔗</a>
                        </div>
                        <div style="display:flex; gap:10px;">
                            <label>Done: <input type='checkbox' class='done-chk'></label>
                            <label>Revision: <input type='checkbox' class='rev-chk'></label>
                        </div>
                    `;
                    
                    container.appendChild(div);
                    
                    // Attach listeners to new checkboxes!
                    const chkDone = div.querySelector('.done-chk');
                    const chkRev = div.querySelector('.rev-chk');
                    
                    if(chkDone) {
                        chkDone.closest('label').className = 'done';
                        chkDone.type = 'checkbox';
                        chkDone.addEventListener('change', handleCheckboxChange);
                    }
                    if(chkRev) {
                        chkRev.closest('label').className = 'revision';
                        chkRev.type = 'checkbox';
                        chkRev.addEventListener('change', handleCheckboxChange);
                    }
                }
            });
        });
        
        // Re-init after dynamic content
        updateGlobalProgress();
    });
}

// Export for debugging
window.clearAllData = function() {
    if(confirm('Clear all local data?')) {
        localStorage.removeItem('dsa_checkbox_data');
        localStorage.removeItem('dsa_calendar_data');
        location.reload();
    }
};
