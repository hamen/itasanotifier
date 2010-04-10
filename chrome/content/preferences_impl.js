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


/// GLOBAL DEFINITIONS
// ----------------------------------------------------------------------

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cr = Components.results;

const prefs = Cc['@mozilla.org/preferences-service;1']
  .getService(Ci.nsIPrefService)
  .getBranch('extensions.itasanotifier.');

const urlSubs = "http://www.italiansubs.net/index.php?option=com_remository&Itemid=9";
//const urlSubs = "http://www.italiansubs.net/Sottotitoli/";

var inp = itasanotifierPreferences;

inp = {
    loader : Cc['@mozilla.org/moz/jssubscript-loader;1'].getService(Ci.mozIJSSubScriptLoader),
    itasaProp: Components
	.classes["@mozilla.org/intl/stringbundle;1"]
	.getService(Components.interfaces.nsIStringBundleService)
	.createBundle("chrome://itasanotifier/locale/itasanotifier.properties"),
    utils : {},
    initList: '',
    listHasChanged: '',
    pref_savedseriesarray: '',
    seriesarray: new Array(),
    unsavedSeriesArray: new Array(),
    itasaProp: Components
	.classes["@mozilla.org/intl/stringbundle;1"]
	.getService(Components.interfaces.nsIStringBundleService)
	.createBundle("chrome://itasanotifier/locale/itasanotifier.properties"),

    passwordManager : Components.
	classes["@mozilla.org/login-manager;1"].
        getService(Components.interfaces.nsILoginManager),
    nsLoginInfo : new Components.Constructor("@mozilla.org/login-manager/loginInfo;1",
                                         Components.interfaces.nsILoginInfo,
                                         "init"),

    getList: function() {
	var tvseries = {
	 title: '',
	 format: ''
     };

    var req = new XMLHttpRequest();
    req.overrideMimeType('text/xml');
    req.open('GET', urlSubs, true);

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
	      var tvseries = {
		  title: temp,
		  format: ''
	      };
	      inp.seriesarray[i] = tvseries;
	    //dump(seriesarray[i] + "\n");
	  }
	}
	else
	  dump("Error loading page\n");
      }
  
	inp.initList = document.getElementById('thelist');  

	if (inp.initList.getRowCount() !== 0){
	    while(inp.initList.getRowCount() !== 0){
		inp.initList.removeItemAt(0);		
	    }
	}
	inp.seriesarray.forEach(inp.appendToList);
    };
    req.send(null);
  },

 addToMyList: function() {
     // thelist is italiansubs.net tv series list
     var thelist = document.getElementById('thelist');
     // myserieslist is my own tv series list
     var myserieslist = document.getElementById('myserieslist');
     // subFormatsList is a collection of formats subs could be released in
     var subFormatsList = document.getElementById('subFormatsList');
     
     // item is the current tv series I am selecting in thelist
     var itemIndex = thelist.selectedIndex;
     var item = thelist.getItemAtIndex(itemIndex);

     var formatIndex = subFormatsList.selectedIndex;
     var format = subFormatsList.getItemAtIndex(formatIndex);

     var rowcount = myserieslist.getRowCount();
     if (rowcount != 0)
	 myserieslist.ensureIndexIsVisible(rowcount-1);
     
     var tvseries = {
	 title: item.label,
	 format: format.label
     };

     if(tvseries.title === undefined) {
	 dump("tvseries title is undefined (addToMyList:122)");
     }
     myserieslist.appendItem(tvseries.title + " (" + tvseries.format + ")");
     
     var lastItem = myserieslist.itemCount - 1;
     var myStoredList = new Array;

     try {
	 myStoredList = inp.utils.getJSON().parse(prefs.getCharPref('seriesIWatch'));
     }
     catch (e){
	 dump("myStoredList is empty or corrupted. Resetting...\n");
	 prefs.setCharPref('seriesIWatch', "empty");
     }

     myStoredList.push(tvseries);
     
     myStoredList.sort(inp.sort_by('title', false, function(a){return a.toUpperCase();}));

     prefs.setCharPref('seriesIWatch', inp.utils.getJSON().stringify(myStoredList));
 },

    removeFromMyList: function() {
	var myserieslist = document.getElementById('myserieslist');
	if(myserieslist.selectedIndex !== -1){
	var itemToRemove = myserieslist.getItemAtIndex(myserieslist.selectedIndex).label;	    
	}
	var myStoredList = inp.utils.getJSON().parse(prefs.getCharPref('seriesIWatch'));

	if(myserieslist.selectedIndex == -1){
	    return; // no item selected so return
	}
	else{
	    // Remove item from listbox
	    myserieslist.removeItemAt(myserieslist.selectedIndex);
	    // Compare selected listbox item with seriesIWatch titles
	    // Remove matching series
	    myStoredList.forEach(function (element, index, array) {
		if (itemToRemove.indexOf(element.title) != -1){
		    var removed = myStoredList.splice(index, 1);
		    }
	    });
	    prefs.setCharPref('seriesIWatch', inp.utils.getJSON().stringify(myStoredList));
	}
    },

 getNamesNIds: function() {
    var req = new XMLHttpRequest();
    req.overrideMimeType('text/xml');
    req.open('GET', urlSubs, true); /* 3rd argument, true, marks this as async */
    
    req.onreadystatechange = function (aEvt) {
      if (req.readyState == 4) {
	if(req.status == 200){
	  var seriesTXTList = req.responseText;
	  var re = new RegExp('("> ).+(</a>)', "g");

	  var matches_array = seriesTXTList.match(re);
	  
	  var series = new Array();
		
	  var i;
	  // Creates a new array of objects "series": seriesName, seriesId
	  var seriesNid = new Array();
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
	    alert(seriesNid[i].id + " " + seriesNid[i].name);
	  }
	}
	else
	  dump("Error loading page\n");
      }
    };
    req.send(null);
  },

    appendToList: function(element, index, array) {
	if (element.title === undefined && element.format === undefined){
	    inp.listHasChanged = document.getElementById('listHasChanged');
	    inp.listHasChanged.hidden = false;
	}     
	else if (element.format != '')
	{
	    inp.initList.appendItem(element.title + " (" + element.format + ")", element);
	}
	else
	{
	    inp.initList.appendItem(element.title, element);
	}
   },

    printElt: function(element, index, array) {
	print("[" + index + "] is " + element); // assumes print is already defined
    },
    
    sort_by: function(field, reverse, primer){
	
	reverse = (reverse) ? -1 : 1;
	
	return function(a,b){
	    
	    a = a[field];
	    b = b[field];
	    
	    if (typeof(primer) != 'undefined'){
		a = primer(a);
		b = primer(b);
	    }
	    
	    if (a<b) return reverse * -1;
	    if (a>b) return reverse * 1;
	    return 0;
	    
	};
    },

    init: function() {
	inp.loader.loadSubScript('chrome://itasanotifier/content/util_impl.js', inp.utils);
	window.sizeToContent();

	inp.initList = document.getElementById('myserieslist');
	try {
	    inp.pref_savedseriesarray = inp.utils.getJSON().parse(prefs.getCharPref('seriesIWatch'));
	    inp.pref_savedseriesarray.forEach(inp.appendToList);
	}
	catch (e if e.message == "JSON.parse") {
	    dump("JSON.parse in preferences_impl at line 111\n");
	    dump("myStoredList is empty or corrupted. Resetting...\n");
	    prefs.setCharPref('seriesIWatch', "empty");
	}
	catch (e if e.message == "inp.pref_savedseriesarray.forEach is not a function" 
	       || inp.pref_savedseriesarray == "empty") {
	    alert(inp.itasaProp.GetStringFromName("itasanotifier.noseries"));
	}

	// Account tab
	var hostname = 'chrome://itasanotifier/content/';
	var formSubmitURL = null;
	var httprealm = 'Account';
	var username;
	var password;
	
	try {
	    username = inp.utils.getJSON().parse(prefs.getCharPref('username'));
	    if (username){
		_('username').value = username;

		var logins = inp.passwordManager.findLogins({}, hostname, formSubmitURL, httprealm);
				
		for (var i = 0; i < logins.length; i++) {
		    if (logins[i].username == username) {
			password = logins[i].password;
			break;
		    }
		}
		if(password) {
		    _('password').value = password;
		    }
	    }
	} catch (e) {
	    dump("No username\n");
	}
    },
    
    importList: function() {
	var nsIFilePicker = Components.interfaces.nsIFilePicker;
	var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
	fp.init(window, "Select a File", nsIFilePicker.modeOpen);
	var res = fp.show();

	if (res == nsIFilePicker.returnOK){
	    var fileContent = "";
	    var fileIStream = Components.classes["@mozilla.org/network/file-input-stream;1"].
                createInstance(Components.interfaces.nsIFileInputStream);
	    var cstream = Components.classes["@mozilla.org/intl/converter-input-stream;1"].
                createInstance(Components.interfaces.nsIConverterInputStream);
	    fileIStream.init(fp.file, -1, 0, 0);
	    cstream.init(fileIStream, "UTF-8", 0, 0);
	    
	    let (str = {}) {
		cstream.readString(-1, str);
		fileContent = str.value;
	    };
	    cstream.close();
	    prefs.setCharPref('seriesIWatch', fileContent);

	    alert(inp.itasaProp.GetStringFromName("itasanotifier.success"));
	    var prefwindow = document.getElementById('itasanotifierPreferences');
	    prefwindow.cancelDialog();
	}
    },
    exportList: function(){
	var nsIFilePicker = Components.interfaces.nsIFilePicker;
	var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
	fp.init(window, "Select a File", nsIFilePicker.modeSave);
	var res = fp.show();
	var series = inp.utils.getJSON().parse(prefs.getCharPref('seriesIWatch'));

	if (res == nsIFilePicker.returnOK || res == nsIFilePicker.returnReplace){
	    var fileOStream = Components.classes["@mozilla.org/network/file-output-stream;1"].
                createInstance(Components.interfaces.nsIFileOutputStream);

	    // use 0x02 | 0x10 to open file for appending.
	    fileOStream.init(fp.file, 0x02 | 0x08 | 0x20, 0666, 0); 

	    var converter = Components.classes["@mozilla.org/intl/converter-output-stream;1"].
                createInstance(Components.interfaces.nsIConverterOutputStream);
	    converter.init(fileOStream, "UTF-8", 0, 0);
	    converter.writeString(inp.utils.getJSON().stringify(series));
	    converter.close(); 
	}
    }
};

inp.saveAccount = function() {
    var username = _('username').value;
    var password = _('password').value;
    var loginInfo;

    if (username.length > 0 && password.length > 0) {
	loginInfo = new inp.nsLoginInfo('chrome://itasanotifier/content/',
					   null, 'Account',
					   username, password, "", "");	
	inp.passwordManager.addLogin(loginInfo);  
	prefs.setCharPref('username', inp.utils.getJSON().stringify(username));
	
	_('saved').hidden = false;

	// dump("username: " + loginInfo.username + 
	//       " password: " + loginInfo.password + 
	//       " formSubmitURL: " + loginInfo.formSubmitURL +
	//       " httpRealm: " + loginInfo.httpRealm +
	//       " hostname: " + loginInfo.hostname);
    }
};

inp.removeAccount = function() {
    var hostname = 'chrome://itasanotifier/content/';
    var formSubmitURL = null;
    var httprealm = 'Account';
    var username = _('username').value;

    try {
	var logins = inp.passwordManager.findLogins({}, hostname, formSubmitURL, httprealm);
	
	for (var i = 0; i < logins.length; i++) {
	    if (logins[i].username == username) {
		inp.passwordManager.removeLogin(logins[i]);

		// Cleaning up prefs and UI
		prefs.setCharPref('username', "");
		_('username').value = "";
		_('password').value = "";
		_('removed').hidden = false;
		break;
	    }
	}
    }
    catch(e) {
	dump(e.message);
    }
};

function _(id) {
    return document.getElementById(id);
}
