from django.contrib import admin

from notes.models import Note, UserProfile


class NoteAdmin(admin.ModelAdmin):
    pass


admin.site.register(Note, NoteAdmin)


class UserProfileAdmin(admin.ModelAdmin):
    pass


admin.site.register(UserProfile, UserProfileAdmin)
