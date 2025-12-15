import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updatePassword as fbUpdatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getDatabase, ref, set, get, push, update, onValue, query, orderByChild } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

// Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyBJW_BwyZzxqumyDsyACddWZMUKJv1O9as",
    authDomain: "ak-playvideo.firebaseapp.com",
    projectId: "ak-playvideo",
    storageBucket: "ak-playvideo.firebasestorage.app",
    messagingSenderId: "452155991718",
    appId: "1:452155991718:web:5d534214ad9526fc61f667",
    measurementId: "G-9EHXX4JKK2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const storage = getStorage(app);

// Global Variables
let currentUser = null;
let selectedFile = null;
let currentPostId = null;

// Auth State Observer
onAuthStateChanged(auth, async (user) => {
    if (user) {
        await loadUserData(user.uid);
        showMainApp();
        loadPosts();
    } else {
        showLoginPage();
    }
});

// Load User Data
async function loadUserData(uid) {
    const userRef = ref(db, `users/${uid}`);
    const snapshot = await get(userRef);
    if (snapshot.exists()) {
        currentUser = { uid, ...snapshot.val() };
        updateProfileDisplay();
    }
}

// Show/Hide Pages
function showLoginPage() {
    document.getElementById('loginPage').classList.add('active');
    document.getElementById('registerPage').classList.remove('active');
    document.getElementById('mainApp').classList.remove('active');
}

function showMainApp() {
    document.getElementById('loginPage').classList.remove('active');
    document.getElementById('registerPage').classList.remove('active');
    document.getElementById('mainApp').classList.add('active');
}

// Login
window.login = async () => {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!username || !password) {
        alert('Sila isi semua field!');
        return;
    }

    try {
        const email = `${username}@locatwet.app`;
        await signInWithEmailAndPassword(auth, email, password);
        
        // Save to local storage
        saveAccountToLocal(username, password);
    } catch (error) {
        alert('Login gagal! Sila semak username dan password anda.');
        console.error(error);
    }
};

// Register
window.register = async () => {
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirm = document.getElementById('regConfirm').value;

    if (!username || !password || !confirm) {
        alert('Sila isi semua field!');
        return;
    }

    if (password !== confirm) {
        alert('Password tidak sama!');
        return;
    }

    if (username.length < 3) {
        alert('Username mestilah sekurang-kurangnya 3 aksara!');
        return;
    }

    try {
        const email = `${username}@locatwet.app`;
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Create user profile in database
        await set(ref(db, `users/${userCredential.user.uid}`), {
            username: username,
            bio: 'Selamat datang ke LocaTwet!',
            createdAt: Date.now()
        });

        // Save to local storage
        saveAccountToLocal(username, password);
        
        alert('Pendaftaran berjaya!');
    } catch (error) {
        alert('Pendaftaran gagal! Username mungkin telah digunakan.');
        console.error(error);
    }
};

// Save Account to Local Storage (Max 3)
function saveAccountToLocal(username, password) {
    let accounts = JSON.parse(localStorage.getItem('locatwet_accounts') || '[]');
    
    // Remove if already exists
    accounts = accounts.filter(acc => acc.username !== username);
    
    // Add to beginning
    accounts.unshift({ username, password });
    
    // Keep only 3 accounts
    if (accounts.length > 3) {
        accounts = accounts.slice(0, 3);
    }
    
    localStorage.setItem('locatwet_accounts', JSON.stringify(accounts));
}

// Show Register Page
window.showRegister = () => {
    document.getElementById('loginPage').classList.remove('active');
    document.getElementById('registerPage').classList.add('active');
};

// Show Login Page
window.showLogin = () => {
    document.getElementById('registerPage').classList.remove('active');
    document.getElementById('loginPage').classList.add('active');
};

// Logout
window.logout = async () => {
    if (confirm('Adakah anda pasti mahu log keluar?')) {
        await signOut(auth);
        currentUser = null;
    }
};

// Update Profile Display
function updateProfileDisplay() {
    if (currentUser) {
        const initial = currentUser.username.charAt(0).toUpperCase();
        document.getElementById('profileAvatar').textContent = initial;
        document.getElementById('profileUsername').textContent = currentUser.username;
        document.getElementById('profileBio').textContent = currentUser.bio || 'Selamat datang ke LocaTwet!';
    }
}

// Show Page (Feed, Upload, Profile)
window.showPage = (page) => {
    // Hide all content pages
    document.getElementById('feedPage').classList.add('hidden');
    document.getElementById('uploadPage').classList.add('hidden');
    document.getElementById('profilePage').classList.add('hidden');
    
    // Remove active from all nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    
    // Show selected page
    if (page === 'feed') {
        document.getElementById('feedPage').classList.remove('hidden');
        document.querySelectorAll('.nav-btn')[0].classList.add('active');
        loadPosts();
    } else if (page === 'upload') {
        document.getElementById('uploadPage').classList.remove('hidden');
        document.querySelectorAll('.nav-btn')[1].classList.add('active');
    } else if (page === 'profile') {
        document.getElementById('profilePage').classList.remove('hidden');
        document.querySelectorAll('.nav-btn')[2].classList.add('active');
    }
};

// Preview File
window.previewFile = () => {
    const file = document.getElementById('fileInput').files[0];
    if (!file) return;

    selectedFile = file;
    const reader = new FileReader();
    
    reader.onload = (e) => {
        const preview = document.getElementById('previewArea');
        if (file.type.startsWith('image/')) {
            preview.innerHTML = `<img src="${e.target.result}">`;
        } else if (file.type.startsWith('video/')) {
            preview.innerHTML = `<video src="${e.target.result}" controls></video>`;
        }
    };
    
    reader.readAsDataURL(file);
};

// Upload Post
window.uploadPost = async () => {
    if (!selectedFile) {
        alert('Sila pilih gambar atau video!');
        return;
    }

    const caption = document.getElementById('postCaption').value;
    
    try {
        // Upload file to storage
        const fileName = `${Date.now()}_${selectedFile.name}`;
        const fileRef = storageRef(storage, `posts/${fileName}`);
        const snapshot = await uploadBytes(fileRef, selectedFile);
        const mediaUrl = await getDownloadURL(snapshot.ref);

        // Save post to database
        const postRef = push(ref(db, 'posts'));
        await set(postRef, {
            userId: currentUser.uid,
            username: currentUser.username,
            caption: caption,
            mediaUrl: mediaUrl,
            mediaType: selectedFile.type.startsWith('image/') ? 'image' : 'video',
            likes: 0,
            timestamp: Date.now()
        });

        alert('Post berjaya dimuat naik!');
        
        // Reset form
        document.getElementById('postCaption').value = '';
        document.getElementById('previewArea').innerHTML = '';
        document.getElementById('fileInput').value = '';
        selectedFile = null;
        
        // Go to feed
        showPage('feed');
    } catch (error) {
        alert('Gagal memuat naik post!');
        console.error(error);
    }
};

// Load Posts
function loadPosts() {
    const postsRef = ref(db, 'posts');
    
    onValue(postsRef, (snapshot) => {
        const posts = [];
        snapshot.forEach((childSnapshot) => {
            posts.push({
                id: childSnapshot.key,
                ...childSnapshot.val()
            });
        });
        
        // Sort by timestamp (newest first)
        posts.sort((a, b) => b.timestamp - a.timestamp);
        
        displayPosts(posts);
    });
}

// Display Posts
function displayPosts(posts) {
    const container = document.getElementById('postsContainer');
    
    if (posts.length === 0) {
        container.innerHTML = '<div class="loading">Tiada post lagi. Jadilah yang pertama!</div>';
        return;
    }

    container.innerHTML = posts.map(post => {
        const isLiked = post.likedBy && post.likedBy[currentUser.uid];
        const likesCount = post.likes || 0;
        const commentsCount = post.comments ? Object.keys(post.comments).length : 0;
        
        const mediaTag = post.mediaType === 'image' 
            ? `<img src="${post.mediaUrl}" class="post-media" alt="Post image">`
            : `<video src="${post.mediaUrl}" class="post-media" controls></video>`;

        return `
            <div class="post">
                <div class="post-header">
                    <div class="avatar">${post.username.charAt(0).toUpperCase()}</div>
                    <div class="post-user">
                        <div class="post-username">${post.username}</div>
                        <div class="post-time">${formatTime(post.timestamp)}</div>
                    </div>
                </div>
                ${mediaTag}
                ${post.caption ? `<div class="post-caption">${post.caption}</div>` : ''}
                <div class="post-actions">
                    <button class="action-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike('${post.id}')">
                        ${isLiked ? '❤️' : '🤍'} ${likesCount}
                    </button>
                    <button class="action-btn" onclick="showComments('${post.id}')">
                        💬 ${commentsCount}
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Format Time
function formatTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Baru sahaja';
    if (minutes < 60) return `${minutes} minit yang lalu`;
    if (hours < 24) return `${hours} jam yang lalu`;
    if (days < 7) return `${days} hari yang lalu`;
    
    const date = new Date(timestamp);
    return date.toLocaleDateString('ms-MY');
}

// Toggle Like
window.toggleLike = async (postId) => {
    const postRef = ref(db, `posts/${postId}`);
    const snapshot = await get(postRef);
    const post = snapshot.val();

    const likedBy = post.likedBy || {};
    const isLiked = likedBy[currentUser.uid];

    if (isLiked) {
        delete likedBy[currentUser.uid];
        await update(postRef, {
            likes: Math.max(0, (post.likes || 0) - 1),
            likedBy: likedBy
        });
    } else {
        likedBy[currentUser.uid] = true;
        await update(postRef, {
            likes: (post.likes || 0) + 1,
            likedBy: likedBy
        });
    }
};

// Show Comments
window.showComments = async (postId) => {
    currentPostId = postId;
    const modal = document.getElementById('commentModal');
    modal.classList.add('active');
    
    // Load comments
    const commentsRef = ref(db, `posts/${postId}/comments`);
    onValue(commentsRef, (snapshot) => {
        const comments = [];
        snapshot.forEach((childSnapshot) => {
            comments.push({
                id: childSnapshot.key,
                ...childSnapshot.val()
            });
        });
        
        // Sort by timestamp
        comments.sort((a, b) => a.timestamp - b.timestamp);
        
        displayComments(comments);
    });
};

// Display Comments
function displayComments(comments) {
    const container = document.getElementById('commentsList');
    
    if (comments.length === 0) {
        container.innerHTML = '<div class="loading">Tiada komen lagi. Jadilah yang pertama!</div>';
        return;
    }

    container.innerHTML = comments.map(comment => `
        <div class="comment">
            <div class="comment-header">
                <div class="comment-avatar">${comment.username.charAt(0).toUpperCase()}</div>
                <span class="comment-username">${comment.username}</span>
            </div>
            <div class="comment-text">${comment.text}</div>
        </div>
    `).join('');
}

// Post Comment
window.postComment = async () => {
    const text = document.getElementById('commentInput').value.trim();
    
    if (!text) {
        alert('Sila tulis komen!');
        return;
    }

    try {
        const commentRef = push(ref(db, `posts/${currentPostId}/comments`));
        await set(commentRef, {
            userId: currentUser.uid,
            username: currentUser.username,
            text: text,
            timestamp: Date.now()
        });

        document.getElementById('commentInput').value = '';
    } catch (error) {
        alert('Gagal menghantar komen!');
        console.error(error);
    }
};

// Show Edit Modal
window.showEditModal = () => {
    document.getElementById('editUsername').value = currentUser.username;
    document.getElementById('editModal').classList.add('active');
};

// Update Username
window.updateUsername = async () => {
    const newUsername = document.getElementById('editUsername').value.trim();
    
    if (!newUsername) {
        alert('Sila masukkan username!');
        return;
    }

    if (newUsername.length < 3) {
        alert('Username mestilah sekurang-kurangnya 3 aksara!');
        return;
    }

    try {
        await update(ref(db, `users/${currentUser.uid}`), {
            username: newUsername
        });

        currentUser.username = newUsername;
        updateProfileDisplay();
        closeModal('editModal');
        alert('Username berjaya dikemaskini!');
    } catch (error) {
        alert('Gagal mengemaskini username!');
        console.error(error);
    }
};

// Show Password Modal
window.showPasswordModal = () => {
    document.getElementById('passwordModal').classList.add('active');
};

// Update Password
window.updatePassword = async () => {
    const oldPassword = document.getElementById('oldPassword').value;
    const newPassword = document.getElementById('newPassword').value;

    if (!oldPassword || !newPassword) {
        alert('Sila isi semua field!');
        return;
    }

    if (newPassword.length < 6) {
        alert('Password baru mestilah sekurang-kurangnya 6 aksara!');
        return;
    }

    try {
        const user = auth.currentUser;
        const email = user.email;
        const credential = EmailAuthProvider.credential(email, oldPassword);
        
        await reauthenticateWithCredential(user, credential);
        await fbUpdatePassword(user, newPassword);

        document.getElementById('oldPassword').value = '';
        document.getElementById('newPassword').value = '';
        closeModal('passwordModal');
        alert('Password berjaya ditukar!');
    } catch (error) {
        alert('Gagal menukar password! Pastikan password lama betul.');
        console.error(error);
    }
};

// Show Switch Account Modal
window.showSwitchModal = () => {
    const accounts = JSON.parse(localStorage.getItem('locatwet_accounts') || '[]');
    const container = document.getElementById('accountsList');
    
    if (accounts.length === 0) {
        container.innerHTML = '<div class="loading">Tiada akaun lain disimpan</div>';
    } else {
        container.innerHTML = accounts.map((acc, index) => `
            <div class="account-item" onclick="switchToAccount('${acc.username}', '${acc.password}')">
                <div class="account-info">
                    <div class="account-avatar">${acc.username.charAt(0).toUpperCase()}</div>
                    <span>${acc.username}</span>
                </div>
                ${acc.username === currentUser.username ? '<span>✓ Aktif</span>' : ''}
            </div>
        `).join('');
    }
    
    document.getElementById('switchModal').classList.add('active');
};

// Switch to Account
window.switchToAccount = async (username, password) => {
    if (username === currentUser.username) {
        alert('Anda sudah menggunakan akaun ini!');
        return;
    }

    try {
        await signOut(auth);
        const email = `${username}@locatwet.app`;
        await signInWithEmailAndPassword(auth, email, password);
        closeModal('switchModal');
    } catch (error) {
        alert('Gagal menukar akaun!');
        console.error(error);
    }
};

// Close Modal
window.closeModal = (modalId) => {
    document.getElementById(modalId).classList.remove('active');
    
    // Clear comment input if closing comment modal
    if (modalId === 'commentModal') {
        document.getElementById('commentInput').value = '';
        currentPostId = null;
    }
};