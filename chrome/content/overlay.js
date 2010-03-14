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

var itasanotifier = {
    loader : Cc['@mozilla.org/moz/jssubscript-loader;1'].getService(Ci.mozIJSSubScriptLoader),
    utils : {},
    
    url: 'http://www.italiansubs.net/index.php?option=com_rsssub&type=lastsub',
    urlSubs: 'http://www.italiansubs.net/index.php?option=com_remository&Itemid=9',
    pref: Components
	.classes["@mozilla.org/preferences-service;1"]
	.getService(Components.interfaces.nsIPrefService)
	.getBranch('extensions.itasanotifier.'),
    itasaProp: Components
	.classes["@mozilla.org/intl/stringbundle;1"]
	.getService(Components.interfaces.nsIStringBundleService)
	.createBundle("chrome://itasanotifier/locale/itasanotifier.properties"),
    alertsService: Components
	.classes["@mozilla.org/alerts-service;1"]
	.getService(Components.interfaces.nsIAlertsService),

    alreadyDownloaded: [],
    lastPopupLink: '',
    latest20subs: '',
    latest20subsNlinks: '',
    matchingSeries: [],
    pref_savedseriesarray: '',
    readSubs: [],
    seriesarray: [],
    seriesNid: new Array(),
    showPopup: '',
    statusbar: '',
    timer: '',
    titles: '',
    toDownload: [],
    winAlreadyOpen: '',
    
    addToolbarButton: function (buttonId) {
	this.modifyToolbarButtons(function(set) {
				      if(set.indexOf(buttonId) == -1) {
					  return set.replace(/(urlbar-container|separator)/,
							     buttonId + ',$1');
				      }
				      else {
					  return null;
				      }
				  });
    },
    
    modifyToolbarButtons: function (modifier) {
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
    },
    
    periodicallyFetch: function (timer) {
	this.getDataFrom(itasanotifier.url, this.amIInterested, function(status) {
	    // report error
	}, "titles+links");
    },
    
    amIInterested: function(nodes) {
	
	try {
	    itasanotifier.pref_savedseriesarray 
		= itasanotifier.utils.getJSON().parse(itasanotifier.pref.getCharPref('seriesIWatch'));
	}
	catch (e) {
	    dump("Error message is: " + e.message + " (amIInterested:69)\n");
	    dump("Resetting seriesIWatch\n");
	    itasanotifier.pref.setCharPref('seriesIWatch', "empty");
	}
	
	var check = false;
	this.statusbar.tooltipText= "";

	var tooltip = [];
	var i, n, matches = 0;
	var latest20subs_array = [];

	var readSubs = [];
	readSubs[0] = false;
	
	this.toDownload = [];
	
	var tvseries = {
	    title: '',
	    format: ''
	};
	
	function formatMatch(tvseries, node){
	    if (node.title.indexOf(tvseries.format) != "-1") return true;
	};

	// compares series you watch (saved in pref_savedseriesarray) against
	// latest 20 subs (nodes)
	// and creates matchingSeries array
	try{
	    for(n=0; n < itasanotifier.pref_savedseriesarray.length; n++){
		if (itasanotifier.pref_savedseriesarray[n].title.indexOf("C.S.I") == 0){
		    itasanotifier.pref_savedseriesarray[n]
			= itasanotifier.pref_savedseriesarray[n].title.replace(/C.S.I./i, "CSI:");
		}
		for(i=0; i < nodes.length; i++){
		    /*
		    dump("itasanotifier.pref_savedseriesarray is: " 
			+ itasanotifier.pref_savedseriesarray[n].toSource() 
			+ "node is: " + nodes[i].toSource() + "\n");
		    */
		    if(nodes[i].title.indexOf(itasanotifier.pref_savedseriesarray[n].title) == 0){
			// Special check for House mismatching issue
			if (itasanotifier.pref_savedseriesarray[n].title 
			    === "House" && nodes[i].title.indexOf("Saddam") != -1 ){
			}
			// Special check for Heroes mismatching issue
			else if (itasanotifier.pref_savedseriesarray[n].title 
				 === "Heroes" && nodes[i].title.indexOf("Novel") != -1 ){
			}
			// Special check for NCIS and NCIS L.A.
			else if (itasanotifier.pref_savedseriesarray[n].title 
				 === "NCIS" && nodes[i].title.indexOf("Angeles") != -1){
			}
			else{
			    var regexBluray = /(Bluray)/;
			    var regex720p = /(720p)/;
			    var regexDVDRip = /(DVDRip)/;
			    var regexHR = /(HR)/;

			    function rssFormat() {
				var format = '';

				var match = nodes[i].title.search(/(720p)/);
				if (match != -1)
				    format = "720p";
				
				var match = nodes[i].title.search(/(Bluray)/);
				if (match != -1)
				    format = "Bluray";
				
				var match = nodes[i].title.search(/(DVDRip)/);
				if (match != -1)
				    format = "DVDRip";

				var match = nodes[i].title.search(/(HR)/);
				if (match != -1)
				    format = "HR";
				
				if (format === '') format = "HDTV";
				
				return format;
			    }
			    
			    nodes[i].format = rssFormat();
			    			    
			    if (nodes[i].format === itasanotifier.pref_savedseriesarray[n].format)
			    {
				check = true;
				matches++;
				itasanotifier.matchingSeries.push(nodes[i]);
				dump("Match found: " + itasanotifier.pref_savedseriesarray[n].title +
				     " matches " + nodes[i].title + "\n");
				tooltip.push(nodes[i]);
				toDownload.push(nodes[i]);
				
			    }
			    
			}
		    }
		}
	    }
	}
	catch (e){
	    dump("error name is: " + e.name + " and error message is: " + e.message + " (amIInterested:112)\n");
	    // Old list format: reset list. Advise user "he/she can select tvseries format now!".
	    itasanotifier.pref.setCharPref('seriesIWatch', "empty");
	    alert(inp.itasaProp.GetStringFromName("itasanotifier.noseries"));
	}
	
	itasanotifier.setTB_label_tooltip(itasanotifier.matchingSeries, check, matches, tooltip );
    },
    
    fetchRSS: function() {
	dump("Start fetching\n");
	var count = 0;
	var previousFirstElement;

	// First call after Firefox launch
	this.getDataFrom(itasanotifier.url, this.amIInterested, function(status) {
	    // report error
	}, "titles+links");

	// Event called periodically using the timer
	var event
	    = { notify: function(timer){
		    itasanotifier.periodicallyFetch(timer); 
		}
	      };
	
	// creates the timer
	this.timer = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
	this.timer.initWithCallback(event,10*60*1000, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
    },
    
    onLoad: function() {
	itasanotifier.loader.loadSubScript('chrome://itasanotifier/content/util_impl.js', itasanotifier.utils);
	
	// Add icon to toolbar on first install
	// Should be replaced with new function suggested by bard
	
	var firstInstall = itasanotifier.utils.getJSON().parse(itasanotifier.pref.getBoolPref('firstInstall'));
	if (firstInstall) {
	    var toolbar = document.getElementById('nav-bar');
	    itasanotifier.addToolbarButton('itasanotifier-toolbar-button');
	    itasanotifier.pref.setBoolPref('firstInstall', false);
	}

	// initialization code
	this.initialized = true;
	this.strings = document.getElementById("itasanotifier-strings");
	document.getElementById("contentAreaContextMenu")
	    .addEventListener("popupshowing", function(e) { itasanotifier.showContextMenu(e); }, false);
	
	this.statusbar = document.getElementById('itasa-status-bar');

	var alreadyDownloaded;

	try{
	    itasanotifier.pref_savedseriesarray = 
		itasanotifier.utils.getJSON().
		parse(itasanotifier.pref.getCharPref('seriesIWatch'));
	    	    
	}
	catch (e) {
	    dump(itasanotifier.itasaProp.GetStringFromName("itasanotifier.noseries") 
		 + "\n itasanotifier.pref_savedseriesarray is: " + itasanotifier.pref_savedseriesarray 
		 + "\nLine is 183\n");
	}
	
	try {
	    alreadyDownloaded = itasanotifier.utils.getJSON().parse(itasanotifier.pref.getCharPref('alreadyDownloaded'));
	}
	catch (e)
	{
	    try {
		var rawSeries = itasanotifier.pref.getCharPref('seriesIWatch');
		var rawAlready = itasanotifier.pref.getCharPref('alreadyDownloaded');
		/* alert ("error name is: " + e.name
				   + " and error message is: " + e.message
				   		   + "\nLine is: 170 \nSeriesRAW is: "
						   		   + rawSeries + "\nAlreadyDownloadedRAW is: " + rawAlready);
								   		   */
		
		// Cannot handle old non-json alreadyDownloaded list
		// Reset it
		alreadyDownloaded = "[]";
	    }
	    catch (e) {
		itasanotifier.pref.setCharPref('seriesIWatch', "");
		itasanotifier.pref.setCharPref('alreadyDownloaded', "");
	    }
	}
	
	if(alreadyDownloaded === undefined || alreadyDownloaded === "[]" || alreadyDownloaded == "")
	    itasanotifier.showPopup = true;
	
	itasanotifier.fetchRSS();
    },

    showContextMenu: function(event) {
	// show or hide the menuitem based on what the context menu is on
	// see http://kb.mozillazine.org/Adding_items_to_menus
	//document.getElementById("context-itasanotifier").hidden = gContextMenu.onImage;
    },
    onMenuItemCommand: function(e) {
	// Opens Options Dialog
	window.openDialog("chrome://itasanotifier/content/preferences.xul");
    },
    onToolbarButtonCommand: function(e) {
	window.openDialog("chrome://itasanotifier/content/preferences.xul");
    },
    
    resetTooltip: function(e) {
	var statusbar = document.getElementById('itasa-status-bar');
	statusbar.label = "ItasaNotifier";
    },
    aboutItasaNotifier: function(e){
	window.openDialog("chrome://itasanotifier/content/about.xul");
    },

    clearStatusBar: function(e) {
	// Reset statusbar label and tooltip text
	this.statusbar.label = itasanotifier.itasaProp.GetStringFromName("itasanotifier.title");
	this.statusbar.tooltipText = itasanotifier.latest20subs;

	// Disable "Go to download page" menu item
	var itasaStatusPopupDownload = document.getElementById("itasa-status-popup-download");
	itasaStatusPopupDownload.disabled = true;
	itasanotifier.readSubs[0] = true;
	
	var toDownloadJSON = itasanotifier.utils.getJSON().stringify(toDownload);
	itasanotifier.pref.setCharPref('alreadyDownloaded', toDownloadJSON);
	
	itasanotifier.alreadyDownloaded = itasanotifier.utils.getJSON().parse(itasanotifier.pref.getCharPref('alreadyDownloaded'));
	itasanotifier.showPopup = false;
    },

    stopTimer: function(e) {
	this.timer.cancel();
	dump("Timer deleted\n");
	this.statusbar.label = "ItasaNotifier";
	this.statusbar.tooltipText = itasanotifier.itasaProp.GetStringFromName("itasanotifier.statusbar.updatesStopped");
    },

    showLatest20Subs: function(e){
	if(itasanotifier.latest20subs) alert(itasanotifier.latest20subs);
    },

    downloadSubs: function(e) {
	// toDownload is an array equal to alreadyDownloaded + new not downloaded subs
	// Fetch alreadyDownloaded from prefs and use its length as starting index
	// for toDownload cycle. In this way, we avoid to re-download old subs.

	var alreadyDownloaded = itasanotifier.utils.getJSON().parse(itasanotifier.pref.getCharPref('alreadyDownloaded'));
	
	for(var i=alreadyDownloaded.length; i < toDownload.length; i++){
	    gBrowser.addTab(toDownload[i].link);
	    gBrowser.selectedTab = gBrowser.newTab;
	}
	this.clearStatusBar();
    },

    showNotificationAlert: function(lastSub) {
	var listener = {
	    observe: function(subject, topic, data) {
		if(topic === "alertclickcallback"){
		    //var win = window.open(data, "Last sub", "width=800,height=600,scrollbars=no,menubar=no" );
		    gBrowser.addTab(data);
		    gBrowser.selectedTab = gBrowser.newTab;
		    itasanotifier.clearStatusBar();
		}
		else if (topic === "alertfinished") itasanotifier.lastPopupLink = data;
	    }
	};
	
	var lastTitle = lastSub.title;
	var lastLink = lastSub.link;
	//    dump("showPopup is: " + itasanotifier.showPopup + "and lastLink is: " + lastLink + "\n");
	if (itasanotifier.showPopup === true && lastLink !== itasanotifier.lastPopupLink)
	{
	    itasanotifier.alertsService
		.showAlertNotification("chrome://mozapps/skin/downloads/downloadIcon.png", 
				       itasanotifier.itasaProp
				       .GetStringFromName("itasanotifier.statusbar.yourSub"),
				       lastTitle,
				       true,
				       lastLink ,
				       listener);
	    itasanotifier.lastPopupLink = lastLink;
	}
    },

    getList: function() {
	var req = new XMLHttpRequest();
	req.overrideMimeType('text/xml');
	req.open('GET', itasanotifier.urlSubs, true);

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
			itasanotifier.seriesarray[i] = temp;
		    }
		}
		else
		    dump("Error loading page\n");
	    }
	};
	req.send(null); 
    },
    
    setTB_label_tooltip: function(l20s_a, check, matches, tt) {
	// Create toolbar label and tooltip
	var latest20subs = "\n" + itasanotifier.itasaProp.GetStringFromName("itasanotifier.statusbar.latest20subs") + "\n";
	for(i=0; i < l20s_a.length; i++){
	    latest20subs += l20s_a[i].title + "\n";
	}
	// CHECK THIS FUNCTION
	// CHECK tt
	tt = this.purgeList(tt);

	var i, tt2str = "";
	for(i=0; i < tt.length; i++){
	    tt2str += tt[i].title + "\n";
	}

	matches = tt.length;
	if(check){
	    var itasaStatusPopupDownload = document.getElementById("itasa-status-popup-download");
	    itasaStatusPopupDownload.disabled = false;
	    itasanotifier.getList();
	}
	this.setLabelNTooltip(check, matches, tt, tt2str);
    },

    setLabelNTooltip: function(check, matches, tooltipArray, tt2str) {
	// MANY SUBS
	if(check && matches > 1){
	    // label looks like: There are N new subs
	    var label = itasanotifier.itasaProp.GetStringFromName("itasanotifier.statusbar.thereAre") + " " +
		+ matches
		+ " "
		+ itasanotifier.itasaProp.GetStringFromName("itasanotifier.statusbar.newSubs");

	    // tooltip look like: New subs: <series list>
	    var tooltip = itasanotifier.itasaProp.GetStringFromName("itasanotifier.statusbar.yourSubs")+ "\n" + tt2str;

	    this.statusbar.label = label;
	    this.statusbar.tooltipText = tooltip;
	    itasanotifier.showNotificationAlert(tooltipArray[tooltipArray.length - 1]);
	}
	// JUST ONE SUB
	else if(check && matches==1){

	    var label = itasanotifier.itasaProp.GetStringFromName("itasanotifier.statusbar.thereIs1Sub");
	    var tooltip = itasanotifier.itasaProp.GetStringFromName("itasanotifier.statusbar.yourSub") + "\n" + tt2str;

	    this.statusbar.label = label;
	    this.statusbar.tooltipText = tooltip;
	    itasanotifier.showNotificationAlert(tooltipArray[tooltipArray.length - 1]);
	}
	// NO SUBS
	else {
	    this.statusbar.label = itasanotifier.itasaProp.GetStringFromName("itasanotifier.title");
	    this.statusbar.tooltipText = itasanotifier.latest20subs;
	}
    },

    // Create a purged list of series to show in tooltip
    // based on which series has been marked as already
    // read in a previous session
    purgeList: function(currentSeries) {
	try {	
	    itasanotifier.alreadyDownloaded = itasanotifier.utils.getJSON().parse(itasanotifier.pref.getCharPref('alreadyDownloaded'));
	}
	catch (e if e.message == "JSON.parse"){
	    itasanotifier.alreadyDownloaded = "[]";
	}
	catch (e if e.message == "itasanotifier.utils.getJSON().parse"){
	    itasanotifier.alreadyDownloaded = "[]";
	}
	
	var newSeries = [];
	if (itasanotifier.alreadyDownloaded === "[]" || itasanotifier.alreadyDownloaded === undefined){
	    //alert("alreadyDownloaded is undefined" + "\n" + "currentSeries is:" + currentSeries.toSource());
	    return currentSeries;
	}
	else if (itasanotifier.alreadyDownloaded.toSource() === currentSeries.toSource()) {
	    //alert("arrays match");
	    return newSeries;
	}
	else {
	    //alert("alreadyDownloaded is:\n" + alreadyDownloaded.toSource() + "\n" + "currentSeries is:\n" + currentSeries.toSource());
	    
	    var i, n, matches = 0;
	    for (i = 0; i < currentSeries.length; matches = 0, i++){
		for (n = 0; n < itasanotifier.alreadyDownloaded.length; n++){
		    var currentTitle = currentSeries[i].title;
		    var oldTitle = itasanotifier.alreadyDownloaded[n].title;
		    
		    if (currentTitle === oldTitle){
			//alert(currentTitle + "\n" + oldTitle);	  
			matches++;
		    }
		    //alert("matches is: " + matches);
		}
		if (matches === 0)
		    newSeries.push(currentSeries[i]);
	    }
	    //alert(newSeries.toSource());
	}
	return newSeries;
    },

    getDataFrom: function(url, onRetrieve, onError, tag) {
	var req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
	    .createInstance(Components.interfaces.nsIXMLHttpRequest);
	req.open("GET", itasanotifier.url, true);
	
	req.onreadystatechange = function (aEvt) {
	    if (req.readyState == 4) {
		if(req.status == 200){
		    var i, n;
		    var nodeList = [];
		    var l20Subs = itasanotifier.itasaProp.GetStringFromName("itasanotifier.statusbar.latest20subs") + "\n";
		    
		    switch(tag){
		    case "titles":
			var nodes = req.responseXML.getElementsByTagName("title");
			for(i=1; i< nodes.length; i++){
			    nodeList.push(nodes[i].textContent);
			}
			
			var l20Subs = itasanotifier.itasaProp.GetStringFromName("itasanotifier.statusbar.latest20subs") + "\n";
			for(i=1; i < nodes.length; i++){
			    l20Subs += nodes[i].textContent + "\n";
			}
			itasanotifier.latest20subs = l20Subs;
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
			    for(i=2, n=0; i < titles.length; i++, n++){
				nodeList.push({
				    title: titles[i].textContent,
				    link: links[i].textContent});
				l20Subs += titles[i].textContent + "\n";
			    }
			    itasanotifier.latest20subs = l20Subs;
			    this.latest20subsNlinks = nodeList;
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
	};
	req.send(null);
    }
};

// ON LOAD
window.addEventListener("load", function(e) {
    // Load main object
    itasanotifier.onLoad(e);
    
}, false);

// MOZILLA FIREFOX FUNCTION OVERRIDE TO FIX A BUG
// https://bugzilla.mozilla.org/show_bug.cgi?id=404124
// http://tinyurl.com/c93sno
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