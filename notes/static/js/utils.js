function isEmpty(obj) {
    for (var key in obj) {
        if (obj.hasOwnProperty(key))
            return false;
    }
    return true;
}

// copies a JSON object and returns the copy. doesn't handle Date objects properly
// http://stackoverflow.com/a/5344074
function copyObj(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// http://diveintohtml5.info/detect.html
function browserSupportsLocalStorage() {
    try {
        return 'localStorage' in window && window['localStorage'] !== null;
    } catch(e) {
        return false;
    }
}

// check if navigator can make requests to our server
// http://www.kirupa.com/html5/check_if_internet_connection_exists_in_javascript.htm
function internetConnectionExists() {
    var xhr = new XMLHttpRequest();
    var file = "/";
    var randomNum = Math.round(Math.random() * 10000);

    xhr.open('HEAD', file + "?rand=" + randomNum, false);

    try {
        xhr.send();

        if (xhr.status >= 200 && xhr.status < 304) {
            return true;
        } else {
            return false;
        }
    } catch (e) {
        return false;
    }
}

// get index of DOM element in an array of elements
// based on http://stackoverflow.com/a/18185833
function getIndex(elements, element) {
    var index = 0;
    for (var len = elements.length; index < len; ++index) {
        if (elements[index] === element) {
            return index;
        }
    }
}

// move focus from current note to x # of elements forward where x is 'delta'
function moveNoteFocus(delta) {
    var inputs = document.getElementById('notes').getElementsByClassName('note-text');
    angular.element(inputs).eq( getIndex(inputs, document.activeElement)+delta )[0].focus();
}

// move focus to note with given id in given pane ('true' for major, 'false' for minor)
function setNoteFocus(note, major_pane) {
    var pane = major_pane ? "major" : "minor";
    var id = ['input', pane, note].join('-');
    var input = document.getElementById(id);
    input.focus();
}

// Returns a random integer between zero and max (inclusive)
function getRandomInt(max) {
    return Math.floor(Math.random() * (max + 1));
}

// generate a positive integer from zero to the max value of a BigInteger in
// Django. Suitable for UUID generation.
function generateUUID() {
    var maxValue = "9223372036854775807"; // maximum value of a BigInteger in Django
    var firstPart = parseInt(maxValue.substr(0, 15));
    var secondPart = parseInt(maxValue.substr(15));

    var firstRandomInt = getRandomInt(firstPart);
    var secondRandomInt = getRandomInt(secondPart);

    return firstRandomInt.toString() + secondRandomInt.toString();
}

// Returns the caret (cursor) position of the specified text field.
// Return value range is 0 – elem.value.length.
// http://stackoverflow.com/a/3976125
function getCaretPosition(editableDiv) {
    var caretPos = 0,
    sel, range;
    if (window.getSelection) {
        sel = window.getSelection();
        if (sel.rangeCount) {
            range = sel.getRangeAt(0);
            if (range.commonAncestorContainer.parentNode == editableDiv) {
                caretPos = range.endOffset;
            }
        }
    } else if (document.selection && document.selection.createRange) {
        range = document.selection.createRange();
        if (range.parentElement() == editableDiv) {
            var tempEl = document.createElement("span");
            editableDiv.insertBefore(tempEl, editableDiv.firstChild);
            var tempRange = range.duplicate();
            tempRange.moveToElementText(tempEl);
            tempRange.setEndPoint("EndToEnd", range);
            caretPos = tempRange.text.length;
        }
    }
    return caretPos;
}

// Dialog box for unsaved changes on navigating away
// http://stackoverflow.com/a/1119324
function confirmOnPageExit(e)  {
    // If we haven't been passed the event get the window.event
    e = e || window.event;

    var message = "Hold up! We're still saving your last changes. Wait 5 seconds then try closing the tab again.";

    // For IE6-8 and Firefox prior to version 4
    if (e)
    {
        e.returnValue = message;
    }

    // For Chrome, Safari, IE8+ and Opera 12+
    return message;
}
