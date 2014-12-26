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
    var inputs = document.getElementById('notes').getElementsByTagName('textarea');
    angular.element(inputs).eq( getIndex(inputs, document.activeElement)+delta )[0].focus();
}

// move focus to note with given id in given pane ('true' for major, 'false' for minor)
function setNoteFocus(note, major_pane) {
    var pane = major_pane ? "major" : "minor";
    var id = ['input', pane, note].join('-');
    var input = document.getElementById(id);
    input.focus();
}

// change a textarea's height to fit its content
// http://stackoverflow.com/a/995374
function resizeTextarea(elem) {
    elem.style.height = "1px";
    elem.style.height = (elem.scrollHeight)+"px";
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
// http://stackoverflow.com/a/2897229
function getCaretPosition (elem) {

    // Initialize
    var iCaretPos = 0;

    // IE Support
    if (document.selection) {

        // Set focus on the element
        elem.focus();

        // To get cursor position, get empty selection range
        var oSel = document.selection.createRange();

        // Move selection start to 0 position
        oSel.moveStart ('character', -elem.value.length);

        // The caret position is selection length
        iCaretPos = oSel.text.length;
    }

    // Firefox support
    else if (elem.selectionStart || elem.selectionStart == '0')
        iCaretPos = elem.selectionStart;

    // Return results
    return (iCaretPos);
}
