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
// ============ FIREBASE AUTH ============

// Wait for firebase to load
function waitForFirebase() {
    return new Promise((resolve) => {
        const check = setInterval(() => {
            if (window.firebaseAuth) {
                clearInterval(check);
                resolve();
            }
        }, 100);
    });
}

// SIGNUP
if(signupForm){
    signupForm.addEventListener('submit', async e => {
        e.preventDefault();
        await waitForFirebase();
        
        const name = document.getElementById("signupName").value;
        const email = document.getElementById("signupEmail").value;
        const password = document.getElementById("signupPassword").value;

        try {
            const userCred = await window.firebaseCreateUser(window.firebaseAuth, email, password);
            
            // Create user doc in firestore
            await window.firebaseSetDoc(
                window.firebaseDoc(window.firebaseDB, "users", userCred.user.uid),
                {
                    name: name,
                    email: email,
                    checkboxes: {},
                    notes: [],
                    links: [],
                    books: [],
                    doneDates: [],
                    practiceHistory: []
                }
            );
            
            alert("Account created! You are now logged in.");
            modal.style.display = 'none';
        } catch(err) {
            alert("Signup failed: " + err.message);
        }
    });
}

// LOGIN
if(loginForm){
    loginForm.addEventListener('submit', async e => {
        e.preventDefault();
        await waitForFirebase();
        
        const email = document.getElementById("loginEmail").value;
        const password = document.getElementById("loginPassword").value;

        try {
            await window.firebaseSignIn(window.firebaseAuth, email, password);
            alert("Logged in successfully!");
            modal.style.display = 'none';
        } catch(err) {
            alert("Login failed: " + err.message);
        }
    });
}

// GOOGLE SIGN-IN
document.addEventListener('DOMContentLoaded', () => {
    const googleBtn = document.getElementById('googleSignInBtn');
    if (googleBtn) {
        googleBtn.addEventListener('click', async () => {
            await waitForFirebase();
            try {
                const result = await window.firebaseGoogleSignIn();
                
                // Check if user doc exists, if not create it
                const userDocRef = window.firebaseDoc(window.firebaseDB, "users", result.user.uid);
                const userDoc = await window.firebaseGetDoc(userDocRef);
                
                if (!userDoc.exists()) {
                    await window.firebaseSetDoc(userDocRef, {
                        name: result.user.displayName || "User",
                        email: result.user.email,
                        checkboxes: {},
                        notes: [],
                        links: [],
                        books: [],
                        doneDates: [],
                        practiceHistory: []
                    });
                }
                
                alert("Logged in with Google!");
                modal.style.display = 'none';
            } catch(err) {
                alert("Google sign-in failed: " + err.message);
            }
        });
    }
});

// LOGOUT
async function handleLogout() {
    await waitForFirebase();
    try {
        // Save to Firebase first
        await saveAllToFirebase();
        
        // Then sign out
        await window.firebaseSignOut(window.firebaseAuth);
        
        // Clear all local data so next user sees empty state
        localStorage.removeItem('checkboxes');
        localStorage.removeItem('notes');
        localStorage.removeItem('links');
        localStorage.removeItem('books');
        localStorage.removeItem('doneDates');
        localStorage.removeItem('practiceHistory');
        
        alert("Logged out!");
        location.reload();
    } catch(err) {
        alert("Logout failed: " + err.message);
    }
}
window.handleLogout = handleLogout;

// AUTH STATE LISTENER — auto-load data when user logs in
let authInitialized = false;

async function initAuthListener() {
    await waitForFirebase();
    
    window.firebaseOnAuth(window.firebaseAuth, async (user) => {
        const loginBtn = document.getElementById('loginBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const userInfo = document.getElementById('userInfo');
        const userEmail = document.getElementById('userEmail');
        
        if (user) {
            console.log("User logged in:", user.email);
            
            if (loginBtn) loginBtn.style.display = 'none';
            if (logoutBtn) logoutBtn.style.display = 'block';
            if (userInfo) userInfo.style.display = 'block';
            if (userEmail) userEmail.innerText = user.email;
            
            window.currentUser = user;
            
            // Only load data ONCE per session
            if (!authInitialized) {
                authInitialized = true;
                await loadFromFirebase(user.uid);
            }
        } else {
            if (loginBtn) loginBtn.style.display = 'block';
            if (logoutBtn) logoutBtn.style.display = 'none';
            if (userInfo) userInfo.style.display = 'none';
            
            window.currentUser = null;
            authInitialized = false;
        }
    });
}

// LOAD USER DATA FROM FIREBASE
async function loadFromFirebase(uid) {
    try {
        const userDocRef = window.firebaseDoc(window.firebaseDB, "users", uid);
        const userDoc = await window.firebaseGetDoc(userDocRef);
        
        if (userDoc.exists()) {
            const data = userDoc.data();
            
            localStorage.setItem('checkboxes', JSON.stringify(data.checkboxes || {}));
            localStorage.setItem('notes', JSON.stringify(data.notes || []));
            localStorage.setItem('links', JSON.stringify(data.links || []));
            localStorage.setItem('books', JSON.stringify(data.books || []));
            localStorage.setItem('doneDates', JSON.stringify(data.doneDates || []));
            localStorage.setItem('practiceHistory', JSON.stringify(data.practiceHistory || []));
            
            // Refresh UI WITHOUT page reload
            loadCheckboxesAndProgress();
            attachStaticCheckboxListeners();
            loadHistory();
            loadCalendar();
            updateGlobalProgress();
            
            console.log("✅ Data loaded from Firebase");
        }
    } catch(err) {
        console.error("Error loading data:", err);
    }
}

// SAVE ALL DATA TO FIREBASE
async function saveAllToFirebase() {
    if (!window.currentUser) return;
    
    try {
        const userDocRef = window.firebaseDoc(window.firebaseDB, "users", window.currentUser.uid);
        
        await window.firebaseSetDoc(userDocRef, {
            email: window.currentUser.email,
            checkboxes: JSON.parse(localStorage.getItem('checkboxes') || '{}'),
            notes: JSON.parse(localStorage.getItem('notes') || '[]'),
            links: JSON.parse(localStorage.getItem('links') || '[]'),
            books: JSON.parse(localStorage.getItem('books') || '[]'),
            doneDates: JSON.parse(localStorage.getItem('doneDates') || '[]'),
            practiceHistory: JSON.parse(localStorage.getItem('practiceHistory') || '[]')
        }, { merge: true });
        
        console.log("Data saved to Firebase ✅");
    } catch(err) {
        console.error("Error saving:", err);
    }
}
window.saveAllToFirebase = saveAllToFirebase;

// AUTO-SAVE every 3 seconds when logged in
setInterval(() => {
    if (window.currentUser) {
        saveAllToFirebase();
    }
}, 15000);  // Every 15 seconds instead of 3

// Start auth listener
initAuthListener();
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

// Tab switching

function switchTab(tab) {
    const category = tab.textContent.replace(/\s/g, '');

    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    document.querySelectorAll('.section').forEach(section => {
        const sectionCategory = section.dataset.category.replace(/\s/g, '');
        section.style.display = (sectionCategory === category) ? 'block' : 'none';
    });

    updateGlobalProgress(); // 🔥 important
}
document.addEventListener("DOMContentLoaded", function () {
    const activeTab = document.querySelector(".tab.active");
    if (activeTab) {
        switchTab(activeTab);
    }
});
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

// Default load

// LOAD CHECKBOXES AND UPDATE BARS
function loadCheckboxesAndProgress() {
    const data = JSON.parse(localStorage.getItem('checkboxes')) || {};
    
    document.querySelectorAll('.section').forEach(section => {
        const category = section.dataset.category;
        const sectionName = section.querySelector('.section-header span').innerText;

        section.querySelectorAll('.problem').forEach(prob => {
            const titleEl = prob.querySelector('span');
            if (!titleEl) return;
            const title = titleEl.innerText.trim();

            ['done', 'revision'].forEach(type => {
                const key = `${category}-${sectionName}-${title}-${type}`;
                const checkbox = prob.querySelector(`.${type} input[type="checkbox"]`);
                if (checkbox) {
                    checkbox.checked = data[key] || false;
                }
            });
        });

        updateProgress(section);
    });
    updateGlobalProgress();
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
async function loadProblems() {
    try {
        const res = await fetch("/problems");
        
        // ✅ Check if response is OK and is JSON
        if (!res.ok) {
            console.log("No backend connected — using static problems only");
            return;
        }
        
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            console.log("Backend not returning JSON — skipping");
            return;
        }

        const data = await res.json();

        document.querySelectorAll(".dynamic-problem").forEach(el => el.remove());

        data.forEach(p => {
            const sections = document.querySelectorAll(
                `.section[data-category="${p.category}"]`
            );

            sections.forEach(sec => {
                const header = sec.querySelector(".section-header span").innerText;
                if (header !== p.section) return;

                const container = sec.querySelector(".content");
                const div = document.createElement("div");
                div.className = "problem dynamic-problem";
                div.innerHTML = `
                    <span>${p.title}</span>
                    <a href="${p.link}" target="_blank">Solve</a>
                    <label class="done"><input type="checkbox"></label>
                    <label class="revision"><input type="checkbox"></label>
                `;
                container.appendChild(div);

                const doneKey = `${p.category}-${p.section}-${p.title}-done`;
                const revisionKey = `${p.category}-${p.section}-${p.title}-revision`;

                const savedData = JSON.parse(localStorage.getItem("checkboxes")) || {};

                const doneCheckbox = div.querySelector('.done input[type="checkbox"]');
                const revisionCheckbox = div.querySelector('.revision input[type="checkbox"]');

                if (doneCheckbox) doneCheckbox.checked = savedData[doneKey] || false;
                if (revisionCheckbox) revisionCheckbox.checked = savedData[revisionKey] || false;

                if (doneCheckbox) {
                    doneCheckbox.addEventListener("change", () => {
                        let saved = JSON.parse(localStorage.getItem("checkboxes")) || {};
                        saved[doneKey] = doneCheckbox.checked;
                        localStorage.setItem("checkboxes", JSON.stringify(saved));

                        updateProgress(sec);
                        updateGlobalProgress();
                        markDone(doneCheckbox, p.title, "Medium");
                    });
                }

                if (revisionCheckbox) {
                    revisionCheckbox.addEventListener("change", () => {
                        let saved = JSON.parse(localStorage.getItem("checkboxes")) || {};
                        saved[revisionKey] = revisionCheckbox.checked;
                        localStorage.setItem("checkboxes", JSON.stringify(saved));

                        updateProgress(sec);
                        updateGlobalProgress();
                    });
                }

                updateProgress(sec);
                updateGlobalProgress();
            });
        });
    } catch (err) {
        console.log("Error loading problems from backend:", err);
    }
}
// ... rest of your existing checkbox and progress code remains unchanged
function updateGlobalProgress() {
    const active = document.querySelector('.tab.active');
    if (!active) return;

    const activeTab = active.textContent.trim().replace(/\s/g, '');

    const sections = Array.from(document.querySelectorAll('.section'))
        .filter(section => (section.dataset.category || '').replace(/\s/g, '') === activeTab);

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

    const progressEl = document.getElementById("progressText");
    if (progressEl) progressEl.innerText = `${done}/${total}`;
}
function markDone(checkbox, problemName, difficulty) {

    const section = checkbox.closest('.section');

    updateProgress(section);
    updateGlobalProgress();

    let history =
        JSON.parse(localStorage.getItem("practiceHistory")) || [];

 history = history.filter(
    item => item.name !== problemName
);

const now = new Date();

let date =
`${now.getFullYear()}-${
now.getMonth()+1}-${
now.getDate()}`;

let savedDates =
JSON.parse(
localStorage.getItem("doneDates")
) || [];


if(checkbox.checked){

    const problemData = {

        name: problemName,
        difficulty: difficulty,
        time: now.getTime()

    };

    history.unshift(problemData);


    if(!savedDates.includes(date)){

        savedDates.push(date);

    }

}
else{

    // CHECK IF ANY DONE CHECKBOX STILL EXISTS TODAY

    let anyChecked =
    document.querySelector(
'.done input[type="checkbox"]:checked'
);

    if(!anyChecked){

        savedDates =
        savedDates.filter(
        d => d !== date
        );

    }

}


localStorage.setItem(

"doneDates",

JSON.stringify(savedDates)

);

loadCalendar();
    localStorage.setItem(
        "practiceHistory",
        JSON.stringify(history)
    );

    loadHistory();
}
let historyInterval;

function openHistory() {

    document.getElementById("historyPopup").style.display = "flex";

    loadHistory();

    historyInterval = setInterval(() => {
        loadHistory();
    }, 1000);
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

    if (days < 7)
        return `${days} days ago`;

    const date = new Date(timestamp);

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
    });
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
function closeHistory() {

    document.getElementById("historyPopup").style.display = "none";

    clearInterval(historyInterval);
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
document.addEventListener("DOMContentLoaded", async () => {
    loadNotesLinksBooks();
    await loadProblems();           // tries backend, skips if fails
    loadCheckboxesAndProgress();    // loads saved ticks
    attachStaticCheckboxListeners(); // ✅ NEW: attach save listeners to HTML problems
    loadHistory();
    updateGlobalProgress();
});
function attachStaticCheckboxListeners() {
    document.querySelectorAll('.section').forEach(section => {
        const category = section.dataset.category;
        const sectionName = section.querySelector('.section-header span').innerText;

        section.querySelectorAll('.problem:not(.dynamic-problem)').forEach(prob => {
            const titleEl = prob.querySelector('span');
            if (!titleEl) return;
            const title = titleEl.innerText.trim();

            ['done', 'revision'].forEach(type => {
                const checkbox = prob.querySelector(`.${type} input[type="checkbox"]`);
                if (!checkbox) return;

                const key = `${category}-${sectionName}-${title}-${type}`;

                // Remove old listeners by cloning
                const newCheckbox = checkbox.cloneNode(true);
                checkbox.parentNode.replaceChild(newCheckbox, checkbox);

                newCheckbox.addEventListener('change', () => {
                    let saved = JSON.parse(localStorage.getItem("checkboxes")) || {};
                    saved[key] = newCheckbox.checked;
                    localStorage.setItem("checkboxes", JSON.stringify(saved));

                    updateProgress(section);
                    updateGlobalProgress();

                    if (type === 'done') {
                        markDone(newCheckbox, title, "Medium");
                    }
                });
            });
        });
    });
}
function loadCalendar() {

    const monthYear =
        document.getElementById("monthYear");

    const calendarDays =
        document.getElementById("calendarDays");

    const now = new Date();

    let year = now.getFullYear();
    let month = now.getMonth();

    let firstDay =
        new Date(year, month, 1).getDay();

    let totalDays =
        new Date(year, month + 1, 0).getDate();

    monthYear.innerText =
        now.toLocaleString('default',
        { month:'long', year:'numeric' });

    calendarDays.innerHTML = "";

    let saved =
        JSON.parse(
        localStorage.getItem("doneDates")
        ) || [];


    for(let i=0;i<firstDay;i++){

        calendarDays.innerHTML +=
        "<div></div>";

    }


    for(let day=1; day<=totalDays; day++){

        let div =
        document.createElement("div");

        div.classList.add("day");

        div.innerText = day;


        let today =
        new Date();

        if(
        day===today.getDate()
        &&
        month===today.getMonth()
        ){

            div.classList.add("today");

        }


        let dateString =
        `${year}-${month+1}-${day}`;


       if(saved.includes(dateString)){

    div.classList.add("done");

    div.innerHTML =
    `${day}<span class="tick">✓</span>`;

}


        calendarDays.appendChild(div);

    }

}


loadCalendar();



/* SAVE DATE WHEN DONE CHECKBOX CLICKED */

// ============ SIDEBAR ACTIVE MENU SWITCH ============
document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', function() {
        // remove active from all
        document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
        // add active to clicked one
        this.classList.add('active');
    });
});
