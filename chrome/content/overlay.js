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
var timer ;
var pref_savedseriesarray;
var titles;
var statusbar;
var latest20subs;

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
    // initialization code
    this.initialized = true;
    this.strings = document.getElementById("itasanotifier-strings");
    document.getElementById("contentAreaContextMenu")
            .addEventListener("popupshowing", function(e) { this.showContextMenu(e); }, false);
    
    pref_savedseriesarray = eval(pref.getCharPref('seriesIWatch'));
    statusbar = document.getElementById('itasa-status-bar');

    // Print the list of series you watch 
    /*
    var i;
    dump("Series you watch:\n");
    for(i=0; i<pref_savedseriesarray.length; i++)
      {
	dump(pref_savedseriesarray[i] + "\n");	
      }
    */
    this.getRSS();
  },

  showContextMenu: function(event) {
    // show or hide the menuitem based on what the context menu is on
    // see http://kb.mozillazine.org/Adding_items_to_menus
    document.getElementById("context-itasanotifier").hidden = gContextMenu.onImage;
  },
  onMenuItemCommand: function(e) {
    // Opens Options Dialog
     window.openDialog("chrome://itasanotifier/content/preferences.xul");
    
    
    //window.open("http://www.italiansubs.net/index.php?option=com_remository&Itemid=27", null);
    /*
    var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                                  .getService(Components.interfaces.nsIPromptService);
    promptService.alert(window, this.strings.getString("helloMessageTitle"),
                              this.strings.getString("helloMessage"));
    */
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
  
  getRSS: function(e){
    //this.clearStatusBar();

    var count = 0;
    var previousFirstElement;
  
    // Event called periodically using the timer
    var event = { notify: function(timer) {
	// Reset previous tooltipText
	//	statusbar.tooltipText= "";

	req.open("GET", url, true);
	req.onreadystatechange = function (aEvt) {  
	  if (req.readyState == 4) {  
	    if(req.status == 200) {
	      var xmldoc = req.responseXML;
	      var titles = xmldoc.getElementsByTagName("title");

	      if(titles[2].textContent != previousFirstElement){
		previousFirstElement = titles[2].textContent;
	    
		var i;
		count++;
		dump("\nPrint #" + count +"\n");
		for(i=2; i<titles.length; i++){
		  dump(titles[i].textContent + "\n");
		}
		dump("Print #" + count +"\n");

		// Check if there are series I watch
		itasanotifier.amIInterested();
	      }
	    }
	    else  {
	      this.stopTimer();
	    }
	  }  
	};  
	req.send(null);
      }
    }
  
    // Create the timer
    timer = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
  
    // URL rss feed
    var url = "http://www.italiansubs.net/index2.php?option=com_rss";
    
    var req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
    .createInstance(Components.interfaces.nsIXMLHttpRequest);
    req.open("GET", url, true);
        
    req.onreadystatechange = function (aEvt) {  
      if (req.readyState == 4) {  
	if(req.status == 200) {
	  // Gets XML RSS Feed and creates an array of TV Series Titles 
	  var xmldoc = req.responseXML;
	  titles = xmldoc.getElementsByTagName("title");

	  // Saves array first element to compare it after and avoid reprint the list
	  previousFirstElement = titles[2].textContent;
	 
	  // Print titles list for the first time
	  var i;
	  count++;
	  dump("\nPrint #" + count +"\n");
	  for(i=2; i<titles.length; i++){
	    dump(titles[i].textContent + "\n");
	  }
	  dump("Print #" + count +"\n");

	  // Check if there are series I watch
	  itasanotifier.amIInterested();
	
	  // If successed, init the timer (timer is in milliseconds, i.e. 10 minutes)
	  timer.initWithCallback(event,10*60*1000, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
	}
	else  
	  dump("Error loading page\n");  
      }  
    };  
    req.send(null);
  },

  clearStatusBar: function(e){
    statusbar.label = itasaProp.GetStringFromName("itasanotifier.title");
    statusbar.tooltipText = latest20subs;
    var itasaStatusPopupDownload = document.getElementById("itasa-status-popup-download");
      itasaStatusPopupDownload.disabled = true;
  },

  amIInterested: function(e){
    pref_savedseriesarray = eval(pref.getCharPref('seriesIWatch'));
    //pref_savedseriesarray.forEach(printElt);
    var check = false;
    
    var i, n, matches = 0;
    for(n=0; n<pref_savedseriesarray.length; n++){
      for(i=2; i<titles.length; i++){
	//dump(pref_savedseriesarray[n] + " is equal to " + titles[i].textContent +"?\n");
	if(titles[i].textContent.indexOf(pref_savedseriesarray[n]) != -1){

	  check = true;
	  matches++;
	  statusbar.tooltipText= "";

	  dump("Match found: " + pref_savedseriesarray[n] + " = " + titles[i].textContent + "\n");
	  statusbar.tooltipText += titles[i].textContent + " | ";
	}
      }
    }
  
    latest20subs = "\n" + itasaProp.GetStringFromName("itasanotifier.statusbar.latest20subs") + "\n";
    for(i=2; i<titles.length; i++){
      latest20subs += titles[i].textContent + "\n";
    }

    if(check){
      var itasaStatusPopupDownload = document.getElementById("itasa-status-popup-download");
      itasaStatusPopupDownload.disabled = false;
    }
    
    if(check && matches>1){
      statusbar.label = itasaProp.GetStringFromName("itasanotifier.statusbar.thereAre") 
      + matches 
      + itasaProp.GetStringFromName("itasanotifier.statusbar.newSubs");
      statusbar.tooltipText = itasaProp.GetStringFromName("itasanotifier.statusbar.yourSubs")+ " " + statusbar.tooltipText + "\n" + latest20subs;
    }
    else if(check && matches==1){
      statusbar.label = itasaProp.GetStringFromName("itasanotifier.statusbar.thereIs1Sub");
      statusbar.tooltipText = itasaProp.GetStringFromName("itasanotifier.statusbar.yourSub")+ " " + statusbar.tooltipText + "\n" + latest20subs;
    }
    
    else {
      statusbar.tooltipText = latest20subs;
    }
  },

  stopTimer: function(e){
    timer.cancel();
    dump("Timer deleted\n");
    statusbar.label = "ItasaNotifier";
    statusbar.tooltipText = itasaProp.GetStringFromName("itasanotifier.statusbar.updatesStopped");
  },
  
  // Gets latest 20 subs released
  /*  getLatest20Subs: function(e){
    var t;
    var url = "http://www.italiansubs.net/index2.php?option=com_rss";
    
    var req = Components.
    classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
    .createInstance(Components.interfaces.nsIXMLHttpRequest);

    req.open("GET", url, true);
        
    req.onreadystatechange = function (aEvt) {  
      if (req.readyState == 4) {  
	if(req.status == 200) {
	  // Gets XML RSS Feed and creates an array of TV Series Titles 
	  var xmldoc = req.responseXML;
	  t = xmldoc.getElementsByTagName("title");
	}
	else  
	  dump("Error loading page\n");  
      }  
    };  
    req.send(null);
    return t;
  },
  */
  
  showLatest20Subs: function(e){
    alert(latest20subs);
  },
  
  downloadSubs: function(e){
    window.open("http://www.italiansubs.net/index.php?option=com_remository&Itemid=27", null);
  }

};

window.addEventListener("load", function(e) {
    /*  
    try {
      Components
	.classes['@hamen.org/itasanotifier/service;1']
	.getService(Components.interfaces.nsIItasaNotifier);

    } catch(exp) {
      Components.utils.reportError(exp); // report the error and continue execution
    }
    */

    itasanotifier.onLoad(e);
	
  }, false);

