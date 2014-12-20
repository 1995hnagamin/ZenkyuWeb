var Grobal = {};

(function() {
  var val = localStorage.getItem("Zenkyu.Courses");
  Grobal.Courses = (val ? JSON.parse(val) : Data);
  
  val = localStorage.getItem("Zenkyu.Lectures");
  Grobal.Lectures = (val ? JSON.parse(val) : Presence);
})();

function courses() {
  return Grobal.Courses;
}

function lectures() {
  return Grobal.Lectures;
}

function count_absence(course) {
  return _.where(lectures(),{
    presence: "Absent",
    courseid: course.courseid
  }).length;
}

function concat_templated_elements(arr, parent_el, template) {
  var text = _.reduce(arr, function(x, y) {
    return x + template(y);
  }, "");
  return parent_el(text);
}

Template = {};

Template.ScheduleElemView = 
  _.template($("#schedule-elem-view").html());

Template.ScheduleView = 
  _.template($("#schedule-view").html());


function get_course(dow, period) {
  return _.findWhere(courses(), {dow: dow, period: period});
}

function make_count_view(n) {
  return (n === 0 ? "" : "(" + n + ")");
}

function render_schedule_view() {
  var dows = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  var periods = [1, 2, 3, 4, 5];
  var make_row = function(dow, row) {
    return "<tr><td>" + dow + "</td>" + row + "</tr>";
  };
  
  var contents = concat_templated_elements(
      dows,
      function(x) { return x; },
      function(dow) {
        return concat_templated_elements(
          periods,
          _.partial(make_row, dow),
          function(period) {
            var course = get_course(dow, period);
            return Template.ScheduleElemView({
              dow: dow,
              period: period,
              name: (course ? course.name:""),
              count: (course ? 
                make_count_view(count_absence(course)):"")
            }); 
          }
        );
      }
    );

  var header = _.reduce(periods, function(acc, period) {
    return acc + "<td>" + period + "</td>";
  }, "");
  
  $("#main").html(Template.ScheduleView({
    header: header,
    contents: contents
  }));
  
  _.forEach(courses(), function(course, i) {
    $("#" + course.dow + course.period).click(function() {
      render_lectures_view(course);
    });
  });
}

Template.CourseView =
  _.template($("#course-view").html());

function get_condition(course) {
  var present = 0, absent = 0, canceled = 0;
  _.forEach(get_lectures(course), function(lecture, i_) {
    if (lecture.presence == "Present") {
      present++;
    } else if (lecture.presence == "Absent") {
      absent++;
    } else if (lecture.presence == "Canceled") {
      canceled++;
    }
  });

  return {
    present: present,
    absent: absent,
    canceled: canceled
  };
}

function render_lectures_view(course) {
  if (!course) return;
  var dowsmap = {
    Sun: "日曜",
    Mon: "月曜",
    Tue: "火曜",
    Wed: "水曜",
    Thu: "木曜",
    Fri: "金曜",
    Sat: "土曜"
  };

  var condition = get_condition(course);

  $("#main").html(Template.CourseView({    
    dow: dowsmap[course.dow],
    period: course.period,
    name: course.name,
    lectures: render_lectures_list_view(get_lectures(course)),
    present: condition.present,
    canceled: condition.canceled,
    absent: condition.absent
  }));
}

function format_date(date) {
  if (typeof(date) == "string") date = new Date(date);
  var dows = "日月火水木金土";
  return "" + (date.getMonth() + 1) + "/" + date.getDate() +
    " (" + dows[date.getDay()] + ")";
}

Template.LectureView =
  _.template($("#lecture-view").html());

function render_lectures_list_view(lectures) {
  var presence_string = {
    Present: "出席",
    Absent: "自主休講",
    Canceled: "休講"
  };
  return _.reduce(lectures, function (acc, lecture) {
    return acc + Template.LectureView({
      date: format_date(lecture.date),
      presence: presence_string[lecture.presence],
      memo: lecture.memo
    });
  }, "");
}

function get_lectures(course) {
  return _.filter(lectures(), function(lecture) {
    return lecture.courseid == course.courseid;
  });
}

Template.EditTodaysConditionsView =
  _.template($("#edit-todays-conditions-view").html());

Template.ConditionEditor =
  _.template($("#condition-editor-view").html());

function render_editor_list_view(courses) {
  return concat_templated_elements(
      courses,
      function(children) {
        return children;
      },
      function(course) {
        return Template.ConditionEditor({
          id: "edit" + course.courseid,
          period: course.period,
          name: course.name
        });
      }
    );
}

function push_lecture(lecture) {
  Grobal.Lectures.push(lecture);
  localStorage.setItem(
      "Zenkyu.Lectures", 
      JSON.stringify(Grobal.Lectures));
}

function manage_condition_input(course, date) {
  $("#prompt").html($("#prompt-view").html());
  $("#prompt").dialog({
    modal: true,
    title: course.name,
    buttons: {
      "submit": function() {
        push_lecture({
          courseid: course.courseid,
          date: date,
          presence: $("#prompt-presence").val(),
          memo: $("#prompt-memo").val()
        });
        render_edit_todays_condition_view();
        $(this).dialog("close");
        $("#prompt").remove();
      },
      "cancel": function() {
        $(this).dialog("close");
        $("#prompt").remove();
      }
    }
  });
}

function equal_day(day1, day2) {
  if (typeof(day1) == "string") day1 = new Date(day1);
  if (typeof(day2) == "string") day2 = new Date(day2);
  
  return (day1.getDate() == day2.getDate())
    && (day1.getMonth() == day2.getMonth());
}

function not_logged(course, date) {
  var ls = lectures();
  var i, len = ls.length;
  for (i = 0; i < len; i++) {
    if ((course.courseid.toString() == ls[i].courseid.toString()) 
        && (equal_day(date, ls[i].date))) {
      return false;
    }
  }
  return true;
}

function render_edit_todays_condition_view() {
  var dows = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    //  today = new Date(),
      today = new Date("Dec 17, 2014");
      dow = dows[today.getDay()],
      periods = [1,2,3,4,5];

  var todays_courses = _.sortBy(
      _.filter(courses(), function(course) {
        return ((course.dow == dow) && (not_logged(course, today)));
      }),
      function(course) {
        return course.period;
      });

  var editor_list = (todays_courses.length > 0 ?
      render_editor_list_view(todays_courses):
      "今日の授業はもうありません.");

  $("#main").html(Template.EditTodaysConditionsView({
    month: today.getMonth() + 1,
    date: today.getDate(),
    editor_list: editor_list
  }));

  _.forEach(todays_courses, function(course) {
    $("#edit" + course.courseid).click(function() {
      manage_condition_input(course, today);
      render_edit_todays_condition_view();
    });
  });
}
