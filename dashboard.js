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
  arrayRemove,
  Timestamp,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
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

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "index.html";
  } else {
    loadDebtors(); // Faqat user aniqlanganda chaqiriladi
  }
});
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

document.getElementById("logoutBtn").onclick = () => {
  signOut(auth).then(() => (window.location.href = "index.html"));
};
const debtorForm = document.getElementById("debtorForm");

// Kod generatsiyasi va unikal bo‘lishini tekshirish
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

// Yangi qarzdor qo‘shishda kodni saqlash
debtorForm.onsubmit = async (e) => {
  e.preventDefault();
  const name = document.getElementById("debtorName").value.trim();
  const product = document.getElementById("debtorProduct").value.trim();
  let count = parseInt(document.getElementById("debtorCount").value);
  let price = parseInt(document.getElementById("debtorPrice").value);
  const note = document.getElementById("debtorNote").value.trim();
  if (!name || !price) return;

  // Mahsulot narxi birinchi 1ga ko‘paytiriladi
  price = price * 1;

  // Mahsulot soni 0 yoki yo‘q bo‘lsa, mahsulot narxiga ko‘paytirilmaydi
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

  const snapshot = await getDocs(collection(db, "debtors"));
  const exists = snapshot.docs.some((doc) => {
    const data = doc.data();
    return (
      data.userId === user.uid && data.name.toLowerCase() === name.toLowerCase()
    );
  });
  if (exists) {
    alert("Bu ismli qarzdor allaqachon mavjud!");
    return;
  }

  // Unikal kod generatsiya qilish
  const existingCodes = snapshot.docs.map(doc => doc.data().code).filter(Boolean);
  const code = generateUniqueDebtorCode(existingCodes);

  await addDoc(collection(db, "debtors"), {
    name,
    product,
    count,
    price,
    note,
    userId: user.uid,
    code, // kodni saqlash
    history: [
      {
        type: "add",
        amount,
        count,
        price,
        product,
        note,
        date: Timestamp.now(),
      },
    ],
  });
  debtorForm.reset();
  loadDebtors();
};
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
  let totalAdded = 0,
    totalSubtracted = 0,
    totalDebt = 0;
  debtors.forEach((d) => {
    let add = 0,
      sub = 0;
    d.history?.forEach((h) => {
      if (h.type === "add") add += h.amount;
      if (h.type === "sub") sub += h.amount;
    });
    totalAdded += add;
    totalSubtracted += sub;
    totalDebt += add - sub;
  });
  document.getElementById("totalAdded").innerText = totalAdded + " so‘m";
  document.getElementById("totalSubtracted").innerText =
    totalSubtracted + " so‘m";
  document.getElementById("totalDebt").innerText = totalDebt + " so‘m";
}
function renderDebtors(debtors) {
  debtors.sort((a, b) =>
    a.name.localeCompare(b.name, "uz", { sensitivity: "base" })
  );
  renderStats(debtors);
  const list = document.getElementById("debtorsList");
  list.innerHTML = "";
  if (debtors.length === 0) {
    list.innerHTML = `<div class="text-center text-gray-500 dark:text-gray-400">Qarzdorlar topilmadi</div>`;
    return;
  }
  debtors.forEach((d) => {
    const productSum = (d.count || 0) * (d.price || 0);

    let totalAdd = 0,
      totalSub = 0;
    (d.history || []).forEach((h) => {
      if (h.type === "add") totalAdd += h.amount || 0;
      if (h.type === "sub") totalSub += h.amount || 0;
    });
    const totalAdded = productSum + totalAdd;
    const totalDebt = totalAdded - totalSub;
    const card = document.createElement("div");
    card.className =
      "bg-white dark:bg-gray-700 rounded-lg shadow p-4 flex items-center justify-between gap-2";
    card.innerHTML = `
      <div>
        <div class="font-bold text-lg">${d.name}</div>
        <div class="text-xs text-gray-400 mb-1">Kod: <span class="font-mono">${d.code || ''}</span></div>
        <div class="text-sm text-gray-500 dark:text-gray-300">${d.product} (${d.count} x ${d.price} so‘m)</div>
        <div class="text-xs text-gray-400">${d.note || ""}</div>
        ${d.moveComment ? `<div class="text-xs text-purple-600 dark:text-purple-300 mt-1">Izoh: ${d.moveComment}</div>` : ""}
        <div class="mt-2 text-xs">
          <span class="font-semibold">Umumiy qo‘shilgan: </span> ${totalAdd} so‘m<br>
          <span class="font-semibold">Ayirilgan: </span>${totalSub} so‘m<br>
          <span class="font-semibold">Qolgan: </span>${totalAdd - totalSub} so‘m
        </div>
      </div>
      <div class="flex gap-2">
        <button class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition" data-id="${d.id}">Batafsil</button>
        <button class="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded transition" data-del="${d.id}">O‘chirish</button>
      </div>
    `;
    card.querySelector("[data-id]").onclick = () => openDebtorModal(d);
    card.querySelector("[data-del]").onclick = () =>
      confirmDeleteDebtor(d.id, d.name);
    list.appendChild(card);
  });
}
function confirmDeleteDebtor(id, name) {
  const div = document.createElement("div");
  div.className =
    "fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50";
  div.innerHTML = `
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-xs text-center">
      <div class="mb-4 font-bold">“${name}”ni o‘chirishni istaysizmi?</div>
      <div class="flex gap-2 justify-center">
        <button id="delYes" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded">Ha, o‘chirish</button>
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
const debtorModal = document.getElementById("debtorModal");
const modalContent = document.getElementById("modalContent");
document.getElementById("closeModal").onclick = () =>
  debtorModal.classList.add("hidden");

function openDebtorModal(debtor) {
  debtorModal.classList.remove("hidden");
  let addHistory = "",
    subHistory = "";
  let totalAdd = 0,
    totalSub = 0;
  (debtor.history || []).forEach((h) => {
    const date = h.date?.toDate ? h.date.toDate() : new Date();
    const time = date.toLocaleString("uz-UZ");
    if (h.type === "add") {
      addHistory += `
        <div class="bg-green-100 dark:bg-green-900 rounded p-2 mb-2">
          +${h.amount} so‘m 
          <span class="text-xs text-gray-500 ml-2">
            (${h.count || 1} x ${h.price || h.amount} so‘m, ${
        h.product || debtor.product || ""
      })
          </span>
          <span class="text-xs text-gray-400 ml-2">${time}</span>
          <div class="text-xs text-gray-400">${h.note || ""}</div>
        </div>`;
      totalAdd += h.amount;
    }
    if (h.type === "sub") {
      subHistory += `
        <div class="bg-red-100 dark:bg-red-900 rounded p-2 mb-2">
          -${h.amount} so‘m 
          <span class="text-xs text-gray-400 ml-2">${time}</span>
        </div>`;
      totalSub += h.amount;
    }
  });
  modalContent.innerHTML = `
    <div class="flex flex-col md:flex-row gap-4 mb-4">
      <div class="flex-1">
        <div class="font-bold text-xl mb-2">${debtor.name}</div>
        <div class="text-gray-500 dark:text-gray-300 mb-2">${debtor.product} (${
    debtor.count
  } x ${debtor.price} so‘m)</div>
        <div class="text-xs text-gray-400 mb-2">${debtor.note || ""}</div>
        <div class="mb-2">Umumiy qarz: <span class="font-bold">${
          totalAdd - totalSub
        } so‘m</span></div>
        <form id="addDebtForm" class="flex flex-col gap-2 mb-2">
          <div class="grid grid-cols-1 gap-2">
            <input type="text" placeholder="Mahsulot nomi" class="p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-400 text-gray-900 dark:text-gray-100" >
            <input type="number"  minlength="" placeholder="Mahsulot soni" class="p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-400 text-gray-900 dark:text-gray-100" >
            <input type="number" min="1" placeholder="Mahsulot narxi" class="p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-400 text-gray-900 dark:text-gray-100" required>
            <input type="text" placeholder="Izoh (ixtiyoriy)" class="p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-400 text-gray-900 dark:text-gray-100">
          </div>
          <button type="submit" class="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded">Qo‘shish</button>
        </form>
        <form id="subDebtForm" class="flex flex-col gap-2 mb-2">
          <input type="number" min="1" placeholder="Qarz ayirish (so‘m)" 
            class="p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-red-400 text-gray-900 dark:text-gray-100" required>
          <input type="text" placeholder="Izoh (ixtiyoriy)" 
            class="p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-red-400 text-gray-900 dark:text-gray-100">
          <button type="submit" class="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded">Ayirish</button>
        </form>
      </div>
      <div class="flex-1">
        <div class="font-bold mb-2">Qo‘shilganlar</div>
        ${
          addHistory + debtor.count * debtor.price ||
          '<div class="text-gray-400">Yo‘q</div>'
        }
        <div class="font-bold mb-2 mt-4">Ayirilganlar</div>
        ${subHistory || '<div class="text-gray-400">Yo‘q</div>'}
      </div>
    </div>
    <div class="mt-4 flex flex-col md:flex-row justify-between font-bold gap-2">
      <span>Jami qo‘shilgan: ${totalAdd} so‘m</span>
      <span>Jami ayirilgan: ${totalSub} so‘m</span>
      <span>Qarzdorlik: ${totalAdd - totalSub} so‘m</span>
    </div>
  `;

  modalContent.querySelector("#addDebtForm").onsubmit = async (e) => {
    e.preventDefault();
    if (!(await showConfirmDiv("Qo‘shaveraymi?"))) return;
    // Inputlarni yashirish
    Array.from(e.target.elements).forEach(el => {
      if (el.tagName === "INPUT" || el.tagName === "BUTTON") el.style.display = "none";
    });
    const product = e.target[0].value.trim();
    let count = parseInt(e.target[1].value);
    let price = parseInt(e.target[2].value);
    const note = e.target[3].value.trim();

    // Mahsulot narxi birinchi 1ga ko‘paytiriladi
    price = price * 1;

    // Mahsulot soni 0 yoki yo‘q bo‘lsa, mahsulot narxiga ko‘paytirilmaydi
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

    // Mahsulot nomi va soni ixtiyoriy, faqat narx bo‘lsa yetarli
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
  modalContent.querySelector("#subDebtForm").onsubmit = async (e) => {
    e.preventDefault();
    if (!(await showConfirmDiv("Ayiraveraymi?"))) return;
    // Inputlarni yashirish
    Array.from(e.target.elements).forEach(el => {
      if (el.tagName === "INPUT" || el.tagName === "BUTTON") el.style.display = "none";
    });
    const val = parseInt(e.target[0].value);
    const note = e.target[1].value.trim(); // Izoh inputini olish
    if (!val) return;
    const ref = doc(db, "debtors", debtor.id);
    await updateDoc(ref, {
      history: arrayUnion({
        type: "sub",
        amount: val,
        note, // Izohni ham saqlash
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
// Modal ochish/yopish
const myDebtsBtn = document.getElementById('myDebtsBtn');
const myDebtsModal = document.getElementById('myDebtsModal');
const closeMyDebtsModal = document.getElementById('closeMyDebtsModal');
myDebtsBtn.onclick = () => myDebtsModal.classList.remove('hidden');
closeMyDebtsModal.onclick = () => myDebtsModal.classList.add('hidden');

let myDebts = JSON.parse(localStorage.getItem('myDebts') || '[]');
let actionState = { idx: null, type: null }; // {idx, type: 'add'|'sub'|'delete'}

// Har bir qarz uchun tarixni saqlash
// { name, amount, note, time, history: [{type, amount, note, time}] }

function renderMyDebts() {
  const list = document.getElementById('myDebtsList');
  list.innerHTML = '';
  const search = document.getElementById("searchInput").value.toLowerCase();
  myDebts
    .filter(debt => debt.name.toLowerCase().includes(search))
    .forEach((debt, idx) => {
      // Tarixlar uchun cardlar
      let historyHtml = '';
      if (Array.isArray(debt.history)) {
        debt.history.slice().reverse().forEach(h => {
          historyHtml += `
            <div class="rounded-lg p-3 mb-2 shadow text-sm
              ${h.type === 'add' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'}">
              <b>${h.type === 'add' ? '+ ' : '- '}${h.amount} so‘m</b>
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
            <div class="text-xl font-bold text-green-600 dark:text-green-400">${debt.amount} so‘m</div>
            <div class="text-xs text-gray-500">${debt.note || ''}</div>
            <div class="text-xs text-gray-400">${debt.time}</div>
          </div>
          <div class="flex flex-col gap-2">
            <button class="qarizlarim-btn bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs" data-idx="${idx}">Qarizlarim</button>
            <button class="delete-debt-btn bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs" data-idx="${idx}">O‘chirish</button>
          </div>
        </div>
        <div class="flex gap-2 mt-2">
          <button class="add-amount-btn bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs" data-idx="${idx}">Qariz qo‘shish</button>
          <button class="subtract-amount-btn bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded text-xs" data-idx="${idx}">Qariz ayirish</button>
        </div>
        <div class="action-area mt-2"></div>
        <div class="mt-3">${historyHtml || '<div class="text-xs text-gray-400">Tarix yo‘q</div>'}</div>
      `;
      list.appendChild(card);

      // Action area uchun interaktiv joy
      const actionArea = card.querySelector('.action-area');
      if (actionState.idx === idx && actionState.type === 'add') {
        actionArea.innerHTML = `
          <form class="flex flex-col md:flex-row gap-2 items-center">
            <input type="number" min="1" class="p-3 text-base rounded border border-gray-300 dark:bg-gray-700 dark:border-gray-600 w-32" placeholder="Summa" required>
            <input type="text" class="p-3 text-base rounded border border-gray-300 dark:bg-gray-700 dark:border-gray-600 flex-1" placeholder="Izoh (ixtiyoriy)">
            <button type="submit" class="bg-green-500 hover:bg-green-600 text-white px-5 py-2 rounded text-base font-semibold">Qo‘shish</button>
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
        actionArea.querySelector('.cancel-btn').onclick = () => {
          actionState = { idx: null, type: null };
          renderMyDebts();
        };
      }
      if (actionState.idx === idx && actionState.type === 'sub') {
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
        actionArea.querySelector('.cancel-btn').onclick = () => {
          actionState = { idx: null, type: null };
          renderMyDebts();
        };
      }
      if (actionState.idx === idx && actionState.type === 'delete') {
        actionArea.innerHTML = `
          <div class="flex items-center gap-2 bg-red-50 dark:bg-red-900 border border-red-300 dark:border-red-700 rounded-xl p-4 text-base shadow-lg">
            <span class="text-sm md:text-base text-gray-700 dark:text-gray-200 font-semibold flex-1">O‘chirishni xohlaysizmi?</span>
            <button class="confirm-delete-btn bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm md:text-base">Ha</button>
            <button class="cancel-btn text-gray-500 px-3 py-2 rounded text-sm md:text-base bg-gray-200 dark:bg-gray-700">Yo‘q</button>
          </div>
        `;
        actionArea.querySelector('.confirm-delete-btn').onclick = () => {
          myDebts.splice(idx, 1);
          localStorage.setItem('myDebts', JSON.stringify(myDebts));
          actionState = { idx: null, type: null };
          renderMyDebts();
        };
        actionArea.querySelector('.cancel-btn').onclick = () => {
          actionState = { idx: null, type: null };
          renderMyDebts();
        };
      }
      if (actionState.idx === idx && actionState.type === 'qarizlarim') {
        actionArea.innerHTML = `
          <div class="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-600 shadow text-sm">
            <div><b>Qariz bergan:</b> ${debt.name}</div>
            <div><b>Summa:</b> ${debt.amount} so‘m</div>
            <div><b>Izoh:</b> ${debt.note || '-'}</div>
            <div><b>Vaqti:</b> ${debt.time}</div>
            <button class="cancel-btn mt-2 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-200 px-3 py-1 rounded text-xs">Yopish</button>
          </div>
        `;
        actionArea.querySelector('.cancel-btn').onclick = () => {
          actionState = { idx: null, type: null };
          renderMyDebts();
        };
      }
    });
}
renderMyDebts();

document.getElementById('myDebtForm').onsubmit = function(e) {
  e.preventDefault();
  const name = document.getElementById('creditorName').value.trim();
  const amount = Number(document.getElementById('creditorAmount').value);
  const note = document.getElementById('creditorNote').value;
  const time = new Date().toLocaleString('uz-UZ', { hour12: false });

  // Bir xil ismni tekshirish (case-insensitive)
  const exists = myDebts.some(
    (d) => d.name.trim().toLowerCase() === name.toLowerCase()
  );
  if (exists) {
    // Card ichida xabar chiqarish
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

document.getElementById('myDebtsList').onclick = function(e) {
  const idx = e.target.dataset.idx;
  if (e.target.classList.contains('add-amount-btn')) {
    actionState = { idx: Number(idx), type: 'add' };
    renderMyDebts();
  }
  if (e.target.classList.contains('subtract-amount-btn')) {
    actionState = { idx: Number(idx), type: 'sub' };
    renderMyDebts();
  }
  if (e.target.classList.contains('delete-debt-btn')) {
    actionState = { idx: Number(idx), type: 'delete' };
    renderMyDebts();
  }
  if (e.target.classList.contains('qarizlarim-btn')) {
    actionState = { idx: Number(idx), type: 'qarizlarim' };
    renderMyDebts();
  }
};


// Qarzdorlar massiviga kod qo‘shish (localStorage yoki massivga)
function addDebtor(debtor) {
  debtor.code = generateDebtorCode();
  // ...debtorlarni saqlash logikasi...
}

// Cardda kodni ko‘rsatish (debtor.code)
// <div>Kod: <span class="font-mono text-xs">{{debtor.code}}</span></div>

// Qarzlar ko‘rish modalini ochish
document.getElementById('viewDebtsBtn').onclick = () => {
  document.getElementById('viewDebtsModal').classList.remove('hidden');
};
document.getElementById('closeViewDebtsModal').onclick = () => {
  document.getElementById('viewDebtsModal').classList.add('hidden');
};

// Qidirilgan kodlarni saqlash va ko‘rsatish
const searchedCodesKey = 'searchedDebtorCodes';
function saveSearchedCode(code, name) {
  let arr = JSON.parse(localStorage.getItem(searchedCodesKey) || '[]');
  if (!arr.some(item => item.code === code)) {
    arr.unshift({ code, name: name || localStorage.getItem('userName') || '' });
    arr = arr.slice(0, 10);
    localStorage.setItem(searchedCodesKey, JSON.stringify(arr));
    renderSearchedCodes();
  }
}
function renderSearchedCodes() {
  const wrap = document.getElementById('searchedCodesWrap');
  if (!wrap) return;
  let arr = JSON.parse(localStorage.getItem(searchedCodesKey) || '[]');
  wrap.innerHTML = '';
  arr.forEach((item, idx) => {
    const card = document.createElement('div');
    card.className = "bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-3 m-1 flex flex-col gap-2 min-w-[220px] shadow relative";
    // Ism inputi faqat ism yo‘q bo‘lsa yoki tahrir rejimida chiqadi
    let nameInputHtml = '';
    if (!item.name || item.editing) {
      nameInputHtml = `
        <form class="flex gap-2 mt-2 name-form">
          <input type="text" placeholder="Ism kiriting" value="${item.name || ''}" class="flex-1 p-2 border border-gray-300 dark:bg-gray-700 dark:border-gray-600 rounded text-xs" required>
          <button type="submit" class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs">Saqlash</button>
        </form>
      `;
    }
    card.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="font-mono text-base bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">${item.code}</span>
        <span class="ml-2 text-gray-700 dark:text-gray-200 text-sm">
          ${item.name && !item.editing ? item.name : '<span class="text-gray-400">Ism yo‘q</span>'}
        </span>
        ${item.name && !item.editing ? `<button class="edit-name-btn ml-2 text-xs bg-yellow-200 hover:bg-yellow-300 dark:bg-yellow-700 dark:hover:bg-yellow-600 text-yellow-900 dark:text-yellow-100 px-2 py-1 rounded">✏️</button>` : ''}
      </div>
      ${nameInputHtml}
      <div class="flex gap-2 mt-2">
        <button class="see-btn bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded text-xs">Ko‘rish</button>
        <button class="delete-btn bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs">O‘chirish</button>
      </div>
    `;
    // Ism yozish yoki tahrirlash
    if (!item.name || item.editing) {
      card.querySelector('.name-form').onsubmit = function(e) {
        e.preventDefault();
        const val = this.querySelector('input').value.trim();
        if (val) {
          arr[idx].name = val;
          delete arr[idx].editing;
          localStorage.setItem(searchedCodesKey, JSON.stringify(arr));
          renderSearchedCodes();
        }
      };
    }
    // Ismni tahrirlash tugmasi
    if (item.name && !item.editing) {
      card.querySelector('.edit-name-btn').onclick = () => {
        arr[idx].editing = true;
        localStorage.setItem(searchedCodesKey, JSON.stringify(arr));
        renderSearchedCodes();
      };
    }
    // Ko‘rish tugmasi
    card.querySelector('.see-btn').onclick = () => {
      const input = document.getElementById('searchByCodeInput');
      input.value = item.code;
      input.dispatchEvent(new Event('input'));
    };
    // O‘chirish tugmasi
    card.querySelector('.delete-btn').onclick = async () => {
      if (await showConfirmDiv("O‘chirishni xohlaysizmi?")) {
        arr.splice(idx, 1);
        localStorage.setItem(searchedCodesKey, JSON.stringify(arr));
        renderSearchedCodes();
      }
    };
    wrap.appendChild(card);
  });
}
renderSearchedCodes();

// Kod tugmasini bosganda inputga joylash va qidiruvni ishga tushirish
document.getElementById('searchedCodesWrap')?.addEventListener('click', function(e) {
  if (e.target.closest('.searched-code-btn')) {
    const code = e.target.closest('.searched-code-btn').dataset.code;
    const input = document.getElementById('searchByCodeInput');
    input.value = code;
    input.dispatchEvent(new Event('input'));
  }
});

// Kod orqali qidirish funksiyasini yangilash
document.getElementById('searchByCodeInput').addEventListener('input', async function() {
  const code = this.value.trim().toUpperCase();
  const user = auth.currentUser;
  if (!user || code.length !== 8) {
    document.getElementById('searchByCodeResult').innerHTML = '';
    return;
  }
  const snapshot = await getDocs(collection(db, "debtors"));
  let debtor = null;
  snapshot.forEach((doc) => {
    const data = doc.data();
    if (data.code === code) {
      debtor = { ...data, id: doc.id };
    }
  });

  const resultDiv = document.getElementById('searchByCodeResult');
  if (debtor) {
    // Qidirilgan kodni va ismni saqlash
    saveSearchedCode(debtor.code, debtor.name);

    let totalAdd = 0, totalSub = 0;
    let addHistory = '', subHistory = '';
    (debtor.history || []).forEach(h => {
      const date = h.date?.toDate ? h.date.toDate() : new Date();
      const time = date.toLocaleString("uz-UZ");
      if (h.type === "add") {
        totalAdd += h.amount || 0;
        addHistory += `
          <div class="rounded bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 p-2 mb-1 text-xs">
          +${h.amount} so‘m <span class="ml-2">${h.note || ''}</span>
          <span class="block text-gray-400">${time}</span>
        </div>
        `;
      }
      if (h.type === "sub") {
        totalSub += h.amount || 0;
        subHistory += `
          <div class="rounded bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 p-2 mb-1 text-xs">
          -${h.amount} so‘m <span class="ml-2">${h.note || ''}</span>
          <span class="block text-gray-400">${time}</span>
        </div>
        `;
      }
    });
    const totalDebt = totalAdd - totalSub;
    const percent = totalAdd > 0 ? Math.round((totalDebt / totalAdd) * 100) : 0;

    resultDiv.innerHTML = `
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-2 border border-gray-200 dark:border-gray-700">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <div class="text-lg font-bold text-blue-700 dark:text-blue-300 mb-1">${debtor.name}</div>
            <div class="text-xs text-gray-400 mb-2">Kod: <span class="font-mono bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">${debtor.code}</span></div>
            <div class="text-sm text-gray-600 dark:text-gray-300 mb-1">${debtor.product}</div>
            <div class="text-xs text-gray-400">${debtor.note || ""}</div>
            <div class="text-xs text-gray-400 mt-2">${debtor.history?.[0]?.date?.toDate ? debtor.history[0].date.toDate().toLocaleString('uz-UZ') : ''}</div>
          </div>
          <div class="flex flex-col gap-2 min-w-[140px]">
            <span class="inline-block bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-3 py-1 rounded-full text-xs font-semibold text-center">Qo‘shilgan: ${totalAdd} so‘m</span>
            <span class="inline-block bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 px-3 py-1 rounded-full text-xs font-semibold text-center">Ayirilgan: ${totalSub} so‘m</span>
            <span class="inline-block bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full text-xs font-semibold text-center">Qarzdorlik: ${totalDebt} so‘m</span>
          </div>
        </div>
        <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mt-2 mb-1">
          <div class="bg-blue-500 h-3 rounded-full transition-all duration-500" style="width: ${percent < 0 ? 0 : percent > 100 ? 100 : percent}%;"></div>
        </div>
        <div class="text-xs text-gray-500 text-right mb-2">${percent}% qarzdorlik qoldi</div>
        <button id="toggleHistoryBtn" class="mt-3 mb-2 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded transition-all">Tarix</button>
        <div id="historyCollapse" class="overflow-hidden transition-all duration-500 max-h-0 opacity-0">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <div class="font-bold mb-1 text-green-700 dark:text-green-300">Qo‘shilganlar</div>
              ${addHistory || '<div class="text-gray-400 text-xs">Yo‘q</div>'}
            </div>
            <div>
              <div class="font-bold mb-1 text-yellow-700 dark:text-yellow-300">Ayirilganlar</div>
              ${subHistory || '<div class="text-gray-400 text-xs">Yo‘q</div>'}
            </div>
          </div>
        </div>
      </div>
    `;

    // Animation va toggle uchun:
    const btn = document.getElementById('toggleHistoryBtn');
    const collapse = document.getElementById('historyCollapse');
    btn.onclick = () => {
      if (collapse.style.maxHeight && collapse.style.maxHeight !== '0px') {
        collapse.style.maxHeight = '0px';
        collapse.style.opacity = '0';
      } else {
        collapse.style.maxHeight = collapse.scrollHeight + 'px';
        collapse.style.opacity = '1';
      }
    };
  } else {
    resultDiv.innerHTML = code.length === 8 ? `
      <div class="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg p-4 text-center font-semibold">
        Qarzdor topilmadi
      </div>
    ` : '';
  }
  // Qidirilgan kodlar ro‘yxatini yangilash
  renderSearchedCodes();
});

// HTML ga joylash (searchByCodeInput pastiga qo‘ying):
// <div id="searchedCodesWrap" class="flex flex-wrap mt-2"></div>

// Misol uchun, qo‘shish tugmasi uchun:
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('add-debt-btn')) {
    if (confirm("Qo‘shaveraymi?")) {
      // Qo‘shish funksiyasini chaqiring
      addDebtFunction();
    }
  }
  if (e.target.classList.contains('subtract-debt-btn')) {
    if (confirm("Ayiraveraymi?")) {
      // Ayirish funksiyasini chaqiring
      subtractDebtFunction();
    }
  }
});
/**
 * Divda custom confirm oynasi ko‘rsatadi.
 * @param {string} message - So‘rov matni
 * @returns {Promise<boolean>} - Ha bosilsa true, Yo‘q bosilsa false
 */
function showConfirmDiv(message) {
  return new Promise((resolve) => {
    // Eski confirmni o‘chir
    document.getElementById('customConfirmDiv')?.remove();

    const div = document.createElement('div');
    div.id = 'customConfirmDiv';
    div.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-40';
    div.innerHTML = `
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 w-full max-w-xs text-center border border-gray-300 dark:border-gray-700">
        <div class="mb-4 font-bold text-lg">${message}</div>
        <div class="flex gap-2 justify-center">
          <button id="confirmYes" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded">Ha</button>
          <button id="confirmNo" class="bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-100 px-4 py-2 rounded">Yo‘q</button>
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

// --- MODALDA QO‘SHISH/AYIRISHDA FOYDALANISH ---
modalContent.querySelector("#addDebtForm").onsubmit = async (e) => {
  e.preventDefault();
  if (!(await showConfirmDiv("Qo‘shaveraymi?"))) return;
  // Inputlarni yashirish
  Array.from(e.target.elements).forEach(el => {
    if (el.tagName === "INPUT" || el.tagName === "BUTTON") el.style.display = "none";
  });
  const product = e.target[0].value.trim();
  let count = parseInt(e.target[1].value);
  let price = parseInt(e.target[2].value);
  const note = e.target[3].value.trim();

  // Mahsulot narxi birinchi 1ga ko‘paytiriladi
  price = price * 1;

  // Mahsulot soni 0 yoki yo‘q bo‘lsa, mahsulot narxiga ko‘paytirilmaydi
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

  // Mahsulot nomi va soni ixtiyoriy, faqat narx bo‘lsa yetarli
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

modalContent.querySelector("#subDebtForm").onsubmit = async (e) => {
  e.preventDefault();
  if (!(await showConfirmDiv("Ayiraveraymi?"))) return;
  // Inputlarni yashirish
  Array.from(e.target.elements).forEach(el => {
    if (el.tagName === "INPUT" || el.tagName === "BUTTON") el.style.display = "none";
  });
  const val = parseInt(e.target[0].value);
  const note = e.target[1].value.trim(); // Izoh inputini olish
  if (!val) return;
  const ref = doc(db, "debtors", debtor.id);
  await updateDoc(ref, {
    history: arrayUnion({
      type: "sub",
      amount: val,
      note, // Izohni ham saqlash
      date: Timestamp.now(),
    }),
  });
  const updated = (await getDocs(collection(db, "debtors"))).docs
    .find((docu) => docu.id === debtor.id)
    .data();
  openDebtorModal({ ...updated, id: debtor.id });
  loadDebtors();
};

function renderViewDebts() {
  const list = document.getElementById('viewDebtsList');
  list.innerHTML = '';
  const search = document.getElementById("searchInput").value.toLowerCase();
  let debts = JSON.parse(localStorage.getItem('myDebts') || '[]');
  debts = debts.filter(debt => debt.name.toLowerCase().includes(search));
  if (debts.length === 0) {
    list.innerHTML = `<div class="text-center text-gray-500 dark:text-gray-400">Qarz topilmadi</div>`;
    return;
  }
  debts.forEach((debt, idx) => {
    // Tarixlar uchun cardlar
    let historyHtml = '';
    let totalAdd = 0, totalSub = 0;
    if (Array.isArray(debt.history)) {
      debt.history.forEach(h => {
        if (h.type === 'add') totalAdd += h.amount;
        if (h.type === 'sub') totalSub += h.amount;
        historyHtml += `
          <div class="rounded-lg p-3 mb-2 shadow text-sm
            ${h.type === 'add' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'}">
            <b>${h.type === 'add' ? '+ ' : '- '}${h.amount} so‘m</b>
            <span class="ml-2">${h.note ? h.note : ''}</span>
            <span class="block text-xs text-gray-400">${h.time || ''}</span>
          </div>
        `;
      });
    }
    const card = document.createElement('div');
    card.className = 'bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-6 border-2 border-purple-500 flex flex-col gap-3';
    card.innerHTML = `
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div class="text-2xl font-bold text-blue-700 dark:text-blue-300 mb-1">${debt.name}</div>
          <div class="text-xl font-bold text-green-600 dark:text-green-400 mb-1">${debt.amount} so‘m</div>
          <div class="text-xs text-gray-500 mb-1">${debt.note || ''}</div>
          <div class="text-xs text-gray-400 mb-2">${debt.time}</div>
          <div class="mb-2 text-base text-gray-700 dark:text-gray-200"><b>Kimdan olgan:</b> ${debt.from || '-'}</div>
          <div class="mb-2 text-sm text-gray-700 dark:text-gray-200">
            <b>Jami qo‘shilgan:</b> ${totalAdd} so‘m<br>
            <b>Jami ayirilgan:</b> ${totalSub} so‘m<br>
            <b>Qolgan:</b> ${debt.amount} so‘m
          </div>
        </div>
        <div class="flex flex-col gap-2 min-w-[120px]">
          <button class="view-debt-btn bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded" data-idx="${idx}">Ko‘rish</button>
          <button class="delete-debt-btn bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded" data-idx="${idx}">O‘chirish</button>
        </div>
      </div>
      <div class="mt-3">${historyHtml || '<div class="text-xs text-gray-400">Tarix yo‘q</div>'}</div>
    `;
    list.appendChild(card);

    // Ko‘rish tugmasi
    card.querySelector('.view-debt-btn').onclick = () => {
      alert(
        `Kimdan: ${debt.from || '-'}\nIsm: ${debt.name}\nSumma: ${debt.amount} so‘m\nIzoh: ${debt.note || '-'}\nVaqti: ${debt.time}`
      );
    };

    // O‘chirish tugmasi
    card.querySelector('.delete-debt-btn').onclick = () => {
      if (confirm("O‘chirishni xohlaysizmi?")) {
        debts.splice(idx, 1);
        localStorage.setItem('myDebts', JSON.stringify(debts));
        renderViewDebts();
      }
    };
  });
}

// Modal ochilganda chaqiring:
document.getElementById('viewDebtsBtn').onclick = () => {
  document.getElementById('viewDebtsModal').classList.remove('hidden');
  renderViewDebts();
};
document.getElementById('closeViewDebtsModal').onclick = () => {
  document.getElementById('viewDebtsModal').classList.add('hidden');
};

document.getElementById("viewDebtsModal").innerHTML = `
  <div class="bg-white dark:bg-gray-900 rounded-xl shadow-xl p-6 w-full max-w-2xl relative">
    <button id="closeViewDebtsModal" class="absolute top-2 right-2 text-2xl">&times;</button>
    <h2 class="text-xl font-bold mb-4">Qarzlar ro‘yxati</h2>
    <div id="viewDebtsList"></div>
  </div>
`;

window.addEventListener('DOMContentLoaded', () => {
  // Foydalanuvchi ismi va random ID olish yoki yaratish
  let userName = localStorage.getItem('userName');
  let userId = localStorage.getItem('userId');

  if (!userName) {
    userName = prompt("Ismingizni kiriting:");
    localStorage.setItem('userName', userName);
  }
  if (!userId) {
    userId = Math.random().toString(36).substr(2, 8).toUpperCase();
    localStorage.setItem('userId', userId);
  }

  // Menyuda ko‘rsatish
  const userNameEl = document.getElementById('userName');
  const userIdEl = document.getElementById('userId');
  if (userNameEl && userIdEl) {
    userNameEl.textContent = userName;
    userIdEl.textContent = `ID: ${userId}`;
  }
});