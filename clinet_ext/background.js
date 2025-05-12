let latestArticle = {
  title: "",
  content: "",
};

let log = "";
console.log("running");

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

  if (message.type == "GET_ARTICLE") {
    sendRes(latestArticle);
  }
});
