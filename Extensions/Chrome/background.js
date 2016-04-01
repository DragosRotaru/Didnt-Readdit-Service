chrome.tabs.onUpdated.addListener(function (tabID, changeInfo, tab) {
  //console.log(tab);
  //console.log(tabID);
  //console.log(changeInfo);
  if (tab.url.indexOf(".reddit.") >= 0 && changeInfo.status == 'complete' && tab.status == 'complete') {
    chrome.tabs.insertCSS(tabID, {file: "TLDR.css"});
    chrome.tabs.executeScript(tabID, {file: "jquery-2.2.2.min.js"});
    chrome.tabs.executeScript(tabID, {file: "TLDR.js"});
  }
});
