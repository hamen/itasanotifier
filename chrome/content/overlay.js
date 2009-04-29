/*
  This file is part of 'ItasaNotifier'.

  'ItasaNotifier' is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License,
  or any later version.
  
  'ItasaNotifier' is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.
  
  You should have received a copy of the GNU General Public License
  along with 'ItasaNotifier'.  If not, see <http://www.gnu.org/licenses/>.

  Author: Ivan Morgillo < imorgillo [at] sanniolug [dot] org >
*/

// ----------------------------------------------------------------------
// GLOBAL DEFINITIONS
var timer;
var pref_savedseriesarray;
var titles;
var statusbar;
var readSubs = [];
var seriesNid = new Array();
var toDownload = [];
var seriesarray = [];
var matchingSeries = [];
var latest20subs;
var latest20subsNlinks;
var alreadyDownloaded = [];
var winAlreadyOpen;
var lastPopupLink;
var showPopup;

const url = "http://www.italiansubs.net/Abbonati-ai-feed-RSS/FRONTPAGE/";
const urlSubs = "http://www.italiansubs.net/Sottotitoli/";
/* Enable external scripts import */
//const loader = Cc['@mozilla.org/moz/jssubscript-loader;1']
//.getService(Ci.mozIJSSubScriptLoader);

/* Initialize interfaces to manage prefs */
const pref = Components
  .classes["@mozilla.org/preferences-service;1"]
  .getService(Components.interfaces.nsIPrefService)
  .getBranch('extensions.itasanotifier.');

const itasaProp = Components.classes["@mozilla.org/intl/stringbundle;1"]
  .getService(Components.interfaces.nsIStringBundleService)
  .createBundle("chrome://itasanotifier/locale/itasanotifier.properties");

const alertsService = Components.classes["@mozilla.org/alerts-service;1"]
                              .getService(Components.interfaces.nsIAlertsService);

// ----------------------------------------------------------------------


var itasanotifier = {
  onLoad: function() {
    // Add icon to toolbar on first install
    // Should be replaced with new function suggested by bard
    var firstInstall = eval(pref.getBoolPref('firstInstall'));
    if (firstInstall) {
      var toolbar = document.getElementById('nav-bar');
      addToolbarButton('itasanotifier-toolbar-button');
      pref.setBoolPref('firstInstall', false);
    }

    // initialization code
    this.initialized = true;
    this.strings = document.getElementById("itasanotifier-strings");
    document.getElementById("contentAreaContextMenu")
            .addEventListener("popupshowing", function(e) { this.showContextMenu(e); }, false);
    
    statusbar = document.getElementById('itasa-status-bar');
    
    pref_savedseriesarray = eval(pref.getCharPref('seriesIWatch'));
    
    var alreadyDownloaded = eval(pref.getCharPref('alreadyDownloaded'));
    if(alreadyDownloaded === undefined) showPopup = true;
    
    fetchRSS();
  },

  showContextMenu: function(event) {
    // show or hide the menuitem based on what the context menu is on
    // see http://kb.mozillazine.org/Adding_items_to_menus
    document.getElementById("context-itasanotifier").hidden = gContextMenu.onImage;
  },
  onMenuItemCommand: function(e) {
    // Opens Options Dialog
     window.openDialog("chrome://itasanotifier/content/preferences.xul");
  },
  onToolbarButtonCommand: function(e) {
    window.openDialog("chrome://itasanotifier/content/preferences.xul");
  },
  
  resetTooltip: function(e){
    var statusbar = document.getElementById('itasa-status-bar');
    statusbar.label = "ItasaNotifier";
  },
  aboutItasaNotifier: function(e){
    window.openDialog("chrome://itasanotifier/content/about.xul");
  },

  clearStatusBar: function(e){
    // Reset statusbar label and tooltip text
    statusbar.label = itasaProp.GetStringFromName("itasanotifier.title");

    statusbar.tooltipText = latest20subs;

    var itasaStatusPopupDownload = document.getElementById("itasa-status-popup-download");
    itasaStatusPopupDownload.disabled = true;
    readSubs[0] = true;
    
    pref.setCharPref('alreadyDownloaded', toDownload.toSource());
    alreadyDownloaded = eval(pref.getCharPref('alreadyDownloaded'));
    showPopup = false;
  },

  stopTimer: function(e){
    timer.cancel();
    dump("Timer deleted\n");
    statusbar.label = "ItasaNotifier";
    statusbar.tooltipText = itasaProp.GetStringFromName("itasanotifier.statusbar.updatesStopped");
  },

  showLatest20Subs: function(e){
    if(latest20subs) alert(latest20subs);
  },

  downloadSubs: function(e) {
    var i;
    for(i=0; i < toDownload.length; i++){
      gBrowser.addTab(toDownload[i].link);
      gBrowser.selectedTab = gBrowser.newTab;
      }
    this.clearStatusBar();
  }
};

// ON LOAD
window.addEventListener("load", function(e) {
    // Array Remove - By John Resig 
    Array.prototype.remove = function(from, to) {
      var rest = this.slice((to || from) + 1 || this.length);
      this.length = from < 0 ? this.length + from : from;
      return this.push.apply(this, rest);
    };
    
    // Load main object
    itasanotifier.onLoad(e);
	
  }, false);

function getList(){

  var req = new XMLHttpRequest();
  req.overrideMimeType('text/xml');
  req.open('GET', urlSubs, true);

  req.onreadystatechange = function (aEvt) {
     if (req.readyState == 4) {
      if(req.status == 200){
	//Print series page as html
	// I know this method sucks, but XML sent from server is wrong and XML parser fails
	var seriesTXTList = req.responseText;
	var re = new RegExp('("> ).+(</a>)', "g");

	var matches_array = seriesTXTList.match(re);
	  
	var series = new Array();
		
	var i;
	for(i=0; i < matches_array.length; i++){
	  var temp = matches_array[i].replace('"> ', "", "gi");
	  matches_array[i] = temp;
	  temp = matches_array[i].replace('</a>', "", "gi");
	  series[i]= temp;
	  seriesarray[i] = temp;
	}
      }
      else
	dump("Error loading page\n");
    }
  };
  req.send(null); 
}




function modifyToolbarButtons(modifier) {
    var toolbar =
        document.getElementById('nav-bar') ||
        document.getElementById('mail-bar') ||
        document.getElementById('mail-bar2');

    if(!toolbar)
        return;

    if(toolbar.getAttribute('customizable') == 'true') {
        var newSet = modifier(toolbar.currentSet);
        if(!newSet)
            return;

        toolbar.currentSet = newSet;
        toolbar.setAttribute('currentset', toolbar.currentSet);
        toolbar.ownerDocument.persist(toolbar.id, 'currentset');
        try { BrowserToolboxCustomizeDone(true); } catch (e) {}
    }
}

function addToolbarButton(buttonId) {
    modifyToolbarButtons(function(set) {
        if(set.indexOf(buttonId) == -1)
            return set.replace(/(urlbar-container|separator)/,
                               buttonId + ',$1');
    });
}

// Create a purged list of series to show in tooltip
// based on which series has been marked as already
// read in a previous session
function purgeList(currentSeries){
  alreadyDownloaded = eval(pref.getCharPref('alreadyDownloaded'));
  
  var newSeries = [];
  if (alreadyDownloaded === "" || alreadyDownloaded === undefined) return currentSeries;
  else if (alreadyDownloaded.toSource() === currentSeries.toSource()) {
    return newSeries;
  }

  var i, n;
  for (i = 0; i < alreadyDownloaded.length; i++){
    for (n = 0; n < currentSeries.length; n++){
      
      if(currentSeries[n].title.indexOf(alreadyDownloaded[i].title))
	 currentSeries[n].title == "alreadyDownloaded";
    }
  }

  currentSeries.forEach(function(item){
      if(item.title != "alreadyDownloaded") newSeries.push(item);
    });
  
  pref.setCharPref('alreadyDownloaded', newSeries.toSource());    
  return newSeries;
}

function setTB_label_tooltip(l20s_a, check, matches, tt){
  // Create toolbar label and tooltip
  var latest20subs = "\n" + itasaProp.GetStringFromName("itasanotifier.statusbar.latest20subs") + "\n";
  for(i=0; i < l20s_a.length; i++){
    latest20subs += l20s_a[i].title + "\n";
  }
  
  // CHECK THIS FUNCTION
  // CHECK tt
  tt = purgeList(tt);

  var i, tt2str = "";
  for(i=0; i < tt.length; i++){
    tt2str += tt[i].title + "\n";
  }

  matches = tt.length;
  if(check){
    var itasaStatusPopupDownload = document.getElementById("itasa-status-popup-download");
    itasaStatusPopupDownload.disabled = false;
    getList();
  }
    
  // MANY SUBS
  if(check && matches > 1){
    // label looks like: There are N new subs
    var label = itasaProp.GetStringFromName("itasanotifier.statusbar.thereAre") + " " +
      + matches
      + " "
      + itasaProp.GetStringFromName("itasanotifier.statusbar.newSubs");

    // tooltip look like: New subs: <series list>
    var tooltip = itasaProp.GetStringFromName("itasanotifier.statusbar.yourSubs")+ "\n" + tt2str;

    statusbar.label = label;
    statusbar.tooltipText = tooltip;
  }
  // JUST ONE SUB
  else if(check && matches==1){

    var label = itasaProp.GetStringFromName("itasanotifier.statusbar.thereIs1Sub");
    var tooltip = itasaProp.GetStringFromName("itasanotifier.statusbar.yourSub") + "\n" + tt2str;

    statusbar.label = label;
    statusbar.tooltipText = tooltip;
  }
  // NO SUBS
  else {
    statusbar.tooltipText = "";
  }
}

function fetchRSS(){
  var count = 0;
  var previousFirstElement;

  // First call after Firefox launch
  getDataFrom(url, amIInterested, function(status) {
      // report error
    }, "titles+links");

  // Event called periodically using the timer
  var event
    = { notify: function(timer){
      periodicallyFetch(timer); 
    } }

  // creates the timer
  timer = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
  timer.initWithCallback(event,10*60*1000, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
}

function periodicallyFetch(timer){
  getDataFrom(url, amIInterested, function(status) {
      // report error
    }, "titles+links");
}

function amIInterested(nodes){

  //  nodes.forEach(function(item){dump(item.toSource());});

  pref_savedseriesarray = eval(pref.getCharPref('seriesIWatch'));
  var check = false;
  statusbar.tooltipText= "";

  var tooltip = [];
  var i, n, matches = 0;
  var latest20subs_array = [];

  var readSubs = [];
  readSubs[0] = false;
  
  toDownload = [];

  // compares series you watch (saved in pref_savedseriesarray) against
  // latest 20 subs (titles)
  // and creates matchingSeries array
  for(n=0; n < pref_savedseriesarray.length; n++){
    for(i=0; i < nodes.length; i++){
      if(nodes[i].title.indexOf(pref_savedseriesarray[n]) != -1){
	check = true;
	matches++;
	matchingSeries.push(nodes[i]);
	dump("Match found: " + pref_savedseriesarray[n] + " matches " + nodes[i].title + "\n");
	tooltip.push(nodes[i]);
	toDownload.push(nodes[i]);
      }
    }
  }
  
  var listener = {
  observe: function(subject, topic, data) {
      if(topic === "alertclickcallback"){
	//var win = window.open(data, "Last sub", "width=800,height=600,scrollbars=no,menubar=no" );
	gBrowser.addTab(data);
	gBrowser.selectedTab = gBrowser.newTab;
	itasanotifier.clearStatusBar();
      }
      else if (topic === "alertfinished") lastPopupLink = data;
    }
  }
  
  if (showPopup === true && toDownload.length != "0" && toDownload[toDownload.length - 1].link !== lastPopupLink){
    
    var lastTitle = toDownload[toDownload.length - 1].title;
    var lastLink = toDownload[toDownload.length - 1].link; 
    alertsService.showAlertNotification("chrome://mozapps/skin/downloads/downloadIcon.png", 
					itasaProp.GetStringFromName("itasanotifier.statusbar.yourSub"), lastTitle, true, lastLink , listener);
    lastPopupLink = toDownload[toDownload.length - 1].link;
  }

  setTB_label_tooltip(matchingSeries, check, matches, tooltip );
}

function getDataFrom(url, onRetrieve, onError, tag){
    var req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
      .createInstance(Components.interfaces.nsIXMLHttpRequest);
    req.open("GET", url, true);
    
    req.onreadystatechange = function (aEvt) {
      if (req.readyState == 4) {
	if(req.status == 200){
	  var i, n;
	  var nodeList = [];
	  var l20Subs = itasaProp.GetStringFromName("itasanotifier.statusbar.latest20subs") + "\n";
	  
	  switch(tag){
	  case "titles":
	  var nodes = req.responseXML.getElementsByTagName("title");
	  for(i=1; i< nodes.length; i++){
	    nodeList.push(nodes[i].textContent);
	  }
	  
	  var l20Subs = itasaProp.GetStringFromName("itasanotifier.statusbar.latest20subs") + "\n";
	  for(i=1; i < nodes.length; i++){
	    l20Subs += nodes[i].textContent + "\n";
	  }
	  latest20subs = l20Subs;
	  break;
	  
	  case "links":
	  var nodes = req.responseXML.getElementsByTagName("link");
	  for(i=1; i < nodes.length; i++){
	    nodeList.push(nodes[i].textContent);
	  }
	  break;

	  case "titles+links":
	  var titles = req.responseXML.getElementsByTagName("title");
	  var links = req.responseXML.getElementsByTagName("link");

	  if(links.length == titles.length){
	    for(i=1, n=0; i < titles.length; i++, n++){
	     nodeList.push({
	       title: titles[i].textContent,
	       link: links[i].textContent});
	     l20Subs += titles[i].textContent + "\n";
	    }
	
	    latest20subs = l20Subs;
	    latest20subsNlinks = nodeList;
	  }
	  else alert("lengths mismatch");
	  break;

	  default:
	  var nodes = req.responseXML.getElementsByTagName("title");
	  }

	  onRetrieve(nodeList);
	}
	else
	  onError(req.status);
      }
        else
	  onError();
    }
    req.send(null);
}

function FillInHTMLTooltip(tipElement)
{
  var retVal = false;
  if (tipElement.namespaceURI == "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul")
    return retVal;

  const XLinkNS = "http://www.w3.org/1999/xlink";


  var titleText = null;
  var XLinkTitleText = null;
  var direction = tipElement.ownerDocument.dir;

  while (!titleText && !XLinkTitleText && tipElement) {
    if (tipElement.nodeType == Node.ELEMENT_NODE) {
      titleText = tipElement.getAttribute("title");
      XLinkTitleText = tipElement.getAttributeNS(XLinkNS, "title");
      var defView = tipElement.ownerDocument.defaultView;
      // XXX Work around bug 350679:
      // "Tooltips can be fired in documents with no view".
      if (!defView)
        return retVal;
      direction = defView.getComputedStyle(tipElement, "")
        .getPropertyValue("direction");
    }
    tipElement = tipElement.parentNode;
  }

  var tipNode = document.getElementById("aHTMLTooltip");
  tipNode.style.direction = direction;
  
  for each (var t in [titleText, XLinkTitleText]) {
    if (t && t.replace && /\S/.test(t)) {

      // Per HTML 4.01 6.2 (CDATA section), literal CRs and tabs should be
      // replaced with spaces, and LFs should be removed entirely.
      // XXX Bug 322270: We don't preserve the result of entities like &#13;,
      // which should result in a line break in the tooltip, because we can't
      // distinguish that from a literal character in the source by this point.
      t = t.replace(/[\r\t]/g, ' ');
      t = t.replace(/\n/g, '');

      tipNode.setAttribute("label", t);
      retVal = true;
    }
  }

  return retVal;
}