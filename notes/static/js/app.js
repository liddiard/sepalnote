(function(angular){

    var app = angular.module('notes', ['contenteditable']);

    app.config(function($httpProvider){
        // Django CSRF token support
        // http://stackoverflow.com/a/18156756
        $httpProvider.defaults.xsrfCookieName = 'csrftoken';
        $httpProvider.defaults.xsrfHeaderName = 'X-CSRFToken';
    });

    app.controller('NotesController', function($http, $scope, $timeout, $document) {

        // ATTRIBUTES //

        var controller = this;
        this.search_query = "";
        this.search_results = {};
        this.searching = false; // are we searching currently?
        this.tree = []; // holds all the notes
        this.diff = []; // holds diff not yet sent to backend
        this.noteTimeouts = {} // stores timeout ids associated with each note
                               // whose text has not yet been updated


        // METHODS //

        // for key events bound to a specific note
        this.keyHandler = function(note, path, major_pane, index, event) {
            var caretPosition = getCaretPosition(document.activeElement);

            if (event.keyCode === 13) // enter
                controller.addNote(note, path, major_pane, index, event);

            else if (event.shiftKey && event.keyCode === 9) // shift + tab
                controller.indentNote(note, path, major_pane, index, event, false);

            else if (event.keyCode === 9) // tab
                controller.indentNote(note, path, major_pane, index, event, true);

            else if (event.keyCode === 8 && !caretPosition) { // backspace (cursor at the beginning of input field)
                if (document.activeElement.textContent.length) // note is NOT empty
                    controller.indentNote(note, path, major_pane, index, event, false);
                else // note field is empty
                    controller.deleteNote(note, path, major_pane, index, event);
            }

            else if (event.metaKey && event.keyCode === 40 ||
                     event.ctrlKey && event.keyCode === 40) // command + down arrow or ctrl + down arrow
                controller.updateFocus(note);

            else if (event.ctrlKey && event.keyCode === 32) // ctrl + space
                controller.expandNote(note, major_pane);

            else if (event.keyCode === 38) // up arrow
                moveNoteFocus(-1);

            else if (event.keyCode === 40) // down arrow
                moveNoteFocus(1);

            else
                controller.updateNote(note);
        };

        // for key events NOT bound to a specific note (works anywhere on page)
        $document.bind('keydown', function(event){
            if (event.metaKey && event.keyCode === 38 ||
                event.ctrlKey && event.keyCode === 38) { // command + up arrow or ctrl + up arrow
                controller.updateFocusToParent();
            }
        });

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

        this.getChildren = function(note) {
            if (note === controller.tree.tree)
                return note;
            else
                return note.children;
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

        this.insertNote = function(note, parent, position, major_pane) {
            var siblings = controller.getChildren(parent);
            if (!siblings)
                siblings = [];
            siblings.splice(position, 0, note);
            $timeout(function(){ // wait for the DOM to update
                // move focus to the newly created note
                setNoteFocus(note.uuid, major_pane);
            });
            controller.diff.push({note: note, kind: 'C'});
        };

        this.addNote = function(note, path, major_pane, index, event) {
            event.preventDefault();
            var parent = controller.noteFromPath(path.slice(0, -1)); // full path except last
            var new_note = {
                uuid: generateUUID(),
                expanded_in_major_pane: true,
                expanded_in_minor_pane: false,
                text: ''
            };
            if (note.children && note.expanded_in_major_pane) {
                new_note.parent = note.uuid;
                new_note.position = 0;
                controller.insertNote(new_note, note, 0, true);
            }
            else {
                new_note.parent = parent.uuid;
                new_note.position = index + 1,
                controller.insertNote(new_note, parent, index+1, true);
            }
        };

        this.addFirstChild = function(note) {
            var new_note = {
                uuid: generateUUID(),
                expanded_in_major_pane: true,
                expanded_in_minor_pane: false,
                text: '',
                parent: note.uuid,
                position: 0
            };
            controller.insertNote(new_note, note, 0, true);
        };

        this.updateNote = function(note) {
            if (controller.noteTimeouts[note.uuid])
                window.clearTimeout(controller.noteTimeouts[note.uuid]);
            controller.noteTimeouts[note.uuid] = window.setTimeout(function(){
                controller.diff.push({note: note, kind: 'U'});
                delete controller.noteTimeouts[note.uuid];
            }, 5000);
        };

        this.deleteNote = function(note, path, major_pane, index, event) {
            event.preventDefault();
            var parent = controller.noteFromPath(path.slice(0, -1)); // full path except last
            var siblings = controller.getChildren(parent);
            var children = note.children;
            moveNoteFocus(-1);
            siblings.splice(index, 1); // remove note from DOM
            if (children) { // deleted note has children
                if (index) { // deleted note has previous siblings
                    var previous_sibling = parent[index-1];
                    if (!previous_sibling.children)
                        previous_sibling.children = [];
                    // insert deleted note's chidren at the end of previous sibling's children
                    previous_sibling.children = previous_sibling.children.concat(children);
                }
                else // deleted note has no previous sibling
                    siblings.splice.apply(siblings, [index, 0].concat(children));
                    // dedent children at position of deleted note
                    // insert array into another array at index
                    // http://stackoverflow.com/a/7032717
            }
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
            var uuid;
            // if the "note" we're trying to focus on is the root of the tree,
            // focused_note (stored in the database) is null/None
            if (note === controller.tree.tree)
                uuid = null;
            else
                uuid = note.uuid;
            $http.post(
                '/api/userprofile/update-focused-note/',
                {id: uuid}
            )
            .success(function(data){
                if (data.tree)
                    controller.tree.tree = data.tree;
                if (data.children)
                    note.children = data.tree.children;
                controller.tree.focused_note_path = data.focused_note_path;
            });
        };

        this.updateFocusToParent = function() {
            if (!controller.tree.focused_note_path.length)
                return; // we're already at the root, do nothing
            var parent = controller.noteFromPath(controller.tree.focused_note_path.slice(0, -1)) || null;
            controller.updateFocus(parent);
        };

        this.displaySearchResult = function(result) {
            var text = result.text;
            var snippet = text.slice(0, 26);
            if (text.length > 26)
                snippet += '…';
            return snippet;
        };

        this.displaySearchResultPath = function(result) {
            var path = result.path;
            return path.slice(0, -1).join(' 〉');
        };

        this.clearSearchResult = function() {
            controller.search_query = "";
            controller.search_results = [];
        };

        $http.get('/api/note/tree/').success(function(data){
            controller.tree = data;
        });


        // WATCHES/INTERVALS //

        // watch for changes on search results
        $scope.$watch(
            function(){ return controller.search_query },
            function(newVal, oldVal){
                if (!controller.search_query.length) {
                    controller.clearSearchResult();
                }
                if (newVal !== oldVal && controller.search_query.length) {
                    if (this.timeoutId)
                        window.clearTimeout(this.timeoutId);
                    controller.searching = true;
                    this.timeoutId = window.setTimeout(function(){
                        $http.get('/api/note/search/', {params: {query: controller.search_query}})
                             .success(function(data){
                                 controller.searching = false;
                                 if (controller.search_query.length)
                                     controller.search_results = data;
                             });
                    }, 500);
                }
            }
        );

        window.setInterval(controller.applyDiff, 5000);
    });

})(window.angular);
