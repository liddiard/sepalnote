$(document).ready(function(){
    ajaxGet({}, '/api/note/minor-pane/', function(response){
        for (var i = 0; i < response.notes.length; i++) {
            notesJSONtoDOM(response.notes[i], $('aside ul'));
        }
    });
    ajaxGet({}, '/api/note/major-pane/', function(response){
        notesJSONtoDOM(response.notes, $('main ul'));
    });
});

function notesJSONtoDOM(root_json, root_dom) {
    $('<li/>', {
        text: root_json.text,
    }).appendTo(root_dom);
    if (typeof root_json.children !== 'undefined' && root_json.children.length > 0) {
        var $list = $('<ul/>', {}).appendTo(root_dom);
        for (var i = 0; i < root_json.children.length; i++) {
            notesJSONtoDOM(root_json.children[i], $list);
        }
    }
}


/* utility functions */

function getCookie(name) {
    var cookieValue = null;
    if (document.cookie && document.cookie != '') {
        var cookies = document.cookie.split(';');
        for (var i = 0; i < cookies.length; i++) {
            var cookie = jQuery.trim(cookies[i]);
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) == (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

function ajaxGet(params, endpoint, callback_success) {
    $.ajax({
        type: "GET",
        url: endpoint,
        data: params,
        success: callback_success,
        error: function(xhr, textStatus, errorThrown) {
            if (xhr.status != 0)
                console.error('Oh no! Something went wrong. Please report this error: \n'+errorThrown+xhr.status+xhr.responseText);
        }
    }); 
}

function ajaxPost(params, endpoint, callback_success) {
    params.csrfmiddlewaretoken = getCookie('csrftoken');
    $.ajax({
        type: "POST",
        url: endpoint,
        data: params,
        success: callback_success,
        error: function(xhr, textStatus, errorThrown) {
            if (xhr.status != 0)
                console.error("Oh no! Something went wrong. Please report this error: \n"+errorThrown+xhr.status+xhr.responseText);
        }
    }); 
}
