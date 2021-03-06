/*jslint browser:true, sloppy: true, plusplus: true */
/*globals $: false, config: false */

var dashboardLastUpdatedTime = new Date(),
    sounds = [],
    soundQueue = {
        add: function (sound_url) {
            sounds.push(sound_url);
        },
        play: function () {
            if (sounds.length > 0) {
                var soundPlayer = $("#sound")[0];
                if (soundPlayer.paused) {
                    soundPlayer.src = sounds.shift();
                    soundPlayer.play();
                }
            }
        }
    };

var jenkinsDashboard = {
    addTimestampToBuild : function (elements) {
        elements.each(function () {
            var worker = $(this).attr("class"),
                y = parseInt($(this).offset().top + $(this).height() / 2),
                x = parseInt($(this).offset().left + $(this).width() / 2),
                id = x + "-" + y,
                html = '<div class="job_disabled_or_aborted" id="' + id + '">' + worker + '</div>',
                new_element;
            $("#content").append(html);
            new_element = $("#" + id);
            new_element.css("top", parseInt(y - new_element.height() / 2)).css("left", parseInt(x - new_element.width() / 2));
            new_element.addClass('rotate');
            $(this).addClass('workon');
        });
    },
    composeHtmlFragement: function (jobs) {
        var fragment = "<section>",
            jobs_to_be_filtered = config.jobs_to_be_filtered,
            jobs_to_be_excluded = config.jobs_to_be_excluded;
        $.each(jobs, function () {
            if ((jobs_to_be_filtered.length === 0 || $.inArray(this.name, jobs_to_be_filtered) !== -1) && ($.inArray(this.name, jobs_to_be_excluded) === -1)) {
                fragment += ("<article class=" + this.color + "><head>" + this.name + "</head></article>");
            }
        });
        dashboardLastUpdatedTime = new Date();
        fragment += "<article class='time'>" + dashboardLastUpdatedTime.toString('dd, MMMM ,yyyy')  + "</article></section>";
        $("#content").html(fragment);
    },
    updateBuildStatus : function (data) {
        jenkinsDashboard.composeHtmlFragement(data.jobs);
        jenkinsDashboard.addTimestampToBuild($(".disabled, .aborted"));
    }
};

function soundForCI(data, lastData) {
    if (lastData !== null) {
        $(data.jobs).each(function (index) {
            if (lastData.jobs[index] !== undefined) {
                if (lastData.jobs[index].color !== 'red' && this.color === 'red') {
                    soundQueue.add('sounds/build_fail_super_mario.mp3');
                }
            }
        });
    }
    return data;
}
$(document).ready(function () {

    var ci_url = config.cctray_path,
        counter = 0,
        lastData = null,
        auto_refresh = setInterval(function () {
            counter++;
            $.get(ci_url)
                .success(function (data, status) {
                    $.unblockUI();
                    data = ccXml2JSON(data);
                    lastData = soundForCI(data, lastData);
                    jenkinsDashboard.updateBuildStatus(data);
                })
                .error(function (XHR, textStatus, errorThrown) {
                    if ($("#error_loading").length <= 0) {
                        $.blockUI({
                            message: '<h1 id="error_loading"> Ooooops, check out your network etc. Retrying........</h1>'
                        });
                    }
                });
            soundQueue.play();
        }, 4000),
        ccXml2JSON = function(xmlDoc) {
          var projectNodes = xmlDoc.childNodes[0].childNodes,
              jobs = [];
          $.each(projectNodes, function(index, projectNode) {
            var color;
            switch (projectNode.getAttribute("lastBuildStatus")) {
              case "Success":
                color = "blue";
                break;
              default:
                color = "red";
            }
            switch (projectNode.getAttribute("activity")) {
              case "Building":
                color = "blue_anime";
                break;
              case "Paused":
                color = "disabled";
                break;
              case "Has pending changes":
                color = "yellow";
                break;
              default:
            }
            jobs.push({
              name: projectNode.getAttribute("name"),
              url: projectNode.getAttribute("webUrl"),
              color: color
            });
          });
          return {jobs: jobs};
        };
        $.blockUI({
          message: '<h1 id="loading"><img src="img/busy.gif" />loading.....</h1>'
        });
});
