// globals
window.SYNC_WAIT_TIME = 3000; // ms

$(document).ready(function(){
    ajaxGet({}, '/api/note/minor-pane/', function(response){
        for (var i = 0; i < response.notes.length; i++) {
            notesJSONtoDOM(response.notes[i], $('aside ul'));
        }
        bindNoteEvents($('aside li'));
    });
    ajaxGet({}, '/api/note/major-pane/', function(response){
        notesJSONtoDOM(response.notes, $('main ul'));
        bindNoteEvents($('main li'));
    });

});

function notesJSONtoDOM(root_json, root_dom) {
    $('<li/>', {
        text: root_json.text,
        'data-id': root_json.id,
        contenteditable: true
    }).appendTo(root_dom);
    if (typeof root_json.children !== 'undefined' && root_json.children.length > 0) {
        var $list = $('<ul/>', {}).appendTo(root_dom);
        for (var i = 0; i < root_json.children.length; i++) {
            notesJSONtoDOM(root_json.children[i], $list);
        }
    }
}

function bindNoteEvents($el) {
    $el.keypress(function(){
        console.log('keypress');
        var $note = $(this);
        if (this.timeoutId)
            window.clearTimeout(this.timeoutId);
        this.timeoutId = window.setTimeout(function(){
            ajaxPost(
                {id: $note.attr('data-id'), text: $note.text()},
                '/api/note/update/',
                function(response){ console.log(response) }
            );
        }, window.SYNC_WAIT_TIME);
    });
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
