(function(){
    var app = angular.module('notes', []);

    app.controller('NotesController', function($http, $scope) {
        var form = this;
        define(function (require) {
            var diff = require('deep-diff');
        });
        this.major_tree = [];
        this.minor_tree = [];

        $http.get('/api/note/major-pane/').success(function(data){
            form.major_tree = data;

            /* listen for changes in notes */
            $scope.$watch(
                function() { return form.major_tree },
                function() {
                    console.log('note changed');
                },
                true // objectEquality
            );
        });
    });
})();
