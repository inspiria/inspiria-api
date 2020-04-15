$( document ).ready(function() {
  console.log('Practice quiz script loaded.');
  $('.pq-active').click(function() {
    if(!$(this).attr('clicked')) {
      $(this).attr('clicked',1);
      var obj = new xAPIObject('practiceQuiz',$(this).parent().attr('pq-id'));
      var result = new xAPIResult('unknown',$(this).attr('pq-order-number'), $(this).text());
      if($(this).attr('pq-value')==1) {
        $(this).addClass('list-group-item-success pq-correct');
        $(this).removeClass('pq-active');
        result.status = 'correct';
        var remaining_correct = 0;
        $(this).siblings().each(function() {
          if($(this).attr('pq-value')==1 && $(this).hasClass('pq-active')) remaining_correct+=1;
        });
        if(remaining_correct==0) {
			$(this).siblings().each(function() {
			  if($(this).hasClass('pq-active')) {
				  $(this).attr('clicked',1);
				  $(this).addClass('list-group-item-light pq-incorrect');
				  $(this).removeClass('pq-active');
			  }
			});
        }
        if(disallow_tracking != true) new xAPIStatement('answered',obj,null,result).store();
      } else {
        $(this).addClass('list-group-item-light pq-incorrect');
        $(this).removeClass('pq-active');
        result.status = 'incorrect';
        if(disallow_tracking != true) new xAPIStatement('answered',obj,null,result).store();
      }
    }
  });


  $('.survey-active').click(function() {
    if(!$(this).attr('clicked')) {
      $(this).attr('clicked',1);
      var obj = new xAPIObject('survey',$(this).parent().attr('data-survey-id'));
      var result = new xAPIResult('chosen',$(this).attr('data-survey-order-number'), $(this).text());
      $(this).removeClass('list-group-item-light survey-unselected');
      $(this).addClass('list-group-item-success survey-selected');
      result.status = 'chose';
			$(this).siblings().each(function() {
			  if($(this).hasClass('survey-active')) {
				  $(this).addClass('list-group-item-light survey-unselected');
			  }
        $(this).removeAttr('clicked');
			});
      if(!$(this).parent().attr('data-xapi-id')) {
        $(this).parent().attr('data-xapi-id', new xAPIStatement('answered',obj,null,result).store());
      } else {
        new xAPIStatement('answered',obj,null,result).store($(this).parent().attr('data-xapi-id'));
      }
    }
  });

    $('.answerKey > .card-header').click(function() {
      var obj = new xAPIObject('answerKey',$(this).text());
      if($(this).attr('aria-expanded')=='false') {
        $verb = 'opened';
      } else {
        $verb = 'closed';
      }
      var result = new xAPIResult('changed to',null, $verb);
      if(disallow_tracking != true) new xAPIStatement($verb,obj,null,result).store();
    });

  $('.text-entry').on('change keyup paste', function() {
    var obj = new xAPIObject('text_entry',$(this).attr('data-text_entry-id'));
    var result = new xAPIResult('entered',null,$(this).val());
    if(!$(this).attr('data-xapi-id')) {
      $(this).attr('data-xapi-id', new xAPIStatement('entered',obj,null,result).store());
    } else {
      new xAPIStatement('entered',obj,null,result).store($(this).attr('data-xapi-id'));
    }
  });
});
