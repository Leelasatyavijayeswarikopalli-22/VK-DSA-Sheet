// Modal elements
const loginBtn = document.getElementById('loginBtn');
const modal = document.getElementById('loginModal');
const closeBtn = modal ? modal.querySelector('.close') : null;
const loginTab = document.getElementById('loginTab');
const signupTab = document.getElementById('signupTab');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');

// Open modal

if(loginBtn && modal){
    loginBtn.addEventListener('click', () => {
        modal.style.display = 'block';
    });
}

if(closeBtn && modal){
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', e => {
        if(e.target == modal){
            modal.style.display = 'none';
        }
    });
}
// Switch tabs
if(loginTab && signupTab && loginForm && signupForm){
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
}
// Login actions
if(loginForm){
loginForm.addEventListener('submit', async e => {
    e.preventDefault();

    const username = document.getElementById("loginUsername").value;
    const password = document.getElementById("loginPassword").value;

    const res = await fetch("http://localhost:5000/login",{
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({username,password})
    });
    

    if(res.ok){
        alert("Admin logged in");
        window.isAdmin = true;
    }else{
        alert("Invalid credentials");
    }
});
    }
// Toggle section
function toggleSection(section, event) {

    if (
        event.target.tagName === 'INPUT' ||
        event.target.tagName === 'A' ||
        event.target.tagName === 'IMG'
    ) {
        return;
    }

    const content = section.querySelector('.content');

    content.style.display =
        content.style.display === 'block'
        ? 'none'
        : 'block';
}
document.addEventListener('DOMContentLoaded', () => {

    localStorage.removeItem("practiceHistory");

});
// Tab switching

function switchTab(tab) {
    const category = tab.textContent.replace(/\s/g,'');

    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    document.querySelectorAll('.section').forEach(section => {
        section.style.display = (section.dataset.category === category) ? 'block' : 'none';
    });

    updateGlobalProgress(); // 🔥 important
}
// ✅ NOTES PAGE FUNCTION (OUTSIDE)
function openNotes() {
    document.querySelectorAll('.section').forEach(sec => sec.style.display = 'none');
    document.querySelector('.tabs').style.display = 'none';

     document.getElementById('notesPage').style.display = 'block';
    document.getElementById('linksPage').style.display = 'none';
    document.getElementById('booksPage').style.display = 'none';
}

// ✅ HOME FUNCTION
function goHome() {
    document.querySelector('.tabs').style.display = 'block';
    document.getElementById('notesPage').style.display = 'none';
    document.getElementById('linksPage').style.display = 'none';
    document.getElementById('booksPage').style.display = 'none'; // add this

    document.querySelectorAll('.section').forEach(section => {
        section.style.display = (section.dataset.category === 'Arrays') ? 'block' : 'none';
    });

    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab')[0].classList.add('active');
    updateGlobalProgress();
}

// Upload
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
    card.className = "card";

    // Check if image or PDF/other
    if(file.type.startsWith("image")) {
        card.innerHTML = `
            <img src="${url}" style="max-width:100%; border-radius:8px; margin-bottom:10px;">
            <p>${file.name}</p>
            <div class="card-buttons">
                <a href="${url}" target="_blank">View Image</a>
                <button onclick="this.closest('.card').remove(); saveNotes();">Remove</button>
            </div>
        `;
    } else {
        card.innerHTML = `
            <p>${file.name}</p>
            <div class="card-buttons">
                <a href="${url}" target="_blank">Open PDF</a>
                <button onclick="this.closest('.card').remove(); saveNotes();">Remove</button>
            </div>
        `;
    }

    container.appendChild(card);
    input.value = ""; // reset input
    saveNotes();
}
// Save checkbox state
document.querySelectorAll('.done input[type="checkbox"], .revision input[type="checkbox"]').forEach((chk, idx) => {
    chk.addEventListener('change', () => {
        const sectionName = chk.closest('.section').querySelector('.section-header span').innerText;
        const problemIndex = Array.from(chk.closest('.content').querySelectorAll('.problem')).indexOf(chk.closest('.problem'));
        const type =
    chk.closest('.done') !== null
    ? 'done'
    : 'revision';

        let data = JSON.parse(localStorage.getItem('checkboxes')) || {};
        data[`${sectionName}-${problemIndex}-${type}`] = chk.checked;
        localStorage.setItem('checkboxes', JSON.stringify(data));
    });
});
// Default load

// LOAD CHECKBOXES AND UPDATE BARS
function loadCheckboxesAndProgress() {
    const data = JSON.parse(localStorage.getItem('checkboxes')) || {};
    document.querySelectorAll('.section').forEach(section => {
        section.querySelectorAll('.problem').forEach((prob, idx) => {
            ['done','revision'].forEach(type => {
                const key = `${section.querySelector('.section-header span').innerText}-${idx}-${type}`;
                const checkbox = prob.querySelector(`.${type} input[type="checkbox"]`);
                if(data[key] && checkbox) checkbox.checked = true;
            });
        });

        // ✅ UPDATE BARS AFTER RESTORING CHECKBOXES
        updateProgress(section);
        updateGlobalProgress(); // 🔥 ADD THIS
    });
}

// CALL ON DOMContentLoaded

// Call on DOMContentLoaded

// OPEN LINKS PAGE
function openLinks() {
    document.querySelectorAll('.section').forEach(sec => sec.style.display = 'none');
    document.querySelector('.tabs').style.display = 'none';
 document.getElementById('notesPage').style.display = 'none';
    document.getElementById('linksPage').style.display = 'block';
    document.getElementById('booksPage').style.display = 'none';
}
//Admin access
window.isAdmin = false;
window.username = "";

// Admin login
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
// Toggle Add button visibility
function toggleAddButton() {
    const btn = document.getElementById("addProblemBtn");
    if (!btn) return;
    btn.style.display = window.isAdmin ? "block" : "none";
}


function addProblem(){
    if(!window.isAdmin){
        alert("Admin only");
        return;
    }

    const title = prompt("Problem name");
    const link = prompt("Problem link");
    const category = prompt("Category (Arrays / Strings / DP)");
    const section = prompt("Section name (same as header)");

    fetch("http://localhost:5000/add-problem",{
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ title, link, category, section })
    })
    .then(()=> loadProblems());
}
// ADD LINK FUNCTION
function addLink() {
    const input = document.getElementById("linkInput");
    const url = input.value.trim();
    if(!url) { alert("Enter a link!"); return; }

    const container = document.getElementById("linksContainer");

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
        <p>${url}</p>
        <div class="card-buttons">
            <a href="${url}" target="_blank">Open Link</a>
            <button onclick="this.closest('.card').remove(); saveLinks();">Remove</button>
        </div>
    `;
    container.appendChild(card);
    input.value = "";
    saveLinks();
}
// OPEN BOOKS PAGE
function openBooks() {
    // hide sections
    document.querySelectorAll('.section').forEach(sec => sec.style.display = 'none');

    // hide tabs
    document.querySelector('.tabs').style.display = 'none';

    // hide notes & links
    document.getElementById('notesPage').style.display = 'none';
    document.getElementById('linksPage').style.display = 'none';

    // show books
    document.getElementById('booksPage').style.display = 'block';
}

// ADD BOOK FUNCTION
function addBook() {
    const nameInput = document.getElementById("bookNameInput");
    const fileInput = document.getElementById("bookFileInput");
    const name = nameInput.value.trim();
    const file = fileInput.files[0];

    if(!name) { alert("Enter book name!"); return; }
    if(!file) { alert("Select file!"); return; }

    const container = document.getElementById("booksContainer");

    const url = URL.createObjectURL(file);
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
        <p>${name}</p>
        <div class="card-buttons">
            <a href="${url}" target="_blank">Open PDF</a>
           <button onclick="this.closest('.card').remove(); saveBooks();">Remove</button>
        </div>
    `;
    container.appendChild(card);

    nameInput.value = "";
    fileInput.value = "";
    saveBooks();
}

function updateProgress(section) {
    const doneBar = section.querySelector('.done-bar');
    const revisionBar = section.querySelector('.revision-bar');

    const problems = section.querySelectorAll('.problem');
    const total = problems.length;
    if (total === 0) return;

    let doneCount = 0;
    let revisionCount = 0;

    problems.forEach(p => {
        const doneCheckbox = p.querySelector('.done input[type="checkbox"]');
        const revisionCheckbox = p.querySelector('.revision input[type="checkbox"]');
        if (doneCheckbox.checked) doneCount++;
        if (revisionCheckbox.checked) revisionCount++;
    });

    const donePercent = (doneCount / total) * 100;
    const revisionPercent = (revisionCount / total) * 100;

    doneBar.style.width = donePercent + '%';
    revisionBar.style.width = revisionPercent + '%';

    // update header text like "3/9"
    const headerCount = section.querySelector('.section-header span:nth-child(2)');
    headerCount.textContent = `${doneCount}/${total}`;
}
// Save checkbox state

function saveNotes() {
    const notes = [];
    document.querySelectorAll('#notesContainer .card').forEach(n => {
        notes.push(n.innerHTML);
    });
    localStorage.setItem('notes', JSON.stringify(notes));
}

function saveLinks() {
    const links = [];
    document.querySelectorAll('#linksContainer .card').forEach(l => {
        links.push(l.innerHTML);
    });
    localStorage.setItem('links', JSON.stringify(links));
}

function saveBooks() {
    const books = [];
    document.querySelectorAll('#booksContainer .card').forEach(b => {
        books.push(b.innerHTML);
    });
    localStorage.setItem('books', JSON.stringify(books));
}

function loadNotesLinksBooks() {
    const notes = JSON.parse(localStorage.getItem('notes') || '[]');
    const links = JSON.parse(localStorage.getItem('links') || '[]');
    const books = JSON.parse(localStorage.getItem('books') || '[]');

    const notesContainer = document.getElementById('notesContainer');
    const linksContainer = document.getElementById('linksContainer');
    const booksContainer = document.getElementById('booksContainer');

    notes.forEach(n => {
        const div = document.createElement('div');
        div.classList.add('card');
        div.innerHTML = n;
        notesContainer.appendChild(div);
        
    });

    links.forEach(l => {
        const div = document.createElement('div');
        div.classList.add('card');
        div.innerHTML = l;
        linksContainer.appendChild(div);
    });

    books.forEach(b => {
        const div = document.createElement('div');
        div.classList.add('card');
        div.innerHTML = b;
        booksContainer.appendChild(div);
    });
}
// CALL load on DOMContentLoaded

function loadProblems() {
    fetch("/problems")
    .then(res => res.json())
    .then(data => {
        document.querySelectorAll(".dynamic-problem").forEach(el => el.remove());
        data.forEach(p => {
            const sections = document.querySelectorAll(`.section[data-category="${p.category}"]`);
            sections.forEach(sec => {
                const header = sec.querySelector(".section-header span").innerText;
                if (header === p.section) {
                    const container = sec.querySelector(".content");
                    const div = document.createElement("div");
                    div.className = "problem dynamic-problem";
                    div.innerHTML = `
                        <span>${p.title}</span>
                        <a href="${p.link}" target="_blank">Solve</a>
                        <label class="done">
<input type="checkbox"
onchange="markDone(this,'${p.title}','Medium')">
</label>
                        <label class="revision"><input type="checkbox"></label>
                    `;
                    container.appendChild(div);
                    updateProgress(sec);
updateGlobalProgress();
                    const checkboxes = div.querySelectorAll('input[type="checkbox"]');

checkboxes.forEach(chk => {
    chk.addEventListener('change', () => {
        updateProgress(sec);
        updateGlobalProgress();
    });
});
                }
            });
        });
    });
}

// Modal login button
const adminBtn = document.getElementById("adminLoginBtn");

if(adminBtn){
    adminBtn.addEventListener("click", () => {
        const username = document.getElementById("adminUsername").value;
        const password = document.getElementById("adminPassword").value;

        adminLogin(username, password);
    });
}


// ... rest of your existing checkbox and progress code remains unchanged
function updateGlobalProgress() {
   const active = document.querySelector('.tab.active');

if(!active) return;

const activeTab = active.textContent.replace(/\s/g,'');

    const sections = document.querySelectorAll(`.section[data-category="${activeTab}"]`);

    let total = 0;
    let done = 0;

    sections.forEach(section => {
        const problems = section.querySelectorAll('.problem');
        total += problems.length;

        problems.forEach(p => {
            const doneCheckbox = p.querySelector('.done input[type="checkbox"]');
            if (doneCheckbox.checked) done++;
        });
    });

    document.getElementById("progressText").innerText = `${done}/${total}`;
}

function markDone(checkbox, problemName, difficulty) {

    const section = checkbox.closest('.section');

    updateProgress(section);
    updateGlobalProgress();

    if (checkbox.checked) {

        let history =
            JSON.parse(localStorage.getItem("practiceHistory")) || [];

        const problemData = {
            name: problemName,
            difficulty: difficulty,
            time: new Date().getTime()
        };

        history.unshift(problemData);

        localStorage.setItem(
            "practiceHistory",
            JSON.stringify(history)
        );
    }

    loadHistory();
}
function openHistory() {

    document.getElementById("historyPopup").style.display = "flex";

    loadHistory();
}

function closeHistory() {

    document.getElementById("historyPopup").style.display = "none";
}

function getTimeAgo(timestamp) {

    const seconds =
        Math.floor((new Date().getTime() - timestamp) / 1000);

    if (seconds < 60)
        return `${seconds} seconds ago`;

    const minutes = Math.floor(seconds / 60);

    if (minutes < 60)
        return `${minutes} minutes ago`;

    const hours = Math.floor(minutes / 60);

    if (hours < 24)
        return `${hours} hours ago`;

    const days = Math.floor(hours / 24);

    if (days === 1)
        return `Yesterday`;

    return `${days} days ago`;
}

function loadHistory() {

    let history =
        JSON.parse(localStorage.getItem("practiceHistory")) || [];

    let tableBody =
        document.getElementById("historyTableBody");

    if (!tableBody) return;

    tableBody.innerHTML = "";

    history.forEach(item => {

        tableBody.innerHTML += `
            <tr>
                <td>${getTimeAgo(item.time)}</td>
                <td>${item.name}</td>
                <td>Accepted</td>
                <td>${item.difficulty}</td>
            </tr>
        `;
    });
}
function openHistory() {
    document.getElementById("historyPopup").style.display = "flex";
}

function closeHistory() {
    document.getElementById("historyPopup").style.display = "none";
}
function toggleSection(section, event) {

    if(event.target.tagName === "INPUT" ||
       event.target.tagName === "A" ||
       event.target.tagName === "IMG") {
        return;
    }

    const content = section.querySelector(".content");

    if(content.style.display === "block"){
        content.style.display = "none";
    }
    else{
        content.style.display = "block";
    }
}
