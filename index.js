// Firebase konfiguratsiya
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyACHEuejKVniBAcYExQxk23A9QD84bUaB4",
  authDomain: "new-project-6075a.firebaseapp.com",
  projectId: "new-project-6075a",
  storageBucket: "new-project-6075a.appspot.com",
  messagingSenderId: "974403904500",
  appId: "1:974403904500:web:5d4edb5db8f5432cbdcfa1",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Forma ko‘rsatish tugmalari
const showLogin = document.getElementById("showLogin");
const showRegister = document.getElementById("showRegister");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const errorEl = document.getElementById("error");

showLogin.onclick = () => {
  loginForm.classList.remove("hidden");
  registerForm.classList.add("hidden");
  errorEl.innerText = "";
};
showRegister.onclick = () => {
  loginForm.classList.add("hidden");
  registerForm.classList.remove("hidden");
  errorEl.innerText = "";
};

// Login
loginForm.onsubmit = (e) => {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;
  signInWithEmailAndPassword(auth, email, password)
    .then(() => window.location.href = "dashboard.html")
    .catch(err => showError(err.message));
};

// Register
registerForm.onsubmit = (e) => {
  e.preventDefault();
  const name = document.getElementById("registerName").value;
  const email = document.getElementById("registerEmail").value;
  const password = document.getElementById("registerPassword").value;
  if (!name) return showError("Ismni kiriting!");
  createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      updateProfile(userCredential.user, { displayName: name });
      window.location.href = "dashboard.html";
    })
    .catch(err => showError(err.message));
};

function showError(error) {
  let msg = error.message;
  if (error.code === "auth/email-already-in-use") {
    msg = "Bu email bilan foydalanuvchi allaqachon ro‘yxatdan o‘tgan.";
  } else if (error.code === "auth/invalid-credential" || error.code === "auth/wrong-password") {
    msg = "Email yoki parol noto‘g‘ri.";
  } else if (error.code === "auth/user-not-found") {
    msg = "Bunday foydalanuvchi topilmadi.";
  }
  document.getElementById("error").innerText = msg;
}

// Ro'yxatdan o'tish va kirish funksiyalaringizda:
// try {
//   ...firebase auth code...
// } catch (error) {
//   showError(error);
// }

// Firestore dan ma'lumotlarni olish
useEffect(() => {
  const unsubscribe = onSnapshot(collection(db, "qarzlar"), (snapshot) => {
    console.log("Snapshot:", snapshot.docs);
    setQarzlar(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  });
  return () => unsubscribe();
}, []);
