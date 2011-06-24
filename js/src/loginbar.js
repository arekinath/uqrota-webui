//= require <prototype>
//= require <LoginBoxView>
//= require <LoginBoxController>

document.observe("dom:loaded", function () {
	var lbc = new LoginBoxController();
	var lbv = new LoginBoxView({ target: $('loginbox'), controller: lbc });
	lbc.setView(lbv);
	lbc.startup();
});