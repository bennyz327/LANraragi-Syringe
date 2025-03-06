(async function main() {
  
  if (!await checkDomain()) {
    console.log("不符合");
    return;
  }

  // console.log("取得本地翻譯字典");
  const { translationMap } = await chrome.storage.sync.get("translationMap");

  // console.log("取得上游字典");
  const { upstreamDB } = await chrome.storage.local.get("upstreamDB");
  const upstreamDBMap = buildUpstreamMap(upstreamDB);

  // 用兩種字典初始化 content 模組
  window.replacer.init(translationMap || {}, upstreamDBMap || {});

  // console.log("首次替換");
  document.addEventListener("DOMContentLoaded", () => {
    window.replacer.replaceTargetText();
  });

  // console.log("動態監聽替換");
  const observer = new MutationObserver(() => {
    window.replacer.replaceTargetText();
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();


async function checkDomain() {
  const { userDomains } = await chrome.storage.sync.get("userDomains");
  if (!userDomains || userDomains.length === 0) {
    console.log("尚未設定任何 LANraragi 網域，跳過注入");
    return false;
  }

  let check = false;
  userDomains.forEach(domain => {
    if (window.location.href.startsWith(domain.replaceAll("/*", ""))) {
      check = true;
    }
  });

  return check;
}


function buildUpstreamMap(upstreamDB) {
  // upstreamDB => { data: [ { namespace, data: { ... } }, ... ] }
  // 我們想要一個 map => { "deck": { name, intro }, "wakadori nikomi": { name, intro }, ... }

  const map = {};
  if (!upstreamDB || !Array.isArray(upstreamDB.data)) {
    return map;
  }
  for (const block of upstreamDB.data) {
    // block => { namespace: "artist", data: { key: { name, intro }, ... } }
    if (!block.data) continue;

    for (const [original, info] of Object.entries(block.data)) {
      // original 可能是 "wakadori nikomi"、"deck" 等
      // info => { name, intro }
      map[original] = {
        name: info.name || original,
        intro: info.intro || ""
      };
    }
  }
  return map;
}