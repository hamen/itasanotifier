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
	      }
	      inp.seriesarray[i] = tvseries;
	    //dump(seriesarray[i] + "\n");
	  }
	}
	else
	  dump("Error loading page\n");
      }
  
      inp.initList = document.getElementById('thelist');   
      inp.seriesarray.forEach(inp.appendToList);

    };
    req.send(null);
  },

 addToMyList: function() {
     // thelist is italiansubs.net tv series list
     var thelist = document.getElementById('thelist');
     // myserieslist is my owntv series list
     var myserieslist = document.getElementById('myserieslist');
     // subFormatsList is a collection of formats subs could be released in
     var subFormatsList = document.getElementById('subFormatsList');
     
     // item is the current tv series I am selection in thelist
     var itemIndex = thelist.selectedIndex;
     var item = thelist.getItemAtIndex(itemIndex);

     var formatIndex = subFormatsList.selectedIndex;
     var format = subFormatsList.getItemAtIndex(formatIndex);

     var rowcount = myserieslist.getRowCount();
     myserieslist.ensureIndexIsVisible(rowcount);

     var tvseries = {
	 title: item.label,
	 format: format.label
     };

     if(tvseries.title === undefined)
	 dump("tvseries title is undefined (addToMyList:122)");
     myserieslist.appendItem(tvseries.title + " (" + tvseries.format + ")");
     
     var lastItem = myserieslist.itemCount - 1;
     var myStoredList = new Array;

     try {
	 myStoredList = inp.utils.getJSON().parse(prefs.getCharPref('seriesIWatch'));
     }
     catch (e if e.message == "JSON.parse"){
	 dump("myStoredList is empty or corrupted. Resetting...\n");
	 prefs.setCharPref('seriesIWatch', "empty");
     }

     myStoredList.push(tvseries);
     myStoredList.sort();
     prefs.setCharPref('seriesIWatch', inp.utils.getJSON().stringify(myStoredList));
 },

    removeFromMyList: function() {
	var myserieslist = document.getElementById('myserieslist');
	var itemToRemove = myserieslist.getItemAtIndex(myserieslist.selectedIndex).label;
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
	 inp.initList.appendItem(element.title + " (" + element.format + ")", element);
     else
	 inp.initList.appendItem(element.title, element);
  },

 printElt: function(element, index, array) {
    print("[" + index + "] is " + element); // assumes print is already defined
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
  }
}