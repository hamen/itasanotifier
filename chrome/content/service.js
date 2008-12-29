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







function init() {
    dump("\nItasaNotifier XPCOM loaded\n");
    
}

function sayHello() {
  // Test method; just ignore it.
    Components
        .classes["@mozilla.org/embedcomp/prompt-service;1"]
        .getService(Components.interfaces.nsIPromptService)
        .alert(null, 'Greeting...', this._message);
}

function getRSS(){
  
}

function amIInterested(titles){
  
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
  
}

function clearStatusBar(){
  
}