(function(){
    var app = angular.module('notes', []);

    app.controller('NotesController', function($http, $scope, $timeout) {
        var controller = this;
        this.major_tree = [];
        this.minor_tree = [];

        this.keyHandler = function(event, config) {
            if (event.keyCode === 13) // enter
                controller.addNote(config.insertAfter, config.parent);
            else if (event.shiftKey && event.keyCode === 9)
                console.log('shift + tab pressed');
            else if (event.keyCode === 9) // tab
                console.log('tab pressed');
            else if (event.keyCode === 8) // backspace
                console.log('backspace pressed');
        }

        this.noteFromPath = function(path) {
            var note = controller.major_tree;
            for (var i = 0; i < path.length-1; i++) {
                note = note[path[i]];
            }
            return note;
        };

        this.applyDiff = function(diff) {
            for (var i = 0; i < diff.length; i++) {
                if (diff[i].path[diff[i].path.length-1] === "$$hashKey") // angular adds these. we want to ignore them.
                    continue;
                else if (diff[i].kind === 'E') {
                    var note = controller.noteFromPath(diff[i].path);
                    $http({
                        method: 'POST',
                        url: '/api/note/update/',
                        data: $.param({id: note.id, text: note.text}),
                        headers: {'Content-Type': 'application/x-www-form-urlencoded'}
                    });
                }
            }
        };

        this.addNote = function(insertAfter, parent) {
            if (parent.children[insertAfter].children)
                parent.children[insertAfter].children.splice(0, 0, {text: ''});
            else
                parent.children.splice(insertAfter+1, 0, {text: ''});
            $timeout(function(){ // wait until the DOM has updated
                // move focus to the next (newly created) note
                var inputs = document.getElementById('notes').getElementsByTagName('input');
                angular.element(inputs).eq( getIndex(inputs, document.activeElement)+1 )[0].focus();
            });
        };

        $http.get('/api/note/major-pane/').success(function(data){
            controller.major_tree = data;

            /* listen for changes in notes */
            $scope.$watch(
                function() { return controller.major_tree },
                function(newValue, oldValue) {
                    var diff = DeepDiff(oldValue, newValue);
                    if (diff)
                        controller.applyDiff(diff);
                },
                true // objectEquality
            );
        });
    });

})();
