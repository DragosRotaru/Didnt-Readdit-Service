var version = 2;
var TLDRversion = chrome.runtime.getManifest().version
var apiURL = "https://localhost:5000/";
var request = indexedDB.open("TLDRDBaaa", version);

//Function creates new DB in the case version number differs or DB non-existent
request.onupgradeneeded = function (e) {
  e.target.result.createObjectStore("Summaries", {
    autoIncrement: false
  });
}

request.onsuccess = function (e) {
  db = e.target.result;
  console.log("TLDR DB initiallization successful");
  console.dir(db.objectStoreNames);

  //Function takes url and summarised article and adds it to the cache
  function createSummary(url, summaryContent) {
    var summary = {
      summaryContent : summaryContent,
      date : new Date()
    };
    var request = db.transaction(["Summaries"], "readwrite").objectStore("Summaries").add(summary, url);

    request.onsuccess = function (e) {
      console.log("TLDR CREATE operation successful", e.target.result);
    }

    request.onerror = function (e) {
      console.log("TLDR CREATE operation failiure", e.target.error.name);
    }
  }

  //Function takes a url key and returns summary for that key
  function readSummary(url) {
    var content = " Failed to Load :( ... srry m8 "; //failsafe
    request = db.transaction(["Summaries"], "readonly").objectStore("Summaries").get(url);

    request.onsuccess = function (e, content) {
      if (typeof e.target.result == "undefined") {
        fetchedSummary = SummaryAPI(url);
        createSummary(url, fetchedSummary);
        content = fetchedSummary;
      }

      else{
      content = e.target.result.summaryContent;
      }
      // remove from this scope to readSummary scope then return to iterator
    }

    request.onerror = function (e) {}
    return content;
  }

  function deleteSummary(url) {
    request = db.transaction(["Summaries"], "readonly").objectStore("Summaries").delete(url);

    request.onsuccess = function (e) {
      console.log("TLDR DELETE operation successful", e.target.result);
    }

    request.onerror = function (e) {
      console.log("TLDR DELETE operation failiure", e.target.error.name);
    }
  }

  //Function call to Summary API
  function SummaryAPI(url) {
    var xhr = new XMLHttpRequest();
    var requestURL = apiURL + "\"" + url + "\"";
    xhr.open("GET", requestURL, true);
    xhr.send();
    return xhr.responseText;
  }

  //augment Reddit page with TLDR buttons
  $(document).ready(function () {
    $('.thing.link').each(function () {
      if (!$(this).is(".self") && !$(this).find('p.title').next().is(".expando-button")) {
        $(this).find('p.title').after("<div class=\"expando-button TLDR collapsed\"></div>");
        content = readSummary($(this).attr("data-url"));
        console.log(content);
        view = "<div><div>" + content + "</div><div><a>Reddit TLDR V" + TLDRversion + "</a> - <a>" + "Donate Here</a> - <a> Give Feedback <a></div></div>";
        $(this).find(".expando").html(view);
      }
    });
  });

  //show summary
  $(".expando-button.TLDR.collapsed").click(function () {
    $(this).siblings(".expando").attr('style', 'display: block');
  });

  //hide summary
  $(".expando-button.TLDR.expanded").click(function () {
    $(this).siblings(".expando").attr('style', 'display: none');
  });

}

request.onerror = function (e) {
  console.log("TLDR DB initiallization failiure", e.target.error.name);
}
