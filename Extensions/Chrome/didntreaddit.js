/* Title: Didnt Readdit Chrome Extension code
 *  Authors: Adrian Fekete, Dragos Rotaru
 *  Date: July 6 2016
 */

var version = chrome.runtime.getManifest().version
var apiURL = "https://didntreaddit.herokuapp.com/api/";
var request = indexedDB.open("didntreaddit", version);
var ClearCacheInterval = 604800000; // 1 week

//Default filler content in the case our extension fails
var defaultMsg = "<div><div>Sorry m8... :(</div><div><a>Reddit TLDR V" + version + "</a> - <a>" + "Donate Here</a> - <a> Give Feedback <a></div></div>";

//Creates new DB in the case version number differs or DB non-existent
request.onupgradeneeded = function (e) {
  e.target.result.deleteObjectStore("Summaries");
  e.target.result.createObjectStore("Summaries", {
    autoIncrement: false
  });
}

request.onsuccess = function (e) {
    db = e.target.result;
    console.log("TLDR DB initiallization successful");

    //Used to periodically delete cache contents
    function clearCache() {
      var request = db.transaction(["Summaries"], "readonly").objectStore("Summaries").get("ClearCacheMarker");
      var date;

      request.onsuccess = function (e) {
        if (typeof e.target.result == "undefined") {
          createSummary("ClearCacheMarker", "ClearCacheMarker");
        } else if (Date.now() - e.target.result.date > ClearCacheInterval) {
          console.log("Marker Reset");
          var request = db.transaction(["Summaries"], "readwrite").objectStore("Summaries").clear();

          request.onsuccess = function (e) {
            createSummary("ClearCacheMarker", "ClearCacheMarker");
            console.log("cache cleared");
          }
          request.onerror = function (e) {
            console.log("cache FAILED to clear: " + e);
          }
        }
      }

      request.onerror = function (e) {
        console.log("clearCache function: db.transaction call returned error: " + e);
      }

    }

    //Takes url and summarised article and adds it to the local cache database
    function createSummary(url, summary) {
      var summary = {
        reference: url,
        summary: summary,
        date: Date.now()
      };
      var request = db.transaction(["Summaries"], "readwrite").objectStore("Summaries").add(summary, url);

      request.onsuccess = function (e) {
        console.log("TLDR CREATE operation successful", e.target.result);
      }

      request.onerror = function (e) {
        console.log("TLDR CREATE operation failiure", e.target.error.name);
      }
    }

    //Returns summary object from the local cache database. if that fails, it calls on the backend API to return the summary
    function readSummary(div) {
      var url = div.attr("data-url");
      var request = db.transaction(["Summaries"], "readonly").objectStore("Summaries").get(url);
      var summary;

      request.onsuccess = function (e, summary) {
        if (typeof e.target.result == "undefined") {
          summary = SummaryAPI(url);
          createSummary(url, summary);
        } else {
          summary = e.target.result.summary;
        }
        var view = "<div><div>" + summary + "</div><div><a>Reddit TLDR V" + version + "</a> - <a>" + "Donate Here</a> - <a> Give Feedback <a></div></div>";
        div.find(".expando").html(view);
      }

      request.onerror = function (e) {
        console.log("readSummary function: db.transaction call returned error: " + e);
      }

    }

    //Deletes entry from local cache database
    function deleteSummary(url) {
      var request = db.transaction(["Summaries"], "readonly").objectStore("Summaries").delete(url);

      request.onsuccess = function (e) {
        console.log("TLDR DELETE operation successful", e.target.result);
      }

      request.onerror = function (e) {
        console.log("TLDR DELETE operation failiure", e.target.error.name);
      }
    }

    //Calls the Backend API to provide a summary for the given url
    function SummaryAPI(url) {
      var summary;
      $.ajax({
        type: "GET",
        data: {
          reference: url
        },
        url: apiURL,
        success: function (result) {
          summary = result.summary;
        },
        async: false
      });
      return summary;
    }

    //This step augments the Reddit page with our own TLDR buttons
    $(document).ready(function () {
      $('.thing.link').each(function () {
        if (!$(this).is(".self") && !$(this).find('p.title').next().is(".expando-button") && !$(this).find('p.title').next().is(".exp-button")) {
          $(this).find('p.title').after("<div class=\"exp-button TLDR collapsed\"></div>");
          $(this).find(".expando").html(defaultMsg);
          readSummary($(this));
        }
      });
    });

    //event handler to show summary content on TLDR button click
    $(".exp-button.TLDR").click(function () {
        if ($(this).hasClass("collapsed")) {
            $(this).siblings(".expando").attr('style', 'display: block');
            $(this).addClass("expanded");
            $(this).removeClass("collapsed");
          } else {
            $(this).siblings(".expando").attr('style', 'display: none');
            $(this).addClass("collapsed");
            $(this).removeClass("expanded");
          }
        });

      clearCache();

    }

    request.onerror = function (e) {
      console.log("TLDR DB initiallization failiure", e.target.error.name);
    }
