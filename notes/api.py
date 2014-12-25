from django.shortcuts import get_object_or_404
from django.forms.models import model_to_dict
from django.db import transaction
from django.core.exceptions import ValidationError

from .models import Note, UserProfile


# utility functions

def get_note_children(response, root):
    '''
    Recursive function which constructs a tree of notes that are expanded in
    the major or minor panes, starting at the specified root. Should be called
    with 'response' as an empty dictionary which the function will populate
    recursively.
    '''
    children = root.immediate_children()
    if root:
        response = model_to_dict(root)
        response['uuid'] = str(response['uuid']) # js can't handle long numbers
        if response['parent']:
            response['parent'] = str(response['parent'])
    if children:
        response['children'] = [get_note_children(response, child) for child
                                in children if
                                child.parent.expanded_in_major_pane or
                                child.parent.expanded_in_minor_pane]
    return response # base case

def get_note_path(note):
    '''
    Get the path of a note relative to the root of the tree. Returns a list of
    indices.
    '''
    path = []
    path.append(note.position)
    while note.parent is not None:
        path[:0] = [note.parent.position] # prepend to list
        note = note.parent
    return path


# api functions

def tree(user):
    '''
    Get a user's tree (a nested dictionary of all notes that are expaned
    either in the major and minor panes) and a path to the user's focused
    note.
    '''
    profile = UserProfile.objects.get(user=user)
    focused_note = profile.focused_note
    root_notes = profile.root_notes()
    tree = []
    for note in root_notes:
        tree.append(get_note_children({}, root=note))
    focused_note_path = get_note_path(focused_note)
    return (tree, focused_note_path)

def search(user, query):
    '''
    Case-insensitive search though a user's notes for the specified query.
    Returns a dictionary of matching notes.
    '''
    search_results = Note.objects.filter(user=user,
                                         text__icontains=query)
    return [model_to_dict(result) for result in search_results]

def insert(user, note, parent_id, position, text=''):
    '''
    Inserts a Note with a specified parent at the specified position. 'note'
    can be either a primary key or a Note object. If a Note object is passed,
    the 'text' argument is ignored.
    '''
    if parent_id == 0: # this will be a top-level note
        parent_note = None
    else:
        parent_note = get_object_or_404(Note, pk=parent_id, user=user)
    following_sibling_notes = Note.objects.filter(parent=parent_note,
                                   position__gte=position)\
                                  .order_by('-position')
    with transaction.atomic():
        for note in following_sibling_notes:
            # shift subsequent notes down to make room for the new one
            note.position += 1
            note.save()
        if isinstance(note, Note):
            new_note = note
            new_note.parent = parent_note
            new_note.position = position
        else:
            new_note = Note(pk=note_id, parent=parent_note, position=position,
                            text=text, user=user,
                            number=parent_note.next_note_number())
        new_note.save()
    return new_note

def update(user, note_id, text):
    '''
    Update a note with the supplied text.
    '''
    note = get_object_or_404(Note, pk=note_id, user=user)
    note.text = text
    note.save()
    return note

def delete(user, note):
    '''
    Delete a note at the specified postion, shift its siblings and children
    accordingly. 'note' can be either a primary key or a Note object.
    '''
    if not isinstance(note, Note):
        note = get_object_or_404(Note, pk=note, user=user)
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
            next_position = preceding_sibling_note.next_child_position()
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
    dedent = bool(not preceding_sibling_note)
        # dedent: were children of the deleted note dedented?
    return dedent

def expand_collapse(user, note_id, major_pane):
    '''
    Toggle a note's expanded/collapsed state. Returns a tuple. If the note
    was expanded, the second value of the tuple contains a tree of the note's
    children.
    '''
    note = Note.objects.get(pk=note_id, user=user)
    if major_pane:
        note.expanded_in_major_pane = expanded =\
                                            not note.expanded_in_major_pane
    else:
        note.expanded_in_minor_pane = expanded =\
                                            not note.expanded_in_minor_pane
    note.save()
    if expanded:
        tree = get_note_children({}, major_pane=major_pane, root=note)
        return (note, tree)
    else:
        return (note, None)

def indent(user, note_id, indent):
    '''
    Indent or dedent a note with the specified primary key. 'indent' should be
    a boolean: True for indent, False for dedent.
    '''
    note = get_object_or_404(Note, pk=note_id, user=user)
    parent = note.parent
    position = note.position
    if indent:
        preceding_sibling_note = Note.objects.filter(parent=parent,
                                                     position__lt=position)\
                                                   .order_by('position').last()
        if not preceding_sibling_note:
            raise ValidationError('This note can\'t be indented because it '
                                  'has no preceding siblings.')
        next_position = preceding_sibling_note.next_child_position()
        note.parent = preceding_sibling_note
        note.position = next_position
        note.save()
    else: # dedent
        if parent is None:
            raise ValidationError('This note can\'t be dedented because it is '
                                  'already at the top level.')
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
    return note

def change_permissions(user, note_id):
    '''
    Recursively change permissions of a note starting with the specified
    primary key.
    '''
    note = get_object_or_404(Note, pk=note_id, user=user)
    def set_permissions(root):
        root.public = public
        root.save()
        children = root.immediate_children()
        for child in children:
            set_permissions(child)
    set_permissions(note)
    return note

def update_focus(user, note_id):
    '''
    Update (or set) a user's focused note (the note that shows up at the top
    of the major pane).
    '''
    note = get_object_or_404(Note, pk=note_id, user=user)
    profile = UserProfile.objects.get(user=user)
    profile.focused_note = note
    profile.save()
