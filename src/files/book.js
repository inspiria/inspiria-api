$(document).ready(function () {
  $(".pq-active").click(function () {
    if (!$(this).attr("clicked")) {
      $(this).attr("clicked", 1);
      var result = {
        status: "unknown",
      };
      if ($(this).attr("pq-value") == 1) {
        $(this).addClass("list-group-item-success pq-correct");
        $(this).removeClass("pq-active");
        result.status = "correct";
        var remaining_correct = 0;
        $(this)
          .siblings()
          .each(function () {
            if ($(this).attr("pq-value") == 1 && $(this).hasClass("pq-active"))
              remaining_correct += 1;
          });
        if (remaining_correct == 0) {
          $(this)
            .siblings()
            .each(function () {
              if ($(this).hasClass("pq-active")) {
                $(this).attr("clicked", 1);
                $(this).addClass("list-group-item-light pq-incorrect");
                $(this).removeClass("pq-active");
              }
            });
        }
      } else {
        $(this).addClass("list-group-item-light pq-incorrect");
        $(this).removeClass("pq-active");
        result.status = "incorrect";
      }
    }
  });

  $(".survey-active").click(function () {
    if (!$(this).attr("clicked")) {
      $(this).attr("clicked", 1);
      var result = {
        status: "chosen",
      };
      $(this).removeClass("list-group-item-light survey-unselected");
      $(this).addClass("list-group-item-success survey-selected");
      result.status = "chose";
      $(this)
        .siblings()
        .each(function () {
          if ($(this).hasClass("survey-active")) {
            $(this).removeClass("survey-selected");
            $(this).addClass("list-group-item-light survey-unselected");
          }
          $(this).removeAttr("clicked");
        });
    }
  });
});
