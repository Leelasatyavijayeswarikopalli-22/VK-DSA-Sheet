// ============ MODAL ELEMENTS ============
const loginBtn = document.getElementById('loginBtn');
const modal = document.getElementById('loginModal');
const closeBtn = modal ? modal.querySelector('.close') : null;
const loginTab = document.getElementById('loginTab');
const signupTab = document.getElementById('signupTab');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');

// Open modal
if (loginBtn && modal) {
    loginBtn.addEventListener('click', () => {
        modal.style.display = 'block';
    });
}

if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', e => {
        if (e.target == modal) {
            modal.style.display = 'none';
        }
    });
}

// Switch tabs
if (loginTab && signupTab && loginForm && signupForm) {
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

// ============ FIREBASE AUTH ============
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
if (signupForm) {
    signupForm.addEventListener('submit', async e => {
        e.preventDefault();
        await waitForFirebase();

        const name = document.getElementById("signupName").value.trim();
        const phone = document.getElementById("signupPhone").value.trim();
        const email = document.getElementById("signupEmail").value.trim();
        const password = document.getElementById("signupPassword").value;

        try {
            const userCred = await window.firebaseCreateUser(window.firebaseAuth, email, password);
            await window.firebaseSetDoc(
                window.firebaseDoc(window.firebaseDB, "users", userCred.user.uid),
                {
                    name: name,
                    email: email,
                    phone: phone,
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
        } catch (err) {
            alert("Signup failed: " + err.message);
        }
    });
}

// LOGIN
if (loginForm) {
    loginForm.addEventListener('submit', async e => {
        e.preventDefault();
        await waitForFirebase();

        const email = document.getElementById("loginEmail").value;
        const password = document.getElementById("loginPassword").value;

        try {
            await window.firebaseSignIn(window.firebaseAuth, email, password);
            alert("Logged in successfully!");
            modal.style.display = 'none';
        } catch (err) {
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
                const userDocRef = window.firebaseDoc(window.firebaseDB, "users", result.user.uid);
                const userDoc = await window.firebaseGetDoc(userDocRef);

                if (!userDoc.exists()) {
                    await window.firebaseSetDoc(userDocRef, {
                        name: result.user.displayName || "User",
                        email: result.user.email,
                        phone: result.user.phoneNumber || "Not Provided",
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
            } catch (err) {
                alert("Google sign-in failed: " + err.message);
            }
        });
    }
});

// LOGOUT
async function handleLogout() {
    await waitForFirebase();
    try {
        await saveAllToFirebase();
        await window.firebaseSignOut(window.firebaseAuth);

        localStorage.removeItem('checkboxes');
        localStorage.removeItem('notes');
        localStorage.removeItem('links');
        localStorage.removeItem('books');
        localStorage.removeItem('doneDates');
        localStorage.removeItem('practiceHistory');

        alert("Logged out!");
        location.reload();
    } catch (err) {
        alert("Logout failed: " + err.message);
    }
}
window.handleLogout = handleLogout;

// AUTH STATE LISTENER
let authInitialized = false;

async function initAuthListener() {
    await waitForFirebase();

    window.firebaseOnAuth(window.firebaseAuth, async (user) => {
        if (user) {
            console.log("User logged in:", user.email);
            window.currentUser = user;
            updateProfileUI(user);

            if (!authInitialized) {
                authInitialized = true;
                await loadFromFirebase(user.uid);
            }
        } else {
    localStorage.removeItem('checkboxes');
    localStorage.removeItem('notes');
    localStorage.removeItem('links');
    localStorage.removeItem('books');
    localStorage.removeItem('doneDates');
    localStorage.removeItem('practiceHistory');

    window.currentUser = null;
    authInitialized = false;
    window.currentUserProfileData = null;
    updateProfileUI(null);

    // Clear all containers so previous user's data disappears
    const notesContainer = document.getElementById('notesContainer');
    const linksContainer = document.getElementById('linksContainer');
    const booksContainer = document.getElementById('booksContainer');
    if (notesContainer) notesContainer.innerHTML = '';
    if (linksContainer) linksContainer.innerHTML = '';
    if (booksContainer) booksContainer.innerHTML = '';

    if (typeof loadCheckboxesAndProgress === 'function') {
        loadCheckboxesAndProgress();
        updateGlobalProgress();
        updateTotalSolvedStats();
    }
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

            window.currentUserProfileData = {
                name: data.name || window.currentUser.displayName || "User",
                phone: data.phone || window.currentUser.phoneNumber || "Not Provided"
            };

            loadCheckboxesAndProgress();
            attachStaticCheckboxListeners();
            loadHistory();
            loadCalendar();
            updateGlobalProgress();
            updateTotalSolvedStats();
            loadNotesLinksBooks();  // 👈 ADD THIS LINE — renders user's saved items

            console.log("✅ Data loaded from Firebase");
        }
    } catch (err) {
        console.error("Error loading data:", err);
    }
}

// SAVE ALL DATA TO FIREBASE
async function saveAllToFirebase() {
    if (!window.currentUser) return;

    try {
        const userDocRef = window.firebaseDoc(window.firebaseDB, "users", window.currentUser.uid);

        const payload = {
            email: window.currentUser.email,
            checkboxes: JSON.parse(localStorage.getItem('checkboxes') || '{}'),
            notes: JSON.parse(localStorage.getItem('notes') || '[]'),
            links: JSON.parse(localStorage.getItem('links') || '[]'),
            books: JSON.parse(localStorage.getItem('books') || '[]'),
            doneDates: JSON.parse(localStorage.getItem('doneDates') || '[]'),
            practiceHistory: JSON.parse(localStorage.getItem('practiceHistory') || '[]')
        };

        if (window.currentUserProfileData) {
            payload.name = window.currentUserProfileData.name;
            payload.phone = window.currentUserProfileData.phone;
        }

        await window.firebaseSetDoc(userDocRef, payload, { merge: true });
        console.log("Data saved to Firebase ✅");
    } catch (err) {
        console.error("Error saving:", err);
    }
}
window.saveAllToFirebase = saveAllToFirebase;

// AUTO-SAVE
setInterval(() => {
    if (window.currentUser) {
        saveAllToFirebase();
    }
}, 15000);

initAuthListener();

// ============ SECTION TOGGLE ============
function toggleSection(section, event) {
    if (
        event.target.tagName === 'INPUT' ||
        event.target.tagName === 'A' ||
        event.target.tagName === 'IMG'
    ) {
        return;
    }
    const content = section.querySelector('.content');
    content.style.display = content.style.display === 'block' ? 'none' : 'block';
}

// ============ TAB SWITCHING ============
function switchTab(tab) {
    const category = tab.textContent.replace(/\s/g, '');

    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    document.querySelectorAll('.section').forEach(section => {
        const sectionCategory = section.dataset.category.replace(/\s/g, '');
        section.style.display = (sectionCategory === category) ? 'block' : 'none';
    });

    updateGlobalProgress();
}

document.addEventListener("DOMContentLoaded", function () {
    const activeTab = document.querySelector(".tab.active");
    if (activeTab) {
        switchTab(activeTab);
    }
});

// ============ PAGE NAVIGATION ============
// ============ HELPER: Check if user is logged in ============
function requireLogin(featureName) {
    if (!window.currentUser) {
        alert(`Please log in to access ${featureName}.`);
        const loginModal = document.getElementById('loginModal');
        if (loginModal) {
            loginModal.style.display = 'block';
        }
        return false;
    }
    return true;
}

function goHome() {
    // Reset display explicitly to flex (not just 'block')
    const tabsEl = document.querySelector('.tabs');
    if (tabsEl) tabsEl.style.display = 'flex';   // 👈 force flex, not block

    document.getElementById('notesPage').style.display = 'none';
    document.getElementById('linksPage').style.display = 'none';
    document.getElementById('booksPage').style.display = 'none';
    const searchPage = document.getElementById('searchPage');
    if (searchPage) searchPage.style.display = 'none';

    document.querySelectorAll('.section').forEach(section => {
        section.style.display = (section.dataset.category === 'Arrays') ? 'block' : 'none';
    });

    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab')[0].classList.add('active');
    updateGlobalProgress();
    updateTotalSolvedStats();
}
window.goHome = goHome;
// ============ NOTES PAGE ============
function openNotes() {
    if (!requireLogin("Notes")) return;

    document.querySelectorAll('.section').forEach(sec => sec.style.display = 'none');
    document.querySelector('.tabs').style.display = 'none';
    document.getElementById('notesPage').style.display = 'block';
    document.getElementById('linksPage').style.display = 'none';
    document.getElementById('booksPage').style.display = 'none';
    document.getElementById('searchPage').style.display = 'none';
    renderCuratedContent('notes');
}

// ============ LINKS PAGE ============
function openLinks() {
    if (!requireLogin("Links")) return;

    document.querySelectorAll('.section').forEach(sec => sec.style.display = 'none');
    document.querySelector('.tabs').style.display = 'none';
    document.getElementById('notesPage').style.display = 'none';
    document.getElementById('linksPage').style.display = 'block';
    document.getElementById('booksPage').style.display = 'none';
    document.getElementById('searchPage').style.display = 'none';
    renderCuratedContent('links');
}

// ============ BOOKS PAGE ============
function openBooks() {
    if (!requireLogin("Books")) return;

    document.querySelectorAll('.section').forEach(sec => sec.style.display = 'none');
    document.querySelector('.tabs').style.display = 'none';
    document.getElementById('notesPage').style.display = 'none';
    document.getElementById('linksPage').style.display = 'none';
    document.getElementById('booksPage').style.display = 'block';
    document.getElementById('searchPage').style.display = 'none';
    renderCuratedContent('books');
}

// Make globally accessible (in case onclick calls need it)
window.openNotes = openNotes;
window.openLinks = openLinks;
window.openBooks = openBooks;
window.requireLogin = requireLogin;


// ============ FILE UPLOAD ============
function uploadFile() {
    if (!requireLogin("Notes")) return;

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

    if (file.type.startsWith("image")) {
        card.innerHTML = `
            <img src="${url}" style="max-width:100%; border-radius:8px; margin-bottom:10px;">
            <p>${file.name}</p>
            <div class="card-buttons">
                <a href="${url}" target="_blank">View</a>
                <button onclick="deleteCard(this, 'notes')">Delete</button>
            </div>
        `;
    } else {
        card.innerHTML = `
            <p>${file.name}</p>
            <div class="card-buttons">
                <a href="${url}" target="_blank">Open PDF</a>
                <button onclick="deleteCard(this, 'notes')">Delete</button>
            </div>
        `;
    }

    container.appendChild(card);
    input.value = "";
    saveNotes();
    if (window.currentUser) saveAllToFirebase();
}
window.uploadFile = uploadFile;


// ============ LOAD CHECKBOXES + PROGRESS ============
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
    updateTotalSolvedStats();
}

// ============ ADMIN ============
window.isAdmin = false;
window.username = "";

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
    if (!btn) return;
    btn.style.display = window.isAdmin ? "block" : "none";
}

function addProblem() {
    if (!window.isAdmin) {
        alert("Admin only");
        return;
    }

    const title = prompt("Problem name");
    const link = prompt("Problem link");
    const category = prompt("Category (Arrays / Strings / DP)");
    const section = prompt("Section name (same as header)");

    fetch("http://localhost:5000/add-problem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, link, category, section })
    })
        .then(() => loadProblems());
}

// ============ ADD LINK ============
function addLink() {
    if (!requireLogin("Links")) return;

    const input = document.getElementById("linkInput");
    const url = input.value.trim();
    if (!url) { alert("Enter a link!"); return; }

    const container = document.getElementById("linksContainer");
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
        <p>${url}</p>
        <div class="card-buttons">
            <a href="${url}" target="_blank">Open Link</a>
            <button onclick="deleteCard(this, 'links')">Delete</button>
        </div>
    `;
    container.appendChild(card);
    input.value = "";
    saveLinks();
    if (window.currentUser) saveAllToFirebase();
}
window.addLink = addLink;

// ============ ADD BOOK ============
function addBook() {
    if (!requireLogin("Books")) return;

    const nameInput = document.getElementById("bookNameInput");
    const fileInput = document.getElementById("bookFileInput");
    const name = nameInput.value.trim();
    const file = fileInput.files[0];

    if (!name) { alert("Enter book name!"); return; }
    if (!file) { alert("Select file!"); return; }

    const container = document.getElementById("booksContainer");
    const url = URL.createObjectURL(file);
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
        <p>${name}</p>
        <div class="card-buttons">
            <a href="${url}" target="_blank">Open PDF</a>
            <button onclick="deleteCard(this, 'books')">Delete</button>
        </div>
    `;
    container.appendChild(card);

    nameInput.value = "";
    fileInput.value = "";
    saveBooks();
    if (window.currentUser) saveAllToFirebase();
}
window.addBook = addBook;

// ============ UNIVERSAL DELETE (safer than inline onclick) ============
function deleteCard(button, type) {
    if (!confirm("Are you sure you want to delete this?")) return;

    const card = button.closest('.card');
    if (card) card.remove();

    if (type === 'notes') saveNotes();
    else if (type === 'links') saveLinks();
    else if (type === 'books') saveBooks();

    if (window.currentUser) saveAllToFirebase();
}
window.deleteCard = deleteCard;
// ============ UPDATE PROGRESS BARS ============
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
        if (doneCheckbox && doneCheckbox.checked) doneCount++;
        if (revisionCheckbox && revisionCheckbox.checked) revisionCount++;
    });

    const donePercent = (doneCount / total) * 100;
    const revisionPercent = (revisionCount / total) * 100;

    if (doneBar) doneBar.style.width = donePercent + '%';
    if (revisionBar) revisionBar.style.width = revisionPercent + '%';

    const headerCount = section.querySelector('.section-header span:nth-child(2)');
    if (headerCount) headerCount.textContent = `${doneCount}/${total}`;
}

// ============ LOCAL STORAGE HELPERS ============
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

    // Clear existing content first (prevents duplicates on reload)
    if (notesContainer) notesContainer.innerHTML = '';
    if (linksContainer) linksContainer.innerHTML = '';
    if (booksContainer) booksContainer.innerHTML = '';

    notes.forEach(n => {
        const div = document.createElement('div');
        div.classList.add('card');
        div.innerHTML = n;
        if (notesContainer) notesContainer.appendChild(div);
    });

    links.forEach(l => {
        const div = document.createElement('div');
        div.classList.add('card');
        div.innerHTML = l;
        if (linksContainer) linksContainer.appendChild(div);
    });

    books.forEach(b => {
        const div = document.createElement('div');
        div.classList.add('card');
        div.innerHTML = b;
        if (booksContainer) booksContainer.appendChild(div);
    });
}
window.loadNotesLinksBooks = loadNotesLinksBooks;

// ============ LOAD DYNAMIC PROBLEMS FROM BACKEND ============
async function loadProblems() {
    try {
        const res = await fetch("/problems");
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
            const sections = document.querySelectorAll(`.section[data-category="${p.category}"]`);
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
                    <div class="difficulty ${(p.difficulty || 'medium').toLowerCase()}">${p.difficulty || 'Medium'}</div>
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
                        updateTotalSolvedStats();
                        markDone(doneCheckbox, p.title, p.difficulty || "Medium");
                    });
                }

                if (revisionCheckbox) {
                    revisionCheckbox.addEventListener("change", () => {
                        let saved = JSON.parse(localStorage.getItem("checkboxes")) || {};
                        saved[revisionKey] = revisionCheckbox.checked;
                        localStorage.setItem("checkboxes", JSON.stringify(saved));

                        updateProgress(sec);
                        updateGlobalProgress();
                        updateTotalSolvedStats();
                    });
                }

                updateProgress(sec);
                updateGlobalProgress();
                updateTotalSolvedStats();
            });
        });
    } catch (err) {
        console.log("Error loading problems from backend:", err);
    }
}

// ============ GLOBAL PROGRESS (right-side circle) ============
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

// ============ TOTAL SOLVED STATS (Top Stats Card) ============
function updateTotalSolvedStats() {
    let totalSolved = 0;
    let easyCount = 0;
    let medCount = 0;
    let hardCount = 0;
    let totalProblems = 0;

    document.querySelectorAll('.section').forEach(section => {
        const problems = section.querySelectorAll('.problem');

        problems.forEach(prob => {
            totalProblems++;

            const doneCheckbox = prob.querySelector('.done input[type="checkbox"]');
            const difficultyEl = prob.querySelector('.difficulty');

            if (doneCheckbox && doneCheckbox.checked) {
                totalSolved++;

                if (difficultyEl) {
                    const diffText = difficultyEl.innerText.trim().toLowerCase();
                    if (diffText === 'easy') easyCount++;
                    else if (diffText === 'medium') medCount++;
                    else if (diffText === 'hard') hardCount++;
                }
            }
        });
    });

    const totalEl = document.getElementById('totalSolved');
    const easyEl = document.getElementById('easyCount');
    const medEl = document.getElementById('medCount');
    const hardEl = document.getElementById('hardCount');
    const beatsEl = document.getElementById('beatsPercent');

    if (totalEl) totalEl.innerText = totalSolved;
    if (easyEl) easyEl.innerText = easyCount;
    if (medEl) medEl.innerText = medCount;
    if (hardEl) hardEl.innerText = hardCount;

    if (beatsEl && totalProblems > 0) {
        const percent = ((totalSolved / totalProblems) * 100).toFixed(1);
        beatsEl.innerText = percent;
    } else if (beatsEl) {
        beatsEl.innerText = "0";
    }
}
window.updateTotalSolvedStats = updateTotalSolvedStats;

// ============ MARK DONE ============
function markDone(checkbox, problemName, difficulty) {
    const problemRow = checkbox.closest('.problem');

    // Auto-detect difficulty from DOM (overrides hardcoded value)
    const diffEl = problemRow ? problemRow.querySelector('.difficulty') : null;
    if (diffEl) {
        difficulty = diffEl.innerText.trim();
    }

    const section = checkbox.closest('.section');
    updateProgress(section);
    updateGlobalProgress();
    updateTotalSolvedStats();

    let history = JSON.parse(localStorage.getItem("practiceHistory")) || [];
    history = history.filter(item => item.name !== problemName);

    const now = new Date();
    let date = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    let savedDates = JSON.parse(localStorage.getItem("doneDates")) || [];

    if (checkbox.checked) {
        const problemData = {
            name: problemName,
            difficulty: difficulty,
            time: now.getTime()
        };
        history.unshift(problemData);

        if (!savedDates.includes(date)) {
            savedDates.push(date);
        }
    } else {
        let anyChecked = document.querySelector('.done input[type="checkbox"]:checked');
        if (!anyChecked) {
            savedDates = savedDates.filter(d => d !== date);
        }
    }

    localStorage.setItem("doneDates", JSON.stringify(savedDates));
    loadCalendar();
    localStorage.setItem("practiceHistory", JSON.stringify(history));
    loadHistory();
}

// ============ HISTORY ============
let historyInterval;
function openHistory() {
    document.getElementById("historyPopup").style.display = "flex";
    loadHistory();
    historyInterval = setInterval(() => {
        loadHistory();
    }, 1000);
}

function getTimeAgo(timestamp) {
    const seconds = Math.floor((new Date().getTime() - timestamp) / 1000);
    if (seconds < 60) return `${seconds} seconds ago`;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minutes ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hours ago`;

    const days = Math.floor(hours / 24);
    if (days === 1) return `Yesterday`;
    if (days < 7) return `${days} days ago`;

    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
    });
}

function loadHistory() {
    let history = JSON.parse(localStorage.getItem("practiceHistory")) || [];
    let tableBody = document.getElementById("historyTableBody");
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

// ============ DOM READY ============
document.addEventListener("DOMContentLoaded", async () => {
    loadNotesLinksBooks();
    await loadProblems();
    loadCheckboxesAndProgress();
    attachStaticCheckboxListeners();
    loadHistory();
    updateGlobalProgress();
    updateTotalSolvedStats();
    setupProfileModal();
});

// ============ STATIC CHECKBOX LISTENERS ============
function attachStaticCheckboxListeners() {
    document.querySelectorAll('.section').forEach(section => {
        const category = section.dataset.category;
        const sectionName = section.querySelector('.section-header span').innerText;

        section.querySelectorAll('.problem:not(.dynamic-problem)').forEach(prob => {
            const titleEl = prob.querySelector('span');
            if (!titleEl) return;
            const title = titleEl.innerText.trim();

            // Auto-detect difficulty from DOM
            const diffEl = prob.querySelector('.difficulty');
            const difficulty = diffEl ? diffEl.innerText.trim() : "Medium";

            ['done', 'revision'].forEach(type => {
                const checkbox = prob.querySelector(`.${type} input[type="checkbox"]`);
                if (!checkbox) return;

                const key = `${category}-${sectionName}-${title}-${type}`;

                const newCheckbox = checkbox.cloneNode(true);
                newCheckbox.checked = checkbox.checked;
                checkbox.parentNode.replaceChild(newCheckbox, checkbox);

                newCheckbox.addEventListener('change', () => {
                    let saved = JSON.parse(localStorage.getItem("checkboxes")) || {};
                    saved[key] = newCheckbox.checked;
                    localStorage.setItem("checkboxes", JSON.stringify(saved));

                    updateProgress(section);
                    updateGlobalProgress();
                    updateTotalSolvedStats();

                    if (type === 'done') {
                        markDone(newCheckbox, title, difficulty);
                    }
                });
            });
        });
    });
}

// ============ CALENDAR ============
function loadCalendar() {
    const monthYear = document.getElementById("monthYear");
    const calendarDays = document.getElementById("calendarDays");
    if (!monthYear || !calendarDays) return;

    const now = new Date();

    let year = now.getFullYear();
    let month = now.getMonth();
    let firstDay = new Date(year, month, 1).getDay();
    let totalDays = new Date(year, month + 1, 0).getDate();

    monthYear.innerText = now.toLocaleString('default', { month: 'long', year: 'numeric' });
    calendarDays.innerHTML = "";

    let saved = JSON.parse(localStorage.getItem("doneDates")) || [];

    for (let i = 0; i < firstDay; i++) {
        calendarDays.innerHTML += "<div></div>";
    }

    for (let day = 1; day <= totalDays; day++) {
        let div = document.createElement("div");
        div.classList.add("day");
        div.innerText = day;

        let today = new Date();
        if (day === today.getDate() && month === today.getMonth()) {
            div.classList.add("today");
        }

        let dateString = `${year}-${month + 1}-${day}`;
        if (saved.includes(dateString)) {
            div.classList.add("done");
            div.innerHTML = `${day}<span class="tick">✓</span>`;
        }
        calendarDays.appendChild(div);
    }
}

loadCalendar();

// ============ SIDEBAR ACTIVE MENU SWITCH ============
document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', function () {
        document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
        this.classList.add('active');
    });
});

// ============ PROFILE UI ============
function updateProfileUI(user) {
    const userInfo = document.getElementById('userInfo');
    const profilePic = document.getElementById('profilePicture');
    const userEmail = document.getElementById('userEmail');
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    if (user) {
        if (userInfo) userInfo.style.display = 'flex';
        if (loginBtn) loginBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'block';

        if (user.photoURL) {
            profilePic.src = user.photoURL;
        } else {
            const initial = user.email ? user.email.charAt(0).toUpperCase() : 'U';
            profilePic.src = `https://ui-avatars.com/api/?name=${initial}&background=6c5ce7&color=fff`;
        }

        if (userEmail) userEmail.textContent = user.email;
    } else {
        if (userInfo) userInfo.style.display = 'none';
        if (loginBtn) loginBtn.style.display = 'block';
        if (logoutBtn) logoutBtn.style.display = 'none';
    }
}

// ============ PROFILE MODAL ============
function setupProfileModal() {
    const userInfoCircle = document.getElementById('userInfo');
    const profileModal = document.getElementById('profileModal');
    const closeProfileBtn = document.getElementById('closeProfileModal');

    if (userInfoCircle && profileModal) {
        userInfoCircle.addEventListener('click', (e) => {
            e.stopPropagation();
            calculateAndPopulateProfileDetails();
            profileModal.style.display = 'block';
        });
    }

    if (closeProfileBtn && profileModal) {
        closeProfileBtn.addEventListener('click', () => {
            profileModal.style.display = 'none';
        });

        window.addEventListener('click', (e) => {
            if (e.target == profileModal) {
                profileModal.style.display = 'none';
            }
        });
    }
}

function calculateAndPopulateProfileDetails() {
    if (!window.currentUser) return;

    const user = window.currentUser;
    const dbProfile = window.currentUserProfileData || {};

    document.getElementById('profileDetailEmail').innerText = user.email || 'N/A';
    document.getElementById('profileDetailPhone').innerText = dbProfile.phone || user.phoneNumber || 'Not Provided';
    document.getElementById('profileDetailName').innerText = dbProfile.name || user.displayName || 'Learner';

    const detailPic = document.getElementById('profileDetailPic');
    if (user.photoURL) {
        detailPic.src = user.photoURL;
    } else {
        const initial = user.email ? user.email.charAt(0).toUpperCase() : 'U';
        detailPic.src = `https://ui-avatars.com/api/?name=${initial}&background=6c5ce7&color=fff`;
    }

    const savedCheckboxData = JSON.parse(localStorage.getItem('checkboxes')) || {};
    const targetCategories = ["Arrays", "BinarySearch", "Strings", "Bit Manipulation", "Linked List"];
    const breakdownContainer = document.getElementById('categoryBreakdown');
    breakdownContainer.innerHTML = '';

    let totalDoneAllTopics = 0;
    let activeCategoriesCount = 0;

    targetCategories.forEach(category => {
        let totalProblemsCount = 0;
        let solvedProblemsCount = 0;

        const matchingSections = Array.from(document.querySelectorAll('.section'))
            .filter(section => (section.dataset.category || '').trim() === category);

        matchingSections.forEach(section => {
            const sectionName = section.querySelector('.section-header span').innerText.trim();
            const problems = section.querySelectorAll('.problem');
            totalProblemsCount += problems.length;

            problems.forEach(prob => {
                const titleEl = prob.querySelector('span');
                if (!titleEl) return;
                const title = titleEl.innerText.trim();
                const checkboxKey = `${category}-${sectionName}-${title}-done`;

                if (savedCheckboxData[checkboxKey] === true) {
                    solvedProblemsCount++;
                }
            });
        });

        totalDoneAllTopics += solvedProblemsCount;
        if (solvedProblemsCount > 0) {
            activeCategoriesCount++;
        }

        if (totalProblemsCount > 0) {
            const percentageFilled = Math.round((solvedProblemsCount / totalProblemsCount) * 100) || 0;
            const breakdownRow = document.createElement('div');
            breakdownRow.className = 'breakdown-row';
            breakdownRow.innerHTML = `
                <div class="breakdown-info">
                    <span class="breakdown-name">${category}</span>
                    <span class="breakdown-count">${solvedProblemsCount}/${totalProblemsCount} (${percentageFilled}%)</span>
                </div>
                <div class="breakdown-progress-bg">
                    <div class="breakdown-progress-fill" style="width: ${percentageFilled}%"></div>
                </div>
            `;
            breakdownContainer.appendChild(breakdownRow);
        }
    });

    document.getElementById('profileTotalDone').innerText = totalDoneAllTopics;
    document.getElementById('profileCategoryCount').innerText = `${activeCategoriesCount}/${targetCategories.length}`;
}

// ============ SEARCH FUNCTIONALITY ============
function openSearch() {
    // Hide all other pages
    document.querySelectorAll('.section').forEach(sec => sec.style.display = 'none');
    document.querySelector('.tabs').style.display = 'none';
    document.getElementById('notesPage').style.display = 'none';
    document.getElementById('linksPage').style.display = 'none';
    document.getElementById('booksPage').style.display = 'none';

    // Show search page
    const searchPage = document.getElementById('searchPage');
    if (searchPage) {
        searchPage.style.display = 'block';
        const input = document.getElementById('searchInput');
        if (input) {
            input.value = '';
            input.focus();
            document.getElementById('searchResults').innerHTML = 
                '<p class="search-hint">Start typing to search across all topics...</p>';
        }
    }
}
window.openSearch = openSearch;

function performSearch() {
    const query = document.getElementById('searchInput').value.trim().toLowerCase();
    const resultsContainer = document.getElementById('searchResults');

    if (!query) {
        resultsContainer.innerHTML = 
            '<p class="search-hint">Start typing to search across all topics...</p>';
        return;
    }

    // Collect matches, grouped by topic (category + section)
    const groupedResults = {};

    document.querySelectorAll('.section').forEach(section => {
        const category = section.dataset.category || 'Other';
        const sectionHeaderEl = section.querySelector('.section-header span');
        const sectionName = sectionHeaderEl ? sectionHeaderEl.innerText.trim() : 'Unknown';

        section.querySelectorAll('.problem').forEach(prob => {
            const titleEl = prob.querySelector('.title') || prob.querySelector('span');
            if (!titleEl) return;
            const title = titleEl.innerText.trim();

            if (title.toLowerCase().includes(query)) {
                const groupKey = `${category}||${sectionName}`;
                if (!groupedResults[groupKey]) {
                    groupedResults[groupKey] = {
                        category: category,
                        sectionName: sectionName,
                        problems: []
                    };
                }
                groupedResults[groupKey].problems.push(prob);
            }
        });
    });

    // Render results
    const keys = Object.keys(groupedResults);
    if (keys.length === 0) {
        resultsContainer.innerHTML = 
            `<p class="search-no-results">No problems found matching "<strong>${escapeHtml(query)}</strong>"</p>`;
        return;
    }

    let html = '';
    keys.forEach(key => {
        const group = groupedResults[key];
        html += `
            <div class="search-topic-group">
                <div class="search-topic-title">
                    ${escapeHtml(group.category)}
                    <span class="search-topic-subtitle">→ ${escapeHtml(group.sectionName)}</span>
                </div>
                <div class="search-result-header">
                    <span>Problem</span>
                    <span>Link</span>
                    <span>Done</span>
                    <span>Revision</span>
                    <span>Difficulty</span>
                </div>
        `;

        group.problems.forEach(prob => {
            // Clone the problem row so interactions stay in sync
            const cloned = prob.cloneNode(true);
            cloned.classList.add('search-result-row');
            cloned.classList.remove('problem');

            // Highlight the matched text
            const titleEl = cloned.querySelector('.title') || cloned.querySelector('span');
            if (titleEl) {
                const originalText = titleEl.innerText;
                const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
                titleEl.innerHTML = originalText.replace(regex, '<span class="search-highlight">$1</span>');
            }

            // Sync checkbox interactions back to the original problem
            const originalDoneCb = prob.querySelector('.done input[type="checkbox"]');
            const originalRevCb = prob.querySelector('.revision input[type="checkbox"]');
            const clonedDoneCb = cloned.querySelector('.done input[type="checkbox"]');
            const clonedRevCb = cloned.querySelector('.revision input[type="checkbox"]');

            if (clonedDoneCb && originalDoneCb) {
                clonedDoneCb.checked = originalDoneCb.checked;
                clonedDoneCb.addEventListener('change', () => {
                    originalDoneCb.checked = clonedDoneCb.checked;
                    originalDoneCb.dispatchEvent(new Event('change'));
                });
            }

            if (clonedRevCb && originalRevCb) {
                clonedRevCb.checked = originalRevCb.checked;
                clonedRevCb.addEventListener('change', () => {
                    originalRevCb.checked = clonedRevCb.checked;
                    originalRevCb.dispatchEvent(new Event('change'));
                });
            }

            html += cloned.outerHTML;
        });

        html += `</div>`;
    });

    resultsContainer.innerHTML = html;

    // Re-attach listeners because innerHTML wipes them
    reattachSearchListeners(groupedResults);
}
window.performSearch = performSearch;

// After innerHTML wipes bindings, wire up again by matching indices
function reattachSearchListeners(groupedResults) {
    const groups = document.querySelectorAll('.search-topic-group');
    let groupIndex = 0;

    Object.keys(groupedResults).forEach(key => {
        const group = groupedResults[key];
        const groupEl = groups[groupIndex++];
        if (!groupEl) return;

        const resultRows = groupEl.querySelectorAll('.search-result-row');
        group.problems.forEach((originalProb, idx) => {
            const clonedRow = resultRows[idx];
            if (!clonedRow) return;

            const originalDoneCb = originalProb.querySelector('.done input[type="checkbox"]');
            const originalRevCb = originalProb.querySelector('.revision input[type="checkbox"]');
            const clonedDoneCb = clonedRow.querySelector('.done input[type="checkbox"]');
            const clonedRevCb = clonedRow.querySelector('.revision input[type="checkbox"]');

            if (clonedDoneCb && originalDoneCb) {
                clonedDoneCb.checked = originalDoneCb.checked;
                clonedDoneCb.addEventListener('change', () => {
                    originalDoneCb.checked = clonedDoneCb.checked;
                    originalDoneCb.dispatchEvent(new Event('change'));
                });
            }

            if (clonedRevCb && originalRevCb) {
                clonedRevCb.checked = originalRevCb.checked;
                clonedRevCb.addEventListener('change', () => {
                    originalRevCb.checked = clonedRevCb.checked;
                    originalRevCb.dispatchEvent(new Event('change'));
                });
            }
        });
    });
}

// Helpers
function escapeHtml(text) {
    const div = document.createElement('div');
    div.innerText = text;
    return div.innerHTML;
}

function escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============ CURATED CONTENT (Owner/Admin added) ============
// Edit these arrays to add your own recommended content
const CURATED_CONTENT = {
    books: [
        {
            name: "Introduction to Algorithms",
            url: "https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/"
        },
        {
            name: "Cracking the Coding Interview",
            url: "https://www.crackingthecodinginterview.com/"
        },
        {
            name: "Grokking Algorithms",
            url: "https://www.manning.com/books/grokking-algorithms"
        }
    ],
    links: [
        { name: "Striver's A2Z DSA Sheet", url: "https://takeuforward.org/strivers-a2z-dsa-course/strivers-a2z-dsa-course-sheet-2/" },
        { name: "NeetCode 150", url: "https://neetcode.io/practice" },
        { name: "LeetCode", url: "https://leetcode.com/" },
        { name: "GeeksforGeeks DSA", url: "https://www.geeksforgeeks.org/data-structures/" },
        { name: "Codeforces", url: "https://codeforces.com/" }
    ],
    notes: [
        { name: "Big-O Cheat Sheet", url: "https://www.bigocheatsheet.com/" },
        { name: "DSA Patterns Guide", url: "https://seanprashad.com/leetcode-patterns/" }
    ]
};

// ============ SWITCH CONTENT TAB (Personal / Curated) ============
function switchContentTab(button, feature, type) {
    // Update tab buttons
    const parent = button.parentElement;
    parent.querySelectorAll('.content-tab').forEach(t => t.classList.remove('active'));
    button.classList.add('active');

    // Update panels
    const personalPanel = document.getElementById(`${feature}Personal`);
    const curatedPanel = document.getElementById(`${feature}Curated`);

    if (type === 'personal') {
        personalPanel.classList.add('active');
        curatedPanel.classList.remove('active');
    } else {
        curatedPanel.classList.add('active');
        personalPanel.classList.remove('active');
        renderCuratedContent(feature);
    }
}
window.switchContentTab = switchContentTab;

// ============ RENDER CURATED CONTENT ============
function renderCuratedContent(feature) {
    const containerId = `curated${feature.charAt(0).toUpperCase() + feature.slice(1)}Container`;
    const container = document.getElementById(containerId);
    if (!container) return;

    const items = CURATED_CONTENT[feature] || [];
    container.innerHTML = '';

    if (items.length === 0) {
        container.innerHTML = '<p style="color:#8b8ba7; text-align:center; padding:20px;">No curated content yet.</p>';
        return;
    }

    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <p>${escapeHtml(item.name)}</p>
            <div class="card-buttons">
                <a href="${escapeHtml(item.url)}" target="_blank">Open</a>
            </div>
        `;
        container.appendChild(card);
    });
}
window.renderCuratedContent = renderCuratedContent;
