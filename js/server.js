// UQRota
// Copyright Alex Wilson 2010
// sever.js -- abstractions for server operations

// line bump
// Singleton that tracks fetching jobs
var FetchThreadManager = {
  emptyHandlers: new Array(),
  active: new Array(),
  
  // Start a fetching job
  // @param name string
  // @return Object job tracker
  start: function(name) {
    var dt = new Date();
    var obj = { "name": name, "time": dt.getTime() };
    // $('log').insert('start '+obj.name+ '@' + obj.time + '<br/>'); 
    FetchThreadManager.active.push(obj);
    FetchThreadManager.updateStatus();
    return obj;
  },

  // Notifies the end of a fetching job
  // @param obj Object job tracker from start()
  stop: function(obj) {
    // $('log').insert('stop '+obj.name+ '@' + obj.time + ' ('+FetchThreadManager.active.size()+')<br/>');
    FetchThreadManager.active = FetchThreadManager.active.without(obj);
    FetchThreadManager.updateStatus();
    if (FetchThreadManager.active.size() == 0) {
      FetchThreadManager.runThenEmpty();
    }
  },

  // Updates the status label on the UI
  updateStatus: function() {
    if (FetchThreadManager.active.size() > 0) {
      $('loading_status').update(FetchThreadManager.active.size() + ' fetches in progress...');
    } else {
      $('loading_status').update('Fetches done.');
      new PeriodicalExecuter(function (pe) {
	pe.stop();
	$('loading_status').update('');
      }, 3.0);
    }
  },

  // Runs any queued empty handlers and clears the queue
  runThenEmpty: function() {
    // $('log').insert('flushing empty handlers... ('+FetchThreadManager.emptyHandlers.size()+')<br/>');
    FetchThreadManager.emptyHandlers.each(function(handler) {
      handler();
    });
    FetchThreadManager.emptyHandlers = new Array();
  },

  // Schedules a function to be called after all fetch jobs are finished
  // @param cb Function callback function to execute
  wait: function(cb) {
    FetchThreadManager.emptyHandlers.push(cb);
    if (FetchThreadManager.active.size() == 0) 
      FetchThreadManager.runThenEmpty();
  }
};

var Notifier = {
  notes: new Array(),

  start: function(message) {
  },

  stop: function(obj) {
    Notifier.notes = Notifier.notes.without(obj);
  }
};

// Server utilities class
var Server = {
  groupCache: new Hash(),
  progressUp: null,

  // Show busy dialog
  // @param msgt string		message to show
  // @return Object		token
  shDlg: function(msgt) {
    if (!Server.progressUp) {
      Ext.MessageBox.show({
	msg: msgt,
	progressText: 'Please wait...',
	width: 300,
	wait: true
      });
      var dt = new Date();
      var obj = { message: msgt, time: dt.getTime() };
      Server.progressUp = obj;
      return obj;
    }
    return null;
  },

  // Hides busy dialog
  // @param obj Object		token from shDlg()
  hDlg: function(obj) {
    if (obj && Server.progressUp == obj) {
      Ext.MessageBox.hide();
      Server.progressUp = null;
    }
  },

  // Removes a group from the cache
  // @param group_id int
  invalidateCache: function(group_id) {
    Server.groupCache.unset(group_id);
  },

  // Fetches a group to the cache
  // @param group_id int
  fetchGroupToCache: function(group_id) {
    if (! Server.groupCache.keys().include(group_id+'')) {
      new Ajax.Request('/groups/get',{
	  parameters: { "group_id": group_id },
	  method: 'get',
	  onSuccess: function(transport) {
	    var resp = transport.responseJSON;
	    if (resp.status == 'ok') {
	      Server.groupCache.set(group_id, resp);
	    }
	  }
	});
    }
  },

  // Fetches a group to the UI
  // @param calendar Calendar		the calendar
  // @param group_id int
  fetchGroup: function(calendar, group_id) {
    Server.fetchGroupCb(group_id, calendar.addGroup.bind(calendar));
  },

  // Fetches a group and executes the given callback
  // @param group_id int
  // @param cb function
  fetchGroupCb: function(group_id, cb) {
    //this.shDlg('Fetching group...');
    var ftm = FetchThreadManager.start('get group '+ group_id);
    var group_id_s = group_id + '';
    if (Server.groupCache.keys().include(group_id_s)) {
      cb(Server.groupCache.get(group_id_s).group);
      FetchThreadManager.stop(ftm);
    } else {
      new Ajax.Request('/groups/get',{
	parameters: { "group_id": group_id },
	method: 'get',
	
	onComplete: function() {
	  FetchThreadManager.stop(ftm);
	},

	onFailure: function() {
	  Server.fetchGroupCb(group_id, cb);
	},

	onSuccess: function(transport) {
	  var resp = transport.responseJSON;
	  if (resp.status == 'ok') {
	    Server.groupCache.set(group_id_s, resp);
	    cb(resp.group);
	    $(document.body).fire('server:fetchedGroup', resp.group);
	  }
	}
      });
    }
  },

  // Updates the list of valid semesters, and the current semester object
  updateSemesters: function() {
    var s = Server.shDlg('Fetching semester list...');
    var ftm = FetchThreadManager.start('semesters');
    new Ajax.Request('/semesters/list', {
      method: 'get',
      onFailure: function() {
	Server.updateSemesters();
      },

      onSuccess: function(t) {
	Application.semesters = t.responseJSON.semesters;
	Application.semesters.each(function (sem) {
	  if (sem.id == t.responseJSON.current) Application.currentSemester = sem;
	});
      },

      onComplete: function() {
	Server.hDlg(s);
	FetchThreadManager.stop(ftm);
      }
    });
  },

  // Checks with the server to see if we're logged in
  // @param callback function(is_logged_in: bool, login_name: string)
  checkLogin: function(callback) {
    var sh = Server.shDlg('Checking login...');
    new Ajax.Request('/login', {
      method: 'get',
      onSuccess: function(t) {
	var o = t.responseJSON;
	if (o.logged_in)
	  callback(true, o.login);
	else
	  callback(false, null);
      },

      onComplete: function() {
	Server.hDlg(sh);
      }
    });
  },

  // Attempts to register an account with the server
  // @param username,password strings
  // @param callback function(successful: bool)
  register: function(username, password, callback) {
    var dlg = new RegisterDialog(username, password, function (obj) {
      var sh = Server.shDlg('Registering...');
      new Ajax.Request('/register', {
	method: 'post',
	parameters: obj,
	onSuccess: function(t) {
	  Server.hDlg(sh);
	  if (t.responseJSON.success) {
	    Server.hDlg(sh);
	    Ext.Msg.alert('Login', 'Successfully registered you as a new user');
	    Application.mainmenu.createLogOutButton();
	    callback(true);
	  } else {
	    Ext.Msg.alert('Error', 'Could not register');
	    callback(false);
	  }
	}
      });
    });
  },

  // Attempts to log in on the server
  // @param username,password strings
  // @param callback function(success: bool)
  login: function(username, password, callback) {    
    var sh = Server.shDlg('Verifying username and password...');
    new Ajax.Request('/login', {
      method: 'post',
      parameters: { "login": username, "password": password },
      onSuccess: function(t) {
	if (!t.responseJSON.success) {
	  if (t.responseJSON.exists) {
	    Server.hDlg(sh);	// kill progress dialog before we display errors
	    Ext.Msg.alert('Error', 'Invalid username or password');
	    callback(false);
	  } else {
	    Server.register(username, password, callback);
	  }
	} else {
	  Application.timetablesStore.load();
	  Application.myTimetablesStore.load();
	  Application.mainmenu.createLogOutButton();
	  callback(true);
	}
      },

      onComplete: function() {
	Server.hDlg(sh);
      }
    });
  },
  
  // Logs out of the server session
  logout: function(callback) {
    var sh = Server.shDlg("Logging out...");
    new Ajax.Request('/logout', {
      method: 'post',
      
      onSuccess: function(t) {
        Application.timetablesStore.load();
    	  Application.myTimetablesStore.load();
    	  Application.mainmenu.destroyLogOutButton();
    	  callback();
      },
      
      onComplete: function () {
        Server.hDlg(sh);
      }
    });
  },

  // Loads a saved timetable from the server
  // @param course_sel CourseSelector
  // @param calendar Calendar
  // @param timetable_id int
  loadTimetable: function(course_sel, calendar, timetable_id) {
    var sh = Server.shDlg('Loading timetable...');
    new Ajax.Request('/timetables/get', {
      method: 'get',
      parameters: { 'timetable_id': timetable_id },

      onFailure: function() {
	Server.loadTimetable(course_sel, calendar, timetable_id);
      },

      onSuccess: function(t) {
	if (t.responseJSON.status == 'okay') {
	  var tt = t.responseJSON.timetable;
	  course_sel.removeAll();

	  tt.courses.each(function(c) {
	    Server.fetchCourseCb(course_sel, c.semester_id, c.code, function(course) {
	      course_sel.addCoursePre(course, c);
	    });
	  });
	  FetchThreadManager.wait(function() {
	    Server.hDlg(sh);
	    calendar.setUnsavedChanges(false);
	    Application.updatePermalink(tt);
	    $(document.body).fire('server:loadedTimetable', tt);
	  });
	} else {
	  Server.hDlg(sh);
	  Ext.Msg.alert('Error', t.responseJSON.message);
	}
      }
    });
  },

  // Saves the current timetable on the UI to the server
  // also note you can put 'no_groups: true' into the tt object to prevent it saving the UI state
  // @param calendar Calendar
  // @param timetable Object		its properties describe which timetable to save to and what settings to use
  // @param cb function(successful: bool, server_timetable: Object)
  saveTimetable: function(calendar, timetable, cb) {
    var sh = Server.shDlg('Saving timetable...');
    if (!timetable.no_groups) {
      timetable.groups = new Array();
      calendar.groups.each(function(gid) {
	timetable.groups.push( { "id": gid } );
      });
    }
    tt_json = Object.toJSON(timetable);
    new Ajax.Request('/timetables/save', {
      method: 'post',
      parameters: { timetable: tt_json },
      onSuccess: function(t) {
	if (t.responseJSON.status == 'okay') {
	  calendar.setUnsavedChanges(false);
	  var tt = t.responseJSON.timetable;
	  cb(true, tt);
	  Application.updatePermalink(tt);
	  $(document.body).fire('server:savedTimetable', tt);
	  Server.hDlg(sh);
	} else {
	  Server.hDlg(sh);
	  Ext.Msg.alert('Error', t.responseJSON.message);
	  cb(false, null);
	}
      }
    });
  },
  
  // Instructs the server to destroy a timetable
  // @param tt_id int   ID of timetable to destroy
  // @param callback function(bool)
  destroyTimetable: function(tt_id, callback) {
    var sh = Server.shDlg('Attempting to destroy...');
    new Ajax.Request('/timetables/destroy', {
      method: 'post',
      parameters: { 'id': tt_id },
      
      onComplete: function() {
        Server.hDlg(sh);
      },
      
      onSuccess: function(t) {
        if (t.responseJSON.status == 'okay') {
          Server.hDlg(sh);
          Ext.Msg.alert('Information', 'Timetable destroyed.');
          calendar.setUnsavedChanges(false);
          StorageManager.create();
          if (callback) callback(true);
        } else {
          Server.hDlg(sh);
          Ext.Msg.alert('Error', 'Could not destroy timetable: '+t.responseJSON.message);
          if (callback) callback(false);
        }
      },
      
      onFailure: function() {
        Server.hDlg(sh);
        Ext.Msg.alert('Error', 'Could not destroy timetable.');
        if (callback) callback(false);
      }
    });
  },

  // Periodically checks the status of a server thread until it's done. then calls the callback
  // @param thread_id int	server thread ID
  // @param callback function()	to call
  checkThread: function(thread_id, callback) {
    new Ajax.Request('/system/thread', {
      parameters: { 'thread_id' : thread_id },
      method: 'get',
      onSuccess: function(transport) {
	var resp = transport.responseJSON;
	if (resp.status == 'wait') {
	  new PeriodicalExecuter(function (pe) {
	    pe.stop();
	    Server.checkThread(thread_id, callback);
	  }, 1.0);
	} else {
	  callback();
	}
      }
    });
  },

  // Imports course list from mysinet
  // @param user string     username for sinet
  // @param pass string     password for sinet
  // @param callback function(bool)
  importFromSinet: function(user, pass, callback) {
    var sh = Server.shDlg('Starting import...');
    new Ajax.Request('/timetables/import_sinet',{
      parameters: { "user": user, "pass": pass },
      method: 'post',
      
      onSuccess: function(t) {
        var resp = t.responseJSON;
        if (resp.status == 'wait') {
          Server.hDlg(sh);
      	  var sh2 = Server.shDlg(resp.message);
      	  var thread_id = resp.thread_id;
      	  Server.checkThread(thread_id, function() {
      	    Server.hDlg(sh2);
      	    Server.loadTimetable(Application.courseSelector, Application.calendar, resp.timetable.id);
      	    if (callback) callback(true);
      	  });
    	  } else {
    	    Server.hDlg(sh);
    	    Ext.Msg.alert('An error occured trying to import.');
    	    if (callback) callback(false);
    	  }
      },
      
      onComplete: function() {
        Server.hDlg(sh);
      }
    });
  },

  // Instructs the server to re-fetch course data from sinet, then reloads it onto the UI
  // @param course_sel	CourseSelector
  // @param course	Object
  forceCourseReload: function(course_sel, course) {
	Server.groupCache = new Hash();
    new Ajax.Request('/courses/update', {
      parameters: { 'course_id': course.id },
      method: 'get',
      onSuccess: function(transport) {
	var resp = transport.responseJSON;
	if (resp.status == 'wait') {
	  var sh = Server.shDlg(resp.message);
	  var thread_id = resp.thread_id;
	  Server.checkThread(thread_id, function() {
	    Server.hDlg(sh);
	    Server.fetchCourse(course_sel, course.semester_id, course.code);
	  });
	} else {
	  Ext.Msg.alert('Error', 'Unknown error occurred reloading course!');
	}
      }
    });
  },

  // Fetches a course to the UI
  // @param course_sel 	CourseSelector
  // @param sem_id	int	semester ID number
  // @param code	string	course code
  fetchCourse: function(course_sel, sem_id, code) {
    Server.fetchCourseCb(course_sel, sem_id, code, course_sel.addCourse.bind(course_sel));
  },

  // Fetches a course and calls a callback with the course object
  // @param course_sel	CourseSelector
  // @param sem_id	int	semester ID number
  // @param code	string	course code
  // @param cb		function(course: Object)
  fetchCourseCb: function(course_sel, sem_id, code, cb) {
    var sh = Server.shDlg('Fetching course ' + code + '...');
    var ftm = FetchThreadManager.start('course fetch ' + code);
    new Ajax.Request('/courses/get', {
      parameters: { "semester_id": sem_id, "code": code },
      method: 'get',
    
      onComplete: function() {
	FetchThreadManager.stop(ftm);
	Server.hDlg(sh);
      },

      onFailure: function() {
	Server.fetchCourseCb(course_sel, sem_id, code, cb);
      },

      onSuccess: function(transport) {
	var resp = transport.responseJSON;
	if (resp.status == 'ok') {
	  cb(resp.course);
	  Server.hDlg(sh);
	  FetchThreadManager.wait(function() {
	    var series = resp.course.series;
	    new PeriodicalExecuter(function (pe) {
	      if (series.size() == 0) { pe.stop(); return; }
	      var s = series[0];
	      s.groups.each(function(group) {
		Server.fetchGroupToCache(group.id);
	      });
	      series = series.without(s);
	    }, 0.25);
	  });
	} else if (resp.status == 'wait') {
	  Server.hDlg(sh);
	  FetchThreadManager.stop(ftm);
	  var sh2 = Server.shDlg(resp.message);
	  var ftm2 = FetchThreadManager.start('fetch waiter '+code);
	  var thread_id = resp.thread_id;
	  FetchThreadManager.stop(ftm);
	  Server.checkThread(thread_id, function() {
	    Server.hDlg(sh2);
	    Server.fetchCourseCb(course_sel, sem_id, code, cb);
	    FetchThreadManager.stop(ftm2);
	  });
	} else if (resp.status == 'error') {
	  Server.hDlg(sh);
	  Ext.Msg.alert('Error', resp.message);
	} else {
	  Server.hDlg(sh);
	  Ext.Msg.alert('Error', 'The server reported an error, but no message was given');
	}
      }
    });
  }
};

var InstrumentCounters = {
  queue: new Array(),
  
  fire: function(iname) {
    InstrumentCounters.queue.push(iname);
    if (InstrumentCounters.queue.size() > 5) {
      var data = Object.toJSON(InstrumentCounters.queue);
      InstrumentCounters.queue = new Array();
      new Ajax.Request('/ic', {
        parameters: { 'data': data },
        method: 'post'
      });
    }
  }
};
