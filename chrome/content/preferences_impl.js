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

const pref = Cc['@mozilla.org/preferences-service;1']
    .getService(Ci.nsIPrefService)
    .getBranch('extensions.itasanotifier.');

var seriesarray = new Array();
var unsavedSeriesArray = new Array();

var pref_savedseriesarray;
var initList;
var listHasChanged;

// INITIALIZATION
// ----------------------------------------------------------------------
function init() {
    window.sizeToContent();
    
    pref_savedseriesarray = eval(pref.getCharPref('seriesIWatch'));

    initList = document.getElementById('myserieslist');   
    //    roomsarray.forEach(printElt);
    pref_savedseriesarray.forEach(appendToList);
}

function getList(){
  var url = 'http://www.italiansubs.net/index.php?option=com_remository&Itemid=27';
  //var url = 'http://www.ing.unisannio.it/';
  var req = new XMLHttpRequest();
  req.overrideMimeType('text/xml');
  req.open('GET', url, true); /* 3rd argument, true, marks this as async */
    
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
    unsavedSeriesArray[i] = myserieslist.getItemAtIndex(i).label;
  }
  unsavedSeriesArray.sort();

  pref_savedseriesarray = unsavedSeriesArray.toSource();
  pref.setCharPref('seriesIWatch', pref_savedseriesarray);
  listHasChanged = document.getElementById('listHasChanged');
  listHasChanged.hidden = true;
}

// Download XML RSS Feed
function getRSS(){
  var req = new XMLHttpRequest();
  var url = "http://www.italiansubs.net/index2.php?option=com_rss";
  req.open('GET', url, true);
  req.onreadystatechange = function (aEvt) {
    if (req.readyState == 4) {
      if(req.status == 200){
	//	dump(req.responseText);
	var xmldoc = req.responseXML;
	var titles = xmldoc.getElementsByTagName("title");
	
	var i;
	for(i=2; i<titles.length; i++){
	  alert(titles[i].textContent);
	}

      }
      else
	dump("Error loading page\n");
    }
  };
  req.send(null);
}

function printElt(element, index, array) {
    print("[" + index + "] is " + element); // assumes print is already defined
}
