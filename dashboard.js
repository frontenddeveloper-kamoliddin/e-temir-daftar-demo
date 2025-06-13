import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, updateDoc, doc, arrayUnion, arrayRemove, Timestamp, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firebase config (o'zingizning loyihangizdan oling)
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

// Auth check
onAuthStateChanged(auth, user => {
  if (!user) window.location.href = "index.html";
});

// Sidebar
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

// Dark/Light mode
const toggleTheme = document.getElementById("toggleTheme");
toggleTheme.onclick = () => {
  if (document.documentElement.classList.contains("dark")) {
    document.documentElement.classList.remove("dark");
    localStorage.theme = "light";
  } else {
    document.documentElement.classList.add("dark");
    localStorage.theme = "dark";
  }
};

// Logout
document.getElementById("logoutBtn").onclick = () => {
  signOut(auth).then(() => window.location.href = "index.html");
};

// Qarzdor qo'shish (ism unikal)
const debtorForm = document.getElementById("debtorForm");
debtorForm.onsubmit = async (e) => {
  e.preventDefault();
  const name = document.getElementById("debtorName").value.trim();
  const product = document.getElementById("debtorProduct").value.trim();
  const count = parseInt(document.getElementById("debtorCount").value);
  const price = parseInt(document.getElementById("debtorPrice").value);
  const note = document.getElementById("debtorNote").value.trim();
  if (!name || !product || !count || !price) return;

  const user = auth.currentUser;
  if (!user) return;

  // Faqat shu foydalanuvchining qarzdorlarini tekshirish
  const snapshot = await getDocs(collection(db, "debtors"));
  const exists = snapshot.docs.some(doc => {
    const data = doc.data();
    return data.userId === user.uid && data.name.toLowerCase() === name.toLowerCase();
  });
  if (exists) {
    alert("Bu ismli qarzdor allaqachon mavjud!");
    return;
  }

  await addDoc(collection(db, "debtors"), {
    name, product, count, price, note,
    userId: user.uid,
    history: [{
      type: "add",
      amount: count * price,
      count,
      price,
      product,
      note,
      date: Timestamp.now()
    }]
  });
  debtorForm.reset();
  loadDebtors();
};

// Qidiruv
document.getElementById("searchInput").oninput = loadDebtors;

// Qarzdorlar ro'yxatini yuklash va ko'rsatish
async function loadDebtors() {
  const user = auth.currentUser;
  if (!user) return;
  const search = document.getElementById("searchInput").value.toLowerCase();
  const snapshot = await getDocs(collection(db, "debtors"));
  let debtors = [];
  snapshot.forEach(doc => {
    let data = doc.data();
    data.id = doc.id;
    // Faqat o‘zining qarzdorlarini olish
    if (data.userId === user.uid) {
      debtors.push(data);
    }
  });
  if (search) {
    debtors = debtors.filter(d => d.name.toLowerCase().includes(search));
  }
  renderDebtors(debtors);
}
loadDebtors();

// Statistika
function renderStats(debtors) {
  let totalAdded = 0, totalSubtracted = 0, totalDebt = 0;
  debtors.forEach(d => {
    let add = 0, sub = 0;
    d.history?.forEach(h => {
      if (h.type === "add") add += h.amount;
      if (h.type === "sub") sub += h.amount;
    });
    totalAdded += add;
    totalSubtracted += sub;
    totalDebt += (add - sub);
  });
  document.getElementById("totalAdded").innerText = totalAdded + " so‘m";
  document.getElementById("totalSubtracted").innerText = totalSubtracted + " so‘m";
  document.getElementById("totalDebt").innerText = totalDebt + " so‘m";
}

// Qarzdorlar cardlari (o‘chirish tugmasi bilan)
function renderDebtors(debtors) {
  renderStats(debtors);
  const list = document.getElementById("debtorsList");
  list.innerHTML = "";
  if (debtors.length === 0) {
    list.innerHTML = `<div class="text-center text-gray-500 dark:text-gray-400">Qarzdorlar topilmadi</div>`;
    return;
  }
  debtors.forEach(d => {
    const card = document.createElement("div");
    card.className = "bg-white dark:bg-gray-700 rounded-lg shadow p-4 flex items-center justify-between gap-2";
    card.innerHTML = `
      <div>
        <div class="font-bold text-lg">${d.name}</div>
        <div class="text-sm text-gray-500 dark:text-gray-300">${d.product} (${d.count} x ${d.price} so‘m)</div>
        <div class="text-xs text-gray-400">${d.note || ""}</div>
      </div>
      <div class="flex gap-2">
        <button class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition" data-id="${d.id}">Batafsil</button>
        <button class="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded transition" data-del="${d.id}">O‘chirish</button>
      </div>
    `;
    card.querySelector("[data-id]").onclick = () => openDebtorModal(d);
    card.querySelector("[data-del]").onclick = () => confirmDeleteDebtor(d.id, d.name);
    list.appendChild(card);
  });
}

// O‘chirishni tasdiqlovchi modal
function confirmDeleteDebtor(id, name) {
  const div = document.createElement("div");
  div.className = "fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50";
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

// Modal (batafsil) — inputlar mobil uchun qulay, pul qo‘shilganda modal yopilmaydi
const debtorModal = document.getElementById("debtorModal");
const modalContent = document.getElementById("modalContent");
document.getElementById("closeModal").onclick = () => debtorModal.classList.add("hidden");

function openDebtorModal(debtor) {
  debtorModal.classList.remove("hidden");
  let addHistory = "", subHistory = "";
  let totalAdd = 0, totalSub = 0;
  (debtor.history || []).forEach(h => {
    const date = h.date?.toDate ? h.date.toDate() : new Date();
    const time = date.toLocaleString("uz-UZ");
    if (h.type === "add") {
      addHistory += `
        <div class="bg-green-100 dark:bg-green-900 rounded p-2 mb-2">
          +${h.amount} so‘m 
          <span class="text-xs text-gray-500 ml-2">
            (${h.count || 1} x ${h.price || h.amount} so‘m, ${h.product || debtor.product || ""})
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
        <div class="text-gray-500 dark:text-gray-300 mb-2">${debtor.product} (${debtor.count} x ${debtor.price} so‘m)</div>
        <div class="text-xs text-gray-400 mb-2">${debtor.note || ""}</div>
        <div class="mb-2">Umumiy qarz: <span class="font-bold">${totalAdd - totalSub} so‘m</span></div>
        <form id="addDebtForm" class="flex flex-col gap-2 mb-2">
          <div class="grid grid-cols-1 gap-2">
            <input type="text" placeholder="Mahsulot nomi" class="p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-400 text-gray-900 dark:text-gray-100" required>
            <input type="number" min="1" placeholder="Mahsulot soni" class="p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-400 text-gray-900 dark:text-gray-100" required>
            <input type="number" min="1" placeholder="Mahsulot narxi" class="p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-400 text-gray-900 dark:text-gray-100" required>
            <input type="text" placeholder="Izoh (ixtiyoriy)" class="p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-400 text-gray-900 dark:text-gray-100">
          </div>
          <button type="submit" class="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded">Qo‘shish</button>
        </form>
        <form id="subDebtForm" class="flex gap-2 mb-2">
          <input type="number" min="1" placeholder="Qarz ayirish (so‘m)" class="flex-1 p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-red-400 text-gray-900 dark:text-gray-100" required>
          <button type="submit" class="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded">Ayirish</button>
        </form>
        <button id="finishDebt" class="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded mt-2">Qarzni tugatish</button>
      </div>
      <div class="flex-1">
        <div class="font-bold mb-2">Qo‘shilganlar</div>
        ${addHistory || '<div class="text-gray-400">Yo‘q</div>'}
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
  // Qo‘shish (modal yopilmaydi)
  modalContent.querySelector("#addDebtForm").onsubmit = async (e) => {
    e.preventDefault();
    const product = e.target[0].value.trim();
    const count = parseInt(e.target[1].value);
    const price = parseInt(e.target[2].value);
    const note = e.target[3].value.trim();
    if (!product || !count || !price) return;
    const amount = count * price;
    const ref = doc(db, "debtors", debtor.id);
    await updateDoc(ref, {
      history: arrayUnion({
        type: "add",
        amount,
        count,
        price,
        product,
        note,
        date: Timestamp.now()
      })
    });
    // Modal yopilmaydi, faqat yangilanadi
    const updated = (await getDocs(collection(db, "debtors"))).docs.find(docu => docu.id === debtor.id).data();
    openDebtorModal({ ...updated, id: debtor.id });
    loadDebtors();
  };
  // Ayirish (modal yopilmaydi)
  modalContent.querySelector("#subDebtForm").onsubmit = async (e) => {
    e.preventDefault();
    const val = parseInt(e.target[0].value);
    if (!val) return;
    const ref = doc(db, "debtors", debtor.id);
    await updateDoc(ref, {
      history: arrayUnion({
        type: "sub",
        amount: val,
        date: Timestamp.now()
      })
    });
    // Modal yopilmaydi, faqat yangilanadi
    const updated = (await getDocs(collection(db, "debtors"))).docs.find(docu => docu.id === debtor.id).data();
    openDebtorModal({ ...updated, id: debtor.id });
    loadDebtors();
  };
  // Qarzni tugatish
  modalContent.querySelector("#finishDebt").onclick = async () => {
    const ref = doc(db, "debtors", debtor.id);
    await updateDoc(ref, { history: [] });
    loadDebtors();
    debtorModal.classList.add("hidden");
  };
}

// {qarzlar.map(q => <div key={q.id}>{q.nomi}</div>)}