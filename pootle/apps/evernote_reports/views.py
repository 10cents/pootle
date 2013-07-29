#!/usr/bin/env python
# -*- coding: utf-8 -*-
#
# Copyright 2013 Evernote Corporation
#
# This file is part of Pootle.
#
# This program is free software; you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation; either version 2 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program; if not, see <http://www.gnu.org/licenses/>.


from datetime import datetime

from django.contrib.auth.models import User
from django.db.models import Sum
from django.http import HttpResponse
from django.shortcuts import render_to_response
from django.template import RequestContext

from pootle_app.views.admin.util import user_is_admin
from pootle_misc.util import jsonify
from pootle_statistics.models import Submission, SubmissionFields


# Django field query aliases
LANG_CODE = 'translation_project__language__code'
LANG_NAME = 'translation_project__language__fullname'
PRJ_CODE = 'translation_project__project__code'
PRJ_NAME = 'translation_project__project__fullname'
INITIAL = 'submissionstats__initial_translation'
POOTLE_WORDCOUNT = 'unit__source_wordcount'
SOURCE_WORDCOUNT = 'submissionstats__source_wordcount'
ADDED_WORDS = 'submissionstats__words_added'
REMOVED_WORDS = 'submissionstats__words_removed'

# field aliases
DATE = 'creation_time_date'

STAT_FIELDS = ['n1', 'pootle_n1', 'added', 'removed']
INITIAL_STATES = ['new', 'edit']

@user_is_admin
def evernote_reports(request, context={}):
    cxt = context
    cxt.update({
        'users': map(
            lambda x: {'code': x.username, 'name': u'%s' % x },
            User.objects.hide_defaults()
        )
    })

    return render_to_response('evernote/reports.html', cxt,
                              context_instance=RequestContext(request))


def user_date_prj_activity(request):
    user = request.GET.get('user', None)

    try:
        user = User.objects.get(username=user)
    except:
        user = ''

    start_date = request.GET.get('start', None)
    end_date = request.GET.get('end', None)

    if start_date:
        start = datetime.strptime(start_date, '%Y-%m-%d')
    else:
        start = datetime.now()

    if end_date:
        end = datetime.strptime(end_date, '%Y-%m-%d')
    else:
        end = datetime.now()

    start = start.replace(hour=0, minute=0, second=0)
    end = end.replace(hour=23, minute=59, second=59)

    def get_item_stats(r={}):
        res = {}
        for f in STAT_FIELDS:
            res[f] = r[f] if (r.has_key(f) and r[f] is not None) else 0
        return res

    def create_total():
        return {
            INITIAL_STATES[0]: get_item_stats(),
            INITIAL_STATES[1]: get_item_stats()
        }

    json = {'total': create_total()}

    def aggregate(total, item):
        for f in STAT_FIELDS:
            total[f] += item[f]

    def add2total(total, subtotal):
        for t in ['new', 'edit']:
            aggregate(total[t], subtotal[t])

    if user:
        rr = Submission.objects.filter(
                submitter=user.pootleprofile,
                creation_time__gte=start,
                creation_time__lte=end,
                field=SubmissionFields.TARGET
            ).extra(select={DATE: "DATE(creation_time)"}) \
             .values(LANG_CODE, LANG_NAME, PRJ_CODE, PRJ_NAME, DATE, INITIAL) \
             .annotate(
                pootle_n1=Sum(POOTLE_WORDCOUNT),
                n1=Sum(SOURCE_WORDCOUNT),
                added=Sum(ADDED_WORDS),
                removed=Sum(REMOVED_WORDS)
            ).order_by(LANG_CODE, DATE)

        projects = {}
        res = {}

        saved_lang = None
        res_date = None
        lang_data = None

        for r in rr:
            cur_lang = r[LANG_CODE]
            cur_prj = r[PRJ_CODE]
            cur = get_item_stats(r)

            if cur_lang != saved_lang:
                if saved_lang != None and lang_data != None:
                    add2total(lang_data['total'], res_date['total'])
                    add2total(json['total'], lang_data['total'])

                saved_lang = cur_lang
                res[cur_lang] = {
                    'name': r[LANG_NAME],
                    'dates': [],
                    'sums': {},
                    'total': create_total()
                }

                lang_data = res[cur_lang]
                sums = lang_data['sums']

                saved_date = None

            if saved_date != r[DATE]:
                if saved_date is not None:
                    after_break = (r[DATE] - saved_date).days > 1
                    add2total(lang_data['total'], res_date['total'])

                else:
                    after_break = False

                saved_date = r[DATE]
                res_date = {
                    'date': datetime.strftime(saved_date, '%Y-%m-%d'),
                    'projects': {},
                    'after_break': after_break,
                    'total': create_total()
                }

                lang_data['dates'].append(res_date)

            if res_date is not None:
                if r[INITIAL]:
                    states = INITIAL_STATES
                else:
                    states = INITIAL_STATES[::-1]

                if sums.has_key(cur_prj):
                    aggregate(sums[cur_prj][states[0]], cur)
                else:
                    sums[cur_prj] = {
                        states[0]: get_item_stats(cur),
                        states[1]: get_item_stats()
                    }

                if res_date['projects'].has_key(cur_prj):
                    res_date['projects'][cur_prj].update({
                        states[0]: get_item_stats(cur)
                    })
                else:
                    res_date['projects'][cur_prj] = {
                        states[0]: get_item_stats(cur)
                    }

                aggregate(res_date['total'][states[0]], cur)
                projects[cur_prj] = r[PRJ_NAME]

        if lang_data is not None and res_date is not None:
            add2total(lang_data['total'], res_date['total'])
            add2total(json['total'], lang_data['total'])

        json['all_projects'] = projects
        json['results'] = res

    json['meta'] = {'user': u'%s' % user, 'start': start_date, 'end': end_date}
    response = jsonify(json)

    return HttpResponse(response, mimetype="application/json")


def users(request):
    json = list(
        User.objects.hide_defaults()
                    .select_related('evernote_account')
                    .values('id', 'username', 'first_name', 'last_name')
    )
    response = jsonify(json)

    return HttpResponse(response, mimetype="application/json")
