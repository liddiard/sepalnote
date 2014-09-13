import json

from django.views.generic.base import View, TemplateView
from django.forms.models import model_to_dict
from django.core import serializers

from .models import Note, UserProfile


# utility functions

def get_note_children(response, major_pane, root):
    children = Note.objects.filter(parent=root)
    if major_pane:
        children = children.filter(expanded_in_major_pane=True)
    else: # minor_pane
        children = children.filter(expanded_in_minor_pane=True)
    if root:
        response = model_to_dict(root)
    if children: 
        response['children'] = [get_note_children(response, major_pane, child)
                                for child in children]
    return json.dumps(response) # base case


# single page views

class FrontView(TemplateView):
    pass


class NotesView(TemplateView):
    pass


# abstract base classes

class AjaxView(View):

    def json_response(self, **kwargs):
        return HttpResponse(json.dumps(kwargs), content_type="application/json")

    def success(self, **kwargs):
        return self.json_response(result=0, **kwargs)

    def error(self, error, message):
        return self.json_response(result=1, error=error, message=message)

    def authentication_error(self):
        return self.error("AuthenticationError", "User is not authenticated.")

    def access_error(self, message):
        return self.error("AccessError", message)

    def key_error(self, message):
        return self.error("KeyError", message)

    def does_not_exist(self, message):
        return self.error("DoesNotExist", message)

    def validation_error(self, message):
        return self.error("ValidationError", message)


class AuthenticatedAjaxView(AjaxView):

    def dispatch(self, request, *args, **kwargs):
        if request.user.is_authenticated():
            return super(AuthenticatedAjaxView, self).dispatch(request, *args,
                                                               **kwargs)
        else:
            return self.authentication_error()


# api views

class MajorPaneNotesView(AuthenticatedAjaxView):
    
    def get(self, request):
        focused_note_id = self.request.GET.get(focused_note)
        if focused_note_id is None:
            return self.key_error('Required key (focused_note) missing from '
                                  'request.')
        try:
            focused_note = Note.objects.get(id=focused_note_id)
        except Note.DoesNotExist:
            return self.does_not_exist('Note matching id %s not found.'\
                                        % focused_note_id)
        tree = get_note_children({}, major_pane=True, root=focused_note) 
        return self.success(notes=tree)


class MinorPaneNotesView(AuthenticatedAjaxView):
    
    def get(self, request):
        tree = get_note_children({}, major_pane=True, root=None) 
        return self.success(notes=tree)


class SearchView(AuthenticatedAjaxView):

    def get(self, request):
        query = self.request.GET.get(query)
        if query is None:
            return self.key_error('Required key (query) missing from request.')
        search_results = Note.objects.filter(text__icontains=query)
        response = serializers.serialize('json', search_results)
        return self.success(results=response)


class AddNoteView(AuthenticatedAjaxView):

    def post(self, request):
        # check for required keys
        # get parent Note
        # get child notes, filter by greater than requested position
        # shift greater than position down one
        # add new note
        pass


class DeleteNoteView(AuthenticatedAjaxView):

    def post(self, request):
        # check for required keys
        # get this Note
        # get sibling notes, filter by greater than requested position
        # delete note
        # shift greater than position up one
        pass


class ChangeNotePermissionsView(AuthenticatedAjaxView):

    def post(self, request):
        # check for required keys
        # get this Note
        # recursively set requested permissions for this note and child notes
        pass


class ExpandCollapseNoteView(AuthenticatedAjaxView):

    def post(self, request):
        # check required keys
        # get this Note
        # collapse/expand in requested pane
        pass
