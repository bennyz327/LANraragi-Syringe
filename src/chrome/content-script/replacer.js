(function() {
  let translationMap = {};
  let upstreamDBMap = {};

  function initDict(map, map2) {
    translationMap = map;
    upstreamDBMap = map2;
  }

  // 根據 LANraragi 的介面訂製調整邏輯
  function replaceTargets() {

    // A. 處理 span: class 結尾是 "-tag"
    const spans = document.querySelectorAll('span[class$="-tag"]');
    spans.forEach(span => {
      const originalText = span.textContent.trim();
      const newText = getMergedTranslation(originalText);
      // 如果是使用上游翻譯，就把 intro 放到 title
      // localMap 優先 => 如果 newText 來自 local，就不加 title
      // 但若 localMap 沒覆蓋，而用到上游 => newText.intro 就有值
      if (newText) {
        span.textContent = newText.text;
        if (newText.intro) {
          span.title = stripHtmlTags(newText.intro);
        }
      }
    });
  
    // B. 處理 div.gt 裡的 a
    const links = document.querySelectorAll('div.gt > a');
    links.forEach(a => {
      const originalText = a.textContent.trim();
      const newText = getMergedTranslation(originalText);
      if (newText) {
        a.textContent = newText.text;
        if (newText.intro) {
          a.title = stripHtmlTags(newText.intro);
        }
      }
    });
  }

  // --- 取得最終翻譯 + intro ---
  // 回傳 { text, intro }，其中 text 為要顯示的翻譯字，intro 為可能要加到 title 的介紹
  function getMergedTranslation(original) {

    // 1) 若在 localMap 中，直接用 localMap
    if (translationMap.hasOwnProperty(original)) {
      return { text: translationMap[original], intro: "" };
    }

    // 2) 若不在 localMap，但在 upstreamMap
    if (upstreamDBMap.hasOwnProperty(original)) {
      return {
        text: upstreamDBMap[original].name,
        intro: upstreamDBMap[original].intro
      };
    }
    
    // 3) 都沒有 => 不替換
    return null;
  }

  // --- 把 intro HTML 轉成純文字 (避免 hover 出現雜亂 HTML tag)
  function stripHtmlTags(html) {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  }

  // 暴露 API
  window.replacer = {
    init(map, upstreamDBMap) {
      initDict(map, upstreamDBMap);
    },
    replaceTargetText() {
      replaceTargets();
    },
  };
})();