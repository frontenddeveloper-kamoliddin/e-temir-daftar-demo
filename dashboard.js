import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  arrayUnion,
  Timestamp,
  deleteDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firebase configuration and initialization
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

// Authentication state listener
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "index.html";
  } else {
    loadDebtors();
    loadMyDebts();
  }
});

// Sidebar functionality
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");
document.getElementById("openSidebar").onclick = () => {
  sidebar.classList.remove("-translate-x-full");
  sidebarOverlay.classList.remove("hidden");
};
document.getElementById("closeSidebar").onclick = closeSidebar;
sidebarOverlay.onclick = closeSidebar;

function closeSidebar() {
  sidebar.classList.add("-translate-x-full");
  sidebarOverlay.classList.add("hidden");
}

// Logout functionality
document.getElementById("logoutBtn").onclick = () => {
  signOut(auth).then(() => (window.location.href = "index.html"));
};

// Generate unique debtor code
function generateUniqueDebtorCode(existingCodes = []) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code;
  do {
    code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (existingCodes.includes(code));
  return code;
}

// Debtor form submission
const debtorForm = document.getElementById("debtorForm");
debtorForm.onsubmit = async (e) => {
  e.preventDefault();
  const name = document.getElementById("debtorName").value.trim();
  const product = document.getElementById("debtorProduct").value.trim();
  let count = parseInt(document.getElementById("debtorCount").value);
  let price = parseInt(document.getElementById("debtorPrice").value);
  const note = document.getElementById("debtorNote").value.trim();
  
  if (!name || !price) return;

  // Validate and calculate amount
  price = price * 1;
  let amount;
  if (!count || count <= 0) {
    count = 1;
    amount = price;
  } else {
    amount = count * price;
  }

  if (price <= 0) {
    price = 1;
    amount = price;
  }

  const user = auth.currentUser;
  if (!user) return;

  // Check if debtor already exists
  const snapshot = await getDocs(collection(db, "debtors"));
  const exists = snapshot.docs.some((doc) => {
    const data = doc.data();
    return data.userId === user.uid && data.name.toLowerCase() === name.toLowerCase();
  });
  
  if (exists) {
    alert("Bu ismli qarzdor allaqachon mavjud!");
    return;
  }

  // Generate unique code
  const existingCodes = snapshot.docs.map(doc => doc.data().code).filter(Boolean);
  const code = generateUniqueDebtorCode(existingCodes);

  // Add new debtor
  await addDoc(collection(db, "debtors"), {
    name,
    product,
    count,
    price,
    note,
    userId: user.uid,
    code,
    history: [{
      type: "add",
      amount,
      count,
      price,
      product,
      note,
      date: Timestamp.now(),
    }],
  });
  
  debtorForm.reset();
  loadDebtors();
};

// Load and render debtors
document.getElementById("searchInput").oninput = loadDebtors;

async function loadDebtors() {
  const user = auth.currentUser;
  if (!user) return;
  
  const search = document.getElementById("searchInput").value.toLowerCase();
  const snapshot = await getDocs(collection(db, "debtors"));
  
  let debtors = [];
  snapshot.forEach((doc) => {
    let data = doc.data();
    data.id = doc.id;
    if (data.userId === user.uid) {
      debtors.push(data);
    }
  });
  
  if (search) {
    debtors = debtors.filter((d) => d.name.toLowerCase().includes(search));
  }
  
  renderDebtors(debtors);
}

function renderStats(debtors) {
  let totalAdded = 0, totalSubtracted = 0, totalDebt = 0;
  
  debtors.forEach((d) => {
    let add = 0, sub = 0;
    d.history?.forEach((h) => {
      if (h.type === "add") add += h.amount;
      if (h.type === "sub") sub += h.amount;
    });
    totalAdded += add;
    totalSubtracted += sub;
    totalDebt += add - sub;
  });
  
  document.getElementById("totalAdded").innerText = totalAdded + " so'm";
  document.getElementById("totalSubtracted").innerText = totalSubtracted + " so'm";
  document.getElementById("totalDebt").innerText = totalDebt + " so'm";
}

function renderDebtors(debtors) {
  debtors.sort((a, b) => a.name.localeCompare(b.name, "uz", { sensitivity: "base" }));
  renderStats(debtors);
  
  const list = document.getElementById("debtorsList");
  list.innerHTML = "";
  
  if (debtors.length === 0) {
    list.innerHTML = `<div class="text-center text-gray-500 dark:text-gray-400">Qarzdorlar topilmadi</div>`;
    return;
  }
  
  debtors.forEach((d) => {
    const productSum = (d.count || 0) * (d.price || 0);
    let totalAdd = 0, totalSub = 0;
    
    (d.history || []).forEach((h) => {
      if (h.type === "add") totalAdd += h.amount || 0;
      if (h.type === "sub") totalSub += h.amount || 0;
    });
    
    const totalAdded = productSum + totalAdd;
    const totalDebt = totalAdded - totalSub;
    
    const card = document.createElement("div");
    card.className = "bg-white dark:bg-gray-700 rounded-lg shadow p-4 flex items-center justify-between gap-2";
    card.innerHTML = `
      <div>
        <div class="font-bold text-lg">${d.name}</div>
        <div class="text-xs text-gray-400 mb-1">Kod: <span class="font-mono">${d.code || ''}</span></div>
        <div class="text-sm text-gray-500 dark:text-gray-300">${d.product} (${d.count} x ${d.price} so'm)</div>
        <div class="text-xs text-gray-400">${d.note || ""}</div>
        ${d.moveComment ? `<div class="text-xs text-purple-600 dark:text-purple-300 mt-1">Izoh: ${d.moveComment}</div>` : ""}
        <div class="mt-2 text-xs">
          <span class="font-semibold">Umumiy qo'shilgan: </span> ${totalAdd} so'm<br>
          <span class="font-semibold">Ayirilgan: </span>${totalSub} so'm<br>
          <span class="font-semibold">Qolgan: </span>${totalAdd - totalSub} so'm
        </div>
      </div>
      <div class="flex gap-2">
        <button class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition" data-id="${d.id}">Batafsil</button>
        <button class="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded transition" data-del="${d.id}">O'chirish</button>
      </div>
    `;
    
    card.querySelector("[data-id]").onclick = () => openDebtorModal(d);
    card.querySelector("[data-del]").onclick = () => confirmDeleteDebtor(d.id, d.name);
    list.appendChild(card);
  });
}

// Delete debtor confirmation
function confirmDeleteDebtor(id, name) {
  const div = document.createElement("div");
  div.className = "fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50";
  div.innerHTML = `
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-xs text-center">
      <div class="mb-4 font-bold">"${name}"ni o'chirishni istaysizmi?</div>
      <div class="flex gap-2 justify-center">
        <button id="delYes" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded">Ha, o'chirish</button>
        <button id="delNo" class="bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-100 px-4 py-2 rounded">Bekor qilish</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(div);
  div.querySelector("#delNo").onclick = () => div.remove();
  div.querySelector("#delYes").onclick = async () => {
    await deleteDoc(doc(db, "debtors", id));
    div.remove();
    loadDebtors();
  };
}

// Debtor modal functionality
const debtorModal = document.getElementById("debtorModal");
const modalContent = document.getElementById("modalContent");
document.getElementById("closeModal").onclick = () => debtorModal.classList.add("hidden");

function openDebtorModal(debtor) {
  debtorModal.classList.remove("hidden");
  
  let addHistory = "", subHistory = "";
  let totalAdd = 0, totalSub = 0;
  
  (debtor.history || []).forEach((h) => {
    const date = h.date?.toDate ? h.date.toDate() : new Date();
    const time = date.toLocaleString("uz-UZ");
    
    if (h.type === "add") {
      addHistory += `
        <div class="bg-green-100 dark:bg-green-900 rounded p-2 mb-2">
          +${h.amount} so'm 
          <span class="text-xs text-gray-500 ml-2">
            (${h.count || 1} x ${h.price || h.amount} so'm, ${h.product || debtor.product || ""})
          </span>
          <span class="text-xs text-gray-400 ml-2">${time}</span>
          <div class="text-xs text-gray-400">${h.note || ""}</div>
        </div>`;
      totalAdd += h.amount;
    }
    
    if (h.type === "sub") {
      subHistory += `
        <div class="bg-red-100 dark:bg-red-900 rounded p-2 mb-2">
          -${h.amount} so'm 
          <span class="text-xs text-gray-400 ml-2">${time}</span>
        </div>`;
      totalSub += h.amount;
    }
  });
  
  modalContent.innerHTML = `
    <div class="flex flex-col md:flex-row gap-4 mb-4">
      <div class="flex-1">
        <div class="font-bold text-xl mb-2">${debtor.name}</div>
        <div class="text-gray-500 dark:text-gray-300 mb-2">${debtor.product} (${debtor.count} x ${debtor.price} so'm)</div>
        <div class="text-xs text-gray-400 mb-2">${debtor.note || ""}</div>
        <div class="mb-2">Umumiy qarz: <span class="font-bold">${totalAdd - totalSub} so'm</span></div>
        <form id="addDebtForm" class="flex flex-col gap-2 mb-2">
          <div class="grid grid-cols-1 gap-2">
            <input type="text" placeholder="Mahsulot nomi" class="p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-400 text-gray-900 dark:text-gray-100">
            <input type="number" minlength="" placeholder="Mahsulot soni" class="p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-400 text-gray-900 dark:text-gray-100">
            <input type="number" min="1" placeholder="Mahsulot narxi" class="p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-400 text-gray-900 dark:text-gray-100" required>
            <input type="text" placeholder="Izoh (ixtiyoriy)" class="p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-400 text-gray-900 dark:text-gray-100">
          </div>
          <button type="submit" class="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded">Qo'shish</button>
        </form>
        <form id="subDebtForm" class="flex flex-col gap-2 mb-2">
          <input type="number" min="1" placeholder="Qarz ayirish (so'm)" 
            class="p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-red-400 text-gray-900 dark:text-gray-100" required>
          <input type="text" placeholder="Izoh (ixtiyoriy)" 
            class="p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-red-400 text-gray-900 dark:text-gray-100">
          <button type="submit" class="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded">Ayirish</button>
        </form>
      </div>
      <div class="flex-1">
        <div class="font-bold mb-2">Qo'shilganlar</div>
        ${addHistory || '<div class="text-gray-400">Yo\'q</div>'}
        <div class="font-bold mb-2 mt-4">Ayirilganlar</div>
        ${subHistory || '<div class="text-gray-400">Yo\'q</div>'}
      </div>
    </div>
    <div class="mt-4 flex flex-col md:flex-row justify-between font-bold gap-2">
      <span>Jami qo'shilgan: ${totalAdd} so'm</span>
      <span>Jami ayirilgan: ${totalSub} so'm</span>
      <span>Qarzdorlik: ${totalAdd - totalSub} so'm</span>
    </div>
  `;

  // Add debt form submission
  modalContent.querySelector("#addDebtForm").onsubmit = async (e) => {
    e.preventDefault();
    if (!(await showConfirmDiv("Qo'shaveraymi?"))) return;
    
    Array.from(e.target.elements).forEach(el => {
      if (el.tagName === "INPUT" || el.tagName === "BUTTON") el.style.display = "none";
    });
    
    const product = e.target[0].value.trim();
    let count = parseInt(e.target[1].value);
    let price = parseInt(e.target[2].value);
    const note = e.target[3].value.trim();

    price = price * 1;
    let amount;
    if (!count || count <= 0) {
      count = 1;
      amount = price;
    } else {
      amount = count * price;
    }

    if (price <= 0) {
      price = 1;
      amount = price;
    }

    if (!price) return;

    const ref = doc(db, "debtors", debtor.id);
    await updateDoc(ref, {
      history: arrayUnion({
        type: "add",
        amount,
        count,
        price,
        product,
        note,
        date: Timestamp.now(),
      }),
    });
    
    const updated = (await getDocs(collection(db, "debtors"))).docs
      .find((docu) => docu.id === debtor.id)
      .data();
    openDebtorModal({ ...updated, id: debtor.id });
    loadDebtors();
  };

  // Subtract debt form submission
  modalContent.querySelector("#subDebtForm").onsubmit = async (e) => {
    e.preventDefault();
    if (!(await showConfirmDiv("Ayiraveraymi?"))) return;
    
    Array.from(e.target.elements).forEach(el => {
      if (el.tagName === "INPUT" || el.tagName === "BUTTON") el.style.display = "none";
    });
    
    const val = parseInt(e.target[0].value);
    const note = e.target[1].value.trim();
    
    if (!val) return;
    
    const ref = doc(db, "debtors", debtor.id);
    await updateDoc(ref, {
      history: arrayUnion({
        type: "sub",
        amount: val,
        note,
        date: Timestamp.now(),
      }),
    });
    
    const updated = (await getDocs(collection(db, "debtors"))).docs
      .find((docu) => docu.id === debtor.id)
      .data();
    openDebtorModal({ ...updated, id: debtor.id });
    loadDebtors();
  };
}

// My Debts functionality
let myDebts = JSON.parse(localStorage.getItem('myDebts') || []);
let actionState = { idx: null, type: null };

// My Debts modal
const myDebtsBtn = document.getElementById('myDebtsBtn');
const myDebtsModal = document.getElementById('myDebtsModal');
const closeMyDebtsModal = document.getElementById('closeMyDebtsModal');
myDebtsBtn.onclick = () => myDebtsModal.classList.remove('hidden');
closeMyDebtsModal.onclick = () => myDebtsModal.classList.add('hidden');

// Load and render my debts
function loadMyDebts() {
  renderMyDebts();
}

function renderMyDebts() {
  const list = document.getElementById('myDebtsList');
  list.innerHTML = '';
  const search = document.getElementById("searchInput").value.toLowerCase();
  
  myDebts
    .filter(debt => debt.name.toLowerCase().includes(search))
    .forEach((debt, idx) => {
      let historyHtml = '';
      if (Array.isArray(debt.history)) {
        debt.history.slice().reverse().forEach(h => {
          historyHtml += `
            <div class="rounded-lg p-3 mb-2 shadow text-sm
              ${h.type === 'add' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'}">
              <b>${h.type === 'add' ? '+ ' : '- '}${h.amount} so'm</b>
              <span class="ml-2">${h.note ? h.note : ''}</span>
              <span class="block text-xs text-gray-400">${h.time}</span>
            </div>
          `;
        });
      }

      const card = document.createElement('div');
      card.className = 'bg-gradient-to-br from-gray-50 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-4 flex flex-col gap-2 shadow-lg relative border border-gray-200 dark:border-gray-600';
      card.innerHTML = `
        <div class="flex justify-between items-center">
          <div>
            <div class="font-bold text-blue-700 dark:text-blue-300 text-lg">${debt.name}</div>
            <div class="text-xl font-bold text-green-600 dark:text-green-400">${debt.amount} so'm</div>
            <div class="text-xs text-gray-500">${debt.note || ''}</div>
            <div class="text-xs text-gray-400">${debt.time}</div>
          </div>
          <div class="flex flex-col gap-2">
            <button class="qarizlarim-btn bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs" data-idx="${idx}">Qarizlarim</button>
            <button class="delete-debt-btn bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs" data-idx="${idx}">O'chirish</button>
          </div>
        </div>
        <div class="flex gap-2 mt-2">
          <button class="add-amount-btn bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs" data-idx="${idx}">Qariz qo'shish</button>
          <button class="subtract-amount-btn bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded text-xs" data-idx="${idx}">Qariz ayirish</button>
        </div>
        <div class="action-area mt-2"></div>
        <div class="mt-3">${historyHtml || '<div class="text-xs text-gray-400">Tarix yo\'q</div>'}</div>
      `;
      list.appendChild(card);

      const actionArea = card.querySelector('.action-area');
      if (actionState.idx === idx) {
        switch (actionState.type) {
          case 'add':
            actionArea.innerHTML = `
              <form class="flex flex-col md:flex-row gap-2 items-center">
                <input type="number" min="1" class="p-3 text-base rounded border border-gray-300 dark:bg-gray-700 dark:border-gray-600 w-32" placeholder="Summa" required>
                <input type="text" class="p-3 text-base rounded border border-gray-300 dark:bg-gray-700 dark:border-gray-600 flex-1" placeholder="Izoh (ixtiyoriy)">
                <button type="submit" class="bg-green-500 hover:bg-green-600 text-white px-5 py-2 rounded text-base font-semibold">Qo'shish</button>
                <button type="button" class="cancel-btn text-gray-500 px-4 py-2 rounded text-base">Bekor</button>
              </form>
            `;
            actionArea.querySelector('form').onsubmit = (e) => {
              e.preventDefault();
              const val = Number(actionArea.querySelector('input[type="number"]').value);
              const note = actionArea.querySelector('input[type="text"]').value;
              if (val > 0) {
                debt.amount += val;
                debt.time = new Date().toLocaleString('uz-UZ', { hour12: false });
                if (!Array.isArray(debt.history)) debt.history = [];
                debt.history.push({
                  type: 'add',
                  amount: val,
                  note,
                  time: debt.time
                });
                localStorage.setItem('myDebts', JSON.stringify(myDebts));
                actionState = { idx: null, type: null };
                renderMyDebts();
              }
            };
            break;
            
          case 'sub':
            actionArea.innerHTML = `
              <form class="flex flex-col md:flex-row gap-2 items-center">
                <input type="number" min="1" class="p-3 text-base rounded border border-gray-300 dark:bg-gray-700 dark:border-gray-600 w-32" placeholder="Summa" required>
                <input type="text" class="p-3 text-base rounded border border-gray-300 dark:bg-gray-700 dark:border-gray-600 flex-1" placeholder="Izoh (ixtiyoriy)">
                <button type="submit" class="bg-yellow-500 hover:bg-yellow-600 text-white px-5 py-2 rounded text-base font-semibold">Ayirish</button>
                <button type="button" class="cancel-btn text-gray-500 px-4 py-2 rounded text-base">Bekor</button>
              </form>
            `;
            actionArea.querySelector('form').onsubmit = (e) => {
              e.preventDefault();
              const val = Number(actionArea.querySelector('input[type="number"]').value);
              const note = actionArea.querySelector('input[type="text"]').value;
              if (val > 0) {
                debt.amount -= val;
                debt.time = new Date().toLocaleString('uz-UZ', { hour12: false });
                if (!Array.isArray(debt.history)) debt.history = [];
                debt.history.push({
                  type: 'sub',
                  amount: val,
                  note,
                  time: debt.time
                });
                localStorage.setItem('myDebts', JSON.stringify(myDebts));
                actionState = { idx: null, type: null };
                renderMyDebts();
              }
            };
            break;
            
          case 'delete':
            actionArea.innerHTML = `
              <div class="flex items-center gap-2 bg-red-50 dark:bg-red-900 border border-red-300 dark:border-red-700 rounded-xl p-4 text-base shadow-lg">
                <span class="text-sm md:text-base text-gray-700 dark:text-gray-200 font-semibold flex-1">O'chirishni xohlaysizmi?</span>
                <button class="confirm-delete-btn bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm md:text-base">Ha</button>
                <button class="cancel-btn text-gray-500 px-3 py-2 rounded text-sm md:text-base bg-gray-200 dark:bg-gray-700">Yo'q</button>
              </div>
            `;
            actionArea.querySelector('.confirm-delete-btn').onclick = () => {
              myDebts.splice(idx, 1);
              localStorage.setItem('myDebts', JSON.stringify(myDebts));
              actionState = { idx: null, type: null };
              renderMyDebts();
            };
            break;
            
          case 'qarizlarim':
            actionArea.innerHTML = `
              <div class="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-600 shadow text-sm">
                <div><b>Qariz bergan:</b> ${debt.name}</div>
                <div><b>Summa:</b> ${debt.amount} so'm</div>
                <div><b>Izoh:</b> ${debt.note || '-'}</div>
                <div><b>Vaqti:</b> ${debt.time}</div>
                <button class="cancel-btn mt-2 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-200 px-3 py-1 rounded text-xs">Yopish</button>
              </div>
            `;
            break;
        }
        
        actionArea.querySelector('.cancel-btn').onclick = () => {
          actionState = { idx: null, type: null };
          renderMyDebts();
        };
      }
    });
}

// Add new debt form
document.getElementById('myDebtForm').onsubmit = function(e) {
  e.preventDefault();
  const name = document.getElementById('creditorName').value.trim();
  const amount = Number(document.getElementById('creditorAmount').value);
  const note = document.getElementById('creditorNote').value;
  const time = new Date().toLocaleString('uz-UZ', { hour12: false });

  // Check for existing debt with same name
  const exists = myDebts.some(
    (d) => d.name.trim().toLowerCase() === name.toLowerCase()
  );
  
  if (exists) {
    const list = document.getElementById('myDebtsList');
    const warn = document.createElement('div');
    warn.className = 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg p-3 mb-2 text-center font-semibold';
    warn.innerText = 'Bu ismli qariz allaqon mavjud!';
    list.prepend(warn);
    setTimeout(() => warn.remove(), 2500);
    return;
  }

  myDebts.unshift({ name, amount, note, time });
  localStorage.setItem('myDebts', JSON.stringify(myDebts));
  renderMyDebts();
  this.reset();
};

// Handle debt actions
document.getElementById('myDebtsList').onclick = function(e) {
  const idx = e.target.dataset.idx;
  if (!idx) return;
  
  if (e.target.classList.contains('add-amount-btn')) {
    actionState = { idx: Number(idx), type: 'add' };
  }
  else if (e.target.classList.contains('subtract-amount-btn')) {
    actionState = { idx: Number(idx), type: 'sub' };
  }
  else if (e.target.classList.contains('delete-debt-btn')) {
    actionState = { idx: Number(idx), type: 'delete' };
  }
  else if (e.target.classList.contains('qarizlarim-btn')) {
    actionState = { idx: Number(idx), type: 'qarizlarim' };
  }
  
  renderMyDebts();
};

// Custom confirmation dialog
function showConfirmDiv(message) {
  return new Promise((resolve) => {
    document.getElementById('customConfirmDiv')?.remove();

    const div = document.createElement('div');
    div.id = 'customConfirmDiv';
    div.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-40';
    div.innerHTML = `
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 w-full max-w-xs text-center border border-gray-300 dark:border-gray-700">
        <div class="mb-4 font-bold text-lg">${message}</div>
        <div class="flex gap-2 justify-center">
          <button id="confirmYes" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded">Ha</button>
          <button id="confirmNo" class="bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-100 px-4 py-2 rounded">Yo'q</button>
        </div>
      </div>
    `;
    document.body.appendChild(div);
    div.querySelector('#confirmYes').onclick = () => {
      div.remove();
      resolve(true);
    };
    div.querySelector('#confirmNo').onclick = () => {
      div.remove();
      resolve(false);
    };
  });
}

window.addEventListener('DOMContentLoaded', () => {
  onAuthStateChanged(auth, async (user) => {
    // DOM to'liq yuklangandan keyin elementlarni aniqlash
    const userNameEl = document.getElementById('userName');
    const userIdEl = document.getElementById('userId');
    if (user && userNameEl && userIdEl) {
      // Nickname yo'q bo'lsa yoki "Foydalanuvchi" bo'lsa
      if (!user.displayName || user.displayName === "Foydalanuvchi") {
        userNameEl.textContent = "Foydalanuvchi";
        userIdEl.textContent = `ID: ${user.uid.substring(0, 8).toUpperCase()}`;
        userNameEl.after(userIdEl);
        userIdEl.style.display = "block";
        userIdEl.style.fontSize = "12px";
        userIdEl.style.color = "#888";

        // Nickname qo'shish button
      
        return;
      }

      // Nickname bor bo'lsa oddiy ko'rsatish
      userNameEl.textContent = user.displayName;
      userIdEl.textContent = `ID: ${user.uid.substring(0, 8).toUpperCase()}`;
      userNameEl.after(userIdEl);
      userIdEl.style.display = "block";
      userIdEl.style.fontSize = "12px";
      userIdEl.style.color = "#888";
    }
  });
});
