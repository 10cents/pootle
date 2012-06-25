$(document).ready(function () {
  /* Sorts language names within select elements */
  var ids = ["id_languages", "id_alt_src_langs", "-language",
             "-source_language"];

  $.each(ids, function (i, id) {
    var selects = $("select[id$='" + id + "']");
    $.each(selects, function (i, select) {
      var select = $(select);
      var options = $("option", select);

      if (options.length) {
        if (!select.is("[multiple]")) {
          var selected = $(":selected", select);
        }
        var opsarray = $.makeArray(options);
        opsarray.sort(function (a,b) {
          return $(a).text() > $(b).text()
        });
        options.remove();
        select.append($(opsarray));
        if (!select.is("[multiple]")) {
          select.get(0).selectedIndex = $(opsarray).index(selected);
        }
      }
    });
  });

  /* Sliding table within admin dashboard */
  var slide_table = function (event) {
    event.preventDefault();
    $.ajax({
      url: l('/admin/stats/more'),
      dataType: 'json',
      beforeSend: function () {
        $(".slide").unbind('click', slide_table);
      },
      error: function () {
        $(".slide").bind('click', slide_table);
      },
      success: function (data) {
        var newstats = '';
        $(data).each(function () {
          newstats += '<tr><th scope="row">' + this[0] + '</th>'
                      + '<td class="stats-number">' + this[1] + '</td></tr>';
        });
        $("tbody.slidethis").append(newstats);
        $("tbody.slidethis").slideDown("fast");
        $("tbody.slidethis").next("tbody").remove();
      }
    });
  };
  $(".slide").bind('click', slide_table);

  /* Sets background color to table rows when checking selects */
  $("td.DELETE input[type=checkbox]").change(function (e) {
      $(this).parents("tr").toggleClass("delete-selected",
                                        $(e.target).is(":checked"));
  });
  $("td[class!=DELETE] input[type=checkbox]").change(function (e) {
    if (!$("input[type=checkbox][checked]",
        $(this).parent().siblings("td[class!=DELETE]")).length) {
      $(this).parents("tr").toggleClass("other-selected",
                                        $(e.target).is(":checked"));
    }
  });


  /* Selects all checkboxes */
  $("th input").click(function (e) {
      var className = e.target.id.split('-').reverse()[0];
      $("td." + className + " input").prop("checked",
                                           $(e.target).is(":checked"));
      $("td." + className + " input").change();
  });


  /* Initialise description data and form */
  $('#edit_settings, #show_settings').click(function(e) {
    _toggle_editing();
  });
  _init_description();

  function _toggle_editing() {
    $('.intro, .js-admin-description, #edit_settings, #show_settings, #hide_description').slideToggle();
  }
  function _init_description() {
    $(".intro,").filter(":not([dir])").bidi();
    $('.js-admin-description form').submit(function (e) {
      e.preventDefault();
      $.ajax({
        url: $(this).attr('action'),
        type: 'POST',
        data: $(this).formSerialize(), //from jquery.form.js
        success: function (data) {
          $('.intro').html(data.intro);
          $('.js-admin-description').html(data.form);
          _init_description();
          if (data.valid) {
            _toggle_editing();
          }
        }
      });
    });
  }

});
