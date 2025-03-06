// options.js
const domainInput = document.getElementById("domainInput");
const addDomainBtn = document.getElementById("addDomainBtn");
const domainList = document.getElementById("domainList");

const originalTextInput = document.getElementById("originalText");
const replaceTextInput = document.getElementById("replaceText");
const addRuleBtn = document.getElementById("addRuleBtn");
const ruleList = document.getElementById("ruleList");

let userDomains = [];
let translationMap = {};

async function init() {
  // 1) 讀取本地儲存資料
  const storageData = await chrome.storage.sync.get(["userDomains", "translationMap"]);
  userDomains = storageData.userDomains || [];
  translationMap = storageData.translationMap || {};

  renderDomainList();
  renderRuleList();
}

init();

// ---- 網域設定 ----
addDomainBtn.addEventListener("click", async () => {
  const domain = domainInput.value.trim();
  if (!domain) return;
  // 可以在這裡做簡單的格式檢查，例如檢查是否含有 http:// 或 https://
  // 也可以確保最後結尾有 /* 以符合 content script 的 matches 格式
  const formattedDomain = formattDomain(domain);

  if (!userDomains.includes(formattedDomain)) {
    userDomains.push(formattedDomain);
    await chrome.storage.sync.set({ userDomains });
    domainInput.value = "";
    renderDomainList();
    // 通知 background 重新註冊
    chrome.runtime.sendMessage({ type: "UPDATE_DOMAINS" });
  }
});

function renderDomainList() {
  domainList.innerHTML = "";
  userDomains.forEach((domain) => {
    const li = document.createElement("li");
    li.textContent = domain;

    const btn = document.createElement("button");
    btn.textContent = "刪除";
    btn.style.marginLeft = "10px";
    btn.addEventListener("click", async () => {
      userDomains = userDomains.filter((d) => d !== domain);
      await chrome.storage.sync.set({ userDomains });
      renderDomainList();
      chrome.runtime.sendMessage({ type: "UPDATE_DOMAINS" });
    });

    li.appendChild(btn);
    domainList.appendChild(li);
  });
}

function formattDomain(domainInput) {
  if (domainInput.endsWith("/")) {
    return domainInput + "*";
  }
  if (!domainInput.endsWith("/*")) {
    return domainInput + "/*";
  }
  return domainInput;
}

// ---- 翻譯字典設定 ----
addRuleBtn.addEventListener("click", async () => {
  const key = originalTextInput.value.trim();
  const val = replaceTextInput.value.trim();
  if (key && val) {
    translationMap[key] = val;
    await chrome.storage.sync.set({ translationMap });
    originalTextInput.value = "";
    replaceTextInput.value = "";
    renderRuleList();
  }
});

function renderRuleList() {
  ruleList.innerHTML = "";
  Object.entries(translationMap).forEach(([key, val]) => {
    const li = document.createElement("li");
    li.textContent = `${key} => ${val}`;
    const btn = document.createElement("button");
    btn.textContent = "刪除";
    btn.style.marginLeft = "10px";
    btn.addEventListener("click", async () => {
      delete translationMap[key];
      await chrome.storage.sync.set({ translationMap });
      renderRuleList();
    });
    li.appendChild(btn);
    ruleList.appendChild(li);
  });
}
