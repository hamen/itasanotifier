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

function getJSON() {
  // test for Firefox 3.5
  if (typeof(JSON) != "undefined") {
    return JSON;
  }
  var json = Components.classes["@mozilla.org/dom/json;1"]
    .createInstance(Components.interfaces.nsIJSON);
  return { stringify : json.encode, parse : json.decode};
}