//= require <prototype>
//= require <LoginBoxView>
//= require <LoginBoxController>

document.observe("dom:loaded", function () {
	API.observe('status', function(status) {
		if (status)
			window.location.href = '/courses.html';
	});
	
	var lbc = new LoginBoxController();
	var lbv = new LoginBoxView({ target: $('loginbox'), controller: lbc });
	lbc.setView(lbv);
	lbc.startup();
});