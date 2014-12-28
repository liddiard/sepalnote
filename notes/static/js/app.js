(function(angular){

    var app = angular.module('notes', ['contenteditable']);

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

        this.keyHandler = function(note, path, major_pane, index, event) {
            var caretPosition = getCaretPosition(document.activeElement);

            if (event.keyCode === 13) // enter
                controller.addNote(note, path, major_pane, index, event);

            else if (event.shiftKey && event.keyCode === 9) // shift + tab
                controller.indentNote(note, path, major_pane, index, event, false);

            else if (event.keyCode === 9) // tab
                controller.indentNote(note, path, major_pane, index, event, true);

            else if (event.keyCode === 8 && !caretPosition) { // backspace (cursor at the beginning of input field)
                if (document.activeElement.value) // input field is NOT empty
                    controller.indentNote(note, path, major_pane, index, event, false);
                else // input field is empty
                    controller.deleteNote(note, path, major_pane, index, event);
            }

            else if (event.keyCode === 38) // up arrow
                moveNoteFocus(-1);

            else if (event.keyCode === 40) // down arrow
                moveNoteFocus(1);

            else
                controller.updateNote(note);
        };

        this.noteFromPath = function(path) {
            if (typeof path === 'undefined')
                return;
            if (path.length === 0)
                return controller.tree.tree; // note is a root note
            var note = controller.tree.tree[path[0]];
            for (var i = 1; i < path.length; i++) {
                note = note.children[path[i]];
            }
            return note;
        };

        // TODO: remove if unused
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


        this.addNote = function(note, path, major_pane, index, event) {
            event.preventDefault();
            var parent = controller.noteFromPath(path.slice(0, -1)); // full path except last
            var new_note = {
                uuid: generateUUID(),
                expanded_in_major_pane: true,
                expanded_in_minor_pane: false,
                text: ''
            }
            if (note.children) {
                new_note.parent = note.uuid;
                new_note.position = 0;
                note.children.splice(0, 0, new_note);
            }
            else {
                new_note.parent = parent.uuid;
                new_note.position = index + 1,
                parent.children.splice(index+1, 0, new_note);
            }
            $timeout(function(){ // wait for the DOM to update
                // move focus to the newly created note
                setNoteFocus(new_note.uuid, major_pane);
            });
            controller.diff.push({note: new_note, kind: 'C'});
        };

        this.updateNote = function(note) {
            if (this.timeoutId)
                window.clearTimeout(this.timeoutId);
            this.timeoutId = window.setTimeout(function(){
                controller.diff.push({note: note, kind: 'U'});
            }, 5000);
        };

        this.deleteNote = function(note, path, major_pane, index, event) {
            event.preventDefault();
            var parent = controller.noteFromPath(path.slice(0, -1)); // full path except last
            var children = note.children;
            moveNoteFocus(-1);
            parent.children.splice(index, 1); // remove note from DOM
            parent.children.splice.apply(parent, [index, 0].concat(children));
                // insert array into another array at index
                // http://stackoverflow.com/a/7032717
            controller.diff.push({note: note, kind: 'X'});
        };

        this.indentNote = function(note, path, major_pane, index, event, indent) {
            event.preventDefault();
            var parent = controller.noteFromPath(path.slice(0, -1)); // full path except last
            var top_level_note = (path.length === 1);

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
            }

            else { // dedent
                if (top_level_note)
                    return; // note is at the top level; can't be dedented
                var grandparent = controller.noteFromPath(path.slice(0, -2)); // full path except last two
                var succeeding_siblings_of_parent = parent.children.splice(index+1, parent.children.length-index);
                if (!note.hasOwnProperty('children'))
                    note.children = [];
                note.children.push.apply(note.children, succeeding_siblings_of_parent);
                if (path.length === 2)
                    grandparent.splice(grandparent.indexOf(parent)+1, 0, note);
                else
                    grandparent.children.splice(grandparent.children.indexOf(parent)+1, 0, note);
                parent.children.splice(index, 1);
            }

            $timeout(function(){ // wait for the DOM to update
                setNoteFocus(note.uuid, major_pane);
            });
            var kind = indent ? "I" : "D";
            controller.diff.push({note: note, kind: kind});
        };

        this.expandNote = function(note, major_pane){
            $http.post(
                '/api/note/expand/',
                {id: note.uuid, major_pane: major_pane}
            )
            .success(function(data){
                if (major_pane)
                    note.expanded_in_major_pane = !note.expanded_in_major_pane;
                else
                    note.expanded_in_minor_pane = !note.expanded_in_minor_pane;
                if (data.tree)
                    note.children = data.tree.children;
            });
        };

        this.updateFocus = function(note) {
            $http.post(
                '/api/userprofile/update-focused-note/',
                {id: note.uuid}
            )
            .success(function(data){
                if (!note.expanded_in_major_pane)
                    note.children = data.tree.children;
                controller.tree.focused_note_path = data.focused_note_path;
            });
        };

        $http.get('/api/note/tree/').success(function(data){
            controller.tree = data;
        });

        window.setInterval(controller.applyDiff, 5000);
    });

})(window.angular);
