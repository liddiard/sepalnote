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

// generate a positive integer from zero to the max value of a BigInteger in
// Django. Suitable for UUID generation.
function generateUUID() {
    var maxValue = "9223372036854775807"; // maximum value of a BigInteger in Django
    var firstPart = parseInt(maxValue.substr(0, 15));
    var secondPart = parseInt(maxValue.substr(15));

    var firstRandomInt = getRandomInt(firstPart);
    var secondRandomInt = getRandomInt(secondPart);

    return firstRandomInt.toString() + secondRandomInt.toString();

    // Returns a random integer between zero and max (inclusive)
    function getRandomInt(max) {
        return Math.floor(Math.random() * (max + 1));
    }
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
