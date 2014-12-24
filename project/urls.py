from django.conf.urls import patterns, include, url
from django.contrib import admin

from notes import views


urlpatterns = patterns('',
    # pages
    url(r'^$', views.FrontView.as_view(), name='front'),
    url(r'^note/', views.NotesView.as_view(), name='notes'),

    # fragments
    url(r'^fragment/note-major/', views.MajorNoteFragmentView.as_view()),
    url(r'^fragment/note-minor/', views.MinorNoteFragmentView.as_view()),

    # api
    url(r'^api/note/tree/$', views.NotesTreeView.as_view(), name='note_list'),
    url(r'^api/note/search/$', views.SearchNotesView.as_view(), name='note_search'),
    url(r'^api/note/diff/$', views.DiffNoteView.as_view(), name='note_diff'),
    url(r'^api/note/add/$', views.AddNoteView.as_view(), name='note_add'),
    url(r'^api/note/update/$', views.UpdateNoteView.as_view(), name='note_update'),
    url(r'^api/note/delete/$', views.DeleteNoteView.as_view(), name='note_delete'),
    url(r'^api/note/expand/$', views.ExpandCollapseNoteView.as_view(), name='note_expand'),
    url(r'^api/note/indent/$', views.IndentNoteView.as_view(), name='note_indent'),
    url(r'^api/note/change-permissions/$', views.ChangeNotePermissionsView.as_view(), name='note_permissions'),
    url(r'^api/userprofile/update-focused-note/$', views.UpdateFocusedNoteView.as_view(), name='userprofile_focused_note'),

    # admin
    url(r'^admin/', include(admin.site.urls)),
)
