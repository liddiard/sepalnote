// get index of DOM element in an array of elements
// based on http://stackoverflow.com/a/18185833
function getIndex(elements, element)
{
    var index = 0;
    for (var len = elements.length; index < len; ++index) {
        if (elements[index] === element) {
            return index;
        }
    }
}
