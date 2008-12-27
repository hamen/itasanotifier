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

  Ivan Morgillo < imorgillo [at] sanniolug [dot] org >
*/


// ----------------------------------------------------------------------

// GLOBAL DEFINITIONS
var timer ;
var pref_savedseriesarray;
var titles;
var statusbar;

/* Enable external scripts import */
const loader = Cc['@mozilla.org/moz/jssubscript-loader;1']
  .getService(Ci.mozIJSSubScriptLoader);

/* Initialize interfaces to manage prefs */
const pref = Components
  .classes["@mozilla.org/preferences-service;1"]
  .getService(Components.interfaces.nsIPrefService)
  .getBranch('extensions.itasanotifier.');
// ----------------------------------------------------------------------

function init() {
    dump("\nItasaNotifier XPCOM loaded\n");
    pref_savedseriesarray = eval(pref.getCharPref('seriesIWatch'));
   
    // Print the list of series you watch
    var i;
    dump("Series you watch:\n");
    for(i=0; i<pref_savedseriesarray.length; i++)
      {
	dump(pref_savedseriesarray[i] + "\n");	
      }
    
    getRSS();
}

function sayHello() {
  // Test method; just ignore it.
    Components
        .classes["@mozilla.org/embedcomp/prompt-service;1"]
        .getService(Components.interfaces.nsIPromptService)
        .alert(null, 'Greeting...', this._message);
}

function getRSS(){
  clearStatusBar();

  var count = 0;
  var previousFirstElement;
  
  // Event called periodically using the timer
  var event = { notify: function(timer) {
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
	    amIInterested(titles);
	  }
	}
	else  {
	  stopTimer();
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
	amIInterested(titles);
	
	// If successed, init the timer (timer is in milliseconds, i.e. 10 minutes)
	timer.initWithCallback(event,10*60*1000, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
      }
      else  
	dump("Error loading page\n");  
    }  
  };  
  req.send(null);
}

function amIInterested(titles){
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
	dump("Match found: " + pref_savedseriesarray[n] + " = " + titles[i].textContent + "\n");
	statusbar.tooltipText += titles[i].textContent + " | ";
      }
    }
  }
  
  if(check){
    statusbar.label = "ItasaNotifier: " + matches;
  }
}

function printElt(element, index, array) {
    dump("[" + index + "] is " + element +"\n"); // assumes print is already defined
}

function getStatusBar(){
  var wm = Components
    .classes["@mozilla.org/appshell/window-mediator;1"]
      .getService(Components.interfaces.nsIWindowMediator);
  // MEMO: Specifing navigator:browser Notify me won't work with Thunderbird
    win = wm.getMostRecentWindow("");
    var statusbar = win.document.getElementById('itasa-status-bar');
    if (statusbar)
      return statusbar;
}

function stopTimer(){
  timer.cancel();
  dump("Timer deleted\n");
  statusbar.label = "ItasaNotifier";
}

function clearStatusBar(){
  // Initializes statusbar
  statusbar = getStatusBar();
  statusbar.label = "ItasaNotifier";
}