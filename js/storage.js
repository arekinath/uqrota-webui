// UQRota
// Copyright Alex Wilson 2010
// storage.js -- interfaces for storing/loading timetables

// line bump
// Dialog for registering a new username/password on the server
var RegisterDialog = Class.create({
  initialize: function(user, pass, callback) {
    this.callback = callback;

    InstrumentCounters.fire('open registration dialog');

    this.window = new Ext.Window({
      title: 'Registration',
      layout: 'form',
      closeable: true,
      renderTo: Ext.getBody(),
      padding: 5
    });

    this.introText = new Ext.Toolbar.TextItem({
      text: "Please provide your details so we can notify you about timetable changes. Everything is optional.",
      width: 350,
      height: 50
    });
    this.usernameText = new Ext.form.TextField({
      value: user,
      fieldLabel: 'New username'
    });
    this.passwordText = new Ext.form.TextField({
      value: pass,
      fieldLabel: 'Password',
      inputType: 'password'
    });
    this.emailText = new Ext.form.TextField({
      fieldLabel: 'Email'
    });
    this.mobileText = new Ext.form.TextField({
      fieldLabel: 'Mobile phone'
    });
    this.mobileNote = new Ext.Toolbar.TextItem({
      text: '(n.b. SMS notifications are free of charge)'
    });
    this.registerButton = new Ext.Button({
      text: 'Register',
      type: 'submit',
      handler: this.on_register_click.bind(this)
    });

    this.window.add([this.introText, this.usernameText, this.passwordText, this.emailText, this.mobileText]);
    this.window.add([this.mobileNote, this.registerButton]);

    this.window.show();
    this.window.center();
  },

  on_register_click: function() {
    this.window.hide();
    this.callback({
      login: this.usernameText.getValue(),
      password: this.passwordText.getValue(),
      email: this.emailText.getValue(),
      mobile: this.mobileText.getValue()
    });
    InstrumentCounters.fire('register new user');
  }
});

// Dialog for logging in
var LoginDialog = Class.create({
  initialize: function() {
    this.window = new Ext.Window({
      title: 'Login',
      layout: 'form',
      closeable: true,
      renderTo: Ext.getBody(),
      padding: 5
    });
    this.noteLabel = new Ext.form.Label({
      text: 'Please note this is not the same as your SI-net sign-in.\nTo create a new account, simply enter the\nusername and password you want to use.'
    });
    this.usernameInput = new Ext.form.TextField({
      fieldLabel: 'Username'
    });
    this.passwordInput = new Ext.form.TextField({
      inputType: 'password',
      fieldLabel: 'Password'
    });
    //this.noteLabel = new Ext.form.Label({
    //  text: "(if the username doesn't exist we will create it automatically)"
    //});
    this.loginButton = new Ext.Button({
      text: 'Login or register',
      type: 'submit',
      handler: this.on_login_click.bind(this)
    });
    this.window.add([this.noteLabel, this.usernameInput, this.passwordInput/*, this.noteLabel*/, this.loginButton]);
    this.window.show();
    this.window.center();

    this.usernameInput.focus(true, 100);
    InstrumentCounters.fire('open login dialog');
  },

  on_login_click: function() {
    Server.login(this.usernameInput.getValue(), this.passwordInput.getValue(), (function(success) {
      if (success) {
	this.window.hide();
	if (this.callback) this.callback();
      } else {
	this.usernameInput.focus(true, 100);
      }
    }).bind(this));
  }
});

// Dialog for importing from sinet
var SinetImportDialog = Class.create({
  initialize: function() {
    this.window = new Ext.Window({
      title: 'SI-net import',
      layout: 'form',
      closeable: true,
      renderTo: Ext.getBody(),
      padding: 5
    });
    this.usernameInput = new Ext.form.TextField({
      fieldLabel: 'mySI-net Username'
    });
    this.passwordInput = new Ext.form.TextField({
      inputType: 'password',
      fieldLabel: 'Password'
    });
    //this.noteLabel = new Ext.form.Label({
    //  text: "(if the username doesn't exist we will create it automatically)"
    //});
    this.loginButton = new Ext.Button({
      text: 'Import timetable',
      type: 'submit',
      handler: this.on_login_click.bind(this)
    });
    this.window.add([this.usernameInput, this.passwordInput/*, this.noteLabel*/, this.loginButton]);
    this.window.show();
    this.window.center();

    this.usernameInput.focus(true, 100);
  },

  on_login_click: function() {
    Server.importFromSinet(this.usernameInput.getValue(), this.passwordInput.getValue(), (function(success) {
      if (success) {
	this.window.hide();
	if (this.callback) this.callback();
      } else {
	this.usernameInput.focus(true, 100);
      }
    }).bind(this));
    InstrumentCounters.fire('import from sinet');
  }
});

// this manages storage-related operations from the UI, like new/save/load
var StorageManager = {
  // Checks whether the UI has any unsaved changes. If so, it prompts the user to save
  // and then either way calls the callback given.
  // @param callback	function()
  checkUnsaved: function(callback) {
    if (Application.calendar.hasUnsavedChanges) {
      Ext.Msg.confirm('Unsaved changes', 'Do you want to save the current timetable?',
	function (ret) {
	  if (ret == 'yes') {
	    StorageManager.callback = callback;
	    StorageManager.save();
	  } else {
	    callback();
	  }
	}
      );
    } else {
      callback();
    }
  },

  // Handles the creation of a new timetable
  create: function() {
    this.checkUnsaved((function() {
      Application.courseSelector.removeAll();
      Application.calendar.setUnsavedChanges(false);
      $('permalink').update();
      $(document.body).fire('storage:new');
    }).bind(this));
  },

  // Starts opening a saved timetable
  open: function() {
    Application.timetablesStore.load();
    Application.myTimetablesStore.load();
    this.checkUnsaved(function() {
      Server.checkLogin(function(logged_in, user) {
	if (!logged_in) user = 'Not logged in';
	var dlg = new OpenDialog('Logged in as '+user);
	$(document.body).fire('storage:open');
      });
    });
  },

  // Starts saving the current timetable
  save: function() {
    Application.myTimetablesStore.load();
    Server.checkLogin(function(logged_in, user) {
      if (logged_in) {
	//Ext.Msg.alert('Login', "Logged in as "+user);
	var dlg = new SaveDialog('Logged in as '+user);
	$(document.body).fire('storage:save');
      } else {
	var dlg = new LoginDialog();
	dlg.callback = (function() {
	  StorageManager.save();
	}).bind(this);
      }
    });
    
  }
};

// Dialog for saving timetables
var SaveDialog = Class.create({
  initialize: function(loginName) {
    this.loginText = new Ext.form.DisplayField({
      value: loginName
    });

    this.topBar = new Ext.Toolbar({
      items: [ this.loginText, '->', 
	{ text: 'Change login', cls: 'x-btn-text-icon', icon: '/images/icons/lock.png', handler: this.on_login_click.bind(this) } ]
    });

    this.window = new Ext.Window({
      title: 'Save timetable',
      closeable: true,
      //layout: 'form',
      layout: 'fit',
      height: 400,
      width: 450,
      tbar: this.topBar,
      renderTo: Ext.getBody(),
      padding: 5
    });
    
    this.saveAsNewPanel = new Ext.Panel({
      layout: 'form',
      padding: 5,
      title: 'Save as new'
    })

    this.loginLabel = new Ext.form.DisplayField({
      value: loginName,
      fieldLabel: 'Owner'
    });

    this.listView = new Ext.ListView({
      store: Application.myTimetablesStore,
      title: 'Save over existing',
      emptyText: 'No already saved timetables could be found',
      height: 200,
      style: { border: '1px solid #333' },
      reserveScrollOffset: true,
      columns: [
	{ header: 'Owner', dataIndex: 'owner' },
	{ header: 'Name', dataIndex: 'name' },
	{ header: 'Visible to', dataIndex: 'visibility' }
      ]
    });
    this.listView.addListener('click', this.on_listview_click.bind(this));

    this.nameField = new Ext.form.TextField({
      fieldLabel: 'Name (like "sem 1 09")'
    });

    this.worldCheckbox = new Ext.form.Checkbox({
      fieldLabel: 'Let everybody see my timetable'
    });

    this.saveButton = new Ext.Button({
      text: 'Save as new',
      cls: 'x-btn-text-icon',
      icon: '/images/icons/disk.png',
      handler: this.on_save_click.bind(this)
    });

    this.saveAsNewPanel.add([this.loginLabel, this.nameField, this.worldCheckbox, this.saveButton]);
    
    this.tabPanel = new Ext.TabPanel({
      items: [this.listView, this.saveAsNewPanel],
      activeTab: 0
    });
    
    this.window.add(this.tabPanel);

    this.window.show();
    this.window.center();
  },

  on_login_click: function() {
    var dlg = new LoginDialog();
    dlg.callback = (function() {
      Server.checkLogin((function(logged_in, user) {
	if (!logged_in) user = 'Not logged in';
	this.loginText.setValue('Logged in as '+user);
      }).bind(this));
    }).bind(this);
  },

  on_save_click: function() {
    var tt = { name: this.nameField.getValue(), world_readable: this.worldCheckbox.getValue() };
    Server.saveTimetable(Application.calendar, tt, (function(success) {
      if (success) {
	this.window.hide();
	if (StorageManager.callback) { StorageManager.callback(); StorageManager.callback = null; }
      }
    }).bind(this));
    InstrumentCounters.fire('save timetable as new');
  },

  on_listview_click: function(dv, index, node) {
    var record = dv.getRecord(node);
    var tt = { id: record.id };
    Server.saveTimetable(Application.calendar, tt, (function(success) {
      if (success) {
	this.window.hide();
	if (StorageManager.callback) { StorageManager.callback(); StorageManager.callback = null; }
      }
    }).bind(this));
    InstrumentCounters.fire('save timetable over existing');
  }
});

var OpenDialog = Class.create({
  initialize: function(user) {
    this.loginText = new Ext.form.DisplayField({
      value: user
    });

    this.topBar = new Ext.Toolbar({
      items: [ this.loginText, '->', 
	{ text: 'Login', cls: 'x-btn-text-icon', icon: '/images/icons/lock.png', handler: this.on_login_click.bind(this) } ]
    });

    this.window = new Ext.Window({
      title: 'Open timetable',
      closeable: true,
      layout: 'fit',
      width: 450,
      height: 400,
      renderTo: Ext.getBody(),
      tbar: this.topBar,
      padding: 5
    });

    this.publicListView = new Ext.ListView({
      store: Application.timetablesStore,
      title: 'All timetables',
      emptyText: 'No saved timetables',
      reserveScrollOffset: true,
      columns: [
        { header: 'Owner', dataIndex: 'owner' },
        { header: 'Name', dataIndex: 'name' },
        { header: 'Visible to', dataIndex: 'visibility' }
      ]
    });
    
    this.myListView = new Ext.ListView({
      store: Application.myTimetablesStore,
      title: 'My timetables',
      emptyText: 'No timetables saved by you could be found',
      reserveScrollOffset: true,
      columns: [
        { header: 'Owner', dataIndex: 'owner' },
        { header: 'Name', dataIndex: 'name' },
        { header: 'Visible to', dataIndex: 'visibility' }
      ]
    });
    this.myListView.addListener('click', this.on_listview_click.bind(this));
    this.publicListView.addListener('click', this.on_listview_click.bind(this));
    
    this.tabPanel = new Ext.TabPanel({
      items: [ this.publicListView, this.myListView ],
      activeTab: 0
    });
    
    this.window.add(this.tabPanel);

    // TODO: add search capability
    // Application.timetablesStore.load({ params: { "q": "lou" } });

    this.window.show();
    this.window.center();
  },

  on_login_click: function() {
    var dlg = new LoginDialog();
    dlg.callback = (function() {
      Server.checkLogin((function(logged_in, user) {
	if (!logged_in) user = 'Not logged in';
	this.loginText.setValue('Logged in as '+user);
      }).bind(this));
    }).bind(this);
  },

  on_listview_click: function(dv, index, node) {
    this.window.hide();
    var record = dv.getRecord(node);
    Server.loadTimetable(Application.courseSelector, Application.calendar, record.id);
    if (StorageManager.callback) { StorageManager.callback(); StorageManager.callback = null; }
    InstrumentCounters.fire('open timetable');
  }
});
