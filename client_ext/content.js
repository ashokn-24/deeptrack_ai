const chunkRegistry = new Map();

let embedded = false;

function extractAndMarkContent() {
  try {
    const searchPagePatterns = [
      "google.com/search",
      "bing.com/search",
      "duckduckgo.com",
      "search.yahoo.com",
    ];

    const url = window.location.href;

    if (searchPagePatterns.some((pattern) => url.includes(pattern))) {
      return;
    }

    const baseUrl = window.location.origin + window.location.pathname;
    const alreadyProcessed = localStorage.getItem(
      `ml-ext-processed:${baseUrl}`
    );

    console.log("baseUrl", baseUrl);
    let chunks = [];

    const article = new Readability(document.cloneNode(true)).parse();
    if (!article) return;

    const html = article.content;
    const div = document.createElement("div");
    div.innerHTML = html;

    const rawParagraphs = Array.from(div.querySelectorAll("p, div"))
      .map((el) => el.innerText.trim())
      .filter((text) => text.length > 50);

    let currentChunk = "";
    const chunkSize = 1000;

    for (const para of rawParagraphs) {
      if ((currentChunk + " " + para).length <= chunkSize) {
        currentChunk += (currentChunk ? " " : "") + para;
      } else {
        if (currentChunk) chunks.push(currentChunk);
        currentChunk = para;
      }
    }
    if (currentChunk) chunks.push(currentChunk);

    const pageParagraphs = Array.from(document.querySelectorAll("p"));
    let chunkIndex = 0;

    for (
      let i = 0;
      i < pageParagraphs.length && chunkIndex < chunks.length;
      i++
    ) {
      const para = pageParagraphs[i];
      const paraText = para.innerText.trim();

      if (
        paraText.length > 50 &&
        chunks[chunkIndex].includes(paraText.substring(0, 50))
      ) {
        const chunkId = `ml-ext-chunk-${chunkIndex}`;

        let wrapper = document.getElementById(chunkId);
        if (!wrapper) {
          wrapper = document.createElement("div");
          wrapper.id = chunkId;
          wrapper.className = "ml-ext-chunk";
          wrapper.dataset.mlChunkId = chunkId;

          wrapper.style.position = "relative";
          wrapper.style.padding = "12px";
          wrapper.style.margin = "12px 0";
          wrapper.style.borderLeft = "3px solid transparent";
          wrapper.style.transition = "background-color 0.3s, border-color 0.3s";

          wrapper.innerHTML = para.innerHTML;
          para.replaceWith(wrapper);
        }

        chunkRegistry.set(chunkId, {
          element: wrapper,
          text: chunks[chunkIndex],
          index: chunkIndex,
          url: url,
        });

        chunkIndex++;
      }
    }

    if (!alreadyProcessed && chunkRegistry.size > 0) {
      const chunkObjects = Array.from(chunkRegistry.values()).map((chunk) => ({
        id: chunk.element.id,
        index: chunk.index,
        text: chunk.text,
      }));

      const data = {
        url: baseUrl,
        timestamp: new Date().toISOString(),
        chunks: {
          title: article.title || "Untitled",
          content: chunkObjects,
        },
      };

      fetch("http://127.0.0.1:8000/embed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })
        .then(() => {
          localStorage.setItem(`ml-ext-processed:${baseUrl}`, "true");
        })
        .catch(console.error);
    }
  } catch (error) {
    console.error("Error in extractAndMarkContent:", error);
  }
}

function highlightChunk(chunkId) {
  document.querySelectorAll(".ml-ext-highlight").forEach((el) => {
    el.classList.remove("ml-ext-highlight");
    el.style.backgroundColor = "";
    el.style.borderLeftColor = "transparent";

    const marker = el.querySelector(".ml-ext-marker");
    if (marker) marker.remove();
  });

  let chunkElement =
    chunkRegistry.get(chunkId)?.element ||
    document.getElementById(chunkId) ||
    document.querySelector(`[data-ml-chunk-id="${chunkId}"]`);

  if (!chunkElement) {
    console.warn(`Chunk element not found for id: ${chunkId}`);
    return;
  }

  if (!chunkRegistry.has(chunkId)) {
    chunkRegistry.set(chunkId, {
      element: chunkElement,
      text: chunkElement.innerText,
      index: parseInt(chunkId.split("-").pop(), 10),
    });
  }

  chunkElement.classList.add("ml-ext-highlight");
  chunkElement.style.borderLeftColor = "gold";
  chunkElement.style.backgroundColor = "rgba(255, 240, 140, 0.3)";
  chunkElement.style.position = "relative";

  const scrollIntoViewIfNeeded = (attempts = 0) => {
    chunkElement.scrollIntoView({ behavior: "smooth", block: "center" });

    setTimeout(() => {
      const rect = chunkElement.getBoundingClientRect();
      const isVisible =
        rect.top >= 0 &&
        rect.bottom <=
          (window.innerHeight || document.documentElement.clientHeight);

      if (!isVisible && attempts < 3) {
        scrollIntoViewIfNeeded(attempts + 1);
      }
    }, 300);
  };

  scrollIntoViewIfNeeded();
}

function handleHashHighlight() {
  const hash = window.location.hash.substring(1);
  if (hash.startsWith("ml-ext-chunk-")) {
    let attempts = 0;
    const maxAttempts = 10;
    const interval = setInterval(() => {
      attempts++;
      const success = highlightChunk(hash);
      if (success || attempts >= maxAttempts) {
        clearInterval(interval);
      }
    }, 500);
  }
}

function initialize() {
  if (!embedded) {
    embedded = true;
    extractAndMarkContent();
  }

  // Set up mutation observer
  const observer = new MutationObserver((mutations) => {
    chunkRegistry.forEach((info, chunkId) => {
      if (!document.contains(info.element)) {
        const found =
          document.getElementById(chunkId) ||
          document.querySelector(`[data-ml-chunk-id="${chunkId}"]`);
        if (found) {
          info.element = found;
          chunkRegistry.set(chunkId, info);
        }
      }
    });

    document.querySelectorAll("[data-ml-chunk-id]").forEach((el) => {
      el.style.position = "relative";
      el.style.padding = "12px";
      el.style.margin = "12px 0";
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  setTimeout(handleHashHighlight, 300);
}

// Start the process
if (document.readyState === "complete") {
  initialize();
} else {
  window.addEventListener("load", initialize);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "HIGHLIGHT_CHUNK") {
    highlightChunk(request.chunkId);
    sendResponse({ status: "success" });
  }
  return true;
});

window.addEventListener("hashchange", handleHashHighlight);
