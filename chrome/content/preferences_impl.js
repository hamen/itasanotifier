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

const urlSubs = "http://www.italiansubs.net/Sottotitoli/";

var seriesarray = new Array();
var unsavedSeriesArray = new Array();

var pref_savedseriesarray;

var initList;
var listHasChanged;

// INITIALIZATION
// ----------------------------------------------------------------------
function init() {
    window.sizeToContent();
    
    pref_savedseriesarray = eval(prefs.getCharPref('seriesIWatch'));
    //pref_savedserieNidsarray = eval(prefs.getCharPref('seriesIWatch_nameNid'));

    initList = document.getElementById('myserieslist');   
    pref_savedseriesarray.forEach(appendToList);
}

function getList(){
  
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
	  seriesarray[i] = temp;
	  //dump(seriesarray[i] + "\n");
	}
      }
      else
	dump("Error loading page\n");
    }
  
    initList = document.getElementById('thelist');   
    seriesarray.forEach(appendToList);

  };
  req.send(null); 
  
}

function appendToList(element, index, array) {
  // alert("[" + index + "] is " + element);
  initList.appendItem(element, element);
}

function addToMyList(){

  var thelist = document.getElementById('thelist');
  var myserieslist = document.getElementById('myserieslist');
  
  var itemIndex = thelist.selectedIndex;
  var item = thelist.getItemAtIndex(itemIndex);
  if(item.label === undefined) alert("item.label is undefined");
  myserieslist.appendItem(item.label);
  
  listHasChanged = document.getElementById('listHasChanged');
  listHasChanged.hidden = false;
}

function removeFromMyList(){

  var myserieslist = document.getElementById('myserieslist');

    if(myserieslist.selectedIndex == -1){
        return; // no item selected so return
    }else{
        myserieslist.removeItemAt(myserieslist.selectedIndex);
	listHasChanged = document.getElementById('listHasChanged');
	listHasChanged.hidden = false;
    }
}

function saveMyList(){
  var myserieslist = document.getElementById('myserieslist');
  var length = myserieslist.itemCount

  var i;
  for(i=0; i < length; i++){
    if(myserieslist.getItemAtIndex(i).label === undefined) alert("myserieslist.getItemAtIndex(i).label is undefined");
    unsavedSeriesArray[i] = myserieslist.getItemAtIndex(i).label;
  }
  unsavedSeriesArray.sort();

  pref_savedseriesarray = unsavedSeriesArray.toSource();
  prefs.setCharPref('seriesIWatch', pref_savedseriesarray);
  listHasChanged = document.getElementById('listHasChanged');
  listHasChanged.hidden = true;
}

function printElt(element, index, array) {
    print("[" + index + "] is " + element); // assumes print is already defined
}


function getNamesNIds(){
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
  
}
