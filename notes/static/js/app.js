(function(){
    var app = angular.module('notes', []);

    app.controller('NotesController', function($http) {
        var form = this;
        this.major_tree = [];
        this.minor_tree = [];

        $http.get('/api/note/major-pane/').success(function(data){
            form.major_tree = data;
        });
    });

})();
