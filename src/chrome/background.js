// background.js

// 用來緩存已註冊的 content script ID（MV3）
let registeredScripts = [];


chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    console.log("LANraragi Text Replacer 已安裝");
    console.log("嘗試下載上游翻譯資料...");
    await checkAndFetchUpstream()
  }
  // 初始化或更新時，試著讀取使用者設定的網域資訊，並註冊 content script
  await registerScriptsFromStorage();
});


// 下載上游資料庫
async function checkAndFetchUpstream() {
  // 1) 檢查 local 是否已有
  const { upstreamDB } = await chrome.storage.local.get("upstreamDB");
  if (upstreamDB) {
    console.log("已存在上游資料，跳過下載");
    return;
  }

  // 2) 若沒有，fetch 上游資料
  try {
    const url = "https://github.com/EhTagTranslation/Database/releases/latest/download/db.text.json"; // 改成你的上游位置
    const response = await fetch(url);
    if (!response.ok) throw new Error("下載失敗：" + response.statusText);

    const db = await response.json();
    // 預期結構: { data: [ { namespace, data: { key: {name,intro}, ... } }, ... ] }

    // 3) 存進 local
    await chrome.storage.local.set({ upstreamDB: db });
    console.log("已下載並儲存上游資料");
  } catch (err) {
    console.error("無法取得上游翻譯資料：", err);
  }
}


// 假設 options.js 在使用者儲存新網域後，會呼叫此事件告知 background 重新註冊
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.type === "UPDATE_DOMAINS") {
    console.log("重新註冊 content script 中...");
    await registerScriptsFromStorage();
    sendResponse({ result: "OK" });
  }
});


chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});


// 也可改用 chrome.storage.onChanged 偵測 changes

async function registerScriptsFromStorage() {
  // 1) 先移除已登記的舊 script，避免重複
  if (registeredScripts.length > 0) {
    for (const id of registeredScripts) {
      try {
        await chrome.scripting.unregisterContentScripts({ ids: [id] });
      } catch (e) {
        console.log("移除舊 content script 出現錯誤：", e);
      }
    }
    registeredScripts = [];
  }

  // 2) 從 storage 取得使用者自訂網域
  const { userDomains } = await chrome.storage.sync.get("userDomains");
  if (!userDomains || userDomains.length === 0) {
    console.log("尚未設定任何 LANraragi 網域，跳過注入");
    return;
  }

  // 3) 逐一註冊 content script
  for (const domain of userDomains) {
    // 假設 userDomains 存放的是類似 "http://192.168.1.100:3000/*" 這種格式
    const scriptId = `lanraragi-replacer-${domain}`;

    try {
      await chrome.scripting.registerContentScripts([
        {
          id: scriptId,
          matches: [domain],  // 動態注入指定網域
          js: ["content-script/content.js"], 
          runAt: "document_idle" // 或 "document_start"/"document_end" 依需求
        }
      ]);
      registeredScripts.push(scriptId);
      console.log(`已註冊 content script => ${domain}`);
    } catch (err) {
      console.error(`無法註冊 content script: ${domain}`, err);
    }
  }
}
