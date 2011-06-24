//= require <MoreInfoPanel>
//= require <CourseSearchResults>
//= require <CourseBrowser>
//= require <API>
//= require <SemesterBrowser>
//= require <LoginBoxView>
//= require <ScrollFollower>

document.observe("dom:loaded", function () {
	var lbc = new LoginBoxController();
	var lbv = new LoginBoxView({ target: $('loginbox'), controller: lbc });
	lbc.setView(lbv);
	lbc.startup();
	
	new ScrollFollower({ target: $('leftcolumn') });
	
	API.checkLogin(function (status) {
		if (!status) {
			window.location.href = '/index.html';
		} else {
			MoreInfoPanel.instance = new MoreInfoPanel($('moreInfoPanel'));
			var cbModel = new CourseSearchResults();
			var cb = new CourseBrowser($('searchEdit'), $('searchResultsPanel'), cbModel);
			
			var sb = new SemesterBrowser($('boxPanel'), $('main'));
			$('searchEdit').value = '';
			$('searchEdit').focus();
		}
	});
});