// UQRota
// Copyright Alex Wilson 2010
// application.js -- application-wide support classes and objects
// line bump

// The global app singleton. Keeps everything together, and handles startup.
var Application = {
  // Start the application
  start: function() {
    if (Prototype.Browser.IE) {
      $('permalink').update('<span style="color: red; font-weight: bold;">Warning: UQRota currently does not recommend using Internet Explorer. Please look into <a href="http://getfirefox.com">using</a> <a href="http://google.com/chrome">another</a> <a href="http://www.apple.com/safari">browser</a>.</span>');
    }

    this.calendar = new Calendar($('calendar'));
    this.mainmenu = new MainMenuBar($('mainmenu'));
    this.courseSelector = new CourseSelector(this.calendar.rightDiv);
    this.loadedTimetable = null;
    this.weekSlider = new WeekSlider($('weekslider'), this.calendar);
    this.ftu = new FileTagUpdater($('msg_tag'), this.calendar);
    $('log').hide();
    $('log').update('starting up<br/>');
    //Server.fetchCourse(this.courseSelector, 6020, 'MATH1052');

    Server.checkLogin(function(loggedIn, login) {
      if (loggedIn) Application.mainmenu.createLogOutButton();
    });

    this.timetablesStore = new Ext.data.JsonStore({
      url: '/timetables/search',
      root: 'timetables',
      fields: [
	'owner', 'name', 'visibility'
      ]
    });
    this.timetablesStore.load();
    
    this.myTimetablesStore = new Ext.data.JsonStore({
      url: '/timetables/search?mine=yes',
      root: 'timetables',
      fields: [
        'owner', 'name', 'visibility'
      ]
    });
    this.myTimetablesStore.load();

    Server.progressUp = false;
    var sh = Server.shDlg('Loading timetable...');

    var q = window.location.href.toQueryParams();
    if (q.tt) {
      // $('log').insert("calling semesters...<br/>");
      Server.updateSemesters();
      // $('log').insert("calling load timetable..<br/>");
      Server.loadTimetable(this.courseSelector, this.calendar, q.tt);
      InstrumentCounters.fire('load by url');
    } else {
      // $('log').insert("calling semesters...<br/>");
      Server.updateSemesters();
    }

    if (q.debug) $('log').show();

    FetchThreadManager.wait(function() {
      Server.hDlg(sh);
    });
  },

  // updates the permalink text down the bottom
  // @param tt	Object	timetable currently loaded
  updatePermalink: function(tt) {
    if (tt) {
      $('permalink').show();
      $('weekslider').show();
      
      var ui_url = 'http://www.uqrota.net/?tt='+tt.id;
      var ical_url = 'http://www.uqrota.net/timetables/get_ical?timetable_id='+tt.id;
      if (!tt.world_readable) ical_url += '&hash='+tt.access_hash;

      var destroyLink = new Element('a');
    	destroyLink.update('[destroy]');
    	destroyLink.href = '#';
    	destroyLink.observe('click', function(evt) {
    	  evt.stop();
    	  Ext.Msg.confirm('Destroy', 'Are you sure you want to permanently destroy this timetable?',
          function (ret) {
            if (ret == 'yes') {
          	  Server.destroyTimetable(tt.id);
            }
          }
        );
    	});

      if (tt.world_readable) {
	$('permalink').update('Share with your friends! Permalink: <a href="'+ui_url+'">'+ui_url+'</a> ');
	var privateLink = new Element('a');
	privateLink.update('[make private]');
	privateLink.href = '#';
	privateLink.observe('click', function(evt) {
	  evt.stop();
	  var obj = { id: tt.id, world_readable: false, no_groups: true };
	  Server.saveTimetable(Application.calendar, obj, function(t) {});
	  InstrumentCounters.fire('world readable link');
	});
	
	$('permalink').appendChild(privateLink);
	$('permalink').insert('&nbsp;');
	$('permalink').appendChild(destroyLink);
	$('permalink').insert('<br/>iCal link: <a href="'+ical_url+'">' + ical_url+'</a>');
      } else {
	$('permalink').update('Share with your friends! ');
	var shareLink = new Element('a');
	shareLink.update('Allow anybody to view this timetable');
	shareLink.href = '#';
	shareLink.observe('click', function(evt) {
	  evt.stop();
	  var obj = { id: tt.id, world_readable: true, no_groups: true };
	  Server.saveTimetable(Application.calendar, obj, function(t) {});
	  InstrumentCounters.fire('world readable link');
	});
	$('permalink').appendChild(shareLink);
	$('permalink').insert('&nbsp;');
	$('permalink').appendChild(destroyLink);
	$('permalink').insert('<br/>Private iCal link: <a href="'+ical_url+'">' + ical_url+'</a>');
      }
    } else {
      $('permalink').update("");
    }
  }
};

// Object to sit and watch for timetable load/save events and update the text at the top
// of the display accordingly
var FileTagUpdater = Class.create({
  initialize: function(target, calendar) {
    this.lastLoaded = "";
    this.lastTt;
    this.cal = calendar;
    this.target = target;

    var b = $(document.body);
    b.observe('server:loadedTimetable', this.on_loaded_timetable.bind(this));
    b.observe('server:savedTimetable', this.on_saved_timetable.bind(this));
    b.observe('storage:new', this.on_storage_new.bind(this));
    calendar.target.observe('calendar:changeStatus', this.on_change_status.bind(this));
  },

  update: function() {
    var str = ' - '+this.lastLoaded;
    if (this.cal.hasUnsavedChanges) str = str + ' <b>(not saved)</b>';
    this.target.update(str);
  },

  on_loaded_timetable: function(evt) {
    var tt = evt.memo;
    this.lastLoaded = tt.owner + "'s " + tt.name;
    this.lastTt = tt;
    this.update();
  },
  on_saved_timetable: function(evt) {
    var tt = evt.memo;
    this.lastLoaded = tt.owner + "'s " + tt.name;
    this.lastTt = tt;
    this.update();
  },
  on_storage_new: function() {
    this.lastLoaded = "New timetable";
    this.lastTt = null;
    this.update();
  },
  on_change_status: function(evt) {
    this.update();
  }
});

// A slider that goes beneath the calendar, lets the user preview what the timetable
// will look like on given weeks
// TODO: naming of weeks
var WeekSlider = Class.create({
  initialize: function(target, calendar) {
    this.cal = calendar;
    this.target = target;
    this.minWeek = -1;
    this.maxWeek = -1;

    this.render();
  },

  render: function() {
    this.target.show();
    
    this.slider = new Ext.Slider({
      style: { marginTop: '10px' },
      renderTo: this.target,
      value: 0, increment: 1,
      clickToChange: false
    });

    this.slider.setMinValue(0);
    this.slider.setMaxValue(0);

    this.statusBubble = new Element('div');
    this.statusBubble.addClassName('event_bubble');
    this.statusBubble.setStyle({ backgroundColor: 'white', border: '1px solid #777' });
    this.statusBubble.update('Show all weeks');
    this.statusBubble.id = 'weekslider-statusbubble';
    $(document.body).appendChild(this.statusBubble);

    this.statusBubbleExt = Ext.get('weekslider-statusbubble');
    this.statusBubbleExt.alignTo(this.slider.thumb, 'b-t?', [0,-5]);

    this.slider.addListener('change', this.on_slider_change.bind(this));
    this.slider.addListener('changecomplete', this.on_slider_finish.bind(this));

    this.cal.target.observe('calendar:sessionAdded', this.on_new_session.bind(this));
  },

  on_new_session: function(evt) {
    var session = evt.memo;
    session.events.each((function(event) {
      if (event.week_number < this.minWeek || this.minWeek == -1) this.minWeek = event.week_number;
      if (event.week_number > this.maxWeek || this.maxWeek == -1) this.maxWeek = event.week_number;
    }).bind(this));
    this.slider.setMaxValue(this.maxWeek - this.minWeek + 1);
  },

  unHideAll: function() {
    this.cal.events.each((function(event) {
	if (event.hidden) {
	  event.hidden = false;
	  event.render();
	}
    }).bind(this));
  },

  hideExcept: function(weekno) {
    this.cal.events.each((function(event) {
      var weeks = event.session.events.select(function(ev) { return ev.taught; }).pluck('week_number');
      if (weeks.include(weekno)) {
	if (event.hidden) {
	  event.hidden = false;
	  event.render();
	}
      } else {
	if (!event.hidden) {
	  event.hidden = true;
	  event.remove();
	}
      }
    }).bind(this));
  },

  on_slider_change: function(slider, value) {
    if (value > 0) {
      var weekno = (value-1)+this.minWeek;
      // update bubble
      this.statusBubble.update('Week '+weekno);
      // update calendar
      this.hideExcept(weekno);
    } else {
      // update bubble
      this.statusBubble.update('Show all weeks');
      // update calendar
      this.unHideAll();
    }
    this.statusBubbleExt.alignTo(this.slider.thumb, 'b-t?', [0,-5]);
  },

  on_slider_finish: function(slider, value) {
    if (value != 0) {
      slider.setValue(0, false);
    }
    InstrumentCounters.fire('use week slidebar');
  }
});

var MenuButton = Class.create({
  initialize: function(target, text, icon) {
    this.target = target;
    this.text = text;
    this.icon = icon;
    this.render();
  },

  render: function() {
    this.element = new Element('a');
    this.element.addClassName('fl');
    this.element.addClassName('button');
    this.element.update(this.text);
    if (this.icon) {
      this.element.setStyle({ 
	paddingLeft: '23px',
	backgroundImage: "url('/images/icons/" + this.icon + ".png')",
	backgroundRepeat: 'no-repeat',
	backgroundPosition: '3px 5px'
      });
    }
    this.element.href = '#';
    this.target.appendChild(this.element);
  }
});

var MainMenuBar = Class.create({
  initialize: function(target) {
    this.target = target;
    this.render();
   },

  render: function() {
    this.newButton = new MenuButton(this.target, 'New', 'page_add');
    this.newButton.element.observe('click', this.newButton_click.bind(this));
    this.openButton = new MenuButton(this.target, 'Open', 'folder_explore');
    this.openButton.element.observe('click', this.openButton_click.bind(this));
    this.importMenu = new MenuButton(this.target, 'Import...', 'folder_explore');
    this.importMenu.element.observe('click', this.importMenu_click.bind(this));
    this.saveButton = new MenuButton(this.target, 'Save As...', 'disk');
    this.saveButton.element.observe('click', this.saveButton_click.bind(this));
    this.printButton = new MenuButton(this.target, 'Print (PDF)', 'printer');
    this.printButton.element.observe('click', this.printButton_click.bind(this));
    this.alertsButton = new MenuButton(this.target, 'Alerts...', 'bell');
    this.alertsButton.element.observe('click', this.alertsButton_click.bind(this));
    this.semesterMenu = new MenuButton(this.target, 'Change semester...', 'clock');
    this.semesterMenu.element.observe('click', this.openSemesterMenu.bind(this));
  },
  
  createLogOutButton: function() {
    if (!this.logOutButton) {
      this.changeDetailsButton = new MenuButton(this.target, 'Password/details...', 'lock');
      this.changeDetailsButton.element.observe('click', this.changeDetailsButton_click.bind(this));
      this.logOutButton = new MenuButton(this.target, 'Logout...', 'lock');
      this.logOutButton.element.observe('click', this.logOutButton_click.bind(this));
    }
  },
  
  destroyLogOutButton: function() {
    this.logOutButton.element.remove();
    this.changeDetailsButton.element.remove();
    this.logOutButton = null;
    this.changeDetailsButton = null;
  },

  newButton_click: function(event) {
    event.stop();
    StorageManager.create();
    InstrumentCounters.fire('menubar: new');
  },
  
  logOutButton_click: function(event) {
    event.stop();
    Server.logout();
    InstrumentCounters.fire('menubar: log out');
  },
  
  changeDetailsButton_click: function(event) {
    event.stop();
    window.open('/user/update', 'detailswindow', 'menubar=0,toolbar=0,location=0,status=0,width=600,height=600');
    InstrumentCounters.fire('menubar: change details');
  },

  openButton_click: function(event) {
    event.stop();
    StorageManager.open();
    InstrumentCounters.fire('menubar: open');
  },

  saveButton_click: function(event) {
    event.stop();
    StorageManager.save();
    InstrumentCounters.fire('menubar: save');
  },

  printButton_click: function(event) {
    event.stop();
    var tt = Application.ftu.lastTt;
    if (tt) {
      window.open('/timetables/get_pdf?timetable_id=' + tt.id + '&hash=' + tt.access_hash,
		  "pdfprint",'toolbar=0,resizable=1,width=500,height=500');
    } else {
      Ext.Msg.alert('Error', 'You need to save the timetable before you can access PDF print view');
    }
    InstrumentCounters.fire('menubar: print pdf');
  },

  alertsButton_click: function(event) {
    event.stop();
    
    var menu = new Element('div');
    menu.addClassName('context_menu');
    menu.clonePosition(this.alertsButton.element, { setWidth: false, setHeight: false, offsetTop: 25 });
    
    if (Application.ftu.lastTt) {
      var tt = Application.ftu.lastTt;

      var icon = '';
      if (tt.alert_sms) icon = 'tick';
      var item = new ContextMenuItem(menu, icon, 'Alert by SMS');
      item.element.observe('click', function (event) {
	event.stop();
	if (tt.alert_sms) tt.alert_sms = false; else tt.alert_sms = true;
	var obj = { id: tt.id, alert_sms: tt.alert_sms, no_groups: true };
	Server.saveTimetable(Application.calendar, obj, function (t) { ContextMenu.close(); });
	InstrumentCounters.fire('change alert settings');
      });
      
      icon = '';
      if (tt.alert_email) icon = 'tick';
      item = new ContextMenuItem(menu, icon, 'Alert by email');
      item.element.observe('click', function (event) {
	event.stop();
	if (tt.alert_email) tt.alert_email = false; else tt.alert_email = true;
	var obj = { id: tt.id, alert_email: tt.alert_email, no_groups: true };
	Server.saveTimetable(Application.calendar, obj, function (t) { ContextMenu.close(); });
	InstrumentCounters.fire('change alert settings');
      });

    } else {
      var item = new ContextMenuItem(menu, '', 'No loaded timetable');
      item.element.observe('click', function (event) {
	event.stop();
	ContextMenu.close();
      });
    }
    ContextMenu.open(menu);
    
    InstrumentCounters.fire('menubar: alerts submenu');
  },

  importMenu_click: function(event) {
    event.stop();
    
    var menu = new Element('div');
    menu.addClassName('context_menu');
    menu.clonePosition(this.importMenu.element, { setWidth: false, setHeight: false, offsetTop: 25 });
    
    /*var item = new ContextMenuItem(menu, '', 'Course list from mySI-net...');
    item.element.observe('click', function (event) {
      event.stop();
      ContextMenu.close();
      var dlg = new SinetImportDialog();
      InstrumentCounters.fire('open sinet import window');
    });*/
    
    ContextMenu.open(menu);
    InstrumentCounters.fire('menubar: import submenu');
  },

  openSemesterMenu: function(event) {
    event.stop();

    var menu = new Element('div');
    menu.addClassName('context_menu');
    menu.clonePosition(this.semesterMenu.element, { setWidth: false, setHeight: false, offsetTop: 25 });
    menu.setStyle({ height: '400px', overflow: 'scroll' });

    Application.semesters.each(function (sem) {
      var icon = '';
      if (sem == Application.currentSemester) icon = 'tick';
      var item = new ContextMenuItem(menu, icon, sem.name);
      item.element.observe('click', (function (event) {
	event.stop();
	ContextMenu.close();
	Application.currentSemester = sem;
	InstrumentCounters.fire('change active semester');
      }).bind(this));
    });

    ContextMenu.open(menu);
  }
});

var ContextMenu = {
  open: function(menu) {
    if (this.menu) { this.menu.remove(); this.menu = null; }
    this.menu = menu;

    var b = $(document.body);
    if (menu) b.appendChild(menu);
    $('log').insert('opening context menu...<br/>');
    b.observe('click', this.close);
    b.observe('contextmenu', this.close);
  },

  close: function() {
    if (ContextMenu.menu) { ContextMenu.menu.remove(); ContextMenu.menu = null; }
    $(document.body).stopObserving('click', ContextMenu.close);
    $(document.body).stopObserving('contextmenu', ContextMenu.close);
    $('log').insert('closing context menu...<br/>');
    if (ContextMenu.closeCallback) { ContextMenu.closeCallback(); ContextMenu.closeCallback = null; }
  }
};

// Support functions for generating and working with colours
var ColourSupport = {
  // Converts an HSL (hue-saturation-luminance) colour object
  // into an RGB (red-green-blue) one.
  // @param c	ColourObject
  // @return ColourObject
  hslToRgb: function(c) {
    // this algorithm blatantly stolen from wikipedia. :)

    // working values
    var q = c.l*(1+c.s);
    if (c.l >= 1/2) q = c.l + c.s - (c.l * c.s);
    var p = 2*c.l - q;
    var hk = c.h/360;

    // base components
    var tr = Math.abs((hk + 1/3))  % 1.0;
    var tg = Math.abs((hk)) % 1.0;
    var tb = Math.abs((hk - 1/3)) % 1.0;
    
    var nc = new Object;
    // red component
    if (tr < 1/6)      nc.r = p + ((q-p)*6*tr);
    else if (tr < 1/2) nc.r = q;
    else if (tr < 2/3) nc.r = p + ((q-p)*6*(2/3-tr));
    else               nc.r = p;
    // green component
    if (tg < 1/6)      nc.g = p + ((q-p)*6*tg);
    else if (tg < 1/2) nc.g = q;
    else if (tg < 2/3) nc.g = p + ((q-p)*6*(2/3-tg));
    else               nc.g = p;
    // blue component
    if (tb < 1/6)      nc.b = p + ((q-p)*6*tb);
    else if (tb < 1/2) nc.b = q;
    else if (tb < 2/3) nc.b = p + ((q-p)*6*(2/3-tb));
    else               nc.b = p;

    return nc;
  },

  // Generates a set of n distinct colours distributed accross the spectrum
  // @param n	integer
  // @return Array[Object]
  genColours: function(n) {
    var colours = new Array;
    var dtheta = 360/n;
    var theta = 11;
    while (colours.length < n) {
      theta += Math.floor((Math.random()*dtheta)+dtheta/2);
      theta = theta % 360;

      var borderColour = { h: theta, s: 0.7, l: 0.3 };
      var bgColour = { h: theta, s: 0.7, l: 0.7 };

      borderColour = this.hslToRgb(borderColour);
      bgColour = this.hslToRgb(bgColour);

      var col = {
	border: 'rgb(' + Math.round(borderColour.r*255) + ',' +
		Math.round(borderColour.g*255) + ',' +
		Math.round(borderColour.b*255) + ')',
	background: 'rgb(' + Math.round(bgColour.r*255) + ',' +
		    Math.round(bgColour.g*255) + ',' +
		    Math.round(bgColour.b*255) + ')'
      };
      colours.push(col);
    }
    return colours;
  }
};
