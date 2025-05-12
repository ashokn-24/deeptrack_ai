let latestArticle = {
  title: "",
  content: "",
};

let log = "";
console.log("runnig");

function highlightText(textToHighlight) {
  const bodyText = document.body.innerText;
  const index = bodyText.indexOf(textToHighlight);

  if (index === -1) return;

  const range = document.createRange();
  const selection = window.getSelection();
  selection.removeAllRanges();

  // simple highlight (for proof of concept)
  const span = document.createElement("span");
  span.style.backgroundColor = "yellow";
  span.textContent = textToHighlight;

  const el = document.body;
  el.innerHTML = el.innerHTML.replace(textToHighlight, span.outerHTML);

  // scroll into view
  const found = document.querySelector('span[style*="yellow"]');
  if (found) found.scrollIntoView({ behavior: "smooth", block: "center" });
}

chrome.runtime.onMessage.addListener((message, sender, sendRes) => {
  if (message.type == "PAGE_TEXT") {
    latestArticle.title = message.title;
    latestArticle.content = message.content;
    log = message.log;
  }

  console.log("Raw extracted text length:", log.length);
  console.log("Preview:", log.slice(0, 50));

  console.log("Total Chunks:", latestArticle.content.length);

  console.log(latestArticle);

  console.log("Received message:", message);

  if (message.type === "HIGHLIGHT_TEXT") {
    console.log("query to highlight:", message.query);
    console.log("Text to highlight:", message.text);
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: highlightText,
        args: [message.text],
      });
    });
  }
  if (message.type == "GET_ARTICLE") {
    sendRes(latestArticle);
  }
});
