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
                controller.indentNote(note, parent, index, event, false);
            else if (event.keyCode === 9) // tab
                controller.indentNote(note, parent, index, event, true);
            else if (event.keyCode === 8) // backspace
                console.log('backspace pressed');
            else
                controller.updateNote(note);
        };


        this.noteFromPath = function(path) {
            if (typeof path === 'undefined')
                return;
            var note = controller.tree.tree[path[0]];
            for (var i = 1; i < path.length; i++) {
                note = note.children[path[i]];
            }
            return note;
        };

        this.noteFromId = function(id) {
            var note;
            for (var i = 0; i < controller.tree.tree.length; i++) {
                note = search(id, controller.tree.tree[i]);
                if (note) return note;
            }

            function search(id, root) {
                if (root.uuid === id)
                    return root;
                if (!root.children)
                    return;
                for (var i = 0; i < root.children.length; i++) {
                    search(id, root.children[i]);
                }
            }
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
            var top_level_note = (note.uuid === parent.uuid);

            if (indent) {
                if (index > 0) {
                    var precedingSiblingNote;
                    if (top_level_note)
                        precedingSiblingNote = controller.tree.tree[index-1];
                    else
                        precedingSiblingNote = parent.children[index-1];
                }
                else
                    return; // note can't be indented because there are no
                            // preceding sibling notes
                var nextPosition;
                if (!precedingSiblingNote.hasOwnProperty('children'))
                    precedingSiblingNote.children = [];
                nextPosition = precedingSiblingNote.children.length;
                precedingSiblingNote.children[nextPosition] = note;
                if (top_level_note)
                    controller.tree.tree.splice(index, 1);
                else
                    parent.children.splice(index, 1);
                moveNoteFocus(1); // move focus off note that's getting deleted
                $timeout(function(){ // wait for the DOM to update
                    moveNoteFocus(-1); // move focus back to indented note
                });
            }

            else { // dedent
                if (top_level_note)
                    return; // note is at the top level; can't be dedented
                var grandparent = controller.noteFromId(parent.parent);
                grandparent.children.splice(grandparent.children.indexOf(parent)+1, 0, note);
                parent.children.splice(index, 1);
            }
        };


        $http.get('/api/note/tree/').success(function(data){
            controller.tree = data;
        });

        window.setInterval(controller.applyDiff, 5000);
    });

})();
