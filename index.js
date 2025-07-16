import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

// Firebase konfiguratsiya
const firebaseConfig = {
   apiKey : "AIzaSyACHEuejKVniBAcYExQxk23A9QD84bUaB4" , 
  authDomain : "new-project-6075a.firebaseapp.com" , 
  projectId : "new-project-6075a" , 
  storageBucket : "new-project-6075a.firebasestorage.app" , 
  messagingSenderId : "974403904500" , 
  appId : "1:974403904500:web:5d4edb5db8f5432cbdcfa1" , 
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);


const showLogin = document.getElementById("showLogin");
const showRegister = document.getElementById("showRegister");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const loginError = document.getElementById("loginError");
const registerError = document.getElementById("registerError");

showRegister.onclick = () => {
  loginForm.classList.add("hidden");
  registerForm.classList.remove("hidden");
  loginError.innerText = "";
  registerError.innerText = "";
};
showLogin.onclick = () => {
  registerForm.classList.add("hidden");
  loginForm.classList.remove("hidden");
  loginError.innerText = "";
  registerError.innerText = "";
};

// Login
loginForm.onsubmit = (e) => {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;
  signInWithEmailAndPassword(auth, email, password)
    .then(() => window.location.href = "dashboard.html")
    .catch(err => loginError.innerText = err.message);
};

// Yangi: SMS kod inputini yaratish uchun yordamchi
function showSmsInput(onVerify) {
  let smsDiv = document.getElementById('smsVerifyDiv');
  if (!smsDiv) {
    smsDiv = document.createElement('div');
    smsDiv.id = 'smsVerifyDiv';
    smsDiv.innerHTML = `
      <input type="text" id="smsCodeInput" placeholder="SMS code" style="width:100%;margin-top:10px;" />
      <button type="button" id="verifySmsBtn" style="width:100%;margin-top:5px;">Tasdiqlash</button>
    `;
    registerForm.appendChild(smsDiv);
  }
  document.getElementById('verifySmsBtn').onclick = onVerify;
}

// Register (Phone Auth)
registerForm.onsubmit = (e) => {
  e.preventDefault();
  registerError.innerText = "";
  const name = document.getElementById("registerName").value;
  const phone = document.getElementById("registerPhone").value;
  if (!name) {
    registerError.innerText = "Ism kiritilishi shart!";
    return;
  }
  // reCAPTCHA ni joylashtirish (Firebase Phone Auth uchun majburiy)
  let recaptchaDiv = document.getElementById('recaptcha-container');
  if (!recaptchaDiv) {
    recaptchaDiv = document.createElement('div');
    recaptchaDiv.id = 'recaptcha-container';
    registerForm.appendChild(recaptchaDiv);
  }
  window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
    'size': 'invisible',
    'callback': function(response) {
      // reCAPTCHA yechildi
    }
  });
  const appVerifier = window.recaptchaVerifier;
  // Telefon raqamga SMS yuborish
  firebase.auth().signInWithPhoneNumber(phone, appVerifier)
    .then((confirmationResult) => {
      window.confirmationResult = confirmationResult;
      showSmsInput(() => {
        const code = document.getElementById('smsCodeInput').value;
        confirmationResult.confirm(code)
          .then((result) => {
            // Foydalanuvchi ro‘yxatdan o‘tdi
            // Ismni profilega yozish
            result.user.updateProfile({ displayName: name });
            window.location.href = "dashboard.html";
          })
          .catch(err => registerError.innerText = "Kod noto‘g‘ri yoki muddati o‘tgan!" );
      });
    })
    .catch(err => registerError.innerText = err.message);
};

// Foydalanuvchi login bo'lganini tekshirish (eng boshida)
onAuthStateChanged(auth, (user) => {
  if (user) {
    // Agar foydalanuvchi login bo'lgan bo'lsa, to'g'ridan-to'g'ri dashboard.html ga yo'naltiriladi
    window.location.href = "dashboard.html";
  }
});
