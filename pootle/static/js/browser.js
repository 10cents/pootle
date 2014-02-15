(function ($) {

  window.PTL = window.PTL || {};

  var sel = {
    breadcrumbs: '.js-breadcrumb',
    navigation: '#js-select-navigation',
    language: '#js-select-language',
    project: '#js-select-project',
    resource: '#js-select-resource'
  };

  var actionMap = {
    'overview': '',
    'translate': 'translate',
    'admin-permissions': 'admin/permissions',
    'admin-languages': 'admin/languages',
    'admin-terminology': 'terminology',
  };

  var makeNavDropdown = function (selector, opts) {
    var defaults = {
        allowClear: true,
        dropdownAutoWidth: true,
        dropdownCssClass: 'breadcrumb-dropdown',
        width: 'off'
      },
      opts = $.extend({}, defaults, opts);

    return PTL.utils.makeSelectableInput(selector, opts,
      function (e) {
        var $select = $(this),
            $opt = $select.find('option:selected'),
            href = $opt.data('href'),
            openInNewTab;

        if (href) {
          openInNewTab = $opt.data('new-tab');

          if (openInNewTab) {
            window.open(href, '_blank');
            // Reset drop-down to its original value
            $select.select2('val', $select.data('initial-code'));
          } else {
            window.location.href = href;
          }

          return false;
        }

        var langCode = $(sel.language).val(),
            projectCode = $(sel.project).val(),
            $resource = $(sel.resource),
            resource = $resource.length ? $resource.val()
                                                   .replace('ctx-', '')
                                        : '';
        PTL.browser.navigateTo(langCode, projectCode, resource);
      }
    );
  };

  var fixDropdowns = function (e) {
    // We can't use `e.persisted` here. See bug 2949 for reference
    var selectors = [sel.navigation, sel.language, sel.project, sel.resource];
    for (var i=0; i<selectors.length; i++) {
      var $el = $(selectors[i]),
          initial = $el.data('initial-code');
      $el.select2('val', initial);
    }
    PTL.browser.fixResourcePathBreadcrumbGeometry();
    $(sel.breadcrumbs).css('visibility', 'visible');
  };

  var formatResource = function (path, container, query) {
    var $el = $(path.element);

    if ($el.prop('disabled')) {
      return '';
    }

    var t = '/' + path.text.trim();

    if (query.term !== '') {
      var escaped_term = query.term.replace(
            /[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g,
            '\\$&'
          ),
          regex = new RegExp(escaped_term, 'gi');
      t = t.replace(regex, '<span class="select2-match">$&</span>');
    }

    return [
      '<span class="', $el.data('icon'), '">',
        '<i class="icon-', $el.data('icon'), '"></i>',
        '<span class="text">', t, '</span>',
      '</span>'
    ].join('');
  };

  var removeCtxEntries = function (results, container, query) {
    if (query.term) {
      return _.filter(results, function (result) {
        return result.id.slice(0, 4) !== 'ctx-';
      });
    }
    return results;
  };


  PTL.browser = {

    init: function () {
      makeNavDropdown(sel.navigation, {
        minimumResultsForSearch: -1
      });
      makeNavDropdown(sel.language, {
        placeholder: gettext("All Languages")
      });
      makeNavDropdown(sel.project, {
        placeholder: gettext("All Projects")
      });
      makeNavDropdown(sel.resource, {
        placeholder: gettext("Entire Project"),
        formatResult: formatResource,
        sortResults: removeCtxEntries
      });

      /* Adjust breadcrumb layout on window resize */
      $(window).on("resize", function (e) {
        PTL.browser.fixResourcePathBreadcrumbGeometry();
      });
    },

    /* Navigates to `languageCode`, `projectCode`, `resource` while
     * retaining the current context when applicable */
    navigateTo: function (languageCode, projectCode, resource) {
      var curProject = $(sel.project).data('initial-code'),
          curLanguage = $(sel.language).data('initial-code'),
          $resource = $(sel.resource),
          curResource = $resource.length ? $resource.data('initial-code')
                                                    .replace('ctx-', '') : '',
          langChanged = languageCode !== curLanguage,
          projChanged = projectCode !== curProject,
          resChanged = resource !== curResource,
          hasChanged = langChanged || projChanged || resChanged;

      if (!hasChanged) {
        return;
      }

      if (!languageCode) {
        languageCode = 'projects';
      }
      if (projectCode === '' || projChanged) {
        resource = '';
      }

      var action = actionMap[$(sel.navigation).val()],
          parts = ['', languageCode, projectCode, action, resource],
          urlParts = parts.filter(function (p, i) {
            return i === 0 || p !== '';
          }),
          newUrl;

      if (!resource) {
        urlParts.push('');
      }

      newUrl = l(urlParts.join('/'));

      if (PTL.hasOwnProperty('editor')) {
        var hash = PTL.utils.getHash().replace(/&?unit=\d+/, '');
        if (hash !== '') {
          newUrl = [newUrl, hash].join('#');
        }
      }

      var changed = projChanged ? 'project' :
                    langChanged ? 'language' : 'resource';
      $.cookie('user-choice', changed, {path: '/'});

      // Remember the latest language the user switched to
      if (langChanged) {
        $.cookie('pootle-language', languageCode, {path: '/'});
      }

      window.location.href = newUrl;
    },

    /* Recalculate breadcrumb geometry on window resize */
    fixResourcePathBreadcrumbGeometry: function () {
      var $projectDropdown = $('#s2id_js-select-project');
      var $resourceDropdown = $('#s2id_js-select-resource');

      var sideMargin = $('#s2id_js-select-navigation').position().left;

      var maxHeaderWidth = $('#header-meta').outerWidth() - sideMargin;
      var resourceDropdownLeft = $resourceDropdown.position().left;

      var maxWidth = maxHeaderWidth - resourceDropdownLeft;
      $resourceDropdown.css("max-width", maxWidth);
    },

  };

  $(window).on('pageshow', fixDropdowns);

}(jQuery));


$(function () {
  PTL.browser.init();
});
