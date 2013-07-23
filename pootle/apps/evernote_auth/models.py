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

from django.db import models

class EvernoteAccountManager(models.Manager):
    def get_query_set(self):
        return super(EvernoteAccountManager, self) \
            .get_query_set() \
            .select_related(depth=1)

class EvernoteAccount(models.Model):
    objects = EvernoteAccountManager()

    evernote_id = models.IntegerField(db_index=True)
    name = models.CharField(max_length=255, db_index=True)
    email = models.EmailField()

    user = models.OneToOneField('auth.User', related_name='evernote_account',
                                unique=True)
    user_autocreated = models.BooleanField()

    def __unicode__(self):
        return "Name: %s; E-mail: %s;" % (self.name, self.email)
