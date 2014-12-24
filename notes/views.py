import json

import jsonpickle

from django.http import HttpResponse
from django.views.generic.base import View, TemplateView
from django.utils.decorators import method_decorator # TODO: remove
from django.views.decorators.csrf import csrf_exempt # TODO: remove

from . import api


# single page views

class FrontView(TemplateView):

    template_name = "front.html"


class NotesView(TemplateView):

    template_name = "notes.html"



class MajorNoteFragmentView(TemplateView):

    template_name = "include/note_major.html"


class MinorNoteFragmentView(TemplateView):

    template_name = "include/note_minor.html"


# abstract base classes

class AjaxView(View):

    def json_response(self, **kwargs):
        return HttpResponse(jsonpickle.encode(kwargs), content_type="application/json")

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

class NotesTreeView(AuthenticatedAjaxView):

    def get(self, request):
        tree, focused_note_path = api.tree(request.user)
        return self.success(tree=tree, focused_note_path=focused_note_path)


class SearchNotesView(AuthenticatedAjaxView):

    def get(self, request):
        query = request.GET.get('query')
        if query is None:
            return self.key_error('Required key (query) missing from request.')
        results = api.search(user, query)
        return self.success(results=results)


class DiffNoteView(AuthenticatedAjaxView):

    def post(self, request):
        diff = json.loads(request.body)
        for change in diff:
            note = change['note']
            if change['kind'] == 'U':
                api.update(request.user, note['uuid'], note['text'])
            elif change['kind'] == 'C':
                api.add(request.user, note['uuid'], note['parent'],
                        note['position'], note['text'])
            else:
                print change
        return self.success()


class AddNoteView(AuthenticatedAjaxView):

    # TODO: remove
    @method_decorator(csrf_exempt)
    def dispatch(self, *args, **kwargs):
        return super(AddNoteView, self).dispatch(*args, **kwargs)

    def post(self, request):
        parent_id = request.POST.get('parent')
        if parent_id is None:
            return self.key_error('Required key (parent) missing from '
                                  'request.')
        position = request.POST.get('position')
        if position is None:
            return self.key_error('Required key (position) missing from '
                                  'request.')
        text = request.POST.get('text')
        if text is None:
            return self.key_error('Required key (text) missing from request.')
        try:
            parent_id = int(parent_id)
        except ValueError:
            return self.validation_error('Could not convert (parent) %s to an '
                                         'integer.' % parent_id)
        new_note = api.add(request.user, parent_id, position, text)
        return self.success(uuid=new_note.uuid)


class UpdateNoteView(AuthenticatedAjaxView):

    # TODO: remove
    @method_decorator(csrf_exempt)
    def dispatch(self, *args, **kwargs):
        return super(UpdateNoteView, self).dispatch(*args, **kwargs)

    def post(self, request):
        note_id = request.POST.get('id')
        if note_id is None:
            return self.key_error('Required key (id) missing from request.')
        text = request.POST.get('text')
        if text is None:
            return self.key_error('Required key (text) missing from request.')
        note = api.update(request.user, note_id, text)
        return self.success(uuid=note.uuid)


class DeleteNoteView(AuthenticatedAjaxView):

    # TODO: remove
    @method_decorator(csrf_exempt)
    def dispatch(self, *args, **kwargs):
        return super(DeleteNoteView, self).dispatch(*args, **kwargs)

    def post(self, request):
        note_id = request.POST.get('id')
        if note_id is None:
            return self.key_error('Required key (id) missing from request.')
        dedent = api.delete(request.user, note_id)
        return self.success(dedent=dedent)


class ExpandCollapseNoteView(AuthenticatedAjaxView):

    # TODO: remove
    @method_decorator(csrf_exempt)
    def dispatch(self, *args, **kwargs):
        return super(ExpandCollapseNoteView, self).dispatch(*args, **kwargs)

    def post(self, request):
        note_id = request.POST.get('id')
        if note_id is None:
            return self.key_error('Required key (id) missing from request.')
        major_pane = request.POST.get('major_pane')
        if major_pane is None:
            return self.key_error('Required key (major_pane) missing from '
                                  'request.')
        major_pane = json.loads(major_pane)
        note, tree = api.expand_collapse(request.user, note_id, major_pane)
        return self.success(id=note.id, major_pane=major_pane,
                            tree=tree)


class IndentNoteView(AuthenticatedAjaxView):

    # TODO: remove
    @method_decorator(csrf_exempt)
    def dispatch(self, *args, **kwargs):
        return super(IndentNoteView, self).dispatch(*args, **kwargs)

    def post(self, request):
        note_id = request.POST.get('id')
        if note_id is None:
            return self.key_error('Required key (id) missing from request.')
        indent = request.POST.get('indent')
        if indent is None:
            return self.key_error('Required key (indent) missing from '
                                  'request.')
        indent = json.loads(indent)
        note = api.indent(request.user, note_id, indent)
        return self.success(id=note.id, indent=indent)


class ChangeNotePermissionsView(AuthenticatedAjaxView):

    # TODO: remove
    @method_decorator(csrf_exempt)
    def dispatch(self, *args, **kwargs):
        return super(ChangeNotePermissionsView, self).dispatch(*args, **kwargs)

    def post(self, request):
        note_id = request.POST.get('id')
        if note_id is None:
            return self.key_error('Required key (id) missing from request.')
        public = request.POST.get('public')
        if public is None:
            return self.key_error('Required key (public) missing from '
                                  'request.')
        public = json.loads(public)
        note = api.change_permissions(request.user, note_id, public)
        return self.success(id=note.id)


class UpdateFocusedNoteView(AuthenticatedAjaxView):

    # TODO: remove
    @method_decorator(csrf_exempt)
    def dispatch(self, *args, **kwargs):
        return super(ChangeNotePermissionsView, self).dispatch(*args, **kwargs)

    def post(self, request):
        note_id = request.POST.get('id')
        if note_id is None:
            return self.key_error('Required key (id) missing from request.')
        note = api.update_focus(request.user, note_id)
        return self.success(id=note.id)
