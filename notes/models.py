from django.db import models
from django.contrib.auth.models import User


class Note(models.Model):
    user = models.ForeignKey(User)
    parent = models.ForeignKey('self', null=True, blank=True)
    position = models.PositiveIntegerField(db_index=True)
        # order in which the note should be displayed relative to siblings
    number = models.PositiveIntegerField(db_index=True)
        # note id unique *to this user*. used for pretty URL access to notes.
    text = models.TextField(blank=True)
    updated = models.DateTimeField(auto_now=True)
    public = models.BooleanField(default=False)
    expanded_in_minor_pane = models.BooleanField(default=False)
    expanded_in_major_pane = models.BooleanField(default=True)
    
    class Meta:
        unique_together = (('parent', 'position'), ('user', 'number'))
        ordering = ['position'] 

    def immediate_children(self):
        return Note.objects.filter(parent=self)

    def next_child_position(self):
        '''
        Returns the next available position for a child of this note.
        '''
        last_child = self.immediate_children().order_by('position').last()
        if last_child:
            return last_child.position + 1
        else:
            return 0

    def next_note_number(self):
        '''
        Returns the next sequential note number for this user. Note numbers are
        guaranteed to be sequential but NOT guaranteed to be contiguous.
        '''
        last_note = Note.objects.filter(user=self.user).order_by('number')\
                                                       .last()
        if last_note:
            return last_note.number + 1
        else:
            return 0

    def save(self, *args, **kwargs):
        if self.pk is None:
            self.number = self.next_note_number()
        super(Note, self).save(*args, **kwargs)

    def __unicode__(self):
        return self.text


class UserProfile(models.Model):
    user = models.OneToOneField(User)
    focused_note = models.ForeignKey('Note', null=True, blank=True)
    spellcheck = models.BooleanField(default=True)
    
    def root_notes(self):
        return Note.objects.filter(user=self.user, parent=None) 
        
    def __unicode__(self):
        return self.user
