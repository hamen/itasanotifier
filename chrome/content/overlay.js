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
var latest20subs;
var readSubs = [];
var seriesNid = new Array();
var toDownload = [];
var seriesarray = [];
var lastSub;

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
// ----------------------------------------------------------------------


var itasanotifier = {
  onLoad: function() {
    // Add icon to toolbar on first install
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
    
    // loads seriesIWatch from preferences
    pref_savedseriesarray = eval(pref.getCharPref('seriesIWatch'));
        
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
    // Mark all subs as read
    statusbar.label = itasaProp.GetStringFromName("itasanotifier.title");
    statusbar.tooltipText = latest20subs;
    var itasaStatusPopupDownload = document.getElementById("itasa-status-popup-download");
    itasaStatusPopupDownload.disabled = true;
    readSubs[0] = true;

    var areRead = eval(pref.getBoolPref('areRead'));
    // alert("clearStatusBar: " + areRead);
    if (!areRead) pref.setBoolPref('areRead', true);
    
    pref.setCharPref('lastSub', lastSub.toSource());
  },

  amIInterested: function(e){
    pref_savedseriesarray = eval(pref.getCharPref('seriesIWatch'));
    var check = false;
    statusbar.tooltipText= "";

    
    var i, n, matches = 0;
    for(n=0; n<pref_savedseriesarray.length; n++){
      for(i=2; i<titles.length; i++){
	if(titles[i].textContent.indexOf(pref_savedseriesarray[n]) != -1){

	  check = true;
	  matches++;
	  if(readSubs[0] == false){
	    readSubs[i] = titles[i].textContent;
	    dump("Match found: " + pref_savedseriesarray[n] + " matches " + titles[i].textContent + "\n");
	    statusbar.tooltipText += titles[i].textContent + "\n";
	    toDownload.push(pref_savedseriesarray[n]);
	    
	    // lastSub comparing avoid reshowing already read subs
	    lastSub = titles[i].textContent;
	  }
	  else statusbar.tooltipText= "";
	}
      }
    }
    
    latest20subs = "\n" + itasaProp.GetStringFromName("itasanotifier.statusbar.latest20subs") + "\n";
    for(i=1; i<titles.length; i++){
      latest20subs += titles[i].textContent + "\n";
    }

    if(readSubs[0] == false){
      if(check){
	var itasaStatusPopupDownload = document.getElementById("itasa-status-popup-download");
	itasaStatusPopupDownload.disabled = false;
	getList();
      }
    
      // MANY SUBS
      if(check && matches>1){
	var label = itasaProp.GetStringFromName("itasanotifier.statusbar.thereAre") + " " +
	+ matches
	+ " "
	+ itasaProp.GetStringFromName("itasanotifier.statusbar.newSubs");

	var tooltip = itasaProp.GetStringFromName("itasanotifier.statusbar.yourSubs")+ "\n" + statusbar.tooltipText;
	
	var compare = eval(pref.getCharPref("lastSub"));
	if(tooltip.indexOf(compare) == -1){
	  setStatusbar(label, tooltip);
	}

      }
      // JUST ONE SUB
      else if(check && matches==1){

	var label = itasaProp.GetStringFromName("itasanotifier.statusbar.thereIs1Sub");
	var tooltip = itasaProp.GetStringFromName("itasanotifier.statusbar.yourSub") + "\n" + statusbar.tooltipText;
	
	var compare = eval(pref.getCharPref("lastSub"));
	if(tooltip.indexOf(compare) == -1){
	  setStatusbar(label, tooltip);
	}
      }
      // NO SUBS
      else {
	getLatest20Subs();
	statusbar.tooltipText = latest20subs;
      }
    }
    else {
      getLatest20Subs();
      statusbar.tooltipText = latest20subs;
    }
  },

  stopTimer: function(e){
    timer.cancel();
    dump("Timer deleted\n");
    statusbar.label = "ItasaNotifier";
    statusbar.tooltipText = itasaProp.GetStringFromName("itasanotifier.statusbar.updatesStopped");
  },



  showLatest20Subs: function(e){
    getLatest20Subs();
    if(latest20subs) alert(latest20subs);
  },

  downloadSubs: function(e){
    var i, n, url;
    for(n=0; n<toDownload.length; n++){
      toDownload[n] = toDownload[n].replace(' ', "-", "gi");
      toDownload[n] = toDownload[n].replace('\'', "-", "gi");
      //      alert("toDownload: " + toDownload[n] + "and n is: " + n);
      url = "http://www.italiansubs.net/Sottotitoli/" + toDownload[n];
      window.open(url, null);

      /*
      for(i=2; i< seriesarray.length; i++){
	if(seriesarray.indexOf(toDownload[n]) != -1){
	  //url = "http://www.italiansubs.net/index.php?option=com_remository&Itemid=27&func=select&id=" + seriesNid[i].id;
	
	  //alert("url is: " + url);
	  //window.open(url, null);
	  }*/
      }
    }
  //alert("fixing it");
};

// ON LOAD
window.addEventListener("load", function(e) {
    itasanotifier.onLoad(e);
	
  }, false);


function sayHello(msg){
  alert("Message is: " + msg);
}

// Gets latest 20 subs released
function getLatest20Subs(){
  var l20Subs;

   // URL rss feed
   //var url = "http://www.italiansubs.net/index2.php?option=com_rss";
  
   var req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
     .createInstance(Components.interfaces.nsIXMLHttpRequest);
   req.open("GET", url, true);

   req.onreadystatechange = function (aEvt) {  
     if (req.readyState == 4) {  
       if(req.status == 200) {
	 // Gets XML RSS Feed and creates an array of TV Series Titles 
	 var xmldoc = req.responseXML;
	 titles = xmldoc.getElementsByTagName("title");
	 var i;

	 // Print titles list for the first time
	 
	 dump("\nManual Print" + "\n");
	 for(i=1; i<titles.length; i++){
	   dump(titles[i].textContent + "\n");
	 }
	 dump("Manual Print" + "\n");
	 

	 l20Subs = itasaProp.GetStringFromName("itasanotifier.statusbar.latest20subs") + "\n";

	 for(i=1; i<titles.length; i++){
	   l20Subs += titles[i].textContent + "\n";
	 }
	 latest20subs = l20Subs;
       }
       else  
	 dump("Error loading page\n Req status:" + req.status + "and url: " + url);  
     }  
   };  
   req.send(null);
}

// Gets an array of objects: series id, series name
/*
function getNamesNIds(){
  //  var url = 'http://www.italiansubs.net/index.php?option=com_remository&Itemid=27';
  //  var url = "http://www.italiansubs.net/Abbonati-ai-feed-RSS/FRONTPAGE/";

  var req = new XMLHttpRequest();
  req.overrideMimeType('text/xml');
  req.open('GET', url, true); // 3rd argument, true, marks this as async 
    
   req.onreadystatechange = function (aEvt) {
     if (req.readyState == 4) {
      if(req.status == 200){
	var seriesTXTList = req.responseText;
	var re = new RegExp('("> ).+(</a>)', "g");

	var matches_array = seriesTXTList.match(re);
	  
	var series = new Array();
		
	var i;
	// Creates a new array of objects "series": seriesName, seriesId
	
	re = new RegExp('(&amp;id).+(</a>)', "g");
	matches_array = seriesTXTList.match(re);
	// matches_array if full of stuff like this: &amp;id=5"> 24</a></a>

	for(i=2; i < matches_array.length; i++){
	  var temp = matches_array[i].replace('&amp;id=', "", "gi"); // 5"> 24</a></a>
	  matches_array[i] = temp;
	  temp = matches_array[i].replace('</a>', "", "gi"); // 5"> 24
	  matches_array[i] = temp;
	  temp = matches_array[i].replace('">', "", "gi"); // 5 24
	  matches_array[i] = temp;
	  
	  var seriesObj = {
	  id: matches_array[i].substring(0, matches_array[i].indexOf(' ')),
	  name: matches_array[i].substring(matches_array[i].indexOf(' ') , matches_array[i].length)
	  };
	  	  
	  seriesNid[i] = seriesObj;
	}
      }
      else
	dump("Error loading page\n");
    }
   };
  req.send(null); 
}
*/
function getList(){


  var req = new XMLHttpRequest();
  req.overrideMimeType('text/xml');
  req.open('GET', urlSubs, true); /* 3rd argument, true, marks this as async */
    
  // defines a function on the fly (called "anonymous function")
  req.onreadystatechange = function (aEvt) {
     if (req.readyState == 4) {
      if(req.status == 200){
	//Print series page as html
	//dump(req.responseText);
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
	  //dump(seriesarray[i] + "\n");
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

function setStatusbar(label, tooltip){

  statusbar.label = label;
  statusbar.tooltip = tooltip;
  
}