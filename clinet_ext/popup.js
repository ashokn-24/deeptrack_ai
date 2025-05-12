const searchText = document.getElementById("query");
const button = document.getElementById("search");
const result = document.getElementById("result");

button.addEventListener("click", async () => {
  try {
    if (!searchText.value.trim()) {
      result.innerHTML = "<p>Please enter a search query</p>";
      return;
    }

    result.innerHTML = "<p>Searching...</p>";

    const res = await fetch("http://127.0.0.1:8000/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: searchText.value }),
    });

    if (!res.ok) {
      throw new Error("Network response was not ok");
    }

    const json = await res.json();
    const data = json.results;

    console.log("Search results:", data);

    if (!data || data.length === 0) {
      result.innerHTML = "<p>No results found</p>";
      return;
    }

    result.innerHTML = "";

    data.forEach((item) => {
      const resultItem = document.createElement("div");
      resultItem.className = "result-item";
      resultItem.style.margin = "10px 0";
      resultItem.style.padding = "10px";
      resultItem.style.border = "1px solid #ddd";
      resultItem.style.borderRadius = "5px";
      resultItem.style.cursor = "pointer";

      resultItem.innerHTML = `
          <h3 style="margin: 0 0 5px 0">${item.title}</h3>
          <p style="margin: 0 0 5px 0; color: #666">${item.url}</p>
          <p style="margin: 0; font-size: 0.9em">${item.text.substring(
            0,
            150
          )}...</p>
        `;

      resultItem.addEventListener("click", () => {
        handleResultClick(item);
      });

      result.appendChild(resultItem);
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    result.innerHTML =
      "<p>An error occurred while searching. Please try again.</p>";
  }
});

function handleResultClick(resultItem) {
  const targetUrl = resultItem.url.split("#")[0];
  const targetHash = `#${resultItem.id}`;

  chrome.tabs.query({}, (tabs) => {
    const existingTab = tabs.find((tab) => {
      return tab.url && tab.url.split("#")[0] === targetUrl;
    });

    if (existingTab) {
      chrome.tabs.update(
        existingTab.id,
        { url: targetUrl + targetHash },
        () => {
          chrome.tabs.sendMessage(existingTab.id, {
            type: "HIGHLIGHT_CHUNK",
            chunkId: resultItem.id,
          });
        }
      );
    } else {
      chrome.tabs.create(
        { url: targetUrl + targetHash, active: true },
        (tab) => {
          const listener = (tabId, changeInfo) => {
            if (tabId === tab.id && changeInfo.status === "complete") {
              chrome.tabs.onUpdated.removeListener(listener);
              chrome.tabs.sendMessage(tabId, {
                type: "HIGHLIGHT_CHUNK",
                chunkId: resultItem.id,
              });
            }
          };
          chrome.tabs.onUpdated.addListener(listener);
        }
      );
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const style = document.createElement("style");
  style.textContent = `
    body {
      width: 400px;
      padding: 10px;
      font-family: Arial, sans-serif;
    }
    #query {
      width: 100%;
      padding: 8px;
      margin-bottom: 10px;
      box-sizing: border-box;
    }
    #search {
      width: 100%;
      padding: 8px;
      background-color:#4d94ff;
      color: white;
      border: none;
      cursor: pointer;
    }
    #search:hover {
      background-color:#1a75ff;
    }
    .result-item:hover {
      background-color: #f5f5f5;
    }
  `;
  document.head.appendChild(style);
});
