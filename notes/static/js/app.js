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
        this.major_tree = [];
        this.minor_tree = [];
        this.diff = []; // holds diff not yet sent to backend

        this.keyHandler = function(event, index, parent, note) {
            if (event.keyCode === 13) // enter
                controller.addNote(index, parent);
            else if (event.shiftKey && event.keyCode === 9)
                console.log('dedent note');
            else if (event.keyCode === 9) // tab
                console.log('indent note');
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
            $timeout(function(){ // wait until the DOM has updated
                // move focus to the next (newly created) note
                var inputs = document.getElementById('notes').getElementsByTagName('input');
                angular.element(inputs).eq( getIndex(inputs, document.activeElement)+1 )[0].focus();
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


        $http.get('/api/note/list/').success(function(data){
            controller.major_tree = data;
        });

        window.setInterval(controller.applyDiff, 5000);
    });

})();
