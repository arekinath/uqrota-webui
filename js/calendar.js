// UQRota
// Copyright Alex Wilson 2010
// calendar.js -- calendar and event display widgets

// line bump
// General class for context menu items (probably doesn't belong in this file)
var ContextMenuItem = Class.create({
  initialize: function(target, icon, text) {
    this.target = target;
    this.icon = '/images/icons/' + icon + '.png';
    this.text = text;
    this.render();
  },

  render: function() {
    this.element = new Element('a');
    this.element.addClassName('item');
    this.element.update(this.text);
    this.element.href = '#';
    this.element.setStyle({
      backgroundImage: "url('" + this.icon + "')",
      backgroundRepeat: 'no-repeat',
      backgroundPosition: '2px 5px'
    });
    this.target.appendChild(this.element);
  }
});

// The context menu that appears when you right-click an event
// contains a few buttons and the week display, and detailed location data
var EventContextMenu = Class.create({
  initialize: function(event, x, y) {
    this.event = event;
    this.x = x;
    this.y = y;
    this.render();
  },

  render: function() {
    // while we're open, dim all the other events slightly
    this.event.cal.dimExcept(this.event.group.id, 0.5);
    // hijack the contextmenu utility class to undim everything when we lose focus
    ContextMenu.closeCallback = (function() {
      this.event.cal.undimAll();
    }).bind(this);

    var menu = new Element('div');
    menu.addClassName('context_menu');
    menu.setStyle({
      top: this.y + 'px',
      left: this.x + 'px'
    });

    var infoDiv = new Element('div');
    infoDiv.addClassName('event_info');
    var s = this.event.session;
    var g = this.event.group;
    var str = '<b>' + g.name + '</b><br/>' + s.building + ' ' + s.room +
	      ' (<a target="_blank" href="http://uq.edu.au/maps/mapsearch.html?q=' + 
	      s.building_number + '">map</a>)';
    infoDiv.update(str);

    // construct the week-by-week display
    var weekContainer = new Element('div');
    weekContainer.addClassName('week_container');
    infoDiv.appendChild(weekContainer);

    s.events.each( (function(event) {
      var ddiv = new Element('div');
      ddiv.addClassName('week');
      if (event.taught) ddiv.addClassName('taught');
      ddiv.update(event.date);
      weekContainer.appendChild(ddiv);
    }).bind(this));

    menu.appendChild(infoDiv);

    //TODO: think about whether these are relevant anymore?
    var link = new ContextMenuItem(menu, 'cross', 'Remove');
    link.element.observe('click', this.removeGroup.bind(this));

    link = new ContextMenuItem(menu, 'arrow_refresh', 'Reload from server');
    link.element.observe('click', this.reloadGroup.bind(this));

    ContextMenu.open(menu);
  },

  removeGroup: function(event) {
    InstrumentCounters.fire('right-click remove')
    Application.calendar.removeGroup(this.event.group.id);
    event.stop();
    ContextMenu.close();
  },

  reloadGroup: function(event) {
    Application.calendar.removeGroup(this.event.group.id);
    Server.invalidateCache(this.event.group.id);
    Server.fetchGroup(Application.calendar, this.event.group.id);
    event.stop();
    ContextMenu.close();
  }
});

// class for events on the calendar.
// there are also "ghost" events which are the ones when you left-click a group
var CalendarEvent = Class.create({

  // @param ecf		EventCalendarFrame
  // @param colour	Object		colour settings object for this event
  // @param group	Object		group data object
  // @param session	Object		session data object (child of group)
  initialize: function(ecf, colour, group, session) {
    this.cal = ecf.calendar;
    this.ecf = ecf;
    this.target = ecf.target;
    this.group = group;
    this.session = session;
    this.colour = colour;
  },

  render: function() {
    this.bubbleDiv = new Element('div');
    this.bubbleDiv.addClassName('event_bubble');
    this.bubbleDiv.setStyle({
      border: '1px solid '+this.colour.border,
      background: this.colour.background
    });
    this.bubbleDiv.setStyle(this.ecf.sessionPos(this.session));
    if (this.ghost) this.bubbleDiv.setStyle({ opacity: 0.5, filter: 'alpha(opacity=50)', border: '2px solid '+this.colour.border });
    this.bubbleDiv.update('<p>' + this.group.name + '</p><p>' + this.session.room + '</p>');
    this.bubbleDiv.observe('mousedown', this.on_mousedown.bind(this));
    this.bubbleDiv.observe('click', this.on_click.bind(this));
    this.bubbleDiv.observe('contextmenu', this.on_contextmenu.bind(this));

    this.target.appendChild(this.bubbleDiv);
    this.ecf.renderEvent(this);
  },

  printmstate: function(type, event) {
    $('log').insert(type + " on " + this.group.id);
    if (event.isLeftClick()) $('log').insert(' +left');
    if (event.isRightClick()) $('log').insert(' +right');
    $('log').insert(' ['+this.lastMouseDown+']');
    $('log').insert('<br/>');
  },

  on_mousedown: function(event) {
    this.printmstate('mousedown', event);
    if (event.isLeftClick()) this.lastMouseDown = 'left';
    if (event.isRightClick()) this.lastMouseDown = 'right';
  },

  on_click: function(event) {
    event.stop();
    this.printmstate('click', event);
    if (event.isLeftClick()) this.clickHandler('left', event);
    else this.clickHandler(this.lastMouseDown, event);
  },

  on_contextmenu: function(event) {
    event.stop();
    this.printmstate('contextmenu', event);
    this.clickHandler('right', event);
  },

  // handles clicks on the event bubble
  clickHandler: function(type, event) {
    if (type == 'left') {
      if (this.ghost) {
	ContextMenu.close();
	var series = Application.courseSelector.getSeries(this.group.series.id);
	var oldActive = series.activeGroup.id;
	series.activeGroup = this.group;
	Server.fetchGroup(Application.calendar, this.group.id);
	this.cal.removeGroup(oldActive);
	series.button.element.update(this.group.code);
      } else {
	if (this.ghostOpen) {
	  ContextMenu.close();
	  this.ghostOpen = false;
	} else {
	  this.oldChanged = this.cal.hasUnsavedChanges;

	  ContextMenu.close();
	  ContextMenu.open(null);
	  this.cal.dimExcept(this.group.id);
	  this.ghostOpen = true;

	  var series = Application.courseSelector.getSeries(this.group.series.id);
	  series.groups.each((function(group) {
	    if (group.id != this.group.id) {
	      Server.fetchGroupCb(group.id, (function(group) {
		if (this.ghostOpen) this.cal.addGroupAsGhost(group);
	      }).bind(this));
	    }
	  }).bind(this));

	  ContextMenu.closeCallback = (function() {
	    this.ghostOpen = false;
	    this.cal.removeGhosts();
	    this.cal.undimAll();
	    this.cal.setUnsavedChanges(this.oldChanged);
	  }).bind(this);
	  
	  InstrumentCounters.fire('open ghosts')
	}
      }
    } else if (type == 'right') {
      if (!this.ghost) {
        InstrumentCounters.fire('right click event')
	      ContextMenu.close();
	      var cm = new EventContextMenu(this, event.pointerX(), event.pointerY());
      }
    }
  },

  remove: function() {
    this.bubbleDiv.remove();
    this.ecf.unRenderEvent(this);
  }
});

// The frame inside the calendar, that draws the lines and manages the actual representation of time
var EventCalendarFrame = Class.create({
  days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],

  // @param target	Element
  // @param calendar	Calendar
  // @param timeSpec	Object		should have startHour and endHour properties
  initialize: function(target, calendar, timeSpec) {
    this.target = target;
    this.renderedEvents = new Array;
    this.calendar = calendar;
    this.timeSpec = timeSpec;

    this.timeSpec.startMinute = this.timeSpec.startHour * 60;
    this.timeSpec.endMinute = this.timeSpec.endHour * 60;
    this.timeSpec.minutes = this.timeSpec.endMinute - this.timeSpec.startMinute;

    this.render();
  },

  // called by CalendarEvents when they render on this ECF
  // handles multiple events on the same timeslot etc
  // TODO: handle >2 simultaneous events correctly
  renderEvent: function(event) {
    this.renderedEvents.each((function(othevent) {
      var osess = othevent.session;
      var sess = event.session;
      var dayNumber = this.days.indexOf(osess.day);
      if ((sess.day == osess.day) && ((osess.start >= sess.start && osess.start <= sess.finish) ||
	  (osess.finish >= sess.start && osess.finish <= sess.finish))) {
	event.bubbleDiv.setStyle({
	  width: Math.round((1/14)*10000)/100 + '%'
	});
	othevent.bubbleDiv.setStyle({
	  left:   Math.round((dayNumber+0.5)*(1/7)*10000)/100 + '%',
	  width: Math.round((1/14)*10000)/100 + '%'
	});
      }
    }).bind(this));
    this.renderedEvents.push(event);
  },

  // called by CalendarEvents when they un-render on this ECF
  unRenderEvent: function(event) {
    this.renderedEvents = this.renderedEvents.without(event);
    this.renderedEvents.each((function(othevent) {
      var osess = othevent.session;
      var sess = event.session;
      if ((sess.day == osess.day) && ((osess.start >= sess.start && osess.start <= sess.finish) ||
	  (osess.finish >= sess.start && osess.finish <= sess.finish) || 
	  (osess.start <= sess.start && osess.finish >= sess.finish))) {
	othevent.bubbleDiv.setStyle(this.sessionPos(othevent.session));
      }
    }).bind(this));
    // then re-render
    var re = this.renderedEvents;
    this.renderedEvents = new Array();
    re.each((function(evt) {
      this.renderEvent(evt);
    }).bind(this));
  },

  // Works out the default position a given session should occupy based on its start and end times
  // @param session	Object
  // @return Object
  sessionPos: function(session) {
    var dayNumber = this.days.indexOf(session.day);
    return {
      width:  Math.round((2/14)*10000)/100 + '%',
      left:   Math.round(dayNumber*(1/7)*10000)/100 + '%',
      top:    Math.round((session.start - this.timeSpec.startMinute)/this.timeSpec.minutes * 10000)/100 + '%',
      height: Math.round((session.finish - session.start)/this.timeSpec.minutes * 10000)/100 + '%'
    };
  },

  render: function() {
    // lots of maths here to work out where the lines go!

    // vertical divs for days
    this.vertDivs = new Array;
    for (var i=0; i<7; i++) {
      var div = new Element('div');
      div.addClassName('calendar_divider');
      div.setStyle({
	left: Math.round(i*(1/7)*10000)/100 + '%',
	width: Math.round((1/7)*10000)/100 + '%',
	height: '100%',
	borderLeft: (i > 0 ? 'none' : '')
      });
      this.target.appendChild(div);
      this.vertDivs.push(div);

      var hdiv = new Element('div');
      hdiv.addClassName('calendar_header');
      hdiv.setStyle({
	left: Math.round(i*(1/7)*10000)/100 + '%',
	width: Math.round((1/7)*10000)/100 + '%',
	height: '14pt',
	top: '-14pt',
	textAlign: 'center'
      });
      hdiv.update(this.days[i]);
      this.target.appendChild(hdiv);
    }
    
    this.horizDivs = new Array;
    var hours = Math.ceil(this.timeSpec.minutes / 60);
    for (var i=0; i<hours; i++) {
      var div = new Element('div');
      div.addClassName('calendar_divider');
      div.setStyle({
	top: Math.round((i*60)/this.timeSpec.minutes*10000)/100 + '%',
	width: '100%',
	height: Math.round(60/this.timeSpec.minutes*10000)/100 + '%',
	borderTop: (i > 0 ? 'none' : '')
      });
      this.target.appendChild(div);
      this.horizDivs.push(div);

      var hdiv = new Element('div');
      hdiv.addClassName('calendar_header');
      hdiv.setStyle({
	left: '-20pt',
	width: '20pt',
	paddingTop: '9pt',
	height: Math.round(60/this.timeSpec.minutes*10000)/100 + '%',
	top: Math.round(((i-0.5)*60)/this.timeSpec.minutes*10000)/100 + '%',
	textAlign: 'center'
      });
      var hour = (i+this.timeSpec.startHour)%12;
      if (hour == 0) hour = 12;
      hdiv.update(hour);
      this.target.appendChild(hdiv);
    }

    var hdiv = new Element('div');
    hdiv.addClassName('calendar_header');
    hdiv.setStyle({
      left: '-20pt',
      width: '20pt',
      paddingTop: '9pt',
      height: Math.round(60/this.timeSpec.minutes*10000)/100 + '%',
      top: Math.round(((i-0.5)*60)/this.timeSpec.minutes*10000)/100 + '%',
      textAlign: 'center'
    });
    var hour = (i+this.timeSpec.startHour)%12;
    if (hour == 0) hour = 12;
    hdiv.update(hour);
    this.target.appendChild(hdiv);
  }
});

// The calendar controller class
var Calendar = Class.create({

  initialize: function(target) {
    this.target = target;
    this.events = new Array();
    this.groups = new Array();
    this.colours = ColourSupport.genColours(16);
    this.currentColour = 0;
    this.hasUnsavedChanges = false;

    this.render();
  },

  // Sets whether we have unsaved changes or not
  // @param status	bool
  setUnsavedChanges: function(status) {
    this.hasUnsavedChanges = status;
    this.target.fire('calendar:changeStatus', status);
  },

  // Removes a group from the calendar
  // @param group_id	int
  removeGroup: function(group_id) {
    var evts = this.events;
    var cal = this;
    evts.each(function(evt) {
      if (evt.group.id == group_id) {
	evt.remove();
	cal.events = cal.events.without(evt);
      }
    });
    this.groups = this.groups.without(group_id);
    this.setUnsavedChanges(true);
    this.target.fire('calendar:groupRemoved', group_id);
  },

  // Removes ghost events from the calendar
  removeGhosts: function() {
    var evts = this.events;
    evts.each((function(evt) {
      if (evt.ghost) {
	evt.remove();
	this.events = this.events.without(evt);
      }
    }).bind(this));
  },

  // Adds a group to the calendar
  // @param group	Object
  addGroup: function(group) {
    var colour = this.nextColour();
    this.groups.push(group.id);
    group.sessions.each((function(session) {
      this.addSession(group, session, colour);
    }).bind(this));
    this.target.fire('calendar:groupAdded', group.id);
  },

  // Adds a group to the calendar, as a ghost
  // @param group	Object
  addGroupAsGhost: function(group) {
    var colour = this.nextColour();
    group.sessions.each((function(session) {
      this.addSessionAsGhost(group, session, colour);
    }).bind(this));
  },

  // Dims all events on the calendar, other than the one mentioned
  // @param group_id	int
  // @param opacity	decimal		opacity to dim them to (0<opacity<1)
  dimExcept: function(group_id, opacity) {
    if (!opacity) opacity = 0.1;
    this.events.each((function(evt) {
      if (evt.group.id != group_id) {
	evt.bubbleDiv.setStyle({ "opacity": opacity, filter: 'alpha(opacity='+opacity*100+')' });
      }
    }).bind(this));
  },

  // Restores all events to opacity 1.0
  undimAll: function() {
    this.events.each((function(evt) {
      evt.bubbleDiv.setStyle({ opacity: 1.0, filter: '' });
    }).bind(this));
  },

  // Adds a session to the calendar
  // @param group	Object
  // @param session	Object
  // @param colour	Object		(from nextColour())
  addSession: function(group, session, colour) {
    this.target.fire('calendar:sessionAdded', session);
    var evt = new CalendarEvent(this.ecf, colour, group, session);
    this.events.push(evt);
    evt.render();
    this.setUnsavedChanges(true);
  },

  // Adds a session to the calendar, as a ghost
  // @param group	Object
  // @param session	Object
  // @param colour	Object		(from nextColour())
  addSessionAsGhost: function(group, session, colour) {
    var evt = new CalendarEvent(this.ecf, colour, group, session);
    evt.ghost = true;
    this.events.push(evt);
    evt.render();
    this.setUnsavedChanges(true);
  },

  render: function() {
    this.rightDiv = new Element('div');
    this.rightDiv.addClassName('course_chooser');

    this.leftOuterDiv = new Element('div');
    this.leftOuterDiv.addClassName('calendar');
    this.leftDiv = new Element('div');
    this.leftOuterDiv.appendChild(this.leftDiv);

    this.target.appendChild(this.rightDiv);
    this.target.appendChild(this.leftOuterDiv);

    this.ecf = new EventCalendarFrame(this.leftDiv, this, { startHour: 7, endHour: 19 });
  },

  // Generates the next colour in the series
  // @return Object
  nextColour: function() {
    this.currentColour++;
    this.currentColour %= this.colours.length;
    return this.colours[this.currentColour];
  }
});
