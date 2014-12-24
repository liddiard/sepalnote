(function(){
    var app = angular.module('notes', []);

    app.config(function($httpProvider){
        // Django CSRF token support
        // http://stackoverflow.com/a/18156756
        $httpProvider.defaults.xsrfCookieName = 'csrftoken';
        $httpProvider.defaults.xsrfHeaderName = 'X-CSRFToken';
    });

    app.controller('NotesController', function($http, $scope, $timeout) {
        var controller = this;
        this.tree = [];
        this.diff = []; // holds diff not yet sent to backend

        this.keyHandler = function(note, parent, index, event) {
            if (event.keyCode === 13) // enter
                controller.addNote(index, parent);
            else if (event.shiftKey && event.keyCode === 9)
                console.log('dedent note');
            else if (event.keyCode === 9) // tab
                controller.indentNote(note, parent, index, event, true);
            else if (event.keyCode === 8) // backspace
                console.log('backspace pressed');
            else
                controller.updateNote(note);
        };


        this.noteFromPath = function(path) {
            var note = controller.major_tree;
            for (var i = 0; i < path.length-1; i++) {
                note = note[path[i]];
            }
            return note;
        };

        this.applyDiff = function() {
            if (!controller.diff.length)
                return; // exit if there's nothing to do
            $http({
                method: 'POST',
                url: '/api/note/diff/',
                data: controller.diff
            });
            console.log(controller.diff);
            controller.diff = [];
        };


        this.addNote = function(insertAfter, parent) {
            var note = {
                uuid: generateUUID(),
                parent: parent.uuid,
                position: insertAfter+1,
                text: '',
            }
            if (parent.children[insertAfter].children)
                parent.children[insertAfter].children.splice(0, 0, note);
            else
                parent.children.splice(insertAfter+1, 0, note);
            $timeout(function(){ // wait for the DOM to update
                // move focus to the next (newly created) note
                moveNoteFocus(1);
            });
            controller.diff.push({note: note, kind: 'C'});
        };

        this.updateNote = function(note) {
            if (this.timeoutId)
                window.clearTimeout(this.timeoutId);
            this.timeoutId = window.setTimeout(function(){
                controller.diff.push({note: note, kind: 'U'});
            }, 5000);
        };

        this.indentNote = function(note, parent, index, event, indent) {
            event.preventDefault();
            if (indent) {
                if (index > 0)
                    var precedingSiblingNote = parent.children[index-1];
                else
                    return; // note can't be indented because there are no
                            // preceding sibling notes
                var nextPosition;
                if (!precedingSiblingNote.hasOwnProperty('children'))
                    precedingSiblingNote.children = [];
                nextPosition = precedingSiblingNote.children.length;
                precedingSiblingNote.children[nextPosition] = note;
                parent.children.splice(index, 1);
                moveNoteFocus(1); // move focus off note that's getting deleted
                $timeout(function(){ // wait for the DOM to update
                    moveNoteFocus(-1); // move focus back to indented note
                });
            }
            else { // dedent

            }
        };


        $http.get('/api/note/tree/').success(function(data){
            controller.tree = data;
        });

        window.setInterval(controller.applyDiff, 5000);
    });

})();
