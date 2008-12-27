function init() {
    this._message = 'Hello, XPCOM world!';
    dump("\n HELLO WORLD \n");
}

function sayHello() {
    Components
        .classes["@mozilla.org/embedcomp/prompt-service;1"]
        .getService(Components.interfaces.nsIPromptService)
        .alert(null, 'Greeting...', this._message);
}
