;(function ($) {
  // Tweak the proportions of teaser image to teaser text. This should be moved to the templating layer instead.

  var columns = 12

  if ($('.campl-tertiary-navigation').length > 0) {
    columns = columns - 3
  }
  if ($('.campl-main-content-sub-column').length > 0) {
    columns = columns - 3
  }
  if ($('.campl-secondary-content').length > 0) {
    columns = columns - 3
  }

  var imageWidth = 6

  if (columns == 12) {
    imageWidth = 3
  } else if (columns >= 9) {
    imageWidth = 4
  }

  var textWidth = 12 - imageWidth

  $('.campl-horizontal-teaser-img')
    .parent('.campl-column6')
    .removeClass('campl-column6')
    .addClass('campl-column' + imageWidth)
  $('.campl-horizontal-teaser-txt')
    .parent('.campl-column6')
    .removeClass('campl-column6')
    .addClass('campl-column' + textWidth)

  // Add classes to tables that are missing them and remove potentially style-breaking attributes. This should be moved to the templating layer instead.

  $('table:not(.campl-table):not(.campl-table-custom)', '.campl-content .field')
    .addClass(
      'campl-table campl-table-bordered campl-table-striped campl-vertical-stacking-table',
    )
    .attr('border', 0)
    .attr('cellpadding', 0)
    .attr('cellspacing', 0)
    .attr('style', null)
})(jQuery)
