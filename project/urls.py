from django.conf.urls import patterns, include, url
from django.contrib import admin


urlpatterns = patterns('',
    # Examples:
    url(r'^$', 'notes.views.FrontView', name='front'),
    url(r'^note/', 'notes.views.NotesView'),
    url(r'^admin/', include(admin.site.urls)),
)
