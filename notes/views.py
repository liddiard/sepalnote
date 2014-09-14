import json

import jsonpickle

from django.http import HttpResponse
from django.views.generic.base import View, TemplateView
from django.forms.models import model_to_dict
from django.db import transaction
from django.utils.decorators import method_decorator # TODO: remove
from django.views.decorators.csrf import csrf_exempt # TODO: remove

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
    return response # base case


# single page views

class FrontView(TemplateView):
     
    template_name = "front.html"


class NotesView(TemplateView):

    template_name = "notes.html"


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

class MajorPaneNotesView(AuthenticatedAjaxView):
    
    def get(self, request):
        focused_note_id = request.GET.get('focused_note')
        if focused_note_id is None:
            return self.key_error('Required key (focused_note) missing from '
                                  'request.')
        try:
            focused_note = Note.objects.get(id=focused_note_id, 
                                            user=request.user)
        except Note.DoesNotExist:
            return self.does_not_exist('Note matching id %s not found.'\
                                        % focused_note_id)
        tree = get_note_children({}, major_pane=True, root=focused_note) 
        return self.success(notes=tree)


class MinorPaneNotesView(AuthenticatedAjaxView):
    
    def get(self, request):
        response = []
        root_notes = Note.objects.filter(user=request.user, parent=None)
        for note in root_notes:
            tree = get_note_children({}, major_pane=False, root=note) 
            response.append(tree)
        return self.success(notes=response)


class SearchNotesView(AuthenticatedAjaxView):

    def get(self, request):
        query = request.GET.get('query')
        if query is None:
            return self.key_error('Required key (query) missing from request.')
        search_results = Note.objects.filter(user=request.user,
                                             text__icontains=query)
        response = [model_to_dict(result) for result in search_results]
        return self.success(results=response)


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
        parent_id = json.loads(parent_id)
        if not parent_id: # this will be a top-level note
            parent_note = None
        else:
            try:
                parent_note = Note.objects.get(id=parent_id, user=request.user)
            except Note.DoesNotExist:
                return self.does_not_exist('Note matching id %s does not '
                                           'exist.' % parent_id)
        following_sibling_notes = Note.objects.filter(parent=parent_note, 
                                       position__gte=position)\
                                      .order_by('-position')
        with transaction.atomic():
            for note in following_sibling_notes:
                note.position += 1
                note.save()
            new_note = Note(parent=parent_note, position=position, text=text, 
                            user=self.request.user)
            new_note.save()
        return self.success(id=new_note.id)


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
        try:
            note = Note.objects.get(id=note_id, user=request.user)
        except Note.DoesNotExist:
            return self.does_not_exist('Note matching id %s does not exist.'\
                                       % note_id)
        note.text = text
        note.save()
        return self.success()


class DeleteNoteView(AuthenticatedAjaxView):

    # TODO: remove
    @method_decorator(csrf_exempt)
    def dispatch(self, *args, **kwargs):
        return super(DeleteNoteView, self).dispatch(*args, **kwargs)

    def post(self, request):
        note_id = request.POST.get('id')
        if note_id is None:
            return self.key_error('Required key (id) missing from request.')
        try:
            note = Note.objects.get(id=note_id, user=request.user)
        except Note.DoesNotExist:
            return self.does_not_exist('Note matching id %s does not exist.'\
                                       % note_id) 
        parent = note.parent
        position = note.position
        following_sibling_notes = Note.objects.filter(parent=parent, 
                                                      position__gt=position)\
                                              .order_by('position')
        preceding_sibling_note = Note.objects.filter(parent=parent, 
                                                     position__lt=position)\
                                             .order_by('position').last()
        children = note.immediate_children()
        with transaction.atomic():
            if preceding_sibling_note: 
                # the note we're deleting has siblings before it
                last_note = preceding_sibling_note.immediate_children()\
                                                  .order_by('position').last()
                if last_note:
                    next_position = last_note.number
                else:
                    next_position = 0
                # append the children of the deleted note to the previous
                # sibling
                for pos, note in enumerate(children):
                    note.parent = preceding_sibling_note
                    note.position = next_position + pos
                    note.save()
            else: # the note we're deleting doesn't have any siblings before it
                # dedent the children of the deleted note to make them children
                # of the deleted note's parent
                for pos, note in enumerate(children):
                    note.parent = parent
                    note.position = pos
                    note.save()
            note.delete()
            for note in following_sibling_notes:
                # shift subsequent siblings up one to keep numbering continuity
                note.position -= 1
                note.save()
        return self.success(dedent=bool(not preceding_sibling_note))
            # dedent: were children of the deleted note dedented?


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
        try:
            note = Note.objects.get(id=note_id, user=request.user)
        except Note.DoesNotExist:
            return self.does_not_exist('Note matching id %s does not exist.'\
                                       % note_id) 
        if major_pane:
            note.expanded_in_major_pane = expanded =\
                                                not note.expanded_in_major_pane
        else:
            note.expanded_in_minor_pane = expanded =\
                                                not note.expanded_in_minor_pane
        note.save()
        return self.success(id=note.id, major_pane=major_pane, 
                            expanded=expanded)


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
        try:
            note = Note.objects.get(id=note_id, user=request.user)
        except Note.DoesNotExist:
            return self.does_not_exist('Note matching id %s does not exist.'\
                                       % note_id) 
        parent = note.parent
        position = note.position
        if indent:
            preceding_sibling_note = Note.objects.filter(parent=parent, 
                                                        position__lt=position)\
                                                 .order_by('position').last()
            if not preceding_sibling_note:
                return self.validation_error('This note can\'t be indented '
                                             'because it has no preceding '
                                             'siblings.')
            last_note = preceding_sibling_note.immediate_children()\
                                              .order_by('position').last()
            if last_note:
                next_position = last_note.number
            else:
                next_position = 0
            note.parent = preceding_sibling_note
            note.position = next_position
            note.save()
        else: # dedent
            if parent is None:
                return self.validation_error('This note can\'t be dedented '
                                             'because it is already at the '
                                             'top level.')
            succeeding_siblings_of_parent = Note.objects.filter(
                                                parent=parent.parent,
                                                position__gt=parent.position)\
                                                .order_by('-position')
            with transaction.atomic():
                for sibling in succeeding_siblings_of_parent:
                    sibling.position += 1
                    sibling.save()
                note.parent = parent.parent
                note.save()
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
        try:
            note = Note.objects.get(id=note_id, user=request.user)
        except Note.DoesNotExist:
            return self.does_not_exist('Note matching id %s does not exist.'\
                                       % note_id) 
        def set_note_permissions(root):
            root.public = public 
            root.save()
            children = root.immediate_children() 
            for child in children:
                set_note_permissions(child)
        set_note_permissions(note)
        return self.success(id=note.id)
