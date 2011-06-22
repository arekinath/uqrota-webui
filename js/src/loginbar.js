//= require <prototype>
//= require <LoginBoxView>

document.observe("dom:loaded", function () {
	var lbv = new LoginBoxView($('loginbox'));	
});