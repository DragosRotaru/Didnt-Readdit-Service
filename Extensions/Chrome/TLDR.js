var version = 2;
var TLDRversion = chrome.runtime.getManifest().version
var apiURL = "https://localhost:8080/api/";
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

  function readSummary(div) {
    url = div.attr("data-url");
    request = db.transaction(["Summaries"], "readonly").objectStore("Summaries").get(url);
    var content;

    request.onsuccess = function (e, content) {
      if (typeof e.target.result == "undefined")
      {
        content = SummaryAPI(url);
        createSummary(url, content);
      }
      else {
        content = e.target.result;
      }
      console.log(content);
      var view = "<div><div>" + content + "</div><div><a>Reddit TLDR V" + TLDRversion + "</a> - <a>" + "Donate Here</a> - <a> Give Feedback <a></div></div>";
      div.find(".expando").html(view);
    }

    request.onerror = function (e) {}




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
    var summary;
    $.ajax({
      type: "GET",
      data: {
        reference: url
      }
      url: apiURL,
      success: function (result) {
        summary = result.summary;
      },
      async: false
    });
    return summary;
  }

  //augment Reddit page with TLDR buttons
  $(document).ready(function () {
    $('.thing.link').each(function () {
      if (!$(this).is(".self") && !$(this).find('p.title').next().is(".expando-button")) {
        $(this).find('p.title').after("<div class=\"expando-button TLDR collapsed\"></div>");
        var defaultMsg = "<div><div>Sorry m8, we are being gay</div><div><a>Reddit TLDR V" + TLDRversion + "</a> - <a>" + "Donate Here</a> - <a> Give Feedback <a></div></div>";
        $(this).find(".expando").html(defaultMsg);
        readSummary($(this));
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
