const STORAGE_KEY = "quickfix-mobile-kitchen-state";
const ADMIN_STORAGE_KEY = "quickfix-admin-auth";
const ADMIN_USERNAME = window.APP_CONFIG?.adminUsername || "sifiso";
const ADMIN_PASSWORD = window.APP_CONFIG?.adminPassword || "10111";
let cloudApiUrl = window.APP_CONFIG?.cloudApiUrl || "";

const defaultState = {
  cloudApiUrl: "",
  whatsappNumber: "",
  spices: [
    { id: crypto.randomUUID(), name: "Classic", price: 2 },
    { id: crypto.randomUUID(), name: "Spicy", price: 3 },
    { id: crypto.randomUUID(), name: "Barbecue", price: 3 },
  ],
  sizes: [
    { id: crypto.randomUUID(), name: "Small", price: 10 },
    { id: crypto.randomUUID(), name: "Medium", price: 15 },
    { id: crypto.randomUUID(), name: "Large", price: 25 },
  ],
  orders: [],
};

let state = loadState();
let selectedOrderId = null;
let isAdmin = false;

function getCloudApiUrl() {
  return state.cloudApiUrl || cloudApiUrl || "";
}

async function syncToCloud() {
  const apiUrl = getCloudApiUrl();
  if (!apiUrl) {
    return;
  }

  try {
    await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save", payload: state }),
    });
  } catch (error) {
    console.warn("Cloud sync failed:", error);
  }
}

async function loadFromCloud() {
  const apiUrl = getCloudApiUrl();
  if (!apiUrl) {
    return false;
  }

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "load" }),
    });
    const result = await response.json();
    if (result?.ok && result?.data) {
      state = { ...result.data, cloudApiUrl: state.cloudApiUrl || result.data.cloudApiUrl || cloudApiUrl };
      cloudApiUrl = state.cloudApiUrl;
      saveState();
      return true;
    }
  } catch (error) {
    console.warn("Cloud load failed:", error);
  }

  return false;
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return JSON.parse(JSON.stringify(defaultState));
    }
    return JSON.parse(saved);
  } catch (error) {
    console.warn("Could not load saved state:", error);
    return JSON.parse(JSON.stringify(defaultState));
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function isAdminLoggedIn() {
  return sessionStorage.getItem(ADMIN_STORAGE_KEY) === "true" || localStorage.getItem(ADMIN_STORAGE_KEY) === "true";
}

function setAdminLoggedIn(value) {
  if (value) {
    sessionStorage.setItem(ADMIN_STORAGE_KEY, "true");
    localStorage.setItem(ADMIN_STORAGE_KEY, "true");
  } else {
    sessionStorage.removeItem(ADMIN_STORAGE_KEY);
    localStorage.removeItem(ADMIN_STORAGE_KEY);
  }
  isAdmin = value;
}

function renderAdminAccess() {
  const controls = document.querySelectorAll("[data-admin-only]");
  const status = document.getElementById("adminLoginStatus");
  const logoutButton = document.getElementById("adminLogoutBtn");
  const passwordField = document.getElementById("adminPassword");

  isAdmin = isAdminLoggedIn();
  controls.forEach((element) => {
    element.style.display = isAdmin ? "" : "none";
  });

  if (logoutButton) {
    logoutButton.style.display = isAdmin ? "" : "none";
  }

  if (passwordField) {
    passwordField.value = "";
  }

  if (status) {
    status.textContent = isAdmin ? "Admin access enabled." : "Admin login required to edit prices and manage orders.";
  }
}

async function renderAll() {
  await loadFromCloud();
  renderSpices();
  renderSizes();
  renderOrderForm();
  renderOrders();
  renderCustomerFeed();
  renderWhatsAppConfig();
  renderAdminAccess();
}

function formatCurrency(value) {
  return `E${Number(value || 0).toFixed(0)}`;
}

function renderSpices() {
  const spiceList = document.getElementById("spiceList");
  const spiceOptions = document.getElementById("spiceOptions");

  if (spiceList) {
    spiceList.innerHTML = state.spices
      .map((spice) => `<span class="menu-item">${spice.name} — ${formatCurrency(spice.price)}</span>`)
      .join("");
  }

  if (spiceOptions) {
    spiceOptions.innerHTML = state.spices
      .map(
        (spice) => `
          <label>
            <input type="checkbox" name="spices" value="${spice.name}" />
            ${spice.name} (${formatCurrency(spice.price)})
          </label>
        `
      )
      .join("");
  }
}

function renderSizes() {
  const sizeList = document.getElementById("sizeList");
  const sizeSelect = document.querySelector('select[name="size"]');

  if (sizeList) {
    sizeList.innerHTML = state.sizes
      .map((size) => `<span class="menu-item">${size.name} — ${formatCurrency(size.price)}</span>`)
      .join("");
  }

  if (sizeSelect) {
    sizeSelect.innerHTML = state.sizes
      .map((size) => `<option value="${size.name}">${size.name} — ${formatCurrency(size.price)}</option>`)
      .join("");
  }
}

function renderOrderForm() {
  const orderMessage = document.getElementById("orderMessage");
  if (orderMessage) {
    orderMessage.textContent = "";
  }
}

function renderOrders() {
  const ordersList = document.getElementById("ordersList");
  const activeOrderTitle = document.getElementById("activeOrderTitle");
  const chatMessages = document.getElementById("chatMessages");

  if (!ordersList) {
    return;
  }

  if (!state.orders.length) {
    ordersList.innerHTML = '<p>No orders yet. Customers will appear here.</p>';
    if (activeOrderTitle) {
      activeOrderTitle.textContent = "No orders yet";
    }
    if (chatMessages) {
      chatMessages.innerHTML = "";
    }
    return;
  }

  if (!selectedOrderId && state.orders.length) {
    selectedOrderId = state.orders[0].id;
  }

  ordersList.innerHTML = state.orders
    .map((order) => {
      const isActive = order.id === selectedOrderId;
      return `
        <button class="order-card ${isActive ? "active" : ""}" data-order-id="${order.id}" type="button">
          <strong>${order.customerName}</strong><br />
          ${order.size} · ${order.quantity} pack(s)<br />
          <small>Status: ${order.status}</small>
        </button>
      `;
    })
    .join("");

  const selectedOrder = state.orders.find((order) => order.id === selectedOrderId) || state.orders[0];
  if (selectedOrder) {
    if (activeOrderTitle) {
      activeOrderTitle.textContent = `${selectedOrder.customerName} • ${selectedOrder.phone}`;
    }
    if (chatMessages) {
      chatMessages.innerHTML = (selectedOrder.messages || [])
        .map(
          (entry) => `
            <div class="chat-bubble ${entry.from === "admin" ? "admin" : "customer"}">
              <strong>${entry.from === "admin" ? "Admin" : "Customer"}</strong>
              <div>${entry.text}</div>
              <small>${entry.time}</small>
            </div>
          `
        )
        .join("");
    }
  }
}

function renderCustomerFeed() {
  const customerFeed = document.getElementById("customerFeed");
  if (!customerFeed) {
    return;
  }
  customerFeed.innerHTML = "<p>Enter your phone number to look up your order updates.</p>";
}

function renderWhatsAppConfig() {
  const input = document.getElementById("whatsappNumber");
  const cloudInput = document.getElementById("cloudApiUrlInput");
  const cloudStatus = document.getElementById("cloudStatus");
  if (input) {
    input.value = state.whatsappNumber || "";
  }
  if (cloudInput) {
    cloudInput.value = state.cloudApiUrl || cloudApiUrl || "";
  }
  if (cloudStatus) {
    cloudStatus.textContent = getCloudApiUrl() ? "Cloud sync ready." : "Paste your cloud URL to connect orders online.";
  }
}

async function handleAddSpice(event) {
  event.preventDefault();
  const spiceName = document.getElementById("spiceName");
  const spicePrice = document.getElementById("spicePrice");
  if (!spiceName || !spicePrice) {
    return;
  }
  state.spices.push({ id: crypto.randomUUID(), name: spiceName.value.trim(), price: Number(spicePrice.value) || 0 });
  saveState();
  await syncToCloud();
  renderSpices();
  spiceName.value = "";
  spicePrice.value = "";
}

async function handleAddSize(event) {
  event.preventDefault();
  const sizeName = document.getElementById("sizeName");
  const sizePrice = document.getElementById("sizePrice");
  if (!sizeName || !sizePrice) {
    return;
  }
  state.sizes.push({ id: crypto.randomUUID(), name: sizeName.value.trim(), price: Number(sizePrice.value) || 0 });
  saveState();
  await syncToCloud();
  renderSizes();
  sizeName.value = "";
  sizePrice.value = "";
}

async function handleOrderSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);

  const selectedSpices = formData.getAll("spices").map((value) => String(value));
  const order = {
    id: crypto.randomUUID(),
    customerName: formData.get("customerName")?.toString().trim() || "Guest",
    phone: formData.get("phone")?.toString().trim() || "",
    address: formData.get("address")?.toString().trim() || "",
    quantity: Number(formData.get("quantity") || 1),
    size: formData.get("size")?.toString() || state.sizes[0]?.name || "Small",
    spices: selectedSpices.length ? selectedSpices : [state.spices[0]?.name || "Classic"],
    notes: formData.get("notes")?.toString().trim() || "",
    status: "Order received",
    createdAt: new Date().toLocaleString(),
    messages: [
      {
        from: "system",
        text: "Order received. Admin will update you soon.",
        time: new Date().toLocaleString(),
      },
    ],
  };

  state.orders.unshift(order);
  saveState();
  await syncToCloud();
  selectedOrderId = order.id;
  renderOrders();
  renderCustomerFeed();
  const orderMessage = document.getElementById("orderMessage");
  if (orderMessage) {
    orderMessage.textContent = `Order placed for ${order.customerName}. Admin will reach you via phone.`;
  }
  form.reset();
}

function handleOrderPick(event) {
  const button = event.target.closest(".order-card");
  if (!button) {
    return;
  }
  selectedOrderId = button.dataset.orderId;
  renderOrders();
}

async function handleUpdateSubmit(event) {
  event.preventDefault();
  const input = document.getElementById("updateText");
  if (!input || !selectedOrderId) {
    return;
  }

  const selectedOrder = state.orders.find((order) => order.id === selectedOrderId);
  if (!selectedOrder) {
    return;
  }

  selectedOrder.messages.push({
    from: "admin",
    text: input.value.trim(),
    time: new Date().toLocaleString(),
  });
  selectedOrder.status = input.value.trim().length > 0 ? "Updated" : "Pending";
  saveState();
  await syncToCloud();
  input.value = "";
  renderOrders();
}

function handleLookup(event) {
  event.preventDefault();
  const input = document.getElementById("lookupPhone");
  const customerFeed = document.getElementById("customerFeed");
  if (!input || !customerFeed) {
    return;
  }

  const phone = input.value.trim();
  const matchingOrder = state.orders.find((order) => order.phone === phone);
  if (!matchingOrder) {
    customerFeed.innerHTML = "<p>No order found for that phone number.</p>";
    return;
  }

  customerFeed.innerHTML = `
    <h4>${matchingOrder.customerName}</h4>
    <p><strong>Status:</strong> ${matchingOrder.status}</p>
    <p><strong>Spices:</strong> ${matchingOrder.spices.join(", ")}</p>
    ${matchingOrder.messages
      .map(
        (entry) => `
          <div class="chat-bubble ${entry.from === "admin" ? "admin" : "customer"}">
            <strong>${entry.from === "admin" ? "Admin" : "You"}</strong>
            <div>${entry.text}</div>
            <small>${entry.time}</small>
          </div>
        `
      )
      .join("")}
  `;
}

async function handleCloudConfigSave(event) {
  event.preventDefault();
  const input = document.getElementById("cloudApiUrlInput");
  const status = document.getElementById("cloudStatus");
  if (!input) {
    return;
  }
  state.cloudApiUrl = input.value.trim();
  cloudApiUrl = state.cloudApiUrl;
  saveState();
  await syncToCloud();
  if (status) {
    status.textContent = state.cloudApiUrl ? "Cloud link saved." : "Paste your cloud URL to connect orders online.";
  }
  renderWhatsAppConfig();
}

async function handleWhatsAppSave(event) {
  event.preventDefault();
  const input = document.getElementById("whatsappNumber");
  const status = document.getElementById("whatsappStatus");
  if (!input) {
    return;
  }
  state.whatsappNumber = input.value.trim();
  saveState();
  await syncToCloud();
  if (status) {
    status.textContent = state.whatsappNumber ? "WhatsApp number saved." : "Enter your number to enable quick sharing.";
  }
}

function handleAdminLogin(event) {
  event.preventDefault();
  const usernameInput = document.getElementById("adminUsername");
  const passwordInput = document.getElementById("adminPassword");
  const status = document.getElementById("adminLoginStatus");
  if (!usernameInput || !passwordInput) {
    return;
  }

  if (usernameInput.value === ADMIN_USERNAME && passwordInput.value === ADMIN_PASSWORD) {
    setAdminLoggedIn(true);
    renderAdminAccess();
    if (status) {
      status.textContent = "Admin access enabled.";
    }
  } else if (status) {
    status.textContent = "Wrong username or password. Only the admin can edit prices and settings.";
  }
}

function handleAdminLogout(event) {
  event.preventDefault();
  setAdminLoggedIn(false);
  renderAdminAccess();
}

function handleWhatsAppOpen() {
  const selectedOrder = state.orders.find((order) => order.id === selectedOrderId);
  if (!selectedOrder) {
    return;
  }

  const cleanedNumber = (state.whatsappNumber || "").replace(/[^0-9]/g, "");
  const message = `Hello ${selectedOrder.customerName}, your order is currently ${selectedOrder.status}. Size: ${selectedOrder.size}. Quantity: ${selectedOrder.quantity}. Spices: ${selectedOrder.spices.join(", ")}. Notes: ${selectedOrder.notes || "None"}.`;
  const url = cleanedNumber
    ? `https://wa.me/${cleanedNumber}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js").catch((error) => {
        console.warn("Service worker registration failed:", error);
      });
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  registerServiceWorker();
  renderAll();

  const addSpiceForm = document.getElementById("addSpiceForm");
  const addSizeForm = document.getElementById("addSizeForm");
  const customerOrderForm = document.getElementById("customerOrderForm");
  const ordersList = document.getElementById("ordersList");
  const updateForm = document.getElementById("updateForm");
  const lookupForm = document.getElementById("lookupForm");
  const whatsappForm = document.getElementById("whatsappForm");
  const whatsappButton = document.getElementById("whatsappButton");
  const cloudConfigForm = document.getElementById("cloudConfigForm");
  const adminLoginForm = document.getElementById("adminLoginForm");
  const adminLogoutBtn = document.getElementById("adminLogoutBtn");

  if (addSpiceForm) {
    addSpiceForm.addEventListener("submit", handleAddSpice);
  }
  if (addSizeForm) {
    addSizeForm.addEventListener("submit", handleAddSize);
  }
  if (customerOrderForm) {
    customerOrderForm.addEventListener("submit", handleOrderSubmit);
  }
  if (ordersList) {
    ordersList.addEventListener("click", handleOrderPick);
  }
  if (updateForm) {
    updateForm.addEventListener("submit", handleUpdateSubmit);
  }
  if (lookupForm) {
    lookupForm.addEventListener("submit", handleLookup);
  }
  if (whatsappForm) {
    whatsappForm.addEventListener("submit", handleWhatsAppSave);
  }
  if (whatsappButton) {
    whatsappButton.addEventListener("click", handleWhatsAppOpen);
  }
  if (cloudConfigForm) {
    cloudConfigForm.addEventListener("submit", handleCloudConfigSave);
  }
  if (adminLoginForm) {
    adminLoginForm.addEventListener("submit", handleAdminLogin);
  }
  if (adminLogoutBtn) {
    adminLogoutBtn.addEventListener("click", handleAdminLogout);
  }
});
