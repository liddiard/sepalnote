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
    var inputs = document.getElementById('notes').getElementsByTagName('input');
    angular.element(inputs).eq( getIndex(inputs, document.activeElement)+delta )[0].focus();
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
